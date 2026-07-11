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

## Future Enhancements
*Features planned after Version 1.0 — see [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §7 for the full ordered list*

- **Per-role permissions.** Once basic accounts exist (Version 1.0), layer in *who can do what* — e.g. Kitchen role editing prep quantities vs. Lead role editing tasks and readiness.
- **Full package/menu-item editor in Settings.** Packages can be activated/deactivated from Settings today, but menu items and their calculation rules (`calc_method`, `qty_per_guest`, `yield_per_unit`) are still seed-data only — changing a recipe or yield requires a code change.
- **Bundle all Prep Docs into one print job.** Each document (Kitchen Sheet, BEO, FOH Notes, Bar Notes, Setup Checklist...) is printed one at a time from `/prep-docs` today; a single combined PDF per event would save a step during pre-shift prep.
- **Analytics export.** The rebuilt operational Analytics page (see Version 1.0 Goals above) should support CSV/PDF export for outside reporting.
- **A single, explicit read-only "Toast total" field** — only if leadership determines a dollar figure is genuinely needed at a glance after the removals above. Entered once per event as a plain number, never a recomputed invoice. Not assumed; see [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §7.5.

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
