# POURMP — V1 Blueprint

*Design document only. No code changes, no roadmap changes, no commits. This document defines exactly what Version 1 of POURMP is — the primary reference for future development. It synthesizes, and does not contradict, everything already established: [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) (scope and guiding principles), [EVENT_DETAILS_DATA_AUDIT.md](EVENT_DETAILS_DATA_AUDIT.md) and [EVENT_WORKSPACE_DESIGN_PROPOSAL.md](EVENT_WORKSPACE_DESIGN_PROPOSAL.md) (data and navigation architecture), and [ROADMAP.md](ROADMAP.md) (the tactical path from current state to this Blueprint's target state).*

---

## Existing Principles (carried forward, not restated in full)

Everything below honors, and is bound by, the architecture already approved:

- **Toast is the System of Record.** POURMP complements Toast and must not duplicate Toast functionality.
- **Every data element has an ownership classification** — Toast-owned/read-only, POURMP-owned/editable, POURMP-derived, or linked-without-duplication ([V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §3.8, full matrix in [EVENT_WORKSPACE_DESIGN_PROPOSAL.md](EVENT_WORKSPACE_DESIGN_PROPOSAL.md) §2).
- **Every feature must reduce operational work, not create it.** ([VISION.md](VISION.md), [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §3.4)
- **Every screen answers one of two questions** — Global ("what needs my attention today?") or Event Workspace ("everything I need to execute this event") ([V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §3.7).
- **The established workflow governs how this Blueprint gets built out**: Audit → Written proposal → Approval → Small implementation → Stop for review. This document is itself a written proposal, awaiting approval, with zero implementation authorized by it.

Where this Blueprint describes something that doesn't exist in the codebase yet, it says so explicitly. This is a definition of the target, not a status report.

---

## The Blueprint: V1 Modules

### 1. Dashboard

- **Purpose:** Answer "what needs my attention across every event, right now?" — the primary Global screen.
- **Primary users:** Event Coordinators (daily use), Ownership (a quick pulse check).
- **Major screens:** `/` (stat cards, Kanban pipeline, Notification Summary, Upcoming Events), `/operations` (triage buckets: Awaiting Deposit, Awaiting Menu, Awaiting Invoice, High Risk, High Bar Impact, Needs Attention), `/calendar` (month view + blocked dates), `/notifications` (alert feed).
- **Primary workflows:** Coordinator opens the app, scans what's overdue or at risk, clicks through to the specific event that needs action.
- **Toast relationship:** None directly — this module reads only POURMP's own operational data plus the Toast Status Tracker's status fields (never dollar amounts). It is explicitly not a financial dashboard.
- **Data ownership:** Entirely (3) POURMP-derived — every number here is computed from event-scoped POURMP data (readiness, risk, bar impact, task completion) or the status-only Toast Status Tracker. Nothing is entered directly on this module.
- **Future expansion (brief):** Deep-linking from a triage bucket directly into the relevant Event Workspace tab (e.g., "Awaiting Menu" → that event's Catering tab) rather than just the event overview.

### 2. Events

- **Purpose:** Find, create, and list events — the bridge between the Global modules and the Event Workspace. Answers "which event am I looking for?"
- **Primary users:** Event Coordinators.
- **Major screens:** `/events` (filterable table, global search), `/events/new` (creation form), `/archive` (closed/historical events, read-only), `/book` (public-facing inquiry form — the only customer-facing surface in the app).
- **Primary workflows:** Create a new event from a Toast-confirmed booking (copying the essential facts by hand — date, guest count, client contact, package); search/filter the full event list; review closed events for repeat-client history.
- **Toast relationship:** This is where the manual handoff *from* Toast happens. A coordinator has already confirmed something in Toast (a booking is real) and is now creating its POURMP counterpart. Nothing here reads or writes Toast; it's the human bridge.
- **Data ownership:** (2) POURMP-owned for the operational shell (event name/date/time/space/status) and (2) minimal client contact card; the public `/book` form and its `leads` table are also (2) POURMP-owned, a one-shot intake queue, not a competing CRM (Toast owns "who the lead/customer is" long-term).
- **Future expansion (brief):** None planned beyond what's already scoped in [ROADMAP.md](ROADMAP.md)'s Long-Term Vision (calendar sync, a customer-facing status-check portal).

### 3. Event Workspace

- **Purpose:** "Everything I need to execute this event" — the primary Event-scoped screen, per [EVENT_WORKSPACE_DESIGN_PROPOSAL.md](EVENT_WORKSPACE_DESIGN_PROPOSAL.md).
- **Primary users:** Event Coordinators (primary), Kitchen/FOH/Bar staff (read specific tabs/documents relevant to their role).
- **Major screens:** `/events/[id]` with tabs Overview, Timeline (Communication Timeline), Catering, Floor Plan, Tasks, Notes (Internal Notes). A 7th tab, Prep Docs, is planned (Event Workspace design, Stage A) but not yet built.
- **Primary workflows:** Review/edit event details; select catering packages and guest counts; log client communication chronologically; review floor plan recommendations; work the Setup/Breakdown/Dynamic task checklist; leave freeform internal notes; toggle Toast Status Tracker milestones as they happen in Toast.
- **Toast relationship:** The Toast Status Tracker (5-stage manual mirror) lives here. This is the module with the most Toast-adjacent surface area, and the one the ownership matrix found the most boundary drift in (see Final Review).
- **Data ownership:** Mixed, by tab — Overview/Catering/Floor Plan/Tasks/Notes are (2) POURMP-owned or (3) POURMP-derived; the Toast Status Tracker is (4) linked-in-intent (manual proxy, no live API); the Communication Timeline is (2) POURMP-owned but currently has an unresolved overlap with the Toast Status Tracker (flagged, not yet fixed — [ROADMAP.md](ROADMAP.md), V1 Architecture Refactor phase 3).
- **Future expansion (brief):** Real navigation to Prep Documents from within this module (in progress); eventual per-tab URL routes for deep-linking (noted, not required for V1).

### 4. Prep Documents

- **Purpose:** Generate and print every document staff need to run the event, without re-typing facts already captured in the Event Workspace.
- **Primary users:** Kitchen, FOH, and Bar staff (consume specific documents); Event Coordinators (generate/print them, keep them current).
- **Major screens:** `/events/[id]/prep` — 11 documents (Toast Notes, Pre-Shift Brief, Main Bar Impact, Run of Show, Kitchen Sheet, FOH Notes, Bar Notes, Leads Pack, Handoff Pack, Setup Checklist, Debrief), assembled from one shared data loader. Currently also reachable only via the global `/prep-docs` picker or three standalone legacy routes (`/prep/beo`, `/prep/kitchen-sheet`, `/prep/checklist`) — all three are transitional and slated for consolidation into this module (see [EVENT_WORKSPACE_DESIGN_PROPOSAL.md](EVENT_WORKSPACE_DESIGN_PROPOSAL.md) §6–7).
- **Primary workflows:** Coordinator opens an event's Prep Docs during Preparation, reviews/prints what each department needs, copies the Toast Notes text into Toast itself.
- **Toast relationship:** **Toast Notes** is the one deliberate POURMP→Toast handoff — a formatted block of text generated *from* POURMP data, meant to be pasted *into* Toast's own event-notes field, so Toast still receives the operational detail it needs without a live integration. Every other document is POURMP-internal only.
- **Data ownership:** (2)/(3) — generated documents are POURMP-owned outputs, computed (3) from underlying POURMP data (catering quantities, bar impact, task lists, readiness). None of the eleven documents store or represent Toast-owned facts as their own data.
- **Future expansion (brief):** BEO migrated in as a 12th document (currently standalone, never integrated); a single combined print job across all documents ([ROADMAP.md](ROADMAP.md) Future Enhancements).

### 5. Daily Execution

- **Purpose:** "What's happening today, specifically" — a same-day operational view distinct from the Dashboard's broader triage.
- **Primary users:** Whoever is running the floor that day — Coordinator, Lead, or a delegate.
- **Major screens:** `/today` — today's events with quick-reference details and links into their prep tools.
- **Primary workflows:** Open at the start of a shift, see everything scheduled today in one place, jump straight into a specific event's prep materials.
- **Toast relationship:** None. This is a pure execution-day view; Toast has no day-of operational role.
- **Data ownership:** (3) POURMP-derived — a filtered, date-scoped view over the same event data every other module reads.
- **Future expansion (brief):** Update its per-event quick links to the consolidated Prep Documents module once that migration lands (already scoped, [ROADMAP.md](ROADMAP.md) V1 Architecture Refactor phase 7).

### 6. Leadership Dashboard

- **Purpose:** "How is the business trending, operationally?" — for ownership/management, distinct from the Coordinator-facing Dashboard's day-to-day triage. **Not yet built.**
- **Primary users:** Ownership / management.
- **Major screens:** None exist yet. The former `/analytics` page (year-over-year revenue) was disabled in Sprint Zero because its only data source (the `payments` table) was removed as a Toast-boundary violation. [ROADMAP.md](ROADMAP.md) already commits to "rebuild Analytics around operational metrics" — this module is that rebuild, reframed with a named audience.
- **Primary workflows (target):** Event volume over time, guest-count trends, package popularity, booking lead time — questions Toast's own reporting can't answer because they're about POURMP's operational data, not Toast's financial data.
- **Toast relationship:** None. Explicitly not a revenue or financial-reporting view — that's Toast's job, permanently.
- **Data ownership:** (3) POURMP-derived, entirely computed from `events`/`event_details`/`event_packages` — no dollar amounts, per the ownership matrix.
- **Future expansion (brief):** CSV/PDF export ([ROADMAP.md](ROADMAP.md) Future Enhancements); deeper seasonal/forecasting views (Long-Term Vision, explicitly out of V1 scope — see below).

### 7. Training (V1 scope only)

- **Purpose:** Let a new hire or a coordinator covering an unfamiliar role answer "how do I do this in POURMP" without needing verbal, tribal-knowledge training every time. **Does not exist yet, in any form** — this is the least-specified module in this Blueprint and needs its own dedicated design pass before implementation, not just this one paragraph.
- **Primary users:** New staff, staff covering an unfamiliar role, anyone onboarding.
- **Major screens (target, minimal):** A single in-app reference area — not a learning-management system — walking through what each module does and the standard event lifecycle (the User Journey below is close to what this content would contain). No quizzes, no completion tracking, no certification.
- **Primary workflows (target):** Read-only reference, consulted as needed, not a mandatory workflow gate.
- **Toast relationship:** None — this module is entirely about how to use POURMP itself.
- **Data ownership:** (2) POURMP-owned, static reference content — not event-scoped, not derived from any operational data.
- **Future expansion (brief):** Explicitly deferred past this minimal scope: any form of tracked completion, role-specific certification, or interactive training belongs to a later version, not V1.

### Additional retained capabilities (not one of the 7 named modules, but real and in V1 scope)

- **Reservations** (`/reservations`) — small-party taproom bookings, deliberately separate from private events per existing architecture. Doesn't map cleanly onto Events/Event Workspace (which are private-event-specific) or Dashboard; retained as its own capability.
- **Staff Directory** (`/staff`) and **Settings** (`/settings`) — administrative, not day-to-day execution surfaces. Retained as supporting infrastructure rather than folded into one of the 7 modules.

These three are flagged in Final Review below as a structural question worth a decision, not silently resolved here.

---

## User Journey: Lead to Debrief

Showing exactly where Toast ends and POURMP begins at each stage:

**1. Lead received in Toast**
Entirely Toast's domain. A prospective client's inquiry is captured and tracked there (or, for a small number of cases, arrives first through POURMP's own lightweight public form at `/book` — a minor, one-shot intake queue that still doesn't compete with Toast's own lead tracking once a lead is qualified). **POURMP has no visibility into this stage** — there is no live integration.

**2. Planning**
**Toast ends, POURMP begins**, the moment a coordinator creates the event's record in the *Events* module (`/events/new`) — copying the essential confirmed facts (date, guest count, client contact, package) from what Toast shows, by hand. From here, POURMP is the primary tool: the *Event Workspace* is where the package/guest count/floor plan/staffing get worked out, and the Toast Status Tracker is manually ticked forward as the coordinator sees Toast's own process advance (Proposal Sent → Confirmed → Invoice Sent → Deposit Received). **Toast remains the system of record for the actual proposal, invoice, and deposit during this entire stage** — POURMP only mirrors status, never dollar amounts.

**3. Preparation**
Fully POURMP. The *Prep Documents* module generates everything staff need — Kitchen Sheet, FOH/Bar Notes, Setup Checklist, Run of Show — from the same Event Workspace data. The one exception, **Toast Notes**, is generated *by* POURMP specifically *for* Toast — a formatted summary the coordinator pastes back into Toast's own notes field. This is the single designed POURMP→Toast handoff point in the whole journey.

**4. Execution**
Fully POURMP, day-of. *Daily Execution* (`/today`) and the Event Workspace's Task tab are the working surfaces. Toast has no role here — there is no reason to open Toast during a live event.

**5. Debrief**
Fully POURMP. The Post-Event Debrief (inside Prep Documents / the Event Workspace) captures what went well, what didn't, and repeat-client intelligence — internal learning with no Toast equivalent. Separately, and asynchronously, staff confirm in Toast that final payment was collected and tick the last Toast Status Tracker stage in POURMP to match — the last point where POURMP mirrors a Toast-owned fact for this event.

---

## Screen Inventory

| Screen | Purpose | Owner (module) | Major actions | Toast dependency | Future enhancements |
|---|---|---|---|---|---|
| `/` | Global "what needs attention" pulse | Dashboard | View stats, Kanban drag, jump to an event | Reads Toast Status fields only, no dollars | Deep-link into specific Workspace tabs |
| `/operations` | Operational triage buckets | Dashboard | Scan/act on Awaiting Deposit/Menu/Invoice, High Risk, High Bar Impact | Reads Toast Status fields only | None currently scoped |
| `/calendar` | Month view + blocked dates | Dashboard | View/manage blocked dates | None | None currently scoped |
| `/notifications` | Alert feed | Dashboard | Review/complete pending alerts | None | None currently scoped |
| `/events` | Global event list/search | Events | Filter, search, open an event | None | None currently scoped |
| `/events/new` | Create an event | Events | Enter event/client/package facts (copied from Toast by hand) | Manual copy from Toast; no read/write | None currently scoped |
| `/archive` | Closed/historical events | Events | Browse past events | None | None currently scoped |
| `/book` | Public inquiry intake | Events | Prospective client submits an inquiry | None (feeds POURMP's own lightweight queue, not Toast) | None currently scoped |
| `/events/[id]` (Overview/Timeline/Catering/Floor Plan/Tasks/Notes) | Execute one event | Event Workspace | Edit details, log communication, build catering, review floor plan, work tasks, leave notes, toggle Toast Status | Toast Status Tracker lives here | Add Prep Docs as a 7th tab (Stage A, in progress) |
| `/events/[id]/prep` | Generate/print event documents | Prep Documents | Generate, print, copy Toast Notes into Toast | Toast Notes is the one POURMP→Toast handoff | Reachable from Event Workspace (in progress); BEO migration |
| `/prep-docs` | Global Prep Docs picker | Prep Documents (transitional) | Pick an event, then see its docs | None | **Slated for retirement** once in-Workspace access lands |
| `/prep/beo`, `/prep/kitchen-sheet`, `/prep/checklist` | Standalone legacy prep tools | Prep Documents (transitional) | Generate one specific document, all-events picker | None | **Slated for consolidation** into the unified suite |
| `/today` | Same-day operational view | Daily Execution | See today's events, jump to prep tools | None | Point at consolidated Prep Docs routes once migrated |
| *(not yet built)* | Operational trends for leadership | Leadership Dashboard | Review volume/guest-count/package trends | None | CSV/PDF export |
| *(not yet built)* | In-app "how to use POURMP" reference | Training | Read-only reference | None | — |
| `/reservations` | Taproom table bookings | *(retained, unmapped)* | Create/manage small-party reservations | None | None currently scoped |
| `/staff` | Staff directory | *(retained, unmapped)* | Manage staff roster | None | None currently scoped |
| `/settings` | Package catalog, notification toggles | *(retained, unmapped)* | Edit packages/menu items, toggle SMS/email delivery | None | Full package/menu-item editor (Future Enhancement) |

---

## Definition of Done

Version 1 is complete when the following are true — measured as operational outcomes, not a feature checklist:

1. **A coordinator can reach any document or tool for an event in one click from that event's Workspace** — no manually-typed URLs, no "go to `/today` to find the BEO link" workaround.
2. **No operational fact has more than one place it's entered or maintained** — the guest-count consolidation, the setup-checklist unification, and the Communication Timeline/Toast Status/`contract_signed` reconciliation are all closed out (V1 Architecture Refactor phases 1–5).
3. **Every data element in the app has a resolved ownership classification** — no field remains an open question the way `packages.price_per_guest` currently is.
4. **Nothing in POURMP independently tracks a dollar amount, invoice, or payment** — the Toast Status Tracker remains the sole financial-status representation.
5. **A new hire can answer "how do I do X" from the Training module** without needing a verbal walkthrough from another coordinator.
6. **Leadership can answer "how is the business trending operationally"** from the Leadership Dashboard without opening Toast or asking a coordinator to pull numbers.
7. **Every screen in the app answers the Global-or-Workspace question** with no screen serving both or neither.

---

## Out of Scope for Version 1

Explicitly excluded — not deferred ambiguously, excluded:

- **AI automation** of any kind (drafting, summarization, suggestions).
- **Multi-location support** — the venue's physical layout, capacity, and floor-plan math are hardcoded to one venue by design.
- **Payroll.**
- **HR** (hiring, scheduling beyond the existing lightweight Staff Directory, performance management).
- **Financial reporting** of any kind — permanently Toast's job, not a POURMP feature to build toward.
- **Inventory management.**
- **Advanced forecasting** (demand prediction, seasonal modeling) — noted as a Long-Term Vision idea, not V1.
- **A live Toast API integration** — everything in this Blueprint assumes manual entry/mirroring continues; building a real integration is a distinct, much larger future decision, not part of V1.
- **Authentication and multi-user accounts** — already a required Version 1.0 Goal in [ROADMAP.md](ROADMAP.md), tracked there, not redefined here; it's a prerequisite this Blueprint depends on (see Final Review) rather than a module of its own.
- **Per-role permissions, two-way SMS, ingredient-level prep planning, a customer-facing self-service portal, offline/PWA support** — all already correctly classified as Future Enhancements or Long-Term Vision in [ROADMAP.md](ROADMAP.md); this Blueprint doesn't pull any of them forward into V1.

---

## Final Review — Concerns and Recommendations

1. **This Blueprint describes two modules that don't exist yet at all** (Leadership Dashboard, Training) alongside five that mostly already exist. Don't read this document as a status report — Modules 1–5 need the V1 Architecture Refactor phases already in [ROADMAP.md](ROADMAP.md) to actually reach the state described here (particularly Module 3's Toast Status/Timeline reconciliation and Module 4's navigation consolidation); Modules 6–7 need their own dedicated design passes, each its own audit-and-proposal cycle, before any implementation.
2. **Three real, working capabilities don't map cleanly onto the 7 suggested modules** — Reservations, Staff Directory, and Settings. This Blueprint retained them as-is rather than forcing a fit. Worth a deliberate decision: are these intentionally "supporting infrastructure" outside the module structure permanently, or should the module list expand to name them?
3. **Authentication is a hidden dependency of two modules in this Blueprint, not just a general Version 1.0 Goal.** Training implies "for a new hire" — onboarding is a weaker concept without distinct logins. Leadership Dashboard implies a "leadership" audience distinct from Coordinators — that distinction is only real once accounts exist. Recommend sequencing authentication before serious investment in either module.
4. **The Event Workspace (Module 3) is where every unresolved Toast-boundary item converges** — the Communication Timeline/Toast Status overlap, `contract_signed`'s pending deprecation, and (once scheduled) the `packages.price_per_guest` cleanup all live on this one page. Recommend treating Module 3's reconciliation work as the highest-priority phase of the V1 Architecture Refactor, since it's the module every other one either feeds into or reads from.
5. **Toast Notes' role as "the one designed POURMP→Toast handoff" is easy to lose sight of** as more Toast-adjacent surfaces get added (the Timeline, the Toast Status Tracker). Recommend this Blueprint's User Journey section — or something like it — stay close at hand as new features are proposed, specifically to keep re-asking "does this send information to Toast, mirror Toast, or duplicate Toast" before building it.

---

*Deliberately no implementation, no roadmap edits, and no commits in this document. Awaiting review.*
