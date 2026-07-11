# POURMP

**Planning • Operations • Unified • Readiness Platform**

*Manhattan Project Beer Company's Internal Events & Reservations Operations Platform*

> Exceptional hospitality is never accidental. It is the result of exceptional preparation.

---

## What POURMP Is

POURMP is the internal operations system Manhattan Project Beer Co. staff use to plan, prep, and run every private event and taproom table reservation the venue hosts. It is not a booking site, not a payment processor, and not a point-of-sale system — it's the layer that turns a confirmed booking into a fully staffed, fully prepped, on-time event.

## Purpose

People deserve exceptional hospitality. Exceptional hospitality is never accidental — it is the result of exceptional preparation.

POURMP exists to make that preparation consistent, organized, efficient, and repeatable, by providing one unified operational platform for planning, preparing, communicating, and executing private events and reservations. It exists to reduce unnecessary work, eliminate repetitive data entry, improve communication, increase operational visibility, preserve institutional knowledge, and help every team member deliver an exceptional guest experience.

Concretely, that means: before POURMP, the operational side of running an event — catering quantities, floor plan setup, task checklists, kitchen prep sheets, day-of run of show — lived in scattered notes, memory, and manual math. POURMP exists to make that operational picture a single source of truth: enter an event's guest count and package once, and every downstream document — the kitchen's prep sheet, the floor staff's setup notes, the bar's impact warning, the copy/paste block for Toast — is generated from that same data instead of being re-typed and re-calculated by hand each time.

See [VISION.md](VISION.md) for the full guiding philosophy behind why POURMP exists and how it should keep growing.

## Mission Statement

**POURMP exists to simplify, standardize, and elevate the planning and execution of private events and reservations at Manhattan Project Beer Company by bringing operational readiness, communication, task management, sales visibility, and event intelligence into one unified platform.**

## Primary Users

POURMP is built for Manhattan Project Beer Co. staff, specifically:

- **Event Coordinators** — the primary users. They create events, build out catering and floor plans, track readiness, and generate every Prep Doc.
- **Kitchen staff** — consume the Kitchen Sheet and Toast Notes for prep quantities, equipment, and timing.
- **Front-of-house (FOH) staff** — consume FOH Notes, Setup Checklists, and the Today dashboard for day-of execution.
- **Bar staff** — consume Bar Notes and the Main Bar Impact rating to prepare for guest-flow load from private events.
- **Ownership / management** — use the Operational Dashboard, Analytics, and Event Risk Scanner to see what needs attention across the whole calendar.

There is no customer-facing account system. The only surface a customer ever touches is the public event-inquiry form at `/book`.

## Relationship to Toast Catering & Events

**POURMP works alongside Toast — it does not replace it.**

**Toast is the System of Record. POURMP is the System of Execution.** Toast remains the official system of record for leads, customer information, proposals, invoices, deposits, payments, and customer-facing communication. POURMP does not process payments, send invoices, generate proposals, or store customer/financial data as authoritative. Instead, POURMP transforms event information into operational plans, task management, preparation documents, leadership visibility, and consistent event execution.

**[V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) is the authoritative, current definition of this boundary** — see it for exactly which fields and features live in POURMP versus Toast. The description below reflects the app as it runs today; the items marked *(pre-1.0)* are being simplified or removed under that plan, not features to build on further:

- **Mirrors** key Toast milestones manually (the Toast Status Tracker: Proposal Sent → Confirmed → Invoice Sent → Deposit Received → Final Payment) so staff can answer "where are we with this client in Toast?" without opening Toast. This is the one financial-status mechanism Version 1.0 keeps.
- *(pre-1.0)* **Mirrors** financial figures (deposit/final due and received) for internal visibility on the Operational Dashboard and Pre-Shift Brief. The realignment behind [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) found this had drifted into three separate, disagreeing representations of the same fact (see [V1_REALIGNMENT_REVIEW.md](V1_REALIGNMENT_REVIEW.md) §3) — it's being removed in favor of the Toast Status Tracker alone.
- *(pre-1.0)* **Projects** sales figures (guest count × package price) for dashboard and analytics purposes as an internal planning proxy — not Toast's actual invoiced or collected revenue. Analytics is being rebuilt around operational metrics (event volume, guest-count trends, package popularity) instead.
- Generates the **Toast Notes** Prep Doc specifically as a formatted block of text staff copy directly into Toast's own event notes field, so Toast still receives the operational detail it needs without staff re-typing it there by hand. This stays in Version 1.0.

If Toast and POURMP ever disagree on a financial number, **Toast is correct.** POURMP's financial fields are a staff convenience, not an accounting system — and per [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md), Version 1.0 removes nearly all of them, keeping only the status-only Toast Status Tracker.

*(POURMP's own public inquiry form at `/book` is a lightweight intake that hands new bookings off into an event record — it is not a leads/CRM system and does not compete with Toast's own lead handling. Version 1.0 further simplifies this from a tracked multi-status pipeline down to a one-shot triage queue — see [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §5.2.)*

## Relationship to Manhattan Project Beer Company

POURMP is built specifically around how Manhattan Project Beer Co. operates its taproom and private-event production space — not as a generic events product. Its rules, thresholds, and layouts are the venue's actual operating constraints:

- The 75-guest total capacity ceiling and 50-guest seated threshold
- The 6 rectangular tables / 4 high-top layout used across every floor plan recommendation
- The fixed 11-table taproom reservation layout, including which two table pairs physically join into long tables
- The venue's specific catering packages, menu items, and serving-vessel conventions (chafers, half-chafers, platters, bowls)
- Manhattan Project's own policies (no outside vendors, no capped bar, no outside alcohol, no outside entertainment) — encoded directly into the Event Risk Scanner's Policy Conflict rules

This means POURMP is **internal tooling built for one venue's real operating model**, not a multi-tenant SaaS product.

## Core Features

- **Dashboard** — stat cards, notification summary, upcoming events, and the event status Kanban board
- **Operations Dashboard** — a triage view of what needs staff attention this week: awaiting deposit, awaiting menu, awaiting invoice, high risk, high bar impact, needs attention
- **Event Records** — the full event lifecycle from creation through Planning → Ready → Active → Closed
- **Catering Builder** — packages, menu items, multi-package support per event, guest-count-driven quantity calculations, and per-item manual overrides
- **Floor Plans** — automatic layout recommendations based on guest count, with a standard setup checklist
- **Task System** — Setup, Breakdown, and Dynamic task checklists assigned by role, with a Task Complexity score
- **Prep Docs Suite** — eleven generated documents (Toast Notes, Pre-Shift Brief, Main Bar Impact, Run of Show, Kitchen Sheet, FOH Notes, Bar Notes, Leads Pack, Handoff Pack, Setup Checklist, Debrief), all generated from the same event data
- **Event Risk Scanner** — automated flags across ten operational risk categories
- **Main Bar Impact** — a scoring system estimating how much a private event will strain main bar service
- **Event Readiness Score** and **Toast Status Tracker** — operational and administrative completion tracking, kept deliberately separate
- **Table Reservations** — taproom table management for small parties, independent from private events
- **Analytics** — year-over-year revenue tracking (invoiced vs. collected) *(pre-1.0 — being rebuilt around operational metrics; see [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md))*
- **Notifications** — an in-app alert engine for upcoming reservations and events
- **Global Event Search**, **Archive**, **Staff Directory**, and **Settings**

## Current Version

**`0.7`** — see [VERSION_HISTORY.md](VERSION_HISTORY.md) and [CHANGELOG.md](CHANGELOG.md) for the full version history. A catering data-consistency fix is currently pending as `0.7.1` (see Unreleased in the changelog).

POURMP has not yet reached `1.0`. **[V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) is the authoritative definition of what Version 1.0 includes**; see [ROADMAP.md](ROADMAP.md) for the tactical, living checklist of work items toward it.

## Future Vision

POURMP is designed to become the central internal operations platform for Manhattan Project Beer Company — the single operational hub for every part of running an event that Toast doesn't already own, while staying deliberately in its lane alongside Toast rather than trying to absorb it. As the platform grows, it should support Private Events, Table Reservations, Event Coordination, Operational Planning, Task Management, Prep Documentation, Sales Visibility, Risk Management, Leadership Reporting, and future operational tools. The goal is not to replace Toast — it's to make every event easier to plan, easier to execute, easier to manage, and more consistent for both the team and our guests.

In the near term, that means closing the gaps documented in [ROADMAP.md](ROADMAP.md) — authentication, automated testing, real SMS/email delivery, a production-durable database — plus the Toast/POURMP boundary work defined in [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md): removing the financial-tracking duplication described above, simplifying client and lead records down to what execution actually needs, and building the new Communication Timeline module. Further out, it means richer operational analytics, ingredient-level prep planning, and a lightweight customer-facing view so a booked client can check status without a phone call.

See [VISION.md](VISION.md) for the full guiding philosophy this direction is built on, and [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) for the authoritative Version 1.0 scope.

---

*See [INDEX.md](INDEX.md) for the full documentation set.*
