# POURMP — Roadmap

Related: [README.md](README.md) · [VERSION_HISTORY.md](VERSION_HISTORY.md) · [CHANGELOG.md](CHANGELOG.md) · [VERSIONING.md](VERSIONING.md) · [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md)

> **[V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) is the authoritative definition of Version 1.0 scope.** This roadmap is the tactical, living checklist of work items toward that scope — where the two ever disagree, the Feature Lock governs and this document should be corrected to match (this revision does exactly that: it removes the "apply `tax_pct`" goal below, which the Feature Lock supersedes with a decision to remove the field instead — see [V1_REALIGNMENT_REVIEW.md](V1_REALIGNMENT_REVIEW.md) §3 and §7 for why).

This roadmap is grounded in gaps actually found in the current codebase (checked 2026-07-10), not speculative wishlist items. It's organized into what's required before POURMP can be officially rolled out internally as **Version 1.0**, what comes right after, and what's worth considering much further out.

---

## Version 1.0 Goals
*Everything required before official internal rollout — see [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §5 and §8 for the full scope and success criteria this list is drawn from*

**Toast/POURMP boundary work** *(added by the Version 1.0 realignment — see [V1_REALIGNMENT_REVIEW.md](V1_REALIGNMENT_REVIEW.md))*
- **Remove the `payments` table and its Charges Summary / Payment Records UI** (`PaymentPanel.tsx`). Dollar-amount and invoice tracking duplicates Toast; the Toast Status Tracker is the sole financial-status representation going forward.
- **Remove the numeric `event_details` financial fields** (`total_event_value`, `deposit_due`, `deposit_received`, `final_amount_due`, `final_amount_received`) and their columns in the Events table and Event Overview tab.
- **Remove `tax_pct`, `gratuity_pct`, and `service_fee`.** These fields exist only to feed the Charges Summary math being removed above. *(This replaces the previous "apply tax_pct to financial totals" goal — the totals themselves are out of scope now, not just the tax line.)*
- **Remove orphaned proposal/policy Settings text** (`general_info`, `cancellation_policy`, `MPBC_CONTACT`) — left over from the customer-facing Proposal PDF removed in `0.7`.
- **Simplify client records** to a minimal event-scoped contact card (name, day-of phone/email, and company/group affiliation). Drop `referral_source` and the freeform client `notes` field. (`company` is kept — see the correction note in [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §5.2; it's the operational fallback identity for company/group-booked events, not CRM data.)
- **Collapse the Leads pipeline** from a multi-status record (New/Contacted/Converted/Dismissed) to a one-shot inquiry queue: a public submission is triaged once into an Event or dismissed, not tracked through its own lifecycle.
- **Build the Communication Timeline.** A chronological internal record of client-facing touchpoints per event — genuinely new, not duplicated from Toast or from the existing internal `event_notes` log. See [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §4 and §5.3.
- **Rebuild Analytics around operational metrics** (event volume, guest-count trends, package popularity, booking lead time) instead of revenue, since revenue data no longer lives in POURMP once the `payments` table is removed.
- **Export/back up existing payments and financial-field data before removing it.** These rows represent real staff work — removal should follow the project's non-destructive-migration convention (`DEVELOPMENT_GUIDE.md`), not a silent drop.

**Carried forward, unaffected by the boundary work above**
- **Authentication & access control.** No route — page or API — currently checks who's making the request. That's fine for a single trusted machine at the venue; it's not fine for an official rollout where multiple staff members and devices will use the system.
- **Basic multi-user accounts.** Ties directly to authentication above: staff need distinct logins before this can be handed to the team as "the system," rather than one shared unauthenticated instance.
- **Automated test coverage.** There are zero test files in the project. The catering math, chafing-dish/equipment counts, task-complexity scoring, and risk-scanner logic have no regression safety net — every change is currently verified by hand.
- **Real SMS/Email delivery.** `notifyDelivery.ts` explicitly stubs both channels ("replace with a real Twilio client," "replace with a real email provider"). Toggling them on in Settings currently only logs what would have been sent.
- **Production-durable database.** SQLite lives at `data/mpbc.db` on local disk. It works for the current "runs on a Mac at the venue" model but won't survive most serverless or ephemeral-filesystem deploys — needs either a persistent volume or a migration to something like Turso/Postgres before it can run anywhere else.
- **Automated database backups.** `data/backups/` exists and is git-ignored (it holds live customer PII), but nothing currently writes to it automatically — it's a convention without automation behind it, and this is real customer data.
- **Default buffer % setting.** Buffer % is entered per event/package every time; there's no org-wide default to start from, which is a small but real point of friction for the primary user (the Event Coordinator) on every single event. (This is about catering-quantity math, not financial tracking, so it's unaffected by the removals above.)
- **Ship the pending catering-consistency fix as `0.7.1`.** See Unreleased in [CHANGELOG.md](CHANGELOG.md) — this should land before rollout, not after.

---

## V1 Architecture Refactor (Event Workspace)
*Introduced by [EVENT_WORKSPACE_DESIGN_PROPOSAL.md](EVENT_WORKSPACE_DESIGN_PROPOSAL.md), grounded in [EVENT_DETAILS_DATA_AUDIT.md](EVENT_DETAILS_DATA_AUDIT.md)'s data-layer findings. A systematic pass to organize POURMP around a canonical data model and an Event Workspace navigation model, applying the two principles in [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §3.7–3.8. Executed one phase at a time, each with its own review gate before the next begins — do not batch phases.*

1. ~~Fix the Overview "Guests" field regression~~ — **shipped.** The Overview tab's "Guests" field had become a silent no-op after the guest-count consumer migration; replaced with a read-only display of the canonical total.
2. **Unify the two setup checklists.** `event_setup_checklist` (8 items, standalone `/prep/checklist`) and `event_tasks`' Setup category (15 tasks, authoritative for Operations/Risk Scanner) track substantively the same physical facts with zero code connecting them. Retire `event_setup_checklist` in favor of `event_tasks`, migrate `/prep/checklist` to read from it. **Next phase, not yet started.**
3. **Reconcile the Communication Timeline, Toast Status Tracker, and `contract_signed`.** Three overlapping representations of Toast-owned milestones currently coexist with no code connecting them (see [EVENT_WORKSPACE_DESIGN_PROPOSAL.md](EVENT_WORKSPACE_DESIGN_PROPOSAL.md) §2):
   - Communication Timeline entries (`'Deposit Received'`, `'Proposal Sent'`, `'Final Confirmation Sent'`, etc.) are purely historical log entries with no connection to the Toast Status Tracker fields that actually drive Deposit Risk, the Operations "Awaiting Deposit" bucket, and alerts.
   - **`event_details.contract_signed` is a confirmed Toast/POURMP boundary violation, not just a UX inconsistency.** It's an independent manual checkbox with no connection to `toast_confirmed_date`. The Toast proposal confirmation is the authoritative event — `toast_confirmed_date` is POURMP's manually-maintained proxy that the confirmation occurred in Toast, until a live Toast integration exists. `contract_signed` should ultimately be **deprecated**, not maintained as a second representation of the same Toast-owned fact.
   - Resolution direction: connect Timeline logging to the Toast Status Tracker where they describe the same milestone (or make the two visually/linguistically impossible to conflate), and retire `contract_signed` in favor of reading `toast_confirmed_date` directly wherever it's currently consumed (Readiness Score, etc.).
   - **Any future UI language here must make clear POURMP is recording or manually synchronizing a Toast milestone — never that POURMP itself creates or confirms the contract.**
   - Design direction only — not yet implemented.
4. **Reconcile the "assemble the whole event" functions.** `getOperationalDashboard()` and `getEventRiskAssessment()`/`getEventRisks()` each independently re-implement a narrower join than `getEventFull()`/`getPrepOutputsData()`, and disagree on task auto-generation side effects — a reproducible case where two views of the same event's task completion can show different numbers depending on which page was opened first. Extract one shared assembly helper.
5. **Resolve planned-vs-actual drink tickets and the `final_menu_locked` tri-representation.** `event_details.drink_tickets` (planned) and `drink_ticket_log.tickets_issued` (actual) seed once then drift independently; `final_menu_locked` is edited but never consumed downstream.
6. **Decompose `EventDetailClient.tsx`** (1,569 lines, monolithic) into per-tab components, mirroring the existing `TasksTab.tsx` extraction. Pure structural prep, no behavior change.
7. **Build the Event Workspace navigation.** Staged per [EVENT_WORKSPACE_DESIGN_PROPOSAL.md](EVENT_WORKSPACE_DESIGN_PROPOSAL.md) §7 (Stages A–D): add a Prep Docs tab to the Workspace, extract a shared layout shell, consolidate BEO/Kitchen Sheet/Checklist (sequenced after phase 2), then remove the now-redundant global "Prep Docs" sidebar link.
8. **Address the four-parallel-state-signals finding.** `events.status`, `calcReadiness()`'s score, the Toast Status Tracker, and task-completion-derived `operationallyReady` can all legitimately disagree for the same event at the same time, with nothing flagging the contradiction. Not a merge — make the relationships explicit and visually unambiguous once phases 2–5 land.

**Toast Boundary Cleanup Items** *(surfaced by the ownership matrix, [EVENT_WORKSPACE_DESIGN_PROPOSAL.md](EVENT_WORKSPACE_DESIGN_PROPOSAL.md) §2 — separate scoped cleanup, not part of the numbered phase sequence above)*

- **Deprecate `packages.price_per_guest` as a user-facing field.** Pricing is Toast-owned. This field should ultimately be removed from package-selection dropdowns and the Settings package editor, and must not drive financial totals, invoicing, or operational decisions in POURMP (Sprint Zero already removed it from every event-facing dollar total — this closes the remaining display/editor surfaces). Approach once scheduled:
  1. Identify every remaining consumer (a fresh, grep-based audit — same rigor as the guest-count consolidation).
  2. Mark the field deprecated in code/comments.
  3. Remove it from package dropdowns and the Settings editor.
  4. Preserve the underlying schema field only temporarily, only if legacy records or existing migrations require it.
  5. Remove the schema field only after usage reaches zero — no earlier.
  - Design direction only — not yet implemented.

---

## Future Enhancements
*Features planned after Version 1.0 — see [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §7 for the full ordered list*

- **Per-role permissions.** Once basic accounts exist (Version 1.0), layer in *who can do what* — e.g. Kitchen role editing prep quantities vs. Lead role editing tasks and readiness.
- **Full package/menu-item editor in Settings.** Packages can be activated/deactivated from Settings today, but menu items and their calculation rules (`calc_method`, `qty_per_guest`, `yield_per_unit`) are still seed-data only — changing a recipe or yield requires a code change.
- **Bundle all Prep Docs into one print job.** Each document (Kitchen Sheet, BEO, FOH Notes, Bar Notes, Setup Checklist...) is printed one at a time from `/prep-docs` today; a single combined PDF per event would save a step during pre-shift prep.
- **Analytics export.** The rebuilt operational Analytics page (see Version 1.0 Goals above) should support CSV/PDF export for outside reporting.
- **A single, explicit read-only "Toast total" field** — only if leadership determines a dollar figure is genuinely needed at a glance after the removals above. Entered once per event as a plain number, never a recomputed invoice. Not assumed; see [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §7.5.
- **Timeline UI Polish.** The Communication Timeline (Sprint One) is functionally complete and approved, but the tab's visual design is a first pass, not a finished one. Revisit:
  - Reduce visual clutter in the quick-action button row (14 buttons is a lot of surface area at once).
  - Group common activity types into logical categories rather than one flat row.
  - Improve spacing and visual hierarchy of individual timeline entries.
  - Use a consistent icon family throughout — the emoji-per-type approach was a fast first pass, not necessarily the final answer alongside the rest of the app's existing emoji (see `BRAND_GUIDE.md`).
  - Consider moving "Log for a different date/time" out of the main flow and into an advanced or custom-entry workflow, rather than a control sitting above the button row by default.
  - Evaluate whether "Communication Timeline" should eventually be renamed "Event Timeline" — as more activity types get added, the name may start to undersell what it covers.

---

## Long-Term Vision
*Ideas that may eventually become part of the platform*

- **Calendar sync** (Google Calendar / iCal export) for confirmed events.
- **Deeper analytics.** Package popularity trends, guest-count forecasting, seasonal demand.
- **Two-way SMS guest communication** (e.g. reservation confirmations/reminders), once real delivery lands.
- **Ingredient-level prep planning.** Current calculations stop at the serving-vessel level (chafers, bowls, platters); the existing `purchase_unit` field on menu items is a natural hook toward true ingredient/purchasing quantities.
- **Customer-facing self-service portal.** Today the only customer-facing surface is the `/book` inquiry form — no way for a booked client to check status, sign documents, or make a payment themselves. Toast would remain system of record for the payment itself.
- **Multi-location support.** Several assumptions are currently hardcoded to one venue — the 11-table taproom layout, the 75-guest capacity ceiling, the 6-rectangular/4-high-top floor plan math. See [ARCHITECTURE.md](ARCHITECTURE.md) for where these live.
- **Offline-capable mobile view (PWA)** for kitchen/FOH staff to check Prep Docs during an event without a reliable connection.
