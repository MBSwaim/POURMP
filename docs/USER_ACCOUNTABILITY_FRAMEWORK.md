# User Roles & Accountability Framework

*Design document only. No code, no commits, no roadmap changes. This defines how users, permissions, ownership, task completion, verification, and accountability work across every current and future POURMP module — a shared foundational service, not a feature of any one module.*

Related: [V1_BLUEPRINT.md](V1_BLUEPRINT.md) · [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) · [ROADMAP.md](ROADMAP.md)

**A dependency stated up front, not buried:** almost everything below assumes real user accounts exist. They don't yet — `staff_members` is a directory, not a login system, and "Authentication & multi-user accounts" is still an unbuilt Version 1.0 Goal in `ROADMAP.md`. This framework is the specification that work should build toward, not a description of something already running. Where something below can be partially true today, that's noted explicitly.

---

## Core Philosophy

POURMP exists to reinforce Manhattan Project's Core Values operationally, not just print them on a wall. Translated into what this framework actually does:

- **Ownership** — every operational item has a clear, visible owner, by default, without anyone having to ask "whose job was this?"
- **Passion for Excellence** — recognition is a first-class mechanism, not an afterthought bolted onto a task list. Excellent work should be as easy to celebrate as a gap is to spot.
- **Truth** — the system records what actually happened, not what was supposed to happen. Verification exists to confirm reality, not to create paperwork that can be filled in without looking.
- **Respect** — accountability is separated from blame. The system surfaces facts; how a manager has a conversation about those facts is a human judgment, not something POURMP automates or scores.
- **Positive Energy** — visibility cuts both directions. A tool that only ever flags problems teaches people to dread opening it.
- **Understands Quality** — verification is targeted at the work where quality genuinely needs a second set of eyes, not applied uniformly as a bureaucratic default.

**The goal is operational ownership, coaching, consistency, and recognition. It is explicitly not surveillance.**

---

## 1. User Roles

Described by responsibility, not title. Titles are provided only as a familiar label.

**Team Member** — *responsible for executing the work assigned to them, accurately and on time.* Views their own assignments and the shared event/shift data needed to do the work. Creates timeline entries, notes, task completions, debrief input, training/quiz responses, SOP acknowledgements. Edits only their own in-progress work. Cannot assign work to others, cannot verify or approve anyone's work (including their own), and has no visibility into other staff's performance data.

**Shift Lead** — *responsible for a single shift or event's execution from open to close.* Everything a Team Member can do, plus: assign tasks to specific people or roles for that shift/event, verify completion of tasks done by others, log the event-level decisions that matter for continuity (Communication Timeline, Debrief), and see the full readiness/risk picture for what they're running today. A Shift Lead's authority is scoped to *what they're actively running*, not a standing department.

**Manager** — *responsible for an operational area over time* (a department across shifts, or the event pipeline as a whole) rather than a single shift. Everything a Shift Lead can do, plus: view trends across multiple shifts/events/staff, formally recognize excellent work, open a coaching conversation with a documented trail, adjust configuration that affects how work gets done (packages, staffing patterns), and approve exceptions a Shift Lead can't unilaterally decide.

**Administrator** — *responsible for the system itself.* Everything a Manager can do, plus: manage accounts and role assignments, configure system-wide settings, and access anything for support or troubleshooting.

Two things are deliberately kept separate and should not be collapsed into one hierarchy:
- **Authority level** (the four roles above) — what you're allowed to do.
- **Functional department** (Lead / Kitchen / Bar / FOH — already how `event_tasks` assigns work today) — what *kind* of work you do. A Team Member can work Kitchen, Bar, or FOH; a Shift Lead can run a shift regardless of which department they came up through. These two axes answer different questions and neither should be inferred from the other.

---

## 2. Permissions

| Role | View | Create | Edit | Approve | Verify | Assign | Report |
|---|---|---|---|---|---|---|---|
| **Team Member** | Own assignments; shared data for events/shifts they're working | Timeline entries, notes, debrief input, quiz/training responses, SOP acknowledgements | Their own in-progress work only | — | — | — | — |
| **Shift Lead** | Everything above, plus the full picture for their shift/event | Everything above, plus task assignments for their shift | Any task/checklist item within their shift/event | — | Task and checklist completion done by others on their shift | Tasks to specific people or roles, scoped to their shift/event | Shift-level ("what happened on this shift") |
| **Manager** | Cross-shift/cross-event trends for their area; individual records within their area | Everything above, plus package/staffing configuration | Settings within their operational area | Exceptions and schedule changes within their area | A Shift Lead's verification, when a second check is warranted | Shift Leads to shifts/events | Leadership Dashboard views scoped to their area |
| **Administrator** | Everything, system-wide | Everything, including accounts | Everything | Everything | Everything | Everything | Everything, unscoped |

**Design intent, not just a table:** permission scope narrows to "your own" at the Team Member level and widens by *area of responsibility*, not by raw authority — a Manager sees trends because they own an area over time, not because they outrank someone. This keeps the model honest to "ownership," not hierarchy for its own sake.

---

## 3. Ownership Model

Every operational item — a task, a checklist entry, a training module, a quiz, an SOP acknowledgement, an event-readiness item, a shift note — answers the same four questions, regardless of what kind of item it is:

1. **Who owns it?**
2. **When was it assigned?**
3. **When was it completed?**
4. **Who verified it (if verification is required)?**

This is the same discipline POURMP already applies to calculations ("one calculation, many consumers," per `DEVELOPMENT_GUIDE.md`) applied to accountability instead: one ownership shape, reused everywhere, rather than a bespoke tracking mechanism invented per feature.

**What already partially exists today**, without auth: `event_tasks` already has `completed`/`completed_at` and a `role` (department, not a person). `reservations.assigned_staff_id` is the one place a specific person is already assigned to something. `event_communications.staff_id` exists in the schema, deliberately unused, waiting for real accounts. None of these currently have a `verified_by` concept — that's new, and depends on accounts existing.

### Which work requires verification, and which doesn't

Verification is not applied uniformly — that would recreate the exact "unnecessary administrative work" this framework exists to avoid. It applies when at least one of these is true:

- **The work is safety- or guest-experience-critical with no room for silent failure** — a locked final headcount, a finalized menu, a setup-checklist item like a secured garage door or a safety boundary.
- **The person doing the work is still building trust in that task type** — verification here is coaching-shaped and temporary, not a permanent gate.
- **The consequence of an unnoticed miss is high and hard to reverse** — something that can't be quietly fixed once the event starts.

It does **not** apply to routine, low-stakes, easily-observable-in-context work — a logged communication note, a routine internal note, most day-to-day task completions where the result is visible to everyone on the floor anyway. Requiring sign-off on everything doesn't increase truth; it just adds friction until people stop taking it seriously.

---

## 4. Accountability

One consistent model, applied identically across Tasks, Checklists, Training, Quizzes, SOP acknowledgements, Event readiness, and Shift notes — not seven different tracking systems that happen to look similar.

**Ownership should be visible as a byproduct of doing the work, not a separate ritual.** Completing a task should automatically and invisibly record who did it and when — no extra "sign off" step for routine items. Only the subset of work identified above as needing verification gets an additional, deliberate step, and that step should be as fast as this project's own Communication Timeline pattern already proved out: one click for the common case, an optional note only when it adds real information.

Concretely, per content type:
- **Tasks / Checklists** — owner + timestamp already exist in shape (`event_tasks`); verification is a new, optional second signature for the flagged subset above.
- **Training / Quizzes** — completion is the "assigned → completed" pair; a quiz's correctness is its own verification, no separate manager sign-off needed unless the training is safety-critical.
- **SOP acknowledgements** — a single-click "I've read and understand this," timestamped, per person. No re-verification needed once acknowledged, until the SOP itself changes.
- **Event readiness** — already exists today as `calcReadiness()`, and already deliberately answers "is the event ready," not "is this person doing well." That distinction matters — see Leadership Visibility below.
- **Shift notes** — already exists in spirit as the Communication Timeline / Internal Notes pattern; ownership is implicit in who logged the entry.

---

## 5. Recognition vs. Coaching

Explicitly not punitive. Two distinct, asymmetric mechanisms — recognition should be *easier* to give than a coaching flag, not equally weighted.

**Recognition** is lightweight and fast: a Shift Lead or Manager can mark a specific piece of work — a task, a shift, a whole event — as well-executed, with an optional note for specifics, using the same one-click-plus-optional-note interaction the Communication Timeline already established. Recognition is visible to the person it's about and, where appropriate, shareable — celebrated, not filed away silently.

**Coaching** is forward-looking, not backward-blaming, and operates on *patterns*, not single incidents. When something recurs — a checklist item that's frequently skipped, a task type that's often late — POURMP's job is to surface the pattern to a Manager as a conversation-starter ("this keeps happening venue-wide" or "this keeps happening on this person's shifts"), never to auto-generate a strike against an individual. Coaching notes are private between the Manager and the person involved — not a permanent public record visible leadership-wide, and not something that follows someone around outside the context it was meant for. Where a pattern is about a *process* (a task that's confusing, a checklist item nobody understands the point of), the system should make it just as easy to conclude "fix the process" as "coach the person" — those are very different conversations, and POURMP shouldn't default to the second.

**No scores, ever.** No point totals, no leaderboards, no single number attached to a person that aggregates their performance. The moment recognition and coaching data get netted into one score, the whole framework becomes exactly the surveillance tool the Core Philosophy explicitly rejects.

---

## 6. Leadership Visibility

What a Manager should see — operational information, not a personnel file:

- **Outstanding tasks** — already exists in shape via the Operational Dashboard's task-completion buckets; extends naturally to "outstanding training/SOP items" once those modules exist.
- **Verification status** — which flagged items are pending a second check, across shifts/events, so nothing sits unverified silently.
- **Training completion** — who's completed what, at the module level (not "how did they do" beyond pass/fail on anything actually gated).
- **Daily quiz participation** — did today's team engage with the day's material, aggregated, not ranked.
- **Recurring missed items** — the pattern data that feeds Coaching above, presented as "this keeps happening," not "this person keeps failing."
- **Operational readiness** — already exists today as the Readiness Score, and it's worth restating precisely because it's easy to misread: **this is a property of an event, not a person.** A 57% readiness score means the *event* isn't fully planned; it says nothing about whether the coordinator working it is doing a good job. Leadership Visibility must never blur that line — an under-planned event and an underperforming person are different problems requiring different conversations, and conflating them is exactly how this kind of system turns punitive by accident.

This is the same information the already-deferred **Leadership Dashboard** module (`V1_BLUEPRINT.md`) would eventually surface — this framework is that module's underlying data model, not a competing view.

---

## 7. Future Expansion

The reason this is designed as one ownership shape (owner, assigned-at, completed-at, verified-by) plus one role hierarchy (Team Member / Shift Lead / Manager / Administrator), rather than bespoke logic per feature, is so future modules plug into it without redesigning permissions:

- **Training** — a course or quiz is just another item with an owner (the learner), an assignment, and a completion — same shape as a task, no new permission concept needed.
- **Scheduling** — a shift assignment has an owner and an assigned-at; "clocked in/out" is a natural completed-at analog. Reuses the model directly.
- **Daily Operations** — shift notes and checklists already fit the shape today.
- **Events** — already the best-covered case: `event_tasks`, the Communication Timeline, and Debrief all already express this shape, just without formal per-person ownership until accounts exist.
- **Leadership** — the Leadership Dashboard is a read-only rollup over the same ownership records across all the above domains. It needs no permission system of its own; it inherits the Manager-level view already defined in §2.

Nothing about adding a new module to this list should require touching the role hierarchy or the permissions table above — that's the test for whether this framework is actually foundational, or just convenient for the first module that used it.

---

## Guiding Principle (restated)

**Accountability requires visibility.** Every piece of work should carry:

- A clear owner
- A completion record
- Verification, when — and only when — it's warranted
- Recognition for excellence
- Coaching opportunities when needed

The objective throughout is to strengthen operational ownership while minimizing administrative overhead — not to build a system anyone dreads opening.

---

*No implementation, no roadmap edits, and no commits in this document. Awaiting review.*
