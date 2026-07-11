# Event Details Data Audit

*Prepared 2026-07-11. Read-only audit — no code changes, no database changes, no migrations. Findings are verified directly against the current codebase (`src/lib/db.ts`, `EventDetailClient.tsx`, `noteGenerators.ts`, `prepOutputsData.ts`, `riskScanner.ts`, `readiness.ts`, `barImpact.ts`, API routes) and, where noted, cross-checked in the running dev server — not against documentation. Every claim below is either marked **CONFIRMED** (with a file:line citation you can verify yourself) or **RECOMMENDATION** (my judgment, clearly separated from what was observed).*

Related: [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)

Scope note: "Event Details" here means the `event_details` database table plus the closely-related `events` table fields that appear alongside it in the UI's "Event Details" card — since the two are edited and consumed together everywhere in the app. Where the two tables' fields diverge in behavior, that's called out explicitly.

---

## A. Current Event Details Fields

### `events` table

| Field | Operational purpose | Confirmed by |
|---|---|---|
| `event_name` | Display name/title for the event, used everywhere the event is listed or printed | Events table, Kanban, Prep Docs |
| `event_date` | The event's calendar date — drives blocked-date checks, calendar, analytics-era reporting | `api/events/route.ts` 21-day/blocked-date checks |
| `event_time` | Event start time — root input for all derived timing | `computeEventTimes()` call in `EventDetailClient.tsx` `saveField` |
| `setup_time`, `teardown_time`, `production_close_time`, `decorate_time` | Derived timing fields, recomputed together whenever `event_time` or `event_duration_mins` changes | **CONFIRMED**: `EventDetailClient.tsx:208-220` — `saveField` has a dedicated branch that recomputes all four whenever `event_time` changes, via `computeEventTimes()` |
| `event_duration_mins` | Event length (180/240 min) — input to the same derived-timing computation | Same as above |
| `status` | Event lifecycle stage (`Confirmed → Planning → Ready → Active → Closed`) | Kanban, Events table, Operational Dashboard bucketing |
| `space` | Which physical space/room is booked | Displayed on Overview, printed on Prep Docs |
| `client_id` | FK to `clients` | Join target for every client-facing view |
| `external_order_number` | Intended to link an event to an order number in an online ordering/catering system | **CONFIRMED unused** — see Section D |
| `created_at` / `updated_at` | Audit timestamps | Not surfaced in UI; standard bookkeeping |

### `event_details` table

| Field | Operational purpose | Confirmed by |
|---|---|---|
| `guest_count` | **Legacy** single-package guest count | **See Section C — actively duplicated and drifting from `event_packages.guest_count`.** |
| `package_id` | **Legacy** single-package selection | Same as above |
| `buffer_pct` | **Legacy** single-package extra-headcount buffer | Same as above |
| `food_notes` | Free-text food/allergy notes, edited on Overview | `EventDetailClient.tsx:515` |
| `dietary_restrictions` | Free-text dietary notes, feeds Readiness Score and Risk Scanner | `EventDetailClient.tsx:516`, `readiness.ts` |
| `bar_tab_limit` | Dollar cap on the bar tab | **CONFIRMED**: set only at creation (`NewEventForm.tsx`), read by BEO and Today dashboard, **no edit control found anywhere on the Event Detail page** — see Section B |
| `drink_tickets` | Pre-paid drink ticket quantity | Catering/bar calculations, `DRINK_TICKET_PRICE` math |
| `tab_details` | Free-text bar tab notes, auto-seeded from `bar_tab_type` selection but independently editable after | **CONFIRMED**: `EventDetailClient.tsx:562` (auto-fill), `:577` (independent edit) — intentional "smart default" pattern, not a problem |
| `staffing_notes` | Free-text staffing notes, feeds Readiness Score | `readiness.ts`, `EventDetailClient.tsx` |
| `contract_signed` | Whether the contract is signed — a Readiness Score input | **CONFIRMED**: set only at creation (`NewEventForm.tsx:408-409`), **no edit control found anywhere on the Event Detail page** — see Section B and Section E |
| `date_flexible` | Whether the client's date is flexible | **CONFIRMED**: captured only at intake (`BookingForm.tsx`, `NewEventForm.tsx`), **never displayed or edited again after event creation** — see Section D |
| `setup_notes` | Free-text decorations/A-V notes | Readiness Score, Prep Docs |
| `bar_tab_type` | Which of the three bar tab models applies | Drives `BAR_TAB_DESCRIPTIONS`, Risk Scanner, Prep Docs |
| `floor_plan_notes` | Free-text floor plan notes | Floor Plan tab, Readiness Score |
| `big_screen_tv` | Whether the TV/AV setup is needed | Task generation (Dynamic task condition) |
| `selected_sauces` | Which optional sauces the client selected | `saucesForItem()` in `calculations.ts` |
| `serve_style_json` | Per-item serve style (all-at-once vs. staggered), JSON blob | `countChafingDishes()` |
| `beo_notes`, `kitchen_notes`, `foh_notes`, `bar_notes` | Department-specific staff notes | Prep Docs, `alerts.ts` kitchen-prep alert |
| `alert_offsets_json` | Per-event overrides of default alert timing | `alerts.ts:42` |
| `menu_item_overrides_json` | Per-event manual piece-count overrides for specific menu items | `parseMenuItemOverrides()` in `calculations.ts` |
| `toast_proposal_sent_date`, `toast_confirmed_date`, `toast_invoice_sent_date`, `toast_deposit_received_date`, `toast_final_payment_date` | The Toast Status Tracker | **See Section E — intentionally lives here, but conceptually owned by a separate module.** |
| `kids_attending` | Drives a Dynamic task + Pre-Shift Brief reminder | `tasks.ts`, `noteGenerators.ts:711` |
| `dessert_expected` | Drives a Dynamic task + Pre-Shift Brief reminder | `tasks.ts`, `noteGenerators.ts:712` |
| `final_menu_locked` | Checkbox indicating the menu is finalized | **CONFIRMED editable** (`EventDetailClient.tsx:539-540`) and passed through `EventForNotes`, but **CONFIRMED it is never referenced in the body of any `generate*()` function in `noteGenerators.ts`** — see Section D |

---

## B. Missing Operational Data

These are facts existing workflows need, that have no reliable way to be captured or updated in the canonical location once an event exists:

1. **`contract_signed` has no post-creation edit path.** **CONFIRMED**: grep of `EventDetailClient.tsx` for `contract_signed` returns only the one line reading it into `calcReadiness` (line 83) — no `saveField` call, no checkbox, anywhere in the Event Detail page. If a contract is signed after the event record is created (the common case — the record often exists before a signed contract comes back), Readiness Score will show "Contract signed" as permanently missing with no way to correct it, unless there's an undiscovered path I didn't find in this audit.
2. **`bar_tab_limit` has no post-creation edit path.** **CONFIRMED**: same pattern — set once in `NewEventForm.tsx`, read in `BEOClient.tsx` and `today/page.tsx`, no edit control found in `EventDetailClient.tsx`.
3. **`date_flexible` has no post-creation edit *or view* path.** **CONFIRMED**: captured at intake only; not read anywhere in `EventDetailClient.tsx` at all. Once the event exists, this fact is invisible.
4. **No canonical "total guest count across all packages" field or function exists.** For an event with more than one catering package, the "real" guest count is the sum of `event_packages.guest_count` across all packages — but no single column or shared helper function represents that sum. Every consumer either computes it ad hoc (correctly, in one place — see Section C) or falls back to the stale single-package legacy field (in most places).

---

## C. Duplicate or Conflicting Data

### The central finding: `guest_count` / `package_id` / `buffer_pct` exist in two places and actively drift

**CONFIRMED, in the codebase's own words** — `db.ts:538-543`:
> "Primary (first-added) catering package per event — `event_packages` is the source of truth for catering... The COALESCE against ed/p falls back to that legacy field only for the rare historical event that predates the `event_packages` migration."

That comment describes the *intended* state. **What's actually confirmed in the running code is broader than that comment implies:**

- **Every new event still writes to both places at creation.** `api/events/route.ts:58-79`: `upsertEventDetails()` writes `guest_count`/`package_id`/`buffer_pct` to `event_details`, then `addEventPackage()` writes the same three values to a new `event_packages` row. Both start in sync.
- **They immediately stop being kept in sync.** `EventDetailClient.tsx:513`: the Overview tab's "Guests" field is an `EditableRow` that calls `saveField('details', 'guest_count', ...)` — this PATCHes `event_details` only. It does **not** touch `event_packages`. Separately, the Catering tab edits `event_packages.guest_count` per package via `updateEventPackage()` — which does **not** touch `event_details`. The two fields have no code path connecting them after creation.
- **The two "guest count" values are read by different consumers, inconsistently:**
  - **Correctly derived from `event_packages`** (the intended, current pattern): `getEvents()`/`getKanbanEvents()`/`getArchivedEvents()` via `PRIMARY_PACKAGE_FIELDS`'s `COALESCE(prime.guest_count, ed.guest_count)` (`db.ts:559`) — list views. Also `generateRunOfShow()` (`noteGenerators.ts:322`): sums `p.guest_count` across resolved packages, falling back to `ev.guest_count` only if the sum is zero.
  - **Reads the legacy `event_details.guest_count` directly, with no package-sum fallback** (confirmed, file:line):
    - Readiness Score input — `EventDetailClient.tsx:76`
    - Bar Impact input (client-side) — `EventDetailClient.tsx:105`
    - Bar Impact input (server-side, Operational Dashboard) — `db.ts:1661`
    - Floor Plan recommendation, both call sites — `EventDetailClient.tsx:988` and `:1051`
    - Task Complexity scoring context — `noteGenerators.ts:205` and `:657`
    - Risk Scanner's `RiskScanInput` assembly — `db.ts` (Operational Dashboard / Risk Assessment queries at `:902`, `:1093`, `:1215` all select `ed.guest_count` directly, no `event_packages` join)
    - Dashboard's "Upcoming Events" widget — `db.ts:815`
    - Alert engine's active-events query — `db.ts:1808`
    - **Kitchen Sheet** — `noteGenerators.ts:416`, `Guest Count: ${ev.guest_count || '—'}`
    - **FOH Notes** — `noteGenerators.ts:458`
    - **Bar Notes** — `noteGenerators.ts:520`
    - **Pre-Shift Brief** — `noteGenerators.ts:674`

**This means:** for any event with more than one catering package, or any event where a coordinator has edited guest count via the Catering tab since creation, the Readiness Score, Bar Impact rating, Floor Plan recommendation, Risk Scanner's Guest Count Risk, Task Complexity score, and four of the Prep Docs (Kitchen Sheet, FOH Notes, Bar Notes, Pre-Shift Brief) can all disagree with what the Catering Builder and Run of Show actually show for the same event, at the same moment. This is a live, present-tense inconsistency, not a historical-data-only concern — it recurs on every multi-package event and every post-creation guest-count edit.

### Secondary finding: Toast Status physically lives inside the same table as everything else

Not a conflict in the "two values disagree" sense, but a structural note: the five `toast_*_date` columns are the Toast Status Tracker's entire data model, but they live as ordinary columns on `event_details` alongside catering/staffing/bar data. This is addressed directly in Section E — it's intentional and not a problem, but worth naming explicitly since it means "Event Details" as a table is not the same thing as "Event Details" as a single coherent concern.

---

## D. Unused or Obsolete Fields

1. **`events.external_order_number`** — **CONFIRMED zero consumers.** Grep across `src/` (excluding `db.ts`'s own schema/interface) returns no matches at all — no UI field to set it, no read anywhere, no API route touches it. Fully dead.
2. **`event_details.final_menu_locked`** — **CONFIRMED editable, but its value is never consumed downstream.** It's a real checkbox (`EventDetailClient.tsx:539-540`), flows into `EventForNotes` (`prepOutputsData.ts:73`) and is declared on the interface (`noteGenerators.ts:65`), but no `generate*()` function body in `noteGenerators.ts` reads `ev.final_menu_locked` to change any output text. Its only observable effect today is the checkbox's own visual state on the Overview tab. Not fully dead (it does persist and display a fact), but it has no operational consumer beyond that.
3. **`event_details.date_flexible`** — captured but never read back (see Section B, item 3). Functionally write-only today.

---

## E. Ownership Exceptions

1. **Toast Status Tracker fields (`toast_proposal_sent_date`, `toast_confirmed_date`, `toast_invoice_sent_date`, `toast_deposit_received_date`, `toast_final_payment_date`)** — these are correctly treated as their own module conceptually (per `toastStatus.ts`'s own header comment and `V1_FEATURE_LOCK.md` §4), even though they're physically columns on the `event_details` table. **This is intentional and already correctly scoped** — Toast remains system of record for what these dates *mean*; POURMP just mirrors completion status. No change needed here; noted for completeness since the audit is about the table, not just the concept.
2. **`contract_signed` is a plausible candidate for the same treatment.** **RECOMMENDATION** (not confirmed as a problem, just worth naming): "is the contract signed" is arguably the same fact as "has Toast marked this Confirmed" (`toast_confirmed_date`). Right now they're two independent, manually-set flags that could disagree, and — per Section B — `contract_signed` can't even be corrected after creation. Worth a deliberate decision: either give `contract_signed` a real post-creation edit path as its own fact, or retire it in favor of reading `toast_confirmed_date` for the same Readiness Score input.

---

## F. Recommended Changes

*Everything in this section is a recommendation, not a finding — presented for your review, not yet implemented.*

**Add**
- A single canonical helper — e.g. `getTotalGuestCount(packages: EventPackageWithItems[])` in `calculations.ts` — that sums `guest_count` across all of an event's `event_packages` rows. This already exists in one place in spirit (`generateRunOfShow`'s `totalGuests` at `noteGenerators.ts:322`) but isn't shared.
- A real post-creation edit control for `contract_signed` and `bar_tab_limit` on the Event Detail page (Overview tab), if they're kept as independent facts rather than consolidated per Section E.

**Remove**
- `events.external_order_number` — zero confirmed consumers.

**Rename**
- No renames are strictly required. If the legacy `event_details.guest_count`/`package_id`/`buffer_pct` trio is kept around during a migration period (see Section G), consider prefixing them (e.g. `legacy_guest_count`) so the "don't read this" intent is visible in the schema itself, not just in a code comment three call sites away.

**Consolidate**
- `event_details.guest_count`, `package_id`, `buffer_pct` → these three fields are the single biggest architectural risk this audit found. They should be consolidated into "read from `event_packages`, always" with no independent legacy copy once every consumer listed in Section C is migrated.

**Values that should be derived instead of stored**
- Total guest count across packages (see "Add," above) — should always be computed from `event_packages`, never stored as a separate number.
- `final_menu_locked`, if kept, arguably belongs as a derived fact ("all packages have a confirmed menu") rather than a single manually-set checkbox disconnected from the packages it's supposedly describing — worth reconsidering alongside the guest-count consolidation, since it has the same "one flag standing in for potentially-multiple-packages" shape.

**Modules that should reference canonical data instead of maintaining duplicate copies**
- `EventDetailClient.tsx`: Readiness Score input, Bar Impact input, both Floor Plan call sites.
- `db.ts`: Operational Dashboard's `RiskScanInput`/`OpsEventSummary` assembly, `getDashboardStats()`'s upcoming-events widget, `getActiveEventsForAlerts()`.
- `noteGenerators.ts`: Kitchen Sheet, FOH Notes, Bar Notes, Pre-Shift Brief, and the Task Complexity context builders (two call sites).

All of the above should call the same canonical guest-count source that `generateRunOfShow()` and the list views (`getEvents`/`getKanbanEvents`/`getArchivedEvents`) already use.

---

## G. Safe Implementation Order

*A commit-by-commit sequence designed so nothing breaks mid-migration — expand first, migrate consumers one at a time, contract last. No step here has been implemented; this is the proposed order for a future, separately-approved implementation pass.*

1. **Add the canonical helper.** A pure function in `calculations.ts` that sums guest count across `event_packages`, with a documented fallback for the zero-package edge case. No consumers changed yet — this commit only adds a new, unused function. Zero risk.
2. **Migrate server-side `db.ts` consumers, one function at a time**, each its own commit: `getOperationalDashboard()`, `getEventRiskAssessment()`/`getEventRiskSummary()`, `getDashboardStats()`'s upcoming-events query, `getActiveEventsForAlerts()`. Each commit is independently verifiable (re-run the affected page, confirm the number shown matches the Catering tab).
3. **Migrate `noteGenerators.ts`'s four non-conforming generators** (Kitchen Sheet, FOH Notes, Bar Notes, Pre-Shift Brief) to the same pattern `generateRunOfShow` already uses — one generator per commit, verified by generating that specific Prep Doc for a real multi-package event before/after.
4. **Migrate `EventDetailClient.tsx`'s three client-side calculations** (Readiness, Bar Impact, Floor Plan) to the canonical source — one commit, verified live in the browser against a multi-package event.
5. **Resolve the `contract_signed` question from Section E** as its own decision point — either wire up a real edit control, or replace it with `toast_confirmed_date` as the Readiness Score input. This is a UI change and should get its own review cycle, not be bundled into the data-consolidation work above.
6. **Only after every consumer in step 2-4 is confirmed migrated (re-grep to verify zero remaining reads of the legacy fields outside the fallback path)** — consider whether to actually drop `event_details.guest_count`/`package_id`/`buffer_pct`, following the same backup-then-`DROP COLUMN` pattern already established this project (`data/backups/` snapshot first). This step is explicitly last and separate from the rest — it's the only step that touches the schema, and only makes sense once nothing depends on the columns anymore.

---

## Executive Summary

**Is Event Details capable of serving as POURMP's canonical operational data model?**
Not fully, as currently structured. Most of the table — bar/catering configuration, staff notes, dietary flags, the Toast Status Tracker — is genuinely canonical and single-sourced. But the `guest_count`/`package_id`/`buffer_pct` trio is stale legacy data that a majority of the app's operational calculations (Readiness, Bar Impact, Floor Plan, Risk Scanner, Task Complexity, and four of eleven Prep Docs) still read directly, while the Catering Builder and two other consumers correctly read the real, current source of truth (`event_packages`). That split is confirmed, active, and will recur on every multi-package event.

**If not, what are the minimum required changes before Version 1.0 document generation begins?**
At minimum: adopt one canonical guest-count-resolution function and migrate the specific consumers listed in Section F/G before any new document-generation feature is built on top of the current state. Secondarily, decide what to do about `contract_signed` and `bar_tab_limit` having no post-creation edit path if either fact is meant to appear in generated documents — right now, once set wrong (or left unset) at creation, they can't be corrected through the Event Detail page.

**Are there any architectural risks that should be addressed before building the Toast Notes Builder?**
Yes, one concrete risk: a Toast Notes Builder built on the current data model would inherit the guest-count inconsistency directly. It's entirely possible to generate a Toast Note showing one guest count while the Catering Builder and Run of Show — visible in the same event, at the same time — show a different, correct one. Since Toast Notes text is meant to be copied into Toast itself, this isn't just an internal display inconsistency; it would put a wrong number in front of the system of record. This should be resolved before that feature is built, not discovered after.

---

**Recommendation: Additional Architecture Changes Required**
