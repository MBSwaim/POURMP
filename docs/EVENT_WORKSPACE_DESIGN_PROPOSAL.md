# Event Workspace — Design Proposal

*Design document only — no code changes. Part of the V1 Architecture Refactor (see [EVENT_DETAILS_DATA_AUDIT.md](EVENT_DETAILS_DATA_AUDIT.md) for the data-layer audit this builds alongside). Applies two adopted principles from [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §3: every screen answers either "what events need my attention today?" (Global) or "everything I need to execute this event" (Event Workspace) (§3.7); and every data element classifies as Toast-owned, POURMP-owned, POURMP-derived, or linked-without-duplication before it's treated as belonging anywhere (§3.8).*

Related: [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [EVENT_DETAILS_DATA_AUDIT.md](EVENT_DETAILS_DATA_AUDIT.md)

---

## Context

Phase 1 of the guest-count consolidation (the Overview Guests fix) shipped. Before Phase 2 (unifying the two setup checklists — `event_setup_checklist` vs. `event_tasks`' Setup category, per the data audit), this document answers a prerequisite question: what does "Event Workspace" concretely mean, for both the data model and the page/navigation structure.

The sharpest problem the UI audit found isn't inside any one tab — it's navigational. **The Event Detail page has zero outbound links to anything.** Confirmed via grep: no `Link`/`href` anywhere in `EventDetailClient.tsx`. Once a staff member is looking at one event, there is no way to reach that same event's Prep Docs, BEO, Kitchen Sheet, or Checklist without leaving to a global list and re-finding it — or happening to be on `/today` if the event is today's, since that's the only page in the app with per-event deep links into those tools. This document defines the target navigation and screen model that fixes that.

---

## 1. Purpose of an Event Workspace

An Event Workspace is the single place a staff member lands, and stays, once they've picked which event they're working on. Its job is to make "everything I need to execute this event" always answerable from where they already are — never "go back to a list and find the right sub-tool." It exists to eliminate the current pattern where knowing that Kitchen Sheet, BEO, and Setup Checklist exist — and where to find them — depends on institutional memory rather than the event itself pointing to them.

A Workspace is not a new feature. It's the container the existing event-scoped tools should already be living inside, made real: one persistent identity (which event, which client, current status) with everything else — planning tabs, communication history, task execution, and every generated document — reachable from inside it without a full navigation context switch.

## 2. Toast/POURMP Ownership Matrix

Before anything below is treated as belonging in the Workspace, it has to pass a boundary test — the same one now recorded in [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) §3.8: **Toast is the System of Record for leads, customer information, proposals, contracts, packages and pricing, invoices, deposits, payments, balances, and financial reporting. POURMP is the System of Execution.** Every data element POURMP touches must classify as exactly one of:

1. **Toast-owned, read-only in POURMP** — POURMP never edits it, and ideally never stores an independent copy at all.
2. **POURMP-owned and editable** — a genuinely operational fact with no Toast equivalent.
3. **Derived by POURMP from authoritative information** — a computed value, never itself hand-entered or treated as a source of truth.
4. **Linked to Toast without duplication** — POURMP points at or mirrors status from Toast rather than re-storing the underlying fact.

**Caveat that applies throughout this matrix:** POURMP has no live Toast API. Nothing today is *actually* category 4 in the literal sense of a real-time link — the Toast Status Tracker and similar mechanisms are manually-maintained human proxies for a link that doesn't exist yet. They're classified as 4 because that's their *intent and design constraint* (status-only, no re-derivation of the underlying fact), not because a connection literally exists. This distinction matters when judging whether something is "duplication" — a manual status checkbox is not the same failure mode as an independently-computed dollar ledger.

| Domain | Data Element | Classification | Reasoning | Status |
|---|---|---|---|---|
| Leads & Intake | Public inquiry (`leads` table, `/book` form) | (2) POURMP-owned, pre-conversion only | Captures an inquiry before it's a real booking; collapsed to one-shot triage per the Feature Lock — doesn't compete with Toast's own lead/CRM tracking once a lead is qualified | OK |
| Customer Information | Client contact card (name, phone, email, company) | (2) POURMP-owned, deliberately minimal | Toast is the real customer record; POURMP keeps only what day-of execution needs (who to call, who's hosting) | OK — already minimized in Sprint Zero |
| Proposals | Proposal documents/content | (1) Toast-owned | POURMP generates no customer-facing proposal (the old one was removed in v0.7); nothing to remediate | OK |
| **Contracts** | `event_details.contract_signed` | Should be (3) derived from `toast_confirmed_date`; **currently isn't** | An independent manual checkbox with no code link to the Toast Status Tracker's `'Confirmed'` stage — two flags standing in for what may be the same underlying fact, exactly the pattern this boundary forbids | **Needs remediation — newly surfaced by this exercise** |
| **Packages & Pricing** | Package/menu-item catalog (`packages`, `menu_items`) | (2) POURMP-owned, operational only | Needed for prep-quantity math Toast doesn't perform (chafer counts, servings); not the source of truth for what's charged | OK, scope already limited |
| **Packages & Pricing** | `packages.price_per_guest` and any "$/guest" display (package dropdowns, Settings editor) | Target: (1) Toast-owned/read-only or (4) linked; **currently an uneasy (2)** | No live Toast connection exists, so this number is held locally and can drift from what Toast actually charges. Sprint Zero already removed it from every event-facing dollar total; it still surfaces in the Settings package editor and package-selection dropdowns | **Open question — newly surfaced by this exercise, see recommendation below** |
| Invoices / Deposits / Payments / Balances | All dollar amounts, ledgers | (1) Toast-owned | `payments` table and financial-tracking fields already removed (Sprint Zero) | OK |
| Toast Status Tracker | 5-stage completion mirror | (4) Linked, in intent (see caveat above) | Status-only, no dollar amounts, exists purely so staff don't have to open Toast to check | OK |
| Guest Count | Total across `event_packages` | (2) POURMP-owned working number → feeds (3) derived outputs | Entered once by staff (from what Toast/the booking shows); floor plan, catering quantities, bar impact, and readiness all derive from this one number rather than re-entering it | OK since the Phase 1 fix — legacy `event_details.guest_count` fully superseded |
| **Communication Timeline** | `event_communications` activity types | (2) POURMP-owned — **overlaps Toast Status Tracker** | `'Deposit Received'`, `'Proposal Sent'`, `'Final Confirmation Sent'` log entries have no connection to the matching Toast Status fields — two representations of the same Toast-owned milestone, one purely cosmetic | **Needs remediation** (already item 3 in the phased roadmap) |
| Internal Notes | `event_notes` | (2) POURMP-owned | Freeform staff scratchpad, no Toast equivalent | OK |
| Floor Plans | `calcFloorPlan()` output | (3) POURMP-derived | Pure function of guest count + venue layout constants | OK |
| Task System | `event_tasks` | (2) POURMP-owned | Execution checklist Toast has no concept of | OK |
| Setup Checklist (legacy) | `event_setup_checklist` | (2) POURMP-owned — duplicates the Task System, not Toast | Not a Toast-boundary issue; a POURMP-internal duplicate, already the subject of Phase 2 | Needs remediation (Phase 2, already scheduled) |
| Readiness Score | `calcReadiness()` output | (3) POURMP-derived | Explicitly excludes payment/Toast status by design, per its own header comment | OK |
| Risk Scanner | `scanEventRisks()` output | (3) POURMP-derived | Reads Toast Status dates as one input among several operational ones — reads, never re-derives or duplicates | OK |
| Main Bar Impact | `calcBarImpact()` output | (3) POURMP-derived | Pure function of guest count, timing, bar tab type | OK |
| Drink Tickets | `event_details.drink_tickets` (planned) vs. `drink_ticket_log.tickets_issued` (actual) | Both (2) POURMP-owned | Not a Toast overlap — a POURMP-internal planned-vs-actual drift, already item 5 in the phased roadmap | Needs remediation (already scheduled) |
| Prep Docs suite (11 docs + BEO) | Generated text/printable documents | (2) POURMP-owned, generated | POURMP's own execution documents — "Toast Notes" specifically exists to summarize POURMP data *for pasting into Toast*, not to replace anything Toast owns | OK |
| Post-Event Debrief | `event_debriefs` | (2) POURMP-owned | Internal learning artifact, no Toast equivalent | OK |
| Community Giving | `event_community_giving` | (2) POURMP-owned | Explicitly "separate from pricing, discounts, comps, or Toast payment status" per its own migration comment | OK |
| Event Lifecycle Status | `events.status` (Confirmed→Planning→Ready→Active→Closed) | (2) POURMP-owned — naming collides with Toast Status's `'Confirmed'` stage | Purely operational lifecycle, manually set; not the same data as Toast Status, but named identically and displayed adjacent to it, inviting confusion | Needs remediation (naming/visual disambiguation — already item 8 in the phased roadmap) |
| Reservations (taproom) | `reservations` table | (2) POURMP-owned | Deliberately separate from private events; no Toast equivalent for small-party taproom seating | OK |
| Staff Directory | `staff_members` | (2) POURMP-owned | Internal roster, no Toast overlap | OK |
| Notifications / Alerts | `notifications` | (3) POURMP-derived | Computed from operational data and the Toast Status mirror; stores no new facts of its own | OK |

**Two new remediation items surfaced by applying this test, not previously flagged:**
- **`contract_signed`** should stop being an independent manual flag and instead be derived from (or replaced by) `toast_confirmed_date` — recommend folding this into the phased roadmap alongside item 8 (the broader Toast Status / event lifecycle naming work), since it's the same category of problem: a POURMP flag standing in for a Toast-owned fact with no code connecting them.
- **`packages.price_per_guest`** and its remaining event-facing surfaces (package dropdowns' "$X/guest," the Settings package editor) are worth a deliberate decision: either accept this as a necessary, tightly-scoped local reference number (since there's no Toast API to read it from live) and stop there, or remove it from user-facing display entirely and keep it purely as an internal planning input. Not resolved here — flagged for your call before it becomes a roadmap item.

## 3. What Belongs Inside the Workspace

**Already inside, no change needed** — the existing `EventDetailClient.tsx` tabs: Overview, Timeline, Catering, Floor Plan, Tasks, Notes.

**Already event-scoped, currently unreachable from the Workspace — should move in:**
- The 11-document Prep Docs suite at `/events/[id]/prep` (Toast Notes, Pre-Shift Brief, Main Bar Impact, Run of Show, Kitchen Sheet, FOH Notes, Bar Notes, Leads Pack, Handoff Pack, Setup Checklist, Debrief) — already takes an event ID, already shares a data loader (`getPrepOutputsData()`) with the global picker at `/prep-docs`. The problem is purely that nothing links to it from the event itself.
- The Bar Impact tab (drink ticket tracking) and Debrief tab, both already living under `/events/[id]/prep`.

**Currently event-scoped but standalone, separately-navigated tools — should be absorbed:**
- **BEO** (`/prep/beo`) — a real, distinct document (financial/contract fields already stripped, per its own version history) that was never migrated into the unified 11-doc system. Belongs in the Workspace as a 12th document, not its own top-level route.
- **Kitchen Sheet** (`/prep/kitchen-sheet`) — appears to duplicate the unified system's own Kitchen Sheet doc. Candidate for retirement once confirmed equivalent.
- **Checklist** (`/prep/checklist`) — backed by `event_setup_checklist`, already flagged by the data audit as a duplicate of `event_tasks`' Setup category. This tool's fate is tied to Phase 2, not just a navigation change.

**Stays outside the Workspace, correctly global:** `/today`, `/operations`, `/events`, `/calendar`, `/reservations`, `/archive`, `/notifications`, `/settings`. None of these answer "everything I need for this event" — they answer "what needs attention across events."

## 4. Global vs. Event-Scoped Navigation

**Remains global (sidebar, unchanged):** Search Events, Today + Jump to Date, Dashboard, Operations, Events, Calendar, Reservations, Archive, Notifications, Settings.

**Becomes event-scoped (moves out of the sidebar, into the Workspace):**
- The sidebar's **"Prep Docs" link** — retired as a global nav item. Its only job today is "pick an event, then see its docs," which is worse than just going to the event.
- **`/prep/beo`, `/prep/kitchen-sheet`, `/prep/checklist`** as independently-navigated destinations — retired as standalone routes. They were never in the sidebar to begin with (reachable only via `/today`'s quick links or a typed URL) — evidence they were always meant to be event-scoped and never got a proper home.

## 5. Proposed Workspace Layout and Navigation Model

Keep what already works — don't rebuild the six existing tabs. Add one thing: a **shared shell** so the Workspace feels like one continuous place instead of two differently-designed pages.

Introduce `src/app/events/[id]/layout.tsx` as the Workspace shell — renders the event header (name, client, status dropdown, currently inline at the top of `EventDetailClient.tsx`) and a top-level tab bar, then renders `{children}`. Both `/events/[id]/page.tsx` (the six existing in-page tabs, unchanged) and `/events/[id]/prep/page.tsx` (Prep Docs) mount underneath this same shell.

The tab bar gains a 7th entry — **"Prep Docs"** — a real navigation (`Link href="/events/[id]/prep"`) rather than the in-page `setTab()` pattern the other six use, since Prep Docs already has its own route for good reason (the printable documents need their own print-CSS context via `PrintDoc`). The tab bar needs to highlight "Prep Docs" as active based on URL path rather than local state — small and contained, not a redesign.

This is deliberately the *minimal* structural change that closes the gap: it does not require converting the six existing tabs into their own routes (a larger, separate decomposition effort, already noted in the broader roadmap) — that's not required to fix the actual problem, which is specifically "how do I get from Event Detail to Prep Docs and back."

## 6. Impact on Existing Tools

| Tool | Current state | Impact |
|---|---|---|
| 11-doc Prep Docs suite | Own route, own data loader, zero links in from Event Detail | No functional change. Becomes reachable via the new Workspace tab. |
| BEO | Standalone `/prep/beo`, own all-events picker | Migrate into the unified Prep Docs suite as a 12th document — real work (a new generator/tab following the existing `generate*`/`*Doc` pattern), not just a redirect. |
| Kitchen Sheet | Standalone `/prep/kitchen-sheet` | Likely retire — appears duplicated by the unified system's own Kitchen Sheet doc. Needs a direct feature-parity check before removal. |
| Checklist | Standalone `/prep/checklist`, backed by `event_setup_checklist` | **Blocked on Phase 2.** Whichever checklist Phase 2 decides is canonical becomes what this tool — and the Workspace's checklist experience — reads from. Folding this in before Phase 2 lands would just relocate the duplication. |
| `/today`'s per-event quick links | Point at the old standalone `/prep/*` routes | Update to point at the new unified Workspace routes once those exist. |
| `/prep-docs` global picker | Top-level nav item, lists all events | Retired as a nav destination — superseded by "go to the event, then its Prep Docs tab." |

## 7. Migration Strategy

Staged, not a cutover — each stage its own small, reviewable, revertible unit:

- **Stage A — additive, lowest risk.** Add the "Prep Docs" tab to the Workspace, linking to the *existing* `/events/[id]/prep` route as-is. Nothing retired yet. Closes the "zero outbound links" gap and delivers most of the practical value alone.
- **Stage B — shared shell.** Extract the event header + tab bar into `src/app/events/[id]/layout.tsx`. Pure refactor, no behavior change.
- **Stage C — consolidate legacy tools.** *Sequenced after Phase 2*, since Checklist's fate depends on it. Migrate BEO into the unified suite; verify and retire Kitchen Sheet's standalone route; update `/today`'s quick links; then retire the old standalone routes and `/prep-docs`. Old routes can redirect for a transition window rather than disappear outright, per the project's existing "additive, non-destructive change" principle.
- **Stage D — sidebar cleanup.** Remove the global "Prep Docs" sidebar link once Stage C lands.

**Relationship to the phased roadmap:** Phase 2 (unify the two setup checklists) still comes next and is unaffected by this document — if anything, this is a reason to make sure Phase 2's outcome anticipates the Workspace needing one canonical checklist. Stages A/B could happen before or after Phase 2 (no dependency); Stage C explicitly depends on Phase 2 landing first.

---

*No implementation in this document. Awaiting explicit approval before any stage begins.*
