# User Experience Blueprint

*Design document only. No code, no commits, no roadmap updates. Not a UI mockup — a workflow and experience document describing how POURMP should feel to use throughout an employee's day. Builds on [PERFECT_EVENT_WORKFLOW.md](PERFECT_EVENT_WORKFLOW.md) (the operational lifecycle), [USER_ACCOUNTABILITY_FRAMEWORK.md](USER_ACCOUNTABILITY_FRAMEWORK.md) (the roles used below), and [V1_BLUEPRINT.md](V1_BLUEPRINT.md) (the modules and screens referenced throughout).*

---

## Guiding Principle

**POURMP should reduce cognitive load.**

At every screen, at every moment, the system should surface exactly three kinds of thing:

- **What needs attention** — something is off, at risk, or waiting on someone.
- **What has changed** — since the last time this person looked, something moved.
- **What requires action** — a decision or a click only a human can make.

Everything else — information that never changes, or doesn't help someone perform their job *today* — should be one tap away, not in front of their face by default. If a piece of information would look identical whether opened this morning or a week from now, it doesn't belong on a screen someone opens every day; it belongs in a reference view they visit when they need it.

This principle is the test applied to every section below.

---

## The Experience, by Role

### Team Member

**Clocks in → opens POURMP.** They should not land on the full Dashboard — almost none of it is theirs to act on. They land on a view scoped to exactly one question: *what am I doing today, and what do I need to do it.*

**What they see:** their assigned tasks for today's shift, grouped by the event(s) they're working, filtered to their department (Kitchen, Bar, or FOH) — not every task across every department, not every event happening today, just theirs. Alongside the tasks, the one or two documents their role actually needs (a Kitchen Sheet, Bar Notes, FOH Notes) — already generated, already correct, zero hunting.

**What they do first:** scan the list, start on the first thing that's time-sensitive or already overdue. No decision-making about *what* to do — that was already resolved during Preparation. Their job is to execute what's already been decided, not interpret a plan.

**What should disappear once completed:** a finished task should visibly leave the "what's left" list — not linger, greyed out, at the bottom of a long list. The list getting shorter over the course of a shift is the entire point; it's the one piece of feedback that tells a Team Member they're on track without anyone having to say so. Once everything assigned to them is done, their screen should go quiet. A Team Member with nothing left to do should see *nothing left to do* — not a wall of checkmarks proving it.

### Shift Lead

**Beginning of shift:** opens whatever they're running today — a specific event's Workspace, or the floor generally. Before anything else, they check Readiness and Risk flags while there's still time to fix something, not after doors open.

**Monitoring the floor:** a live, at-a-glance sense of where things stand by department — not a wall of individual task rows, a shape ("Kitchen 6/8, Bar 3/3, FOH 10/17") that tells them where to walk over and help without needing to interrogate anyone.

**Checking task completion:** the same task list their team is working from — not a separate "management view" the team can't see. Visibility is shared; a Shift Lead isn't watching people, they're looking at the same board everyone else is.

**Verifying work:** for the specific subset of tasks that need it (per the Accountability Framework), a single tap — "verify" — appearing right next to the completed item, not a separate screen to navigate to.

**Supporting the team:** this is where recognition happens in the moment, not at a desk later — a one-tap "nice work" on something they just watched go well, with an optional note if it's worth being specific. Anything that needs to survive to the next shift gets logged once, right here, in the Communication Timeline or Internal Notes — never held in someone's head until they remember to mention it at handoff.

**End of shift:** the Debrief — quick, while it's fresh, not a form to dread. What went well, what didn't, whether they'd want to repeat this client. Then they're done; POURMP doesn't ask for anything more.

### Manager

**Morning review:** opens the Dashboard or Operations view, not any single event — a Manager's day starts with "what across everything needs me," not "how is one event doing."

**Operational priorities:** the existing triage buckets — Awaiting Deposit, Awaiting Menu, High Risk, High Bar Impact, Needs Attention — scanned in order of what actually needs a decision today, not a full list of every event in flight.

**Event readiness:** reviewed as a property of the *events*, never of the people running them. A low readiness score means an event isn't fully planned yet — it is not a verdict on the coordinator, and the Manager's view should never make that ambiguous.

**Outstanding work:** cross-shift, cross-event visibility — outstanding tasks, pending verifications, training/SOP completion at the aggregate level, recurring missed items surfaced as patterns worth a conversation, not as a tally against any one person.

**Recognition:** reviewing what happened over the last shift or week, a Manager can formally recognize a well-executed event or a team's handling of a hard one — visible to the people it's about, not buried in an admin log only leadership ever opens.

**Coaching opportunities:** a pattern surfaces — something keeps slipping, somewhere. The first question POURMP should help a Manager ask is "is this a person or a process problem," and it should be just as easy to act on either answer.

### Event Coordinator

This walks the same five stages as [PERFECT_EVENT_WORKFLOW.md](PERFECT_EVENT_WORKFLOW.md), described here as a feeling rather than a process:

- **Lead handed off from Toast:** creating the event should ask for exactly what's needed and nothing more — the facts already confirmed in Toast, copied over once, never re-asked for later.
- **Planning:** everything about this one event lives in the Workspace. A coordinator picking this event back up after a week away shouldn't need to reconstruct context from memory — the Timeline already tells the story of what's happened.
- **Preparation:** Prep Docs are one click from the event itself (once the Workspace navigation gap closes), already correct, because the underlying facts were only ever entered once.
- **Execution:** the day arrives, and the event is simply *there* on Today's view — no searching, no remembering which events are today's.
- **Debrief:** a natural last step, not a chore squeezed in after everyone's already moved on — and if this client has booked before, their history is already surfaced, not something the coordinator has to go dig up.

The feeling this stage should produce, end to end: **nothing was ever entered twice, and nothing was ever lost between one stage and the next.**

---

## Dashboard Philosophy

Every dashboard in POURMP should be able to answer, for every single element on it: *does this help someone do their job today?* If the honest answer is no, it doesn't belong there, no matter how interesting it is.

**What belongs:** anything that changes meaningfully day to day and implies a next step — a risk flag, an outstanding task count, an upcoming deadline, a pending verification.

**What should never appear:** static reference data (a package's ingredient list, a client's contact details, a venue policy) — that lives one click away in the relevant Workspace tab or Settings, not on a screen someone glances at ten times a day. Raw data dumps — a dashboard shows a conclusion ("3 events need a deposit"), never the full underlying table someone then has to read to find the conclusion themselves. And anything that would look identical whether checked this morning or last week — if nothing changes, it's not dashboard material.

Every item on a dashboard falls into exactly one of four kinds, and a good dashboard is honest with itself about which kind each element is:

- **Action** — requires a human decision today (an unassigned task, an overdue deposit flag).
- **Reference** — a stable fact someone might need mid-task, but doesn't act on directly (an event's space, a phone number).
- **Historical** — what already happened (a past event, a completed debrief) — valuable for pattern and context, not for action.
- **Derived** — a computed signal (Readiness, Risk, Bar Impact) — always freshly calculated, never a stored number that can go stale.

A dashboard that's mostly Reference or Historical material is a filing cabinet, not a dashboard. The proportion of Action items is the honest measure of whether a given screen is earning the word "dashboard" at all.

---

## Notification Philosophy

The standard for every notification POURMP ever sends: **would silence here cause someone to miss something time-sensitive that they wouldn't otherwise see?** If yes, notify. If they'd see the same thing anyway the next time they naturally open the app, don't send it — a notification that duplicates what a dashboard already shows isn't helpful, it's noise with a badge count attached.

Concretely:
- Notify on a **state change that requires a decision** — a risk flag crossing into High, a deposit deadline arriving, a task about to become overdue with enough lead time to still act on it.
- Do **not** notify on **routine confirmations of things going as planned** — a task being completed on schedule, a note being logged, anything that's simply "working as intended."
- **Batch, don't trickle.** A pile of small updates should arrive as one digest a person can scan in five seconds, not five separate interruptions across an hour.
- **Every notification should be actionable from where it lands** — a tap should go straight to the thing that needs attention, never to a general list the person then has to search.

Notification fatigue isn't caused by having "too many" notifications in the abstract — it's caused by notifications that didn't need to exist. The fix is a stricter bar for what fires, not a smarter way to display a large volume of them.

---

## Daily Experience

**What does a great shift feel like, using POURMP?**

It feels quiet. A Team Member opens the app, sees a short, clear list of exactly what's theirs, and watches it shrink over the course of the shift with nothing extra competing for their attention. A Shift Lead glances at the floor's shape once an hour, not because they have to dig for it, but because it's already sitting there in one place — and when something's genuinely off, it's impossible to miss, not buried among things that are fine. A Manager opens one screen in the morning and knows, within thirty seconds, exactly where their attention is needed today and nowhere else. A Coordinator moves an event from a Toast confirmation to a fully executed evening without ever re-typing a fact they already entered once, without ever wondering whether the kitchen has the current headcount, and without a single moment of "wait, did anyone check that?"

Nobody feels watched. Everybody can see, at a glance, whose job something is. Good work is visible and gets said out loud, in the app, the same day it happens — not filed away for a review three months later. When the shift ends, the debrief takes two minutes because everything worth remembering was already captured as it happened, not reconstructed from memory at close.

The app should feel less like a system being checked, and more like a second brain nobody dreads opening.

---

## Five User Experience Principles

1. **Reduce clicks.** The correct action should also be the fastest one — if doing the right thing takes more taps than doing nothing, people will do nothing.
2. **Surface exceptions.** Show what's unusual, not what's normal. A screen full of green checkmarks is wasted attention; a screen with one red flag on an otherwise quiet day is exactly right.
3. **Keep context.** Nobody picking up an event mid-stream should have to reconstruct what already happened — the Timeline, the Notes, the Debrief history exist so context survives staff turnover and shift changes.
4. **Show ownership.** Every piece of work should make it obvious, without asking, whose job it is — not to assign blame, but so nothing falls through a gap between two people who each assumed the other had it.
5. **Celebrate completion.** Finishing something should feel like finishing something — visibly, immediately, not silently swallowed into a list that looks the same whether it's done or not.

**Additions, specific to what this project has already learned building POURMP:**

6. **Never ask twice.** If a fact was already entered once — anywhere — the system should never ask for it again. Every re-entry point found and closed this session (guest count, catering facts, client contact) was a violation of this principle first, and a data-integrity bug second.
7. **Show the story, not just the state.** A single status field ("Confirmed") answers less than a timeline of how it got there. Where the two are in tension, prefer the story — it's what makes an event pickup-able by someone who wasn't there for the first half of it.
8. **Silence is a feature.** The absence of a notification should be trustworthy — someone should be able to infer "nothing needs me right now" from a quiet phone, not have to double-check because the app cries wolf.
9. **Separate the event from the person.** A readiness score, a risk flag, a missed checklist item — none of these are a verdict on someone's competence, and the interface should never make them look like one.

---

*No implementation, no roadmap edits, and no commits in this document. Awaiting review.*
