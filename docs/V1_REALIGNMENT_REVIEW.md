# POURMP — Version 1.0 Realignment Review

*Architectural review and simplification exercise. Prepared 2026-07-11. No code was changed to produce this document — it is an audit of the codebase as it exists today, cross-referenced against `docs/VISION.md`, `docs/ARCHITECTURE.md`, and the current schema in `src/lib/db.ts`.*

Related: [VISION.md](VISION.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [ROADMAP.md](ROADMAP.md) · [CHANGELOG.md](CHANGELOG.md)

---

## 0. Restated Core Vision

**Toast is the System of Record.** Leads, customer information, proposals, invoices, payments, catering orders, BEOs, event status.

**POURMP is the System of Execution.** Communication timeline, operational readiness, floor plans, risk scanning, prep docs, run of show, internal notes, day-of execution, operational guidance.

The test for every feature: *"What does our team need in order to execute this event exceptionally?"* If the honest answer is "Toast already does that," POURMP should not hold its own copy of it.

This is not a new philosophy for the project — `VISION.md` already states "Toast remains the official system of record for: Leads, Proposals, Invoices, Deposits, Payments, Customer-facing communication," and one migration comment in `db.ts:267-268` already says outright: *"Financial Tracking — manual mirror of what Toast shows... POURMP does not process payments (Toast does)."* What this review found is that the codebase has not fully lived up to that stated intent — in one area (money) it independently reinvented the same idea three separate times without ever consolidating.

---

## 1. Current Architecture Assessment

POURMP is a single Next.js 14 app over one SQLite database (`data/mpbc.db`), no auth, no external API calls of any kind — there is **no live integration with Toast anywhere in the codebase** (confirmed: no Toast-related dependency in `package.json`, no outbound `fetch` to any Toast domain). Every fact that exists in both systems today got there because a staff member typed it into both, independently, at different times. That's the actual starting condition this review has to design around — not a future API sync, a present manual-dual-entry reality.

The good news: most of the codebase already earns its place under the "System of Execution" banner. `ARCHITECTURE.md` §2's core principle — one calculation, many consumers — has been enforced rigorously for catering math, floor plans, bar impact, task complexity, and risk scanning. The `0.7.1` catering-consistency fix in `CHANGELOG.md` is a real example of the team catching and correcting exactly this kind of drift once. **The financial layer is where that discipline slipped**, almost certainly because it grew feature-by-feature (`payments` in v0.1, the Toast Status Tracker in v0.5, the numeric Financial Tracking fields later) without anyone stepping back to ask whether all three were still needed.

---

## 2. Duplication Audit

| # | Area | Current State | Verdict |
|---|---|---|---|
| 1 | **Payment amounts & status** | Three parallel representations — see §3, this is the headline finding | **REMOVE two of three** |
| 2 | **Client / customer records** | Full CRM-style `clients` table (name, email, phone, company, notes, referral_source) with its own create/edit UI | **SIMPLIFY** |
| 3 | **Leads pipeline** | Public `/book` form + `leads` table with its own status pipeline (New → Contacted → Converted → Dismissed) | **SIMPLIFY** |
| 4 | **Catering package selection** | `event_packages` + `packages` + `menu_items` — package/guest-count/buffer selection | **KEEP** (with pricing carved out — see below) |
| 5 | **Catering pricing / Charges Summary** | `price_per_guest`, tax/gratuity/service-fee math, "Grand Total," "Balance Remaining" in `PaymentPanel.tsx` | **REMOVE** |
| 6 | **Proposal / policy text** | `general_info`, `cancellation_policy`, `MPBC_CONTACT` in Settings, orphaned since the customer-facing Proposal PDF was removed in v0.7 | **REMOVE** |
| 7 | **Event core details** (date, time, space, guest count) | `events` / `event_details` scheduling fields | **KEEP** — required input to every operational calculation POURMP runs |
| 8 | **Toast Status Tracker** | 5-stage manual mirror (`toastStatus.ts`) — proposal sent / confirmed / invoice sent / deposit received / final payment | **KEEP** — this is the correct pattern, see §3 |
| 9 | **Internal event notes** | `event_notes` activity log | **KEEP** — internal-only, no Toast equivalent |
| 10 | **Client-facing communication history** | Does not exist yet as a distinct feature | **BUILD** (new — see §6) |
| 11 | **Analytics (revenue)** | `getYearMonthly` / `getYearTotals` read `payments.amount_due` / `amount_paid` | **AT RISK** if #1 is actioned — see §7 |

---

## 3. The Headline Finding: Payment Status Is Tracked Three Different Ways

This is the single clearest violation of the project's own "one source of truth per fact" rule (`DEVELOPMENT_GUIDE.md` §Best Practices #1), and it exists entirely because of Toast/POURMP boundary drift rather than any operational need. Three independent, manually-updated representations of the same underlying fact ("has the deposit been received?") currently coexist:

**A. The `payments` table + `PaymentPanel.tsx`** (v0.1). A real ledger: `payment_type`, `amount_due`, `amount_paid`, `due_date`, `paid_date`, `status`. Auto-generates a 20%/80% deposit+final split on Confirm (`db.ts:718-742`). Drives its own "Charges Summary" with food subtotal, drink tickets, tax, gratuity, service fee, grand total, and balance remaining — a from-scratch re-derivation of what a Toast invoice already shows.

**B. `event_details` numeric Financial Tracking fields** (added later): `total_event_value`, `deposit_due`, `deposit_received`, `final_amount_due`, `final_amount_received`. Edited directly on the Event Overview tab (`EventDetailClient.tsx:428-440`) and surfaced as columns in the Events table (`EventsTable.tsx:175-191`). The migration comment introducing these (`db.ts:267-268`) explicitly calls this *"a manual mirror of what Toast shows... POURMP does not process payments"* — i.e., this was already an attempt at exactly what (A) was supposed to be.

**C. The Toast Status Tracker** (`toastStatus.ts`, v0.5): five simple date fields — `toast_proposal_sent_date`, `toast_confirmed_date`, `toast_invoice_sent_date`, `toast_deposit_received_date`, `toast_final_payment_date`. No dollar amounts, just "has this milestone happened, and when."

**The tell:** the app's own newest and most carefully-built modules have already quietly converged on (C) as the real answer. `riskScanner.ts`'s Deposit Risk rule reads `toast_deposit_received_date`, not the numeric fields or the payments table. `getOperationalDashboard()`'s "Awaiting Deposit" and "Awaiting Invoice" buckets (`db.ts:1085-1086`) do the same. Meanwhile `alerts.ts` and the Events table read from (B), and `PaymentPanel.tsx` reads from (A) — three different tabs of the same app can disagree about "did we get the deposit" and there is no reconciliation between them. This is precisely the anti-pattern the `0.7.1` catering fix corrected for menu quantities, just uncorrected here.

**Recommendation:** Keep (C) — status-only, no dollars, exactly matching "POURMP tracks completion, Toast tracks money." Remove (A) and (B) entirely: the `payments` table, `PaymentPanel.tsx`'s Charges Summary/Deposit/Payment Records UI, and the five numeric `event_details` financial columns. If leadership still wants an at-a-glance dollar figure without opening Toast, that's a legitimate ask — but it should be a single read-only "Toast said $X" field entered once per event, not a recomputed invoice living beside a manually-tracked ledger living beside a status tracker.

---

## 4. Client Records vs. Toast Customer Data

The `clients` table (`first_name`, `last_name`, `email`, `phone`, `company`, `notes`, `referral_source`) is full CRM data — this is squarely what the user's list of Toast responsibilities calls "Customer information." POURMP re-collects it from scratch on every new event (`NewEventForm.tsx`) or via the public `/book` form, independent of whatever Toast already has on file for that client.

That said, POURMP has a real, defensible need for a *minimal* subset: staff on the floor the day of an event need a phone number and a name to reach the client, and the event record needs *something* to identify whose event it is. The problem isn't that contact info exists in POURMP — it's that POURMP maintains it as a full editable customer record (with `notes`, `referral_source`, `company` — fields with zero operational execution value) rather than treating it as a lightweight, event-scoped contact card.

**Recommendation:** Simplify `clients` down to what execution actually needs — name and a day-of phone/email — and drop `referral_source` (sales/marketing attribution data, squarely Toast's job) and the freeform `notes` field (redundant with `event_notes`, which already exists for exactly this purpose).

> **Correction (implementation pass):** this section originally recommended dropping `company` as well. Building the actual cleanup surfaced that `company` is printed on the BEO/Kitchen Sheet/bar-impact "Host" line and is the only identifying field for company/group-booked events with no personal contact name (e.g. "Chili's VIP Dinner," "The Grove") — it has real operational value and was misclassified here as CRM data. [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §5.2 has been corrected; `company` stays as part of the contact card.

---

## 5. Leads Pipeline vs. Toast Lead Intake

The `leads` table and its own status pipeline (New → Contacted → Converted → Dismissed), fed by the public `/book` form, is a parallel CRM lead-tracking system sitting in front of POURMP's actual job (execution). The user's vision statement puts "Leads" explicitly under Toast. Nothing in the codebase suggests POURMP's lead pipeline is more than a convenience intake box — there's no evidence it needs to exist as a tracked, multi-status pipeline rather than a one-shot inquiry-to-event handoff.

**Recommendation:** Simplify. Keep the intake mechanism (a public form is genuinely useful for capturing "someone wants to book something" before it's in Toast at all), but collapse the status pipeline — an inquiry should be something staff triages once and either promotes directly into an Event or dismisses, not a multi-stage record staff maintains in parallel with whatever stage Toast's own CRM has that same lead at.

---

## 6. Communication Timeline — Genuinely Missing

The user's vision lists "Communication Timeline" as a POURMP responsibility. It does not exist today. `event_notes` is an internal activity/notes log (staff-to-staff), not a chronological record of *client-facing* touchpoints (calls, emails, texts, "sent updated headcount to client"). This is real, net-new operational value — the kind of thing that helps a second staff member pick up an event mid-planning without calling the person who's been handling it. It should be built as part of V1, clearly scoped as **internal record-keeping about communication that happened**, not a channel for sending communication (sending stays Toast's job, or a future integration — not this review's concern).

---

## 7. Risks

- **Analytics depends on the data being removed.** `getYearMonthly()` / `getYearTotals()` (`/analytics`) read `payments.amount_due` / `amount_paid`. If the `payments` table is removed per §3, Analytics loses its only data source. This has to be resolved *before* removing the payments table, not after — see proposed architecture in §9 for the recommended replacement (operational metrics instead of revenue).
- **Historical data loss.** Any already-entered rows in `payments` and the numeric `event_details` financial columns represent real staff work. Removing the tables/columns should be preceded by an export/backup (the project already has a `data/backups/` convention — use it), not a silent drop.
- **No automated backups yet** (flagged independently in `ROADMAP.md`) — this schema simplification is a good forcing function to finally automate that, since it's about to become genuinely destructive for the first time.
- **Retraining cost.** Staff currently record deposit/final amounts in the app. Removing that surface means retraining them to treat Toast as the sole place dollar amounts live — a real behavior change, not just a code change.
- **Toast Status Tracker becomes the only financial signal in POURMP.** If it's not kept reliably up to date, `riskScanner.ts`'s Deposit Risk and the Operations "Awaiting Deposit/Invoice" buckets — which already depend on it exclusively — lose their only source of truth. Consolidating onto it raises the bar for keeping it current; that's a training/process point, not a code one.
- **`tax_pct` and friends become fully moot, not just unused.** `ROADMAP.md` currently frames `tax_pct` as "collected but never applied — wire it in or remove it." Once Charges Summary math is removed per §3, the honest answer becomes "remove it," which actually shrinks the V1.0 checklist rather than adding to it.

---

## 8. Opportunities

- **One clear mental model for every staff member:** *Toast has the money and the paperwork. POURMP has the plan and the execution.* Right now that line is blurry in exactly one place (money); fixing it makes the whole app easier to explain in a five-minute training session.
- **Smaller schema surface going into V1.0 auth/multi-user work.** `ROADMAP.md` already lists authentication and per-role permissions as required/near-term work. Fewer financially-sensitive fields (client PII, dollar amounts) means a smaller surface to get access control right on.
- **Two Roadmap items disappear instead of needing work:** `tax_pct` (§7 above) and — arguably — the "default buffer %" friction point becomes lower priority once the Charges Summary that consumes tax/gratuity/service-fee is gone; buffer % still matters for catering *quantities*, but the financial-math complexity around it shrinks.
- **Analytics gets more honest, not less useful.** A revenue chart built from manually-mirrored numbers was always going to lag or drift from Toast's real numbers. An operational-metrics view (event volume, guest-count trends, package popularity, lead time between booking and event) is something Toast fundamentally can't produce, because it doesn't know about POURMP's execution data. That's a stronger, more defensible Analytics page than the one today.
- **The Communication Timeline (§6) is a genuinely new capability**, not a rebuild — it's the clearest example in this review of "this helps our team prepare, communicate, or execute" with no Toast equivalent to duplicate.

---

## 9. Proposed Version 1.0 Architecture

```
                    ┌───────────────────────────┐
                    │   Toast (external, no      │
                    │   integration — manual      │
                    │   staff cross-reference)    │
                    │  Leads · Customers ·         │
                    │  Proposals · Invoices ·      │
                    │  Payments · Catering Orders  │
                    │  · BEOs · Event Status       │
                    └──────────────┬──────────────┘
                                   │  (staff manually opens an event
                                   │   in POURMP once Toast has it)
                                   ▼
                    ┌───────────────────────────┐
                    │  events / event_details     │
                    │  (minimal client contact     │
                    │   card, not a full CRM)      │
                    │  + Toast Status Tracker       │
                    │    (status-only, 5 stages)    │
                    └──────────────┬──────────────┘
                                   │
   ┌──────────────┬────────────────┼───────────────┬────────────────┬─────────────────┐
   │              │                │               │                │                 │
event_packages  event_tasks   Communication    event_notes     event_debriefs    (payments/pricing
(Catering plan, (Tasks)       Timeline (NEW)   (internal ops    (post-event)      REMOVED — see §3)
 not pricing)                                   notes)
   │              │
   ▼              ▼
calcAllItems / calcTaskComplexity
calcMerged-
CateringItems
   │              │
   └───────┬──────┴────────────┬───────────────┬──────────────────┐
           ▼                    ▼               ▼                  ▼
    calcFloorPlan        calcBarImpact    calcReadiness      scanEventRisks
   (Floor Plans)        (Bar Impact)      (Readiness)       (Risk Scanner)
           │                    │               │                  │
           └────────────────────┴───────┬───────┴──────────────────┘
                                         ▼
                          ┌──────────────────────────────┐
                          │  Dashboard · Operations ·      │
                          │  Prep Docs · Today ·           │
                          │  Analytics (operational           │
                          │  metrics, not revenue)          │
                          └──────────────────────────────┘
```

**What changes from today's architecture (`ARCHITECTURE.md`):**

1. **Financial layer collapses to one node**: the Toast Status Tracker, carried on `event_details`, status-only. The `payments` table and the five numeric financial columns are removed.
2. **Client model shrinks** to an event-scoped contact card (name + day-of phone/email), not a standalone editable customer database.
3. **Leads becomes a one-shot intake**, not a parallel status pipeline — the public form still exists, but a submission is triaged once, not tracked through its own lifecycle alongside Toast's.
4. **Communication Timeline is added** as a new sibling to Tasks/Notes/Debriefs, hanging off the same `event_id` everything else does — chronological log of client-facing touchpoints, internal-only.
5. **Analytics is repurposed** around operational metrics (volume, guest-count trends, package popularity, booking lead time) instead of revenue, since revenue data no longer lives in POURMP.
6. **Everything already under "System of Execution"** — Floor Plans, Risk Scanner, Task System, Prep Docs suite, Bar Impact, Operational Dashboard, Readiness Score — is untouched. This review found this half of the app already matches the target vision closely; the drift was isolated to the financial layer and the two CRM-shaped features (Clients, Leads).

---

## 10. Summary Table

| Keep | Simplify | Remove | Build |
|---|---|---|---|
| Floor Plans | Client records → contact card only | `payments` table + Charges Summary UI | Communication Timeline |
| Risk Scanner | Leads → one-shot intake, no pipeline | `event_details` numeric financial fields | |
| Task System | Catering package selection (drop pricing) | Orphaned proposal/policy Settings text | |
| Prep Docs suite (all 11 docs) | Analytics (rebuild around ops metrics, not revenue) | `tax_pct` / gratuity / service-fee fields | |
| Bar Impact scoring | | | |
| Readiness Score | | | |
| Operational Dashboard | | | |
| Toast Status Tracker (already correct) | | | |
| Internal event notes | | | |
| Post-Event Debrief | | | |

---

*This document is a review artifact for discussion, not an implementation plan. Per the request that prompted it, no code has been changed. Next step: review this together and agree on scope before any schema or UI changes begin.*
