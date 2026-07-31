# The Perfect Event Workflow

*Design document only. No code, no commits, no roadmap or architecture changes. This document describes the ideal operational lifecycle of a private event at Manhattan Project Beer Company — starting from the business, not the software. POURMP exists to support this workflow. This workflow does not exist to justify POURMP's current feature set, and where the two disagree, this document should win the argument, not the other way around.*

---

## How to read this document

Ten phases, each answering the same questions: what problem is the team solving, who owns it, what goes in and comes out, what gets decided, what could go wrong, where the work hands off from one person or system to another, and — specifically — what belongs to Toast versus POURMP. The mapping to the current [V1_BLUEPRINT.md](V1_BLUEPRINT.md) comes only at the end, deliberately, so the workflow gets defined on its own terms first.

---

## 1. Lead

**Objective (the problem being solved):** Someone wants to host an event here. Capture that interest, from whatever channel it arrives through, before it's lost.

**Who owns it:** Whoever receives the inquiry — front-of-house staff, a coordinator, whoever answers the phone. Ownership should not depend on which channel the inquiry came through.

**Inputs:** A name, a way to reach them, a rough date, a rough guest count, an occasion. Often incomplete at this stage — that's expected, not a failure.

**Outputs:** A logged inquiry, somewhere a coordinator will actually see it.

**Decisions:** None yet, beyond "did someone write this down."

**Risks:** An inquiry arrives through an unowned channel (a voicemail, a DM, a comment passed verbally between staff) and never becomes a logged record at all — the single most common way real business gets lost, because it never even reaches the point of being evaluated. A second risk: the same inquiry gets logged twice through two different channels, creating a duplicate that confuses whoever follows up.

**Operational handoffs:** Whoever received the inquiry → the person responsible for qualifying and pursuing it. This handoff must happen the same day; hospitality inquiries go cold fast.

**Toast responsibilities:** System of record for the lead itself. Every inquiry, regardless of channel, should end up represented here.

**POURMP responsibilities:** None at this stage — an event isn't yet an operational concern, it's a sales one. Where POURMP offers a public inquiry form as a convenience front door, that form's only job is to get the inquiry logged quickly; it is not a second lead-tracking system running alongside Toast.

---

## 2. Qualification

**Objective:** Decide whether this inquiry can actually become a real event here — not whether the venue *wants* the business (that's a sales question), but whether it's *executable*: right date, right size, right fit.

**Who owns it:** The coordinator or salesperson handling the lead.

**Inputs:** The lead's stated date, guest count, and occasion; the venue's actual constraints — which dates are already blocked or booked, the minimum lead time the venue requires, the hard guest-count ceiling the space can physically hold, and the venue's standing policies (no outside catering, no outside alcohol, no outside entertainment).

**Outputs:** A qualified opportunity — a date tentatively held, a rough sense of which package(s) would fit — or a clear, timely decline/redirect if it doesn't.

**Decisions:** Is the date actually open? Does the guest count fit the space? Does the lead time meet the venue's minimum? Is this the kind of event the venue can deliver on within its own policies?

**What could go wrong:** A date gets tentatively promised to two different leads because nobody checked a shared view of what's already held. A lead that will never actually fit the venue's capacity gets strung along for weeks before anyone checks the ceiling. Qualification criteria live only in one experienced coordinator's head, so a newer staff member either over-promises or under-sells without meaning to.

**Operational handoffs:** Whoever is qualifying the lead needs fast, reliable access to the venue's actual calendar and constraints — this is the first moment where operational data (not sales data) becomes load-bearing.

**Toast responsibilities:** Continues tracking the lead's status through this stage — still exploratory, not yet a commitment.

**POURMP responsibilities (how friction should be reduced):** Give the person qualifying a lead one fast, reliable answer to "is this date actually open, and does this guest count fit" — without needing to cross-reference multiple systems or ask someone else. This is squarely an operational-visibility question, and answering it quickly is exactly the kind of friction POURMP should remove.

---

## 3. Proposal

**Objective:** Turn a qualified opportunity into a concrete offer the client can say yes to.

**Who owns it:** Sales/coordinator.

**Inputs:** The qualified guest count and occasion, the venue's package menu and pricing, any specific requests already discussed.

**Outputs:** A sent proposal — package options, pricing, general terms, cancellation policy, next steps.

**Decisions:** Which package(s) to recommend, whether to customize anything, what the total comes to, which policies apply.

**What could go wrong:** The proposal quotes outdated pricing or policy language. The client goes quiet after receiving it and nobody follows up before the opportunity goes cold. The proposal promises something the venue can't actually deliver — a menu combination, a guest count, a timeline — because whoever wrote it wasn't checking against real operational limits.

**Operational handoffs:** None yet. Still entirely a conversation between the venue and the prospective client.

**Toast responsibilities:** Generates the actual proposal document, tracks whether it's been sent and viewed, holds the pricing that's quoted.

**POURMP responsibilities:** None directly. Packages and pricing are Toast's to sell; POURMP's own package/menu-item catalog exists later, to support prep math, not to generate anything customer-facing at this stage.

---

## 4. Booking

**Objective:** Convert an accepted proposal into a firm, contracted, paid-deposit commitment — the moment a "maybe" becomes a real event.

**Who owns it:** Sales/coordinator, with the client signing and paying.

**Inputs:** The client's acceptance, a signed contract, the first deposit payment.

**Outputs:** A confirmed booking — contract signed, deposit received, date locked for real (not just tentatively held).

**Decisions:** Is the deposit actually in hand before the date is treated as fully secured? (Holding a date indefinitely on an unconfirmed opportunity is its own risk.)

**What could go wrong:** The booking is "done" from a sales perspective, but nobody has told the execution side anything yet — the kitchen, the floor staff, and the bar have no idea this event exists. The date that was tentatively qualified weeks ago never actually gets confirmed as unavailable to anyone else in the meantime.

**Operational handoffs:** **This is the single most important handoff in the entire workflow.** Everything before this point is a sales conversation. Everything after it is an execution problem. Someone must deliberately translate "we have a signed, deposited booking" into an actual operational record the execution team can work from — this doesn't happen automatically, and if it's skipped or delayed, the event exists commercially but not operationally.

**Toast responsibilities:** The contract, the deposit, the invoice — the entire financial and legal transaction of becoming a real booking.

**POURMP responsibilities:** This is where POURMP's job begins. A coordinator creates the event's operational record — copying over the essential confirmed facts (date, guest count, client contact, package) from what Toast now shows. Before this moment, POURMP has nothing to do with the event. After it, POURMP owns everything about executing it.

---

## 5. Planning

**Objective:** Turn a booked-but-unspecified event into a fully worked-out operational plan, well ahead of the event date — not the week of.

**Who owns it:** The Event Coordinator.

**Inputs:** The event record from Booking; guest count; package selection; any special requests (dietary needs, AV, dessert, children attending); the venue's physical capacity and layout constraints.

**Outputs:** A finalized catering plan, a floor plan appropriate to the guest count, staffing notes, a bar-tab arrangement, and a running record of everything discussed with the client since booking.

**Decisions:** Which package(s) and in what quantities; how the floor should be laid out for this guest count; which bar-tab model applies; whether any special accommodation is needed.

**What could go wrong:** The guest count or package changes partway through planning and the change doesn't reach every plan that depends on it — the floor plan, the catering quantities, and the bar-impact estimate can each end up reflecting a different, stale number if there's no single place that number lives. A decision gets made verbally with the client on a phone call and is never written down anywhere, so nobody else on the team knows it happened. The plan isn't actually finalized until uncomfortably close to the event, leaving no runway for preparation.

**Operational handoffs:** The coordinator keeps the venue's own read on where Toast's process stands (proposal sent, confirmed, invoice sent, deposit received) up to date — a status check, not a duplicate ledger — so nobody has to open Toast just to answer "have we been paid yet."

**Toast responsibilities:** Remains the system of record for the invoice, the deposit, and any contract amendments if the booking's terms change.

**POURMP responsibilities:** The majority of planning work lives here — building the catering plan, working out the floor plan, recording client communication chronologically so context survives staff turnover, and mirroring Toast's milestones without re-storing the underlying dollar figures.

---

## 6. Preparation

**Objective:** Turn the finalized plan into concrete, department-ready instructions in the final days and hours before the event.

**Who owns it:** The Event Coordinator generates and distributes; Kitchen, FOH, and Bar leads consume and prep against what they're given.

**Inputs:** The finalized plan from Planning — catering, floor plan, staffing, bar setup, any special requirements.

**Outputs:** Printed or otherwise distributed department instructions — a kitchen prep sheet, front-of-house notes, bar notes, a setup checklist, a run-of-show timeline, a pre-shift summary.

**Decisions:** Final headcount confirmation (locked within a defined window before the event, not left open indefinitely); final menu lock; who on the team is responsible for which setup tasks.

**What could go wrong:** A late guest-count change happens after documents are printed and doesn't reach the kitchen in time. A department works from an outdated printed copy instead of whatever the latest plan says. Nobody actually looks at the event's risk signals (deposit still outstanding, unusually high bar-load expected, a policy conflict in the request) until it's too late in the week to do anything about them.

**Operational handoffs:** Coordinator to Kitchen/FOH/Bar — the prep documents themselves *are* the handoff artifact. This is the moment planning becomes other people's problem to execute, and the quality of the handoff determines how smoothly execution goes.

**Toast responsibilities:** None directly, beyond staying accurate if a last-minute financial change occurs (an added item, a revised headcount affecting the invoice).

**POURMP responsibilities:** Generate every department's document from one single, consistent source of truth, so no two documents can disagree about the same event. Surface risk flags with enough runway to actually act on them, not just log them. Track whether setup work is actually getting done, not assume it is because it was assigned.

---

## 7. Execution

**Objective:** Run the event as planned, and adapt smoothly when reality doesn't match the plan exactly.

**Who owns it:** Whoever is running the floor that day — FOH, Bar, and Kitchen leads, with the Event Coordinator or a delegate as the point of accountability.

**Inputs:** The prep documents, the run-of-show timeline, the task checklist.

**Outputs:** A successfully run event, plus real-time notes on anything that deviated from the plan.

**Decisions:** In-the-moment adjustments — running low on an item, a guest count that shows up different from what was planned, a timeline slipping.

**What could go wrong:** Nobody captures what actually happened, so there's nothing to learn from afterward. An operational exception — over capacity, spillover into the main bar, a policy conflict playing out in real time — isn't caught until it's already causing a problem, because it should have been flagged well before the event even started.

**Operational handoffs:** None external — Toast has no role during a live event. Internally, whoever is on the floor needs the day's plan at hand instantly, without digging for it.

**Toast responsibilities:** None. There is no reason to open Toast during a live event.

**POURMP responsibilities:** A fast, reliable day-of reference; the live task checklist; and — critically — risk and readiness signals that should already have been resolved during Preparation, not discovered for the first time here.

---

## 8. Breakdown

**Objective:** Return the space to normal operating condition and close out anything time-sensitive before it's forgotten.

**Who owns it:** FOH/Bar/Kitchen staff, closed out by the Event Coordinator or shift lead.

**Inputs:** The breakdown task list, actual drink-ticket counts (issued versus redeemed), any add-ons actually consumed.

**Outputs:** A cleared, reset space; a completed breakdown checklist; an accurate record of what was actually consumed, for reconciliation against what was planned.

**Decisions:** Whether anything needs to be flagged for follow-up — damage, an unhappy guest, a supply shortfall.

**What could go wrong:** Breakdown tasks get rushed or skipped under pressure to get the space ready for whatever's next. Actual consumption never gets reconciled against the plan, so the gap between "what we planned for" and "what actually happened" just repeats, event after event, with nothing learned from it.

**Operational handoffs:** Back to normal taproom operations — the space needs to be ready for regular service or the next booking, whichever comes first.

**Toast responsibilities:** Recording any final charges beyond the original invoice, if actual consumption exceeded what was pre-arranged.

**POURMP responsibilities:** The breakdown task checklist, and tracking actual drink-ticket consumption as its own fact, distinct from what was planned.

---

## 9. Debrief

**Objective:** Capture what went well and what didn't while it's still fresh, and preserve it so the next event — especially a repeat client — benefits from what was just learned.

**Who owns it:** The Event Coordinator, ideally with input from whichever Kitchen/FOH/Bar leads worked the event.

**Inputs:** What actually happened during Execution and Breakdown — actual guest count, any issues, how accurate the catering and bar-impact plans turned out to be.

**Outputs:** A completed debrief record; institutional knowledge that outlives any one staff member's memory.

**Decisions:** Would the team want to repeat this client or event type? What should change next time?

**What could go wrong:** Debrief gets skipped once everyone's attention has already moved to the next thing. The same avoidable mistake repeats event after event because nothing was ever written down. A repeat client's history doesn't resurface the next time they book, so the team re-learns lessons it already had.

**Operational handoffs:** None external. Internally, this is the moment institutional knowledge either gets captured for good or is lost for good — there's no third option.

**Toast responsibilities:** Confirming final payment was actually collected — the last Toast-owned fact in the entire lifecycle of this event.

**POURMP responsibilities:** The debrief record itself, and — just as important — automatically surfacing a client's history the next time they (or a similar event type) come up again, so the debrief isn't just an archive nobody revisits.

---

## 10. Continuous Improvement

**Objective:** Use the pattern across *many* events — not just any single debrief — to actually change how the venue operates, not just note what happened once.

**Who owns it:** Ownership/management, informed by what Event Coordinators are seeing event after event.

**Inputs:** Debrief history across many events; operational trend data — guest-count patterns, which packages actually sell, how far in advance events typically book, which risk flags keep firing.

**Outputs:** Adjusted packages, staffing plans, policies, or training priorities — decisions made at the level of the business, not the level of one event.

**Decisions:** Which patterns are worth acting on. Are events consistently under-staffed at a particular size? Does a package rarely sell and deserve retiring? Does the same risk flag fire on nearly every event, meaning it should become a standard part of the process instead of a repeated warning?

**What could go wrong:** Debrief data piles up but nobody ever looks at it in aggregate — every insight stays trapped in a single event's record. The same operational problem gets solved fresh, one event at a time, instead of being fixed once at the policy level.

**Operational handoffs:** From individual coordinators' day-to-day experience, up to leadership's periodic review — the only phase in this workflow that deliberately operates on a slower cadence than "per event."

**Toast responsibilities:** None. This is entirely about POURMP's own accumulated operational history — Toast has no visibility into execution patterns at all.

**POURMP responsibilities:** Aggregate what Debrief and the Risk Scanner have already captured, event after event, into trends someone can actually act on — event volume, guest-count patterns, package popularity, booking lead time, recurring risk categories.

---

## Once the workflow is complete: mapping to the V1 Blueprint

| Phase | Status against [V1_BLUEPRINT.md](V1_BLUEPRINT.md) | Notes |
|---|---|---|
| **1. Lead** | **Should remain outside POURMP — Toast owns it** | POURMP's public `/book` form is a convenience front door feeding the same concern, not a competing lead-tracking system. |
| **2. Qualification** | **Partially covered** | The underlying data POURMP already has (blocked dates, calendar, the 21-day minimum lead-time check, the venue's hard capacity ceiling) is exactly what qualification needs — but there's no dedicated workflow or screen that presents it as a qualification tool. Today it's implicit, scattered across the Calendar and the New Event form's validation, not a deliberate step. |
| **3. Proposal** | **Should remain outside POURMP — Toast owns it** | Entirely Toast's job; POURMP's package/menu-item catalog exists for later prep math, not proposal generation. |
| **4. Booking** | **The transaction itself should remain outside POURMP; the handoff moment is already covered** | Toast owns the contract/deposit/invoice. The critical handoff — turning a confirmed booking into an operational record — is exactly what the Events module's event-creation workflow already does. |
| **5. Planning** | **Already covered** | The Event Workspace (Overview, Catering, Floor Plan, Communication Timeline, Toast Status Tracker) is built specifically for this phase. |
| **6. Preparation** | **Already covered** | The Prep Documents module exists specifically to produce this phase's outputs. |
| **7. Execution** | **Already covered** | Daily Execution (`/today`) and the Task system are built for this phase. |
| **8. Breakdown** | **Partially covered** | Breakdown tasks already exist in the Task system, and drink-ticket actual tracking already exists — but the planned-vs-actual drink-ticket drift already flagged in the Data Audit means this phase's reconciliation isn't fully trustworthy yet. |
| **9. Debrief** | **Already covered** | The Post-Event Debrief module, including repeat-client history surfacing. |
| **10. Continuous Improvement** | **Missing entirely today — deferred to V1.5** | This is exactly the Leadership Dashboard's job, already identified in the MLP review as valuable but not required for V1 launch. Until it exists, this phase has no home at all — debrief data accumulates with no aggregate view of it. |

**The clearest gap this workflow surfaces that the Blueprint hadn't named as sharply before:** Qualification has no deliberate home. It's not that POURMP lacks the underlying data — it's that nothing currently presents "can we actually take this booking" as its own step, the way Planning, Preparation, and Execution each already have a clear operational surface. Worth a decision on whether this deserves one before V1, or whether the existing Calendar/blocked-dates view is judged sufficient once it's used deliberately for this purpose.

---

*No implementation, no architecture changes, no roadmap edits, and no commits in this document. Awaiting review.*
