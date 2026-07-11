# POURMP — Version 1.0 Feature Lock

*The blueprint for Version 1.0. Built on [V1_REALIGNMENT_REVIEW.md](V1_REALIGNMENT_REVIEW.md) — that document is the audit and reasoning; this document is the resulting decision. Where the two ever disagree, this document governs, since it reflects the agreed-upon outcome of that review.*

Related: [VISION.md](VISION.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [ROADMAP.md](ROADMAP.md) · [V1_REALIGNMENT_REVIEW.md](V1_REALIGNMENT_REVIEW.md)

This is a documentation and planning artifact only. No application code changes are authorized by this document — it defines scope for work that has not started yet.

---

## 1. Purpose

This document exists to end feature creep before Version 1.0 ships. Every module, page, and field currently in POURMP — and every one proposed for it going forward — is measured against a single boundary:

> **Toast is the System of Record. POURMP is the System of Execution.**
> **Toast records the event. POURMP prepares the team.**

If a proposed feature's job is to record what happened commercially with a client — a lead, a customer profile, a proposal, an invoice, a payment, a signed contract — it belongs in Toast, not POURMP, no matter how convenient it would be to have it in one place. If its job is to help the team plan, prepare, communicate internally, or execute the event itself, it belongs in POURMP.

This document is the tiebreaker for that question going forward. When someone asks "should POURMP do X," the answer is found here before it's found in a feature request.

---

## 2. Core Mission

POURMP exists to make event execution at Manhattan Project Beer Company consistent, organized, and repeatable — so that every event is prepared for exceptional hospitality, not accidental hospitality.

POURMP does not sell events, invoice clients, collect payments, or manage customer relationships. Toast Catering & Events already does that job well. POURMP's job starts where Toast's ends: once an event is real, POURMP is what turns it into a plan the team can execute flawlessly.

Concretely, per client-facing fact:

| Fact | System of Record |
|---|---|
| Who the lead/customer is | Toast |
| Whether they've signed / paid | Toast |
| What they were quoted / invoiced | Toast |
| What the event needs from the team to run well | **POURMP** |
| What the team has done to prepare, and what's left | **POURMP** |
| What was communicated internally about this event | **POURMP** |

---

## 3. Guiding Principles

1. **One source of truth per fact.** If a fact already lives in Toast, POURMP does not maintain its own competing copy of it. If a fact is operational and unique to execution, POURMP is the only place it lives. (This is the rule the Version 1.0 realignment review found violated for financial tracking — see [V1_REALIGNMENT_REVIEW.md](V1_REALIGNMENT_REVIEW.md) §3 — and the rule this feature lock exists to enforce going forward.)
2. **Enter information once.** Where POURMP must hold a fact that also exists in Toast (an event date, a guest count, a client's day-of phone number), it exists because execution genuinely requires it locally — not because it was convenient to duplicate.
3. **Status, not dollars.** Where POURMP needs visibility into Toast's commercial process (has the deposit been received, has the invoice gone out), it tracks *completion status only* — never a recomputed dollar figure, ledger, or invoice.
4. **Every feature answers the execution question.** Before anything is added: *"Does this make planning easier, execution smoother, communication clearer, operational visibility stronger, or the guest experience better?"* (`VISION.md`). If the true answer is "no, but it would be convenient to not open Toast," that is not sufficient justification.
5. **No feature ships half-finished.** A stub page or a field nobody reads is worse than no feature at all — it's the exact shape of drift this review process exists to catch.
6. **Additive, non-destructive change.** Consistent with existing practice (`DEVELOPMENT_GUIDE.md`), schema and feature changes moving toward this lock should preserve historical data (export/backup before removal) rather than silently drop it.

---

## 4. Core Modules

These are POURMP's permanent responsibilities — the System of Execution, module by module. This list is the operational counterpart to the Toast-owned list in §2, and it is what "POURMP" means going forward.

| Module | What it owns |
|---|---|
| **Event Records** | The operational shell of an event — date, time, space, guest count, status lifecycle (Confirmed → Planning → Ready → Active → Closed). The minimum facts execution needs, entered once by staff from what Toast already confirmed. |
| **Toast Status Tracker** | Read-only-in-spirit, status-only mirror of where an event stands in Toast's process (Proposal Sent → Confirmed → Invoice Sent → Deposit Received → Final Payment). No dollar amounts. Exists purely so staff can answer "where are we with Toast" without opening it. |
| **Catering Builder** | Package and menu-item selection, guest-count-driven prep quantities, serving-vessel math. Feeds every prep document. Carries no pricing logic. |
| **Floor Plans** | Guest-count-driven layout recommendations for the venue's physical space. |
| **Task System** | Setup/Breakdown/Dynamic task generation, role assignment (Lead/Kitchen/Bar/FOH), task complexity scoring. |
| **Risk Scanner** | Automated, read-only risk flags across deposit timing, menu deadlines, guest count, shared space, bar load, task completion, floor plan, policy conflicts, dessert logistics, and child supervision. |
| **Main Bar Impact** | Scoring for how a private event strains the main taproom bar. |
| **Event Readiness Score** | Operational-completion scoring, deliberately independent of Toast payment status. |
| **Prep Docs Suite** | The full generated-document set (Toast Notes, Pre-Shift Brief, Run of Show, Kitchen Sheet, FOH/Bar Notes, Setup Checklist, Leads Pack, Handoff Pack, Debrief, Main Bar Impact) — plain-text and printable. |
| **Operational Dashboard** | Triage view across all in-flight events — readiness, task completion, financial-status flags (from the Toast Status Tracker only), risk, bar impact. |
| **Communication Timeline** *(new in V1.0)* | Chronological internal record of client-facing touchpoints (calls, emails, texts, updates sent) for an event, so any staff member can pick up context without needing the person who's been handling it. Records that communication happened — does not send it. |
| **Internal Notes** | Freeform staff-to-staff activity log per event, distinct from the Communication Timeline. |
| **Post-Event Debrief** | What went well, issues, catering/bar-impact accuracy, repeat-client notes. |
| **Reservations** | Small-party table bookings — intentionally separate from private events, sharing only the notification engine. |
| **Operational Analytics** | Event volume, guest-count trends, package popularity, booking lead time — operational metrics Toast cannot produce, not a revenue report. |

---

## 5. Features Included in Version 1.0

### 5.1 Carried forward as-is
Everything in §4 that already exists and already matches this boundary, unchanged in scope:

- Floor Plans, Risk Scanner, Task System, Prep Docs Suite (all documents), Main Bar Impact, Event Readiness Score, Operational Dashboard, Reservations, Post-Event Debrief, Internal Notes, Toast Status Tracker.

### 5.2 Simplified before launch
Per the realignment review's findings:

- **Client records** reduced from a full editable customer profile to a minimal event-scoped contact card (name + day-of phone/email only). `referral_source`, `company`, and the freeform client `notes` field are dropped — they are sales/CRM data with no execution value and belong in Toast.
- **Leads intake** collapsed from a multi-status pipeline (New/Contacted/Converted/Dismissed) to a one-shot inquiry queue: a public submission is triaged once and either promoted directly into an Event or dismissed. POURMP does not maintain a parallel lead-nurturing pipeline alongside Toast's.
- **Catering package selection stays; pricing does not.** The Catering Builder keeps package/guest-count/buffer selection (required for prep math) but drops `price_per_guest`-driven totals from event-facing views.
- **Analytics rebuilt** around operational metrics (event volume, guest-count trends, package popularity, lead time) instead of revenue, since revenue no longer lives in POURMP once the payments table is removed (§6).

### 5.3 New in Version 1.0
- **Communication Timeline** — see §4. The one genuinely new module this lock authorizes; everything else in this section is carried-forward or simplified, not new.

### 5.4 Required launch-readiness work
Carried over from `ROADMAP.md`'s existing Version 1.0 Goals, still required and unaffected by the Toast/POURMP realignment:

- Authentication & access control on every route (page and API).
- Basic multi-user accounts.
- Automated test coverage for the calculation layer (catering math, task complexity, risk scanner) — there is currently none.
- Production-durable database (persistent volume or migration off local SQLite file).
- Automated database backups — `data/backups/` exists as a convention today but nothing writes to it automatically, and this is real customer PII.
- Real SMS/Email delivery (`notifyDelivery.ts` is currently stubbed) — or, if not ready for V1.0, notifications should be clearly labeled as in-app-only until it lands.
- Default buffer % setting (still relevant — this is about catering quantity math, not financial tracking, and is unaffected by the removals in §6).
- Ship the pending `0.7.1` catering-consistency fix.

---

## 6. Features Explicitly Excluded from Version 1.0

### 6.1 Removed — duplicated Toast functionality
These exist in the codebase today and are explicitly out of scope for V1.0 — they duplicate what Toast already records:

- The `payments` table and its Charges Summary / Deposit / Payment Records UI (`PaymentPanel.tsx`) — dollar-amount tracking is Toast's job.
- The five numeric financial fields on `event_details` (`total_event_value`, `deposit_due`, `deposit_received`, `final_amount_due`, `final_amount_received`) and their surfacing in the Events table and Event Overview tab.
- `tax_pct`, `gratuity_pct`, and `service_fee` fields — these exist only to feed the Charges Summary math being removed; **this supersedes the `ROADMAP.md` item that proposed "wiring tax_pct into totals,"** since the totals themselves are out of scope.
- Orphaned proposal/policy Settings text (`general_info`, `cancellation_policy`, `MPBC_CONTACT`) — leftover from the customer-facing Proposal PDF removed in v0.7; not reintroduced.
- Full client CRM fields (`referral_source`, `company`, freeform client `notes`) — see §5.2.
- The Leads status pipeline as a maintained, multi-stage record — see §5.2.

### 6.2 Deferred — not duplication, just not required for V1.0
These are legitimate future ideas already captured in `ROADMAP.md`, explicitly not part of the V1.0 boundary:

- Customer-facing self-service portal (status checking, e-signing, self-serve payment) — Toast remains system of record for the payment itself even if this is ever built.
- Calendar sync (Google Calendar / iCal export).
- Two-way SMS guest communication.
- Full in-app package/menu-item editor (menu items remain seed-data/code-level for V1.0).
- Per-role permissions (depends on V1.0 authentication landing first).
- Analytics export (CSV/PDF).
- Bundled single-PDF export of all Prep Docs.
- Ingredient-level prep planning (below the current serving-vessel level).
- Multi-location support.
- Offline-capable mobile/PWA view.

---

## 7. Future Roadmap (Version 1.1+)

Ordered roughly by how directly each follows from V1.0 landing:

1. **Per-role permissions**, once V1.0 authentication and multi-user accounts exist.
2. **Full package/menu-item editor** in Settings, so recipe/yield changes don't require a code change.
3. **Bundled Prep Docs export** — one combined print job instead of one document at a time.
4. **Analytics export** (CSV/PDF) for outside reporting.
5. **A single, explicit read-only "Toast total" field**, if leadership determines a dollar figure is genuinely needed at a glance — entered once per event as a plain number, never a recomputed invoice. Only if requested; not assumed.
6. **Calendar sync** for confirmed events.
7. **Deeper operational analytics** — seasonal demand, guest-count forecasting.
8. **Two-way SMS guest communication**, once real delivery (a V1.0 item) is live.
9. **Ingredient-level prep planning**, extending the existing `purchase_unit` hook on menu items.
10. **Customer-facing self-service portal** — status visibility only; Toast remains system of record for payment.
11. **Multi-location support** — the taproom layout, capacity ceiling, and floor plan math are currently hardcoded to one venue.
12. **Offline-capable mobile/PWA view** for kitchen/FOH staff during service.

---

## 8. Success Criteria

Version 1.0 is complete when all of the following are true:

**Boundary correctness**
- No dollar amount, invoice total, or payment ledger exists anywhere in POURMP outside of a single, explicit, optional "Toast total" reference field (if built at all — see §7.5). The Toast Status Tracker is the only financial-status representation in the app.
- No client record in POURMP holds more than the minimum needed for day-of contact — no CRM fields, no sales attribution data.
- No lead in POURMP is tracked through a multi-stage pipeline independent of Toast.

**Completeness**
- Every module listed in §4 is fully built — no stub pages remain (`/prep/kitchen-sheet`, `/prep/beo`, `/settings` were previously flagged as stubs in earlier project history and must be resolved one way or the other, not left half-finished).
- The Communication Timeline exists and is used on at least one real event before launch is called complete.
- Analytics reflects operational metrics only, with no dependency on removed payment data.

**Operational readiness**
- Every route (page and API) requires authentication.
- Automated tests cover the calculation layer (catering math, floor plan, task complexity, risk scanner).
- The database survives a deploy/restart without data loss, and backups run automatically without manual intervention.
- SMS/Email notifications either deliver for real or are clearly labeled in-app-only.

**Organizational clarity**
- A new staff member can be told, in one sentence, which system to use for a given fact — "if it's about money or the customer relationship, it's in Toast; if it's about getting the event ready, it's in POURMP" — and that sentence is true everywhere in the app, with no exceptions they have to memorize.

---

*This document is the scope boundary for Version 1.0. Anything not listed in §5 or §7 is out of scope until explicitly added here through the same review process that produced [V1_REALIGNMENT_REVIEW.md](V1_REALIGNMENT_REVIEW.md) and this document.*
