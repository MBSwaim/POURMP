# POURMP — Changelog

This is the official running history of POURMP, organized by application version, newest first. See [VERSION_HISTORY.md](VERSION_HISTORY.md) for the narrative version-by-version summary, [ROADMAP.md](ROADMAP.md) for what's planned next, and [VERSIONING.md](VERSIONING.md) for how to add new entries.

Each entry uses these categories (only the ones with content are shown):

- **Features Added** — new features
- **Improvements** — enhancements to existing features
- **Removed** — deprecated or deleted features
- **Bug Fixes** — corrections to existing behavior
- **Architectural Changes** — internal/structural changes (data model, shared code, migrations)

---

## [Unreleased] — Catering Data Consistency

Pending commit. Recommended next version: **0.7.1**.

### Bug Fixes
- Catering Summary — Plain Text could disagree with the Catering Builder on serving vessel (e.g. showing "Large Chafer" for an item the Builder had computed as a `1/2 Chafer`).
- Toast Notes, the text and printable Kitchen Sheet, the printable BEO, and the `/today` dashboard computed catering quantities from the event's legacy top-level guest count instead of each package's own guest count — producing wrong quantities for any event using more than one catering package.
- Print document mastheads and the Task Complexity package count had the same stale-guest-count/stale-package-count problem.

### Architectural Changes
- Added `resolveCateringPackages`, `calcMergedCateringItems`, and `cateringPackageTitle` to `src/lib/calculations.ts` as the single shared resolver for "which packages, at what quantities" — replacing five independent, hand-rolled implementations across the Catering Builder, Kitchen Sheet, BEO, Prep Docs/Toast Notes, and the Today dashboard.
- `vesselLabelFor` now derives its label purely from the already-computed `unit_name` instead of a hardcoded per-item lookup table, so it cannot drift from what the Builder displays.

---

## [0.7] — 2026-07-09 — Dashboard, Search & Navigation

### Features Added
- Global Event Search
- Consolidated Prep Docs picker (`/prep-docs`)
- Dashboard Notification Summary Card

### Improvements
- Sidebar / navigation restructuring
- Dashboard stat cards

### Removed
- Legacy customer-facing Proposal PDF generator (`ProposalPDF.tsx`)

---

## [0.6] — 2026-07-03 → 2026-07-09 — Task System & Risk Scanner

### Features Added
- Setup / Breakdown / Dynamic task checklists, assigned by role (Lead, Kitchen, Bar, FOH)
- Task Complexity scoring
- Event Risk Scanner — 10 automated risk categories (Deposit, Menu Deadline, Guest Count, Shared Space, Main Bar Load, Task Completion, Floor Plan, Policy Conflict, Dessert Logistics, Child Supervision)

---

## [0.5] — 2026-07-03 — Operations Intelligence

### Features Added
- Toast Status Tracker (5-stage completion)
- Event Readiness Score
- Operational Dashboard (`/operations`)
- Leads Pack and full Handoff Pack exports
- Post-Event Debrief with repeat-client history
- Pricing on event add-ons

### Improvements
- Per-item manual piece-count overrides with a half-pan sizing rule

### Bug Fixes
- Catering split logic for arepas, kabobs, and sliders

### Architectural Changes
- `data/backups/` excluded from git (contains live customer PII)

---

## [0.4] — 2026-07-02 — Notifications & Table Management

### Features Added
- In-app notification engine and Notification Center
- Taproom table management (11-table layout, long-table combos, capacity-mismatch warning with a table-picker modal)
- Staff directory
- Automatic phone number formatting across every phone field

---

## [0.3] — 2026-06-20 — Prep Docs Suite & Bar Impact

### Features Added
- Toast Notes, Run of Show, Kitchen Sheet, FOH Notes, Bar Notes, and Setup Checklist generators
- Main Bar Impact scoring
- Drink Ticket Efficiency Tracker
- `purchase_unit` field on menu items

### Improvements
- MP-branded printable documents with print-ready `@page` CSS
- Mobile-responsive Prep Output tabs
- Archive: sortable columns
- Global typography and visual design overhaul

### Bug Fixes
- React falsy-zero (`0`) rendering bugs in Kitchen Sheet and Setup Checklist

---

## [0.2] — 2026-06-19 — Multi-Package Catering

### Features Added
- Multi-package catering per event, each package with its own guest count and buffer %
- Supplies calculator (plates, rolled silverware, sternos, tablecloths, high-top covers)
- Plain-text catering & equipment export
- Setup checklist

### Removed
- Financial/contract fields from the BEO document

### Bug Fixes
- Missing `event_packages` table migration

### Architectural Changes
- New `event_packages` table, with a migration copying existing single-package data forward
- `mergeCalculatedItems` added to de-duplicate shared dishes across packages

---

## [0.1] — 2026-06-12 → 2026-06-18 — Foundation

### Features Added
- Event and client records, with events tracked through a staged lifecycle (Confirmed → Planning → Ready → Active → Closed) and a separate lead-intake pipeline (New → Contacted → Converted → Dismissed) feeding new events
- Catering Builder (packages, menu items, guest-count-driven quantities)
- Payments tracking (deposit / final)
- Proposal PDF generation
- Public lead-capture booking form and Leads pipeline
- Floor Plan recommendation engine
- Table Reservations, Analytics, Archive
- Settings (business contact info, proposal policy text, package management)

### Improvements
- Payments tab redesigned into Charges Summary + Payment Records
- Tax line item added to the fee grid *(later found to be unused in totals — see [ROADMAP.md](ROADMAP.md))*

### Bug Fixes
- Event-time auto-compute bug where a stale value was read before React re-rendered
