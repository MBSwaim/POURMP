# POURMP — Version History

*Planning • Operations • Unified • Readiness Platform — Manhattan Project Beer Co. internal events & reservations system.*

Related: [CHANGELOG.md](CHANGELOG.md) · [ROADMAP.md](ROADMAP.md) · [VERSIONING.md](VERSIONING.md)

POURMP was built iteratively without formal release tags. This document reconstructs that work into a version sequence, grounded in the project's git history (`git log`) and the features actually present in the codebase as of **2026-07-10**. Going forward, new work should follow [VERSIONING.md](VERSIONING.md) instead of being reconstructed after the fact.

---

## 1. Project Version History

### Version 0.1 – Foundation
*2026-06-12 → 2026-06-18*

The initial rebuild from a customer-facing prototype into a staff-only internal operations tool.

- Event and client records, with events tracked through a staged lifecycle (Confirmed → Planning → Ready → Active → Closed) and a separate lead-intake pipeline (New → Contacted → Converted → Dismissed) feeding new events
- Catering Builder: packages, menu items, and guest-count-driven quantity calculations
- Payments tracking (deposit / final) with a Charges Summary and Payment Records view
- Client-facing Proposal PDF generation *(removed later — see 0.7)*
- Public lead-capture booking form (`/book`) feeding a Leads pipeline
- Floor Plan recommendation engine — layout type, table/high-top counts, seated capacity, capacity warnings
- Table Reservations (small parties, distinct from private events)
- Analytics — year-over-year revenue
- Archive — closed/historical events
- Settings — business contact info, proposal policy text, package activation/deactivation

### Version 0.2 – Multi-Package Catering
*2026-06-19*

- Multi-package support: one event can now carry more than one catering package, each with its own independent guest count and buffer %
- Supplies calculator: plates, rolled silverware, sternos, tablecloths, high-top covers
- Plain-text catering & equipment export for copy/paste into other systems
- Setup checklist added; BEO tightened (financial/contract fields removed from that document)

### Version 0.3 – Prep Docs Suite & Bar Impact
*2026-06-20*

- First generation of the Prep Docs system: Toast Notes, Run of Show, Kitchen Sheet, FOH Notes, Bar Notes, Setup Checklist
- Main Bar Impact scoring — congestion notes, guest-flow notes, copy/paste alert text
- Drink Ticket Efficiency Tracker (post-event log)
- MP-branded printable documents (Josefin Sans / Crimson Text, print-ready `@page` CSS)
- Visual design overhaul — active-nav indicators, stat card accents, Kanban column colors — plus mobile-responsive prep tables
- Archive: sortable columns

### Version 0.4 – Notifications & Table Management
*2026-07-02*

- In-app notification engine and Notification Center (SMS/Email channels stubbed behind settings toggles, pending a real provider)
- Taproom table management: fixed 11-table layout with seating capacity, joined long-table combos, a "Mark Reserved" action that stops alerts, capacity-mismatch warning with a table-picker modal
- Staff directory
- Phone number auto-formatting across every phone field in the app

### Version 0.5 – Operations Intelligence
*2026-07-03*

- Toast Status Tracker — 5-stage completion (Proposal Sent → Confirmed → Invoice Sent → Deposit Received → Final Payment)
- Event Readiness Score — operational-completion checklist, deliberately independent of payment status
- Operational Dashboard (`/operations`)
- Leads Pack and full Handoff Pack exports
- Post-Event Debrief with repeat-client history
- Catering split-logic fixes (arepas/kabobs/sliders), per-item manual piece-count overrides, half-pan sizing rule
- Pricing added to event add-ons

### Version 0.6 – Task System & Risk Scanner
*2026-07-03 → 2026-07-09*

- Per-event task checklists: Setup and Breakdown tasks (always generated) plus Dynamic tasks (generated when event-specific conditions apply), each assigned to a role — Lead, Kitchen, Bar, or FOH
- Task Complexity scoring
- Event Risk Scanner — automated flags across 10 categories: Deposit, Menu Deadline, Guest Count, Shared Space, Main Bar Load, Task Completion, Floor Plan, Policy Conflict, Dessert Logistics, and Child Supervision risk

### Version 0.7 – Dashboard, Search & Navigation
*2026-07-09*

- Global Event Search — search bar with results across all events
- Consolidated Prep Docs picker (`/prep-docs`) as a single entry point for every generated document
- Dashboard: Notification Summary Card, refined stat cards
- Sidebar / navigation restructuring
- Removed the legacy customer-facing Proposal PDF generator, superseded by the internal Prep Docs suite

---

## 2. Current Version

**Recommended current version: `0.7`**

This matches the last committed milestone (commit `eb714e9`, 2026-07-09).

A set of uncommitted changes is currently sitting in the working tree — a catering data-consistency fix that makes the Catering Builder the single source of truth for quantities and serving vessels across every Prep Doc output. It is documented under **Unreleased** in [CHANGELOG.md](CHANGELOG.md). Per the rules in [VERSIONING.md](VERSIONING.md), once committed this should ship as **`0.7.1`** — it corrects existing behavior rather than adding a feature.

POURMP has not yet reached `1.0`. **[V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) is the authoritative definition of Version 1.0 scope** — see [ROADMAP.md](ROADMAP.md) for the tactical, living checklist of what's considered required before that milestone, including the Toast/POURMP boundary work (removing duplicated financial tracking, simplifying client/lead records, adding the Communication Timeline) the Feature Lock introduced.
