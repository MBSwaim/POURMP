# POURMP — Development Guide

*Technical reference for future contributors.*

Related: [ARCHITECTURE.md](ARCHITECTURE.md) · [ROADMAP.md](ROADMAP.md) · [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md)

## Folder Structure

```
src/
  app/                    Next.js App Router — one folder per route
    api/                  API routes (route.ts), called by Client Components
    events/[id]/          Event detail page + tabs (Catering, Floor Plan, Tasks, Notes)
    events/[id]/prep/     Printable Prep Docs (PrintableDoc.tsx) + per-doc client tabs
    prep/                 Standalone live prep tools: kitchen-sheet, beo, checklist
    prep-docs/            Consolidated Prep Docs picker (all 11 docs, one event at a time)
    operations/           Operational Dashboard
    today/                Day-of dashboard
    book/                 Public-facing lead-capture form
    settings/, staff/,
    reservations/,
    analytics/, archive/  One page + one *Client.tsx per route, same pattern throughout
  components/             Shared UI components used across multiple routes
    ui/                   shadcn/ui primitives (button, dialog, select, table, ...) — don't
                           hand-roll a control that already exists here
  lib/                    All business logic and data access. No UI here.
    db.ts                 Schema, migrations, and every DB read/write function
    db-internal.ts        The getDb() singleton
    calculations.ts       Catering math, floor plan recommendations, serving-vessel labels
    tasks.ts              Task templates, generation, Task Complexity scoring
    riskScanner.ts         Event Risk Scanner (pure function, no DB access)
    barImpact.ts           Main Bar Impact scoring
    readiness.ts           Event Readiness Score
    noteGenerators.ts       Plain-text Prep Doc generators (Toast Notes, Kitchen Sheet, ...)
    prepOutputsData.ts      Shared loader that assembles EventForNotes for every Prep Doc
    alerts.ts, notifyDelivery.ts   Notification engine + delivery channel stubs
    constants.ts            Venue-specific constants (business hours, table layout, policy text)
    seed.ts                 Initial package/menu-item seed data
```

**The rule this structure encodes:** if it's a calculation, a query, or a rule about how the venue operates, it belongs in `src/lib/`, not inline in a component. Components render what `lib/` computes.

## Naming Conventions

These are already consistent throughout the codebase — follow them:

- **Files:** `PascalCase.tsx` for components (`CateringCalculator.tsx`), `camelCase.ts` for lib modules (`riskScanner.ts`), lowercase route folders per Next.js convention (`app/events/[id]/`).
- **Functions:** `camelCase`, verb-first for actions (`calcFloorPlan`, `getEventFull`, `syncEventTasks`, `scanEventRisks`). `calc*` computes a derived value from inputs; `get*` reads from the database; `sync*` reconciles derived rows without destroying existing state (see Task Generation below).
- **Types/interfaces:** `PascalCase` (`RiskFlag`, `EventForNotes`, `CalculatedItem`). One interface per shape, exported from the module that owns it, imported everywhere else — never redeclared.
- **Database columns & JSON payloads:** `snake_case` (`guest_count`, `buffer_pct`, `event_id`), matching SQLite convention directly through to API request/response bodies. This is deliberate — there's no camelCase/snake_case translation layer, so a field name is the same string in the database, the API body, and (usually) the prop name.
- **Constants:** `SCREAMING_SNAKE_CASE` for fixed values (`EVENT_STATUSES`, `RISK_LEVEL_RANK`, `TASK_ATTENTION_WINDOW_HOURS`).

## Shared Data Models

See [ARCHITECTURE.md](ARCHITECTURE.md) §4 for the full table. The one rule worth restating here: **when you need a fact about an event in a new place, add it to the existing shared shape (`EventForNotes`, `CalculatedItem`, etc.) and to whatever function assembles it — don't fetch or recompute it separately.** The `0.7.1` catering-consistency fix (see [CHANGELOG.md](CHANGELOG.md)) exists specifically because several Prep Docs had each grown their own copy of "what packages does this event have" instead of sharing one.

## Task Generation

`src/lib/tasks.ts` defines a flat array of task templates, each with a `key`, a `category` (`Setup` | `Breakdown` | `Dynamic`), a `role` (`Lead` | `Kitchen` | `Bar` | `FOH`), a `condition` function, and a `label` function. Setup and Breakdown templates use `condition: () => true` (always generated); Dynamic templates check real event fields (e.g. `dessert_expected`).

`syncEventTasks(eventId)` in `db.ts` is the generation entry point, and it's **idempotent by design**:

1. Build a `TaskContext` from the event's current data.
2. Run every template's condition against that context to get the list of tasks that *should* exist.
3. Compare against `source_key` values already present in `event_tasks` for this event.
4. Insert only the templates that don't already have a matching `source_key`.

It never updates or deletes an existing row. This means calling it again after the event's data changes (e.g. `dessert_expected` gets checked later) safely adds the newly-relevant Dynamic tasks without touching a task someone already completed. **If you add a new task template, give it a stable, unique `key` and never reuse or repurpose an old one** — `source_key` is how already-synced events are told apart from ones that need the new task added.

## Prep Docs Generation

Every Prep Doc — plain-text or printable — is generated from one shared object, `EventForNotes`, assembled once by `getPrepOutputsData()` in `prepOutputsData.ts`. From there:

- **Plain-text generators** live in `noteGenerators.ts` — one exported function per doc (`generateToastNotes`, `generateKitchenSheet`, `generateRunOfShow`, etc.), each taking the same `EventForNotes` and returning a formatted string.
- **Printable/branded documents** live in `PrintableDoc.tsx` as React components (`KitchenSheetDoc`, `RunOfShowDoc`, `SetupChecklistDoc`, `LeadsPackDoc`, ...), sharing a common `PrintDoc` wrapper for the masthead and print CSS.

Both paths call the same catering-resolution helpers (`resolveCateringPackages`, `calcMergedCateringItems`, `cateringPackageTitle` — see [ARCHITECTURE.md](ARCHITECTURE.md) §2) rather than each computing quantities independently. **When adding a new Prep Doc:** add whatever new fields it needs to `EventForNotes` and `getPrepOutputsData()` first, then write the generator/component against that shape — don't reach past it to a raw DB query inside the doc itself.

## Dashboard Calculations

`getDashboardStats()` and `getOperationalDashboard()` in `db.ts` are aggregation layers, not calculation layers — they run SQL over `events`/`event_details`/`payments`, and for anything that already has a calculation function elsewhere (risk level, bar impact, readiness), **they call that function and filter/bucket its output** rather than re-deriving the underlying rule. For example, the Dashboard's "High Risk" count calls `getEventRiskAssessment()` (the same function the Risk Scanner UI uses) and just filters to a 14-day window — it does not re-implement "what counts as high risk." Follow this pattern for any new dashboard metric: compute the underlying fact once, in `lib/`, and have every display of it call that same function.

## Risk Scanner Architecture

`src/lib/riskScanner.ts` is worth studying as the reference example for how a new rules-based module should be built in this codebase:

- `scanEventRisks(input: RiskScanInput): RiskFlag[]` is a **pure function** — no database access, no date math beyond what's passed in. Everything it needs (`isBooked`, `withinDepositWindow`, `barImpactLevel`, etc.) is pre-computed by the caller.
- `db.ts` is responsible for gathering raw data and assembling the `RiskScanInput` object — the scanner itself stays trivially unit-testable in isolation, which matters given there's no test suite yet (see [ROADMAP.md](ROADMAP.md)).
- It **reads** other modules' outputs (floor plan thresholds, bar impact level, task completion) instead of re-deriving them, so its rules can never silently drift from the modules they reference.
- It is explicitly read-only — it never writes to the Task system, Toast status, or any other table, even though it reads their data.
- Free-text keyword scanning (the Policy Conflict rules) is clearly commented as **best-effort, not authoritative** — a real intake field will always be more reliable than a regex over staff notes, and the code says so directly rather than implying more confidence than it has.

## Best Practices for Future Contributors

1. **One source of truth per fact.** If two places need the same number (a threshold, a guest count, a package list), there should be exactly one function that produces it. Grep before you write — if the value already exists somewhere in `lib/`, call that instead of recomputing it.
2. **Business logic goes in `lib/`, not in components.** A component should call a function and render its result, not contain the calculation itself.
3. **Prefer idempotent generation over destructive regeneration.** `syncEventTasks` is the model: never delete or silently overwrite user state (a completed task, a manual override) when data changes — add what's newly needed and leave the rest alone.
4. **Additive migrations only.** Schema changes in `db.ts` are `ALTER TABLE` statements wrapped in try/catch inside `initSchema()`. There is no destructive migration pattern in this codebase — don't introduce one without a real backup story in place (see [ROADMAP.md](ROADMAP.md)).
5. **Keep `snake_case` at the data boundary.** Don't introduce a camelCase/snake_case translation layer between the database and the API — it doesn't exist today and adding it partially would be worse than not having it.
6. **New Prep Docs extend `EventForNotes`, they don't bypass it.** See Prep Docs Generation above.
7. **There is no test suite yet.** Until one exists, be conservative with pure-function refactors (`calculations.ts`, `riskScanner.ts`, `tasks.ts`, `barImpact.ts`, `readiness.ts`) and verify behavior manually against a real event before committing — see the project's `/verify`-style workflow if one is configured for this repo.
8. **Check new features against [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) before building them.** It's the authoritative definition of what POURMP owns versus Toast. If a proposed feature's job is to record a lead, a customer profile, a proposal, an invoice, or a payment as authoritative, it belongs in Toast, not here — see that document §1 and §6 before writing code, not after.
