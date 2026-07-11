# POURMP

**Planning • Operations • Unified • Readiness Platform**

**Manhattan Project Beer Company's Internal Events & Reservations Operations Platform**

Related: [README.md](README.md) · [BRAND_GUIDE.md](BRAND_GUIDE.md) · [ROADMAP.md](ROADMAP.md)

This document is the guiding philosophy behind POURMP — why it exists, what it's for, and how to decide whether a proposed change belongs in it. It is the foundation every other document in this project builds on, and it should be read before any future feature is planned. When a decision about POURMP's direction is unclear, this document — not a feature request — is the tiebreaker.

---

## Core Purpose

People deserve exceptional hospitality.

Exceptional hospitality is never accidental. It is the result of exceptional preparation.

POURMP exists to make that preparation consistent, organized, efficient, and repeatable by providing one unified operational platform for planning, preparing, communicating, and executing private events and reservations.

The platform exists to reduce unnecessary work, eliminate repetitive data entry, improve communication, increase operational visibility, preserve institutional knowledge, and help every team member deliver an exceptional guest experience.

## Mission Statement

POURMP exists to simplify, standardize, and elevate the planning and execution of private events and reservations at Manhattan Project Beer Company by bringing operational readiness, communication, task management, sales visibility, and event intelligence into one unified platform.

POURMP works alongside Toast Catering & Events.

Toast remains the official system of record for:

- Leads
- Customer information
- Proposals
- Invoices
- Deposits
- Payments
- Customer-facing communication

POURMP transforms event information into operational plans, task management, preparation documents, leadership visibility, and consistent event execution.

The short version: **Toast records the event. POURMP prepares the team.**

**[V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) is the authoritative, current definition of what this means in practice for Version 1.0** — which modules POURMP owns, which fields and features were found to duplicate Toast and are being simplified or removed, and what's deliberately out of scope until after 1.0. It was produced by applying this document's philosophy to a full audit of the codebase (see [V1_REALIGNMENT_REVIEW.md](V1_REALIGNMENT_REVIEW.md)) and now governs any scope question this document is too high-level to answer on its own.

## Vision

POURMP is designed to become the operational standard for private events and reservations at Manhattan Project Beer Company.

Every feature should support one or more of the following objectives:

- Reduce duplicate work.
- Eliminate repetitive data entry.
- Standardize event execution.
- Improve communication across departments.
- Increase operational readiness.
- Improve leadership visibility.
- Improve decision-making.
- Preserve institutional knowledge.
- Work alongside Toast rather than replacing it.
- Help every event deliver an exceptional guest experience.

## Development Philosophy

Before any new feature is added, ask the following question:

> **"Does this make planning easier, execution smoother, communication clearer, operational visibility stronger, or the guest experience better?"**

If the answer is no, reconsider whether the feature belongs in POURMP.

This is the test every entry in [ROADMAP.md](ROADMAP.md) should already pass, and the test every new feature proposal should be measured against before it's added there.

## Design Principles

Every part of POURMP should be:

- Professional
- Simple
- Fast
- Intuitive
- Operationally focused
- Consistent
- Easy to train
- Easy to maintain
- Scalable
- Built for hospitality professionals

The application should always prioritize clarity over complexity.

Automation should support the team, not replace good judgment.

Information should be entered once and reused everywhere possible. This is not just a design preference — it is the specific architectural principle already documented in [ARCHITECTURE.md](ARCHITECTURE.md) and [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md): one calculation, one shared model, many consumers. Every place in the codebase where that principle has been violated and later fixed (see [CHANGELOG.md](CHANGELOG.md)) is evidence of why it matters, not just an ideal.

Every module should contribute to operational excellence.

## Long-Term Vision

POURMP should become the central internal operations platform for Manhattan Project Beer Company.

As the platform grows, it should support:

- Private Events
- Table Reservations
- Event Coordination
- Operational Planning
- Task Management
- Prep Documentation
- Sales Visibility
- Risk Management
- Leadership Reporting
- Future operational tools

The goal is not to replace Toast.

The goal is to make every event easier to plan, easier to execute, easier to manage, and more consistent for both the team and our guests.

See [V1_FEATURE_LOCK.md](V1_FEATURE_LOCK.md) for the authoritative Version 1.0 scope, and [ROADMAP.md](ROADMAP.md) for the tactical, living checklist of what's left to build toward it — both are the actionable expression of the philosophy stated here.

## Brand Identity

The following statement is the guiding principle behind POURMP, and the reason the platform exists:

> **Exceptional hospitality is never accidental. It is the result of exceptional preparation.**

This statement should be used sparingly and deliberately — as a foundational reminder of purpose, not a repeated slogan. Its intended placements are:

- The Dashboard welcome area, beneath the POURMP title
- [README.md](README.md)
- This document
- Future presentation materials

**Implementation note:** this statement appears in [README.md](README.md), here in VISION.md, and in the application itself — a single quiet line beneath the "Dashboard" title on the Dashboard page (`src/app/page.tsx`), in small italic serif (Crimson Text) at a fraction of the title's size, with no bold, no box, and no other visual weight competing with the page's actual content. It should not be added anywhere else in the UI beyond this one placement.

---

*This document is the foundation for future development decisions and should remain part of the project's permanent documentation. See [INDEX.md](INDEX.md) for the full documentation set.*
