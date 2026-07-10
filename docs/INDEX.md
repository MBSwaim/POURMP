# POURMP — Documentation

**Planning • Operations • Unified • Readiness Platform**

This is the home page for POURMP's project documentation. Start with [README.md](README.md) if you're new here; otherwise jump straight to what you need below.

---

## Overview

| Doc | What's in it |
|---|---|
| **[README.md](README.md)** | Project overview — purpose, mission, primary users, relationship to Toast and to Manhattan Project Beer Co., core features, current version, future vision |
| **[VISION.md](VISION.md)** | The guiding philosophy behind POURMP — core purpose, mission, vision, development philosophy, design principles, long-term vision, and brand identity. The foundation every other document and every future feature decision builds on |

## Project History & Direction

| Doc | What's in it |
|---|---|
| **[VERSION_HISTORY.md](VERSION_HISTORY.md)** | Narrative version-by-version summary of everything built so far, and the recommended current version |
| **[CHANGELOG.md](CHANGELOG.md)** | The formal, official running history — Features Added, Improvements, Bug Fixes, Architectural Changes, organized by version |
| **[ROADMAP.md](ROADMAP.md)** | What's required before Version 1.0, what's planned right after, and long-term ideas |
| **[VERSIONING.md](VERSIONING.md)** | The process to follow for every future version bump — how to number it, what to document, and how |

## For Staff

| Doc | What's in it |
|---|---|
| **[OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md)** | How an Event Coordinator uses POURMP through the full life of an event — creating it, planning, menu selection, floor plans, tasks, Prep Docs, Toast Notes, kitchen coordination, day-of execution, breakdown, and closing it out |

## For Developers

| Doc | What's in it |
|---|---|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | How the Dashboard, Operations, Event Records, Reservations, Catering, Floor Plans, Tasks, Prep Docs, Risk Scanner, Main Bar Impact, Sales Tracking, and Analytics modules fit together, how data flows between them, and the shared models that keep them in sync |
| **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)** | Folder structure, naming conventions, shared data models, task generation, Prep Docs generation, dashboard calculations, Risk Scanner architecture, and best practices for contributors |

## Brand

| Doc | What's in it |
|---|---|
| **[BRAND_GUIDE.md](BRAND_GUIDE.md)** | The POURMP name and meaning, brand voice, design philosophy, typography, colors, icons, and UI/naming consistency rules |

---

## A note on where these docs live

All of the above lives in `docs/` at the project root, alongside the application source in `src/`. Nothing in this folder affects application behavior — it's documentation only. If a doc here and the running application ever disagree, the application is correct and the doc needs updating — file that as part of whatever change caused the drift, per [VERSIONING.md](VERSIONING.md).
