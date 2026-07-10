# POURMP — Roadmap

Related: [README.md](README.md) · [VERSION_HISTORY.md](VERSION_HISTORY.md) · [CHANGELOG.md](CHANGELOG.md) · [VERSIONING.md](VERSIONING.md)

This roadmap is grounded in gaps actually found in the current codebase (checked 2026-07-10), not speculative wishlist items. It's organized into what's required before POURMP can be officially rolled out internally as **Version 1.0**, what comes right after, and what's worth considering much further out.

---

## Version 1.0 Goals
*Everything required before official internal rollout*

- **Authentication & access control.** No route — page or API — currently checks who's making the request. That's fine for a single trusted machine at the venue; it's not fine for an official rollout where multiple staff members and devices will use the system.
- **Basic multi-user accounts.** Ties directly to authentication above: staff need distinct logins before this can be handed to the team as "the system," rather than one shared unauthenticated instance.
- **Automated test coverage.** There are zero test files in the project. The catering math, chafing-dish/equipment counts, task-complexity scoring, and risk-scanner logic have no regression safety net — every change is currently verified by hand.
- **Apply `tax_pct` to financial totals.** The field is collected per event (`event_details.tax_pct`, default 8.25%) and carried through to Prep Docs data, but it is never multiplied into any subtotal or total anywhere in the app. Either wire it into real totals or remove it from the data model — right now it's silently unused.
- **Real SMS/Email delivery.** `notifyDelivery.ts` explicitly stubs both channels ("replace with a real Twilio client," "replace with a real email provider"). Toggling them on in Settings currently only logs what would have been sent.
- **Production-durable database.** SQLite lives at `data/mpbc.db` on local disk. It works for the current "runs on a Mac at the venue" model but won't survive most serverless or ephemeral-filesystem deploys — needs either a persistent volume or a migration to something like Turso/Postgres before it can run anywhere else.
- **Automated database backups.** `data/backups/` exists and is git-ignored (it holds live customer PII), but nothing currently writes to it automatically — it's a convention without automation behind it, and this is real customer data.
- **Default buffer % setting.** Buffer % is entered per event/package every time; there's no org-wide default to start from, which is a small but real point of friction for the primary user (the Event Coordinator) on every single event.
- **Ship the pending catering-consistency fix as `0.7.1`.** See Unreleased in [CHANGELOG.md](CHANGELOG.md) — this should land before rollout, not after.

---

## Future Enhancements
*Features planned after Version 1.0*

- **Full package/menu-item editor in Settings.** Packages can be activated/deactivated from Settings today, but menu items and their calculation rules (`calc_method`, `qty_per_guest`, `yield_per_unit`) are still seed-data only — changing a recipe or yield requires a code change.
- **Per-role permissions.** Once basic accounts exist (Version 1.0), layer in *who can do what* — e.g. Kitchen role editing prep quantities vs. Lead role editing contracts and financials.
- **Analytics export.** Revenue data can be viewed on the Analytics page but not exported (CSV/PDF) for outside reporting.
- **Bundle all Prep Docs into one print job.** Each document (Kitchen Sheet, BEO, FOH Notes, Bar Notes, Setup Checklist...) is printed one at a time from `/prep-docs` today; a single combined PDF per event would save a step during pre-shift prep.

---

## Long-Term Vision
*Ideas that may eventually become part of the platform*

- **Customer-facing self-service portal.** Today the only customer-facing surface is the `/book` inquiry form — no way for a booked client to check status, sign documents, or make a payment themselves. Toast would remain system of record for the payment itself.
- **Calendar sync** (Google Calendar / iCal export) for confirmed events.
- **Deeper analytics.** Package popularity trends, guest-count forecasting, seasonal demand.
- **Two-way SMS guest communication** (e.g. reservation confirmations/reminders), once real delivery lands.
- **Ingredient-level prep planning.** Current calculations stop at the serving-vessel level (chafers, bowls, platters); the existing `purchase_unit` field on menu items is a natural hook toward true ingredient/purchasing quantities.
- **Multi-location support.** Several assumptions are currently hardcoded to one venue — the 11-table taproom layout, the 75-guest capacity ceiling, the 6-rectangular/4-high-top floor plan math. See [ARCHITECTURE.md](ARCHITECTURE.md) for where these live.
- **Offline-capable mobile view (PWA)** for kitchen/FOH staff to check Prep Docs during an event without a reliable connection.
