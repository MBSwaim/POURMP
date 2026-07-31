# POURMP — V1 Blueprint: Minimum Lovable Product Review

*Review only. No code, no commits, no roadmap changes. This document re-examines every module, screen, workflow, and feature in [V1_BLUEPRINT.md](V1_BLUEPRINT.md) against a Minimum Lovable Product (MLP) standard rather than a Minimum Viable one — the target is the smallest version an Event Coordinator (the primary daily user) would genuinely enjoy using, not the smallest version that merely functions.*

**Classification lens applied to every item:** operational value to the Event Coordinator's daily loop, development complexity, dependency on Toast (or lack thereof), and whether the item reduces work or risks creating it. Nothing below was cut for being unfinished — several items are deferred *despite* being fully built, and at least one already-built, already-shipped feature (parts of the Communication Timeline) is flagged for narrowing, not because it's broken, but because MLP asks "does the full version of this earn its place on day one," not "does it work."

---

## Modules

| Module | Classification | Why |
|---|---|---|
| **Dashboard** | **Required for V1** | The primary Global entry point. Zero Toast dependency, already built, directly serves the daily "what needs attention" loop every Coordinator runs first thing. |
| **Events** | **Required for V1** | Can't create or find an event without it. Zero Toast dependency (manual copy-in only), already built. |
| **Event Workspace** | **Required for V1** | The core of the product — "everything to execute this event." Not negotiable; see below for which of its *internal* tabs and features earn a place in the MLP cut. |
| **Prep Documents** | **Required for V1** | This is the actual deliverable value POURMP exists to provide — the reason Kitchen/FOH/Bar staff open the app at all. Not negotiable at the module level; see below for which of the 11 documents make the MLP cut. |
| **Daily Execution** (`/today`) | **Required for V1** | Small, already built, zero Toast dependency, directly used during live execution — the highest-stakes moment for the app to be reliable and fast. Cutting it saves no real complexity and removes real daily value. |
| **Leadership Dashboard** | **Should Move to V1.5** | Real value, but for the wrong persona to justify launch priority — its audience is ownership/leadership, not the Event Coordinator whose daily delight defines this MLP. It doesn't exist yet (the old Analytics page was already removed as a Toast-boundary violation), so building it means net-new development rather than polishing something real. It also has a genuine dependency this Blueprint's own Final Review already named: authentication, so a "leadership" audience is a meaningful distinction. Reduces no one's daily work today; worth doing once V1's core loop is solid and accounts exist. |
| **Training (V1 scope only)** | **Future Version** | Doesn't exist in any form — not a half-built feature being cut, a not-yet-started one being sequenced later. Its value (self-service onboarding) matters most when there's an actual new hire to onboard, not as a day-one requirement for the existing team that has been directly involved in defining this system. Authoring good reference content is real effort better spent polishing the core loop first. Revisit when the next new hire is imminent, or once Auth/roles exist to scope it against. |
| Reservations (retained, unmapped) | **Required for V1** | Already built, already used for real day-to-day taproom operations independent of private events. This isn't new scope to build — it's existing value; removing it would be a regression, not a simplification. |
| Staff Directory (retained, unmapped) | **Required for V1** | Small, already built, and a dependency of other Required features (reservation assignment; Communication Timeline's future staff attribution). |
| Settings — package/menu-item editor | **Required for V1** | Operational necessity, not a nice-to-have — packages and menu items can't otherwise be maintained without a code change. |
| Settings — SMS/Email delivery toggles | **Future Version** *(narrowed, not the whole Settings screen)* | These toggles are fully wired in the UI but the delivery itself is stubbed (per `ROADMAP.md`, still a Version 1.0 Goal). A working-looking toggle that silently does nothing is exactly the kind of thing that creates confusion and false expectations rather than reducing work. Recommend hiding or clearly marking these two toggles specifically as "not yet active" until real delivery exists, rather than shipping a control that lies about what it does. |

---

## Event Workspace — Tab by Tab

| Tab / Feature | Classification | Why |
|---|---|---|
| Overview | **Required for V1** | Core event facts, Toast Status Tracker, readiness — the tab everything else hangs off of. |
| Catering | **Required for V1** | Core planning function; feeds every Prep Doc. |
| Floor Plan | **Required for V1** | Core capacity/layout decision-making, already built, zero complexity to keep. |
| Tasks | **Required for V1** | The execution checklist — directly serves "reduce work," since it replaces ad hoc verbal/memory-based task tracking. |
| Internal Notes | **Required for V1** | Simple, already built, low complexity. Noted overlap risk with the Timeline is a polish concern (already tracked as "Timeline UI Polish" in the roadmap), not a reason to defer either feature. |
| **Communication Timeline** | **Required for V1, conditionally** | The concept is sound and already shipped, but per this Blueprint's own Final Review, it currently has an unresolved overlap with the Toast Status Tracker (V1 Architecture Refactor phase 3). Shipping it *as currently built* — where logging "Deposit Received" in the Timeline has zero connection to the Toast Status checkbox that actually drives Deposit Risk and the Operations "Awaiting Deposit" bucket — risks *creating* work (two places to check, easy to update one and forget the other) rather than reducing it. **Recommend treating phase 3's reconciliation as a hard prerequisite to calling this feature V1-complete, not an optional follow-up.** See also the narrower activity-type recommendation below. |
| Prep Docs tab (not yet built — Stage A/B) | **Required for V1** | This closes the single sharpest gap this whole process found — zero outbound links from the Event Workspace. Cheap (a nav link + shared layout, per the design proposal), and the daily-experience payoff is large. Not building this before V1 undermines "genuinely enjoyable to use every day" more than almost anything else on this list. |
| BEO/Kitchen Sheet/Checklist full consolidation (Stage C — migrating BEO in, retiring old routes) | **Should Move to V1.5** | Distinct from the navigation fix above. Making these tools *reachable* is cheap and required now; fully absorbing BEO into the 12-doc pattern and retiring the standalone routes is real development work (a new generator, feature-parity verification) that doesn't add anything a Coordinator can't already do — it makes an already-working thing tidier. Recommend: link to the existing standalone tools for now (cheap), do the deeper consolidation once the core loop is proven. |
| Backdating control ("Log for a different date/time") | **Should Move to V1.5** | Already flagged in the existing "Timeline UI Polish" backlog. Real capability, rare need (most logging happens in the moment) — adds UI surface to every button for an edge case. Move to an advanced/secondary entry path rather than sitting above the button row by default. |
| Delete affordance on Timeline entries | **Required for V1** | Already built, cheap, a genuine safety valve for mis-clicks given how easy single-click logging makes a mistake. |
| Staff attribution on Timeline (schema-only) | **Correctly already deferred** | Not built, and rightly so — this was the original design decision (schema-ready, no UI, since a picker would cost the "single click" property this feature depends on, and real attribution wants real auth first). No change from this review. |

---

## Communication Timeline — Activity Types

The full 14-type button row is exactly the kind of "complete feature set vs. minimum lovable" tension this exercise exists to catch. Recommend narrowing the *default* set, not the underlying capability:

**Required for V1** (the activities that map to a Toast-adjacent milestone, a core planning fact, or the most common day-to-day log entry): Proposal Sent, Deposit Received, Menu Finalized, Floor Plan Updated, Final Confirmation Sent, Event Completed, Phone Call, Internal Note.

**Should Move to V1.5** (real, but likely lower-frequency or overlapping with a Required type already covering the same need): Intro Email Sent, Follow-up Sent, Voicemail Left, Deposit Reminder Sent, Menu Discussion.

This is a judgment call without real usage data behind it yet — flagged as a recommendation to validate against actual coordinator behavior once the reconciled version (with Toast Status connected, per above) has been in use for a few weeks, not a confident final cut.

---

## Prep Documents — Document by Document

**Required for V1** (directly serve a department's day-of execution, or the one designed Toast handoff): Toast Notes, Kitchen Sheet, FOH Notes, Bar Notes, Setup Checklist *(pending phase 2's unification with the Task System's Setup category — the document is required, but shouldn't ship reading from the soon-to-be-deprecated `event_setup_checklist` table if phase 2 lands first)*, Run of Show, Pre-Shift Brief, Main Bar Impact, Handoff Pack, Debrief.

**Should Move to V1.5**: **Leads Pack**. Its value proposition predates Sprint Zero's decision to collapse the Leads pipeline to a minimal one-shot intake — a full "pack" of leads-related material is a heavier concept than what the simplified Leads model now represents. Worth confirming it's still genuinely used before re-committing to it as core; if it is, it can move back to Required with real evidence behind that call.

---

## User Journey Stages

Not tiered individually — these are the lifecycle, not optional scope — but two calls fall out of the module-level analysis above:

- **Planning** and **Preparation** stages are fully covered by Required-for-V1 modules; no gap.
- **Debrief** stage's only Should-Move item is the Leads Pack question above; the Post-Event Debrief itself stays Required.

---

## The Smallest V1, Restated

**Ships in V1:** Dashboard, Events, Event Workspace (all six existing tabs, plus the new Prep Docs navigation tab, with Communication Timeline's Toast Status reconciliation as a hard prerequisite and a narrowed 8-type default activity set), Prep Documents (10 of 11 documents), Daily Execution, Reservations, Staff Directory, Settings' package editor.

**Moves to V1.5:** Leadership Dashboard, the deeper BEO/Kitchen Sheet/Checklist consolidation, the Timeline's backdating control, the remaining 6 lower-frequency activity types, the Leads Pack (pending a usage check).

**Moves to a Future Version:** Training, and the Settings SMS/Email toggles specifically (until real delivery exists).

---

*Review only — no implementation, no roadmap edits, no commits. Awaiting your decision on which recommendations to fold into the Blueprint.*
