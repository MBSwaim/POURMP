# POURMP — Architecture

Related: [README.md](README.md) · [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) · [BRAND_GUIDE.md](BRAND_GUIDE.md) · [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md)

This document describes how POURMP's modules fit together, how data moves between them, and what shared models keep them from drifting out of sync with each other. It reflects the codebase **as it exists today, as of `0.7`** (plus the pending `0.7.1` catering-consistency fix) — it is a description of current implementation, not a statement of target scope.

> **This document is due for a rewrite once Version 1.0 work lands.** [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) is the authoritative target architecture and has already decided that the `payments` table, the numeric financial fields on `event_details`, and the full `clients`/`leads` CRM-style records described below are being removed or simplified — see that document's §5–§6 and the proposed architecture diagram in [V1_REALIGNMENT_REVIEW.md](V1_REALIGNMENT_REVIEW.md) §9. Until that work is actually done, this document accurately reflects what's running; treat the Sales Tracking (§3) and Reservations/Leads descriptions below as **current-state, not target-state**.

---

## 1. Stack, in one paragraph

POURMP is a Next.js 14 App Router application, written in TypeScript, backed by a single SQLite database (`better-sqlite3`, file at `data/mpbc.db`). There is no separate backend service — Server Components query the database directly through `src/lib/db.ts`, and Client Components (anything interactive) call the app's own `/api/*` routes, which call the same `db.ts` functions. Styling is Tailwind CSS + shadcn/ui primitives. There is no authentication layer (see [ROADMAP.md](ROADMAP.md)).

## 2. The core architectural principle: one calculation layer, many consumers

The single most important pattern in POURMP, and the one every new feature should follow, is this:

> **Business logic lives in pure functions in `src/lib/*.ts`. Pages and components call those functions — they never re-derive the same logic locally.**

Concretely:

- `calcAllItems` / `calcMergedCateringItems` (catering quantities) live in `src/lib/calculations.ts`.
- `calcFloorPlan` (floor plan recommendations) lives in `src/lib/calculations.ts`.
- `calcReadiness` (Event Readiness Score) lives in `src/lib/readiness.ts`.
- `calcBarImpact` (Main Bar Impact) lives in `src/lib/barImpact.ts`.
- `calcTaskComplexity` (Task Complexity score) lives in `src/lib/tasks.ts`.
- `scanEventRisks` (Event Risk Scanner) lives in `src/lib/riskScanner.ts`.

Every one of these is a **pure function**: given the same plain-object input, it returns the same result, with no database access and no side effects inside the function itself. `src/lib/db.ts` is the layer that gathers the raw data *for* these functions and assembles their input objects — the functions themselves stay trivially testable and auditable in isolation, which matters a great deal given there is currently no automated test suite (see [ROADMAP.md](ROADMAP.md)).

This is also why several of these functions explicitly *read* another function's output instead of recomputing a threshold themselves — for example, the Risk Scanner's Guest Count Risk reuses `calcFloorPlan`'s existing 50/75 guest thresholds rather than re-declaring "50" and "75" a second time, and its Main Bar Load Risk reads `calcBarImpact`'s level rather than re-scoring bar load itself. **A number should only ever be defined in one place.** See [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) for more on this convention.

The same principle applies to *which catering packages an event has*: `resolveCateringPackages`, `calcMergedCateringItems`, and `cateringPackageTitle` in `calculations.ts` are the single place that resolves "what packages does this event have, at what quantities" — every catering-facing output (the Builder, the plain-text summary, the Equipment list, Toast Notes, the Kitchen Sheet, the BEO, and the Today dashboard) calls the same functions rather than each re-implementing package resolution independently.

## 3. How the modules work together

```
                         ┌──────────────────────────┐
                         │   events / event_details  │
                         │   (one event record)      │
                         └────────────┬─────────────┘
                                      │
        ┌───────────────┬────────────┼────────────┬───────────────┐
        │               │            │            │               │
   event_packages   event_tasks  event_notes   payments      event_debriefs
   (Catering)       (Tasks)      (Notes)      (Sales /       (post-event)
        │               │                     Toast mirror)
        │               │
        ▼               ▼
  calcAllItems /   calcTaskComplexity
  calcMerged-            │
  CateringItems          │
        │                │
        └───────┬────────┴─────────────┬───────────────┬────────────────┐
                ▼                      ▼               ▼                ▼
         calcFloorPlan          calcBarImpact    calcReadiness    scanEventRisks
        (Floor Plans)         (Main Bar Impact)  (Readiness)    (Risk Scanner)
                │                      │               │                │
                └──────────────────────┴───────┬───────┴────────────────┘
                                                ▼
                                 ┌──────────────────────────────┐
                                 │  Dashboard · Operations ·     │
                                 │  Prep Docs · Today ·          │
                                 │  Analytics                    │
                                 └──────────────────────────────┘
```

### Dashboard (`/`)
Reads `getDashboardStats()` (this-month event count, next-14-day count, projected/confirmed sales, upcoming events) plus `getKanbanEvents()` for the event status board (Confirmed / Planning / Ready / Active / Closed columns) and the Notification Summary Card. It does not compute risk or bar-impact logic itself — it calls `getEventRiskAssessment()` and `getOperationalDashboard()` and filters their results to a 14-day window, so the Dashboard's "High Risk" and "High Bar Impact" counts can never disagree with the Operations page's own numbers.

### Operations (`/operations`)
The triage view. `getOperationalDashboard()` in `db.ts` assembles one `OpsEventSummary` per event (readiness score, task-completion percentage, bar-impact level, financial-tracking fields) and buckets events into seven sections: This Week, Awaiting Deposit, Awaiting Menu, Awaiting Invoice, High Risk, High Bar Impact, and Needs Attention. "Readiness" (planning/admin completeness) and "Task Completion" (execution/day-of completeness) are deliberately kept as two separate numbers here — the code comments in `db.ts` explicitly warn against merging them into one score, since a fully-planned event can still have incomplete setup tasks the morning of.

### Event Records (`/events`, `/events/[id]`)
The `events` + `event_details` tables are the root of everything else — every other module (Catering, Floor Plans, Tasks, Prep Docs, Risk Scanner) hangs off a single `event_id`. An event moves through `EVENT_STATUSES`: **Confirmed → Planning → Ready → Active → Closed**. Events are created either directly (`/events/new`) or from a converted lead (the public `/book` form feeds a separate, lighter-weight `leads` pipeline: New → Contacted → Converted → Dismissed).

### Reservations (`/reservations`)
Table reservations are intentionally **separate** from private events — a different table (`reservations`), a different, smaller-party use case, mapped onto the venue's fixed physical taproom layout (`TAPROOM_TABLES` / `TABLE_COMBOS` in `constants.ts`). They share only the notification engine with events, not the catering/floor-plan/task machinery.

### Catering (Catering Builder, in the Event Detail "Catering" tab)
An event can carry one or more `event_packages` rows, each with its own package, guest count, and buffer %. `calcAllItems` turns a package's menu items + guest count into quantities and serving units (chafers, bowls, platters); `calcMergedCateringItems` combines multiple packages on the same event, de-duplicating shared dishes. This is the **source of truth** every other catering-facing output reads from — see §2 above.

### Floor Plans (Event Detail "Floor Plan" tab)
`calcFloorPlan(guestCount)` is a pure lookup: guest count in, `{ layoutType, tablesNeeded, highTopCount, seatedCapacity, warningLevel, staffNotes, isOverCapacity }` out, based on the venue's actual room (6 rectangular + 4 high-top tables, 52-guest standard seated capacity, 75-guest hard ceiling). Both the Floor Plan tab and the Risk Scanner's Guest Count Risk read this same function.

### Tasks (Event Detail "Tasks" tab)
`syncEventTasks()` generates `event_tasks` rows from a static template list in `tasks.ts` — **Setup** and **Breakdown** tasks are always generated; **Dynamic** tasks are generated only when a condition function on the event data returns true (e.g. a dessert-related task only appears if `dessert_expected` is set). Each task is assigned a role: Lead, Kitchen, Bar, or FOH. `calcTaskComplexity` scores overall complexity from the event's context plus how many Dynamic tasks apply.

### Prep Docs (`/prep-docs`, `/events/[id]/prep`)
The consolidated output layer — eleven generated documents (Toast Notes, Pre-Shift Brief, Main Bar Impact, Run of Show, Kitchen Sheet, FOH Notes, Bar Notes, Leads Pack, Handoff Pack, Setup Checklist, Debrief). All eleven are built from one shared loader, `getPrepOutputsData()` in `prepOutputsData.ts`, which assembles a single `EventForNotes` object per event (see §4). The text generators live in `noteGenerators.ts`; the printable/branded versions live in `PrintableDoc.tsx`. Both read the same `EventForNotes` shape, so a fact never has to be entered twice for the plain-text and printable versions to agree.

### Risk Scanner (`src/lib/riskScanner.ts`)
A read-only intelligence layer. `scanEventRisks()` takes a plain `RiskScanInput` object (assembled by `db.ts` from raw event data plus the *outputs* of `calcFloorPlan`, `calcBarImpact`, and the Task system) and returns `RiskFlag[]` across ten categories: Deposit, Menu Deadline, Guest Count, Shared Space, Main Bar Load, Task Completion, Floor Plan, Policy Conflict, Dessert Logistics, and Child Supervision. It never writes to any other table — it only reads. See [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) for the full architecture of this module.

### Main Bar Impact (`src/lib/barImpact.ts`)
Scores how much a private event will strain the main taproom bar, based on guest count, timing overlap with taproom hours, and bar tab type. Its output (`level`, congestion notes, guest-flow notes) is consumed by Toast Notes, Run of Show, FOH/Bar Notes, the Setup Checklist, the Operational Dashboard, and the Risk Scanner's Main Bar Load Risk — always read, never recomputed by the consumer.

### Sales Tracking (Dashboard stat cards, `/analytics`, Toast Status Tracker)
POURMP tracks two distinct kinds of "sales" data, and it's important they aren't confused:
1. **Projected/Confirmed Sales** (Dashboard) — a `guest_count × package price_per_guest` proxy, computed live from `event_details` + `packages`. This is a planning estimate, not real revenue.
2. **Invoiced/Collected** (Analytics, year-over-year) — computed from the `payments` table (`amount_due` / `amount_paid`), which staff enter manually as a mirror of what Toast shows. This is *closer* to real money than the projection above, but is still a manual mirror, not a live Toast sync.

The **Toast Status Tracker** (5-stage: Proposal Sent → Confirmed → Invoice Sent → Deposit Received → Final Payment) and the **Financial Tracking** fields on the event (deposit/final due & received) exist for the same reason: giving staff a fast internal answer to "where does Toast say we are with this client" without opening Toast. None of this is authoritative — see [README.md](README.md) for POURMP's relationship to Toast.

> **Slated for consolidation.** The realignment review that produced [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) found that this section describes *three* independent, manually-updated representations of the same facts — the `payments` table, the numeric Financial Tracking fields, and the Toast Status Tracker — that had drifted out of sync with each other (see [V1_REALIGNMENT_REVIEW.md](V1_REALIGNMENT_REVIEW.md) §3). Version 1.0 keeps only the Toast Status Tracker; the `payments` table and the numeric Financial Tracking fields are removed, and the "Projected/Confirmed Sales" proxy below goes with them (Analytics is rebuilt around operational metrics instead).

### Analytics (`/analytics`)
Reads `getYearMonthly()` / `getYearTotals()` — pure SQL aggregation over `events` + `payments` for a given calendar year. No calculation-layer logic of its own; it's a reporting view over the same `payments` data described above.

## 4. Shared data models

These are the types that cross module boundaries and must be kept in sync when the schema changes:

| Model | Defined in | Used by |
|---|---|---|
| `Event`, `EventDetails`, `EventPackageWithItems` | `db.ts` | Every event-scoped page/module |
| `MenuItem`, `CalculatedItem` | `calculations.ts` | Catering Builder, Kitchen Sheet, BEO, Toast Notes, Today dashboard |
| `RiskFlag` | `riskScanner.ts` | Risk Scanner UI, Pre-Shift Brief, Leads Pack |
| `TaskContext` | `tasks.ts` | Task Complexity scoring, wherever complexity is displayed |
| `EventForNotes` | `noteGenerators.ts` | Every Prep Doc generator and printable document |
| `OpsEventSummary` / `OperationalDashboard` | `db.ts` | Operations page, Dashboard's high-risk/high-bar-impact counts |

`EventForNotes` deserves particular attention: it is the shape every Prep Doc is generated from, assembled once by `getPrepOutputsData()` and passed unchanged into both the plain-text generators (`noteGenerators.ts`) and the printable-document components (`PrintableDoc.tsx`). Any field a new Prep Doc needs should be added to this shape and to `getPrepOutputsData()` — not fetched separately by an individual doc, which is exactly the anti-pattern the `0.7.1` catering-consistency fix corrected (see [CHANGELOG.md](CHANGELOG.md)).

## 5. Server vs. client data access

- **Server Components** (most `page.tsx` files) call `db.ts` functions directly — no network round trip, no API layer in between.
- **Client Components** (anything with `'use client'` that needs to mutate data, like `EventDetailClient.tsx`) call the app's own `/api/*` routes, which in turn call the same `db.ts` functions. There is no separate data-access path for client vs. server beyond that one hop.
- `getDb()` is a singleton (`global.__mpbc_db`) that initializes the schema and seed data on first call. Schema migrations are appended as `ALTER TABLE` statements wrapped in try/catch in `initSchema()` — additive only, no destructive migrations exist in the codebase.
