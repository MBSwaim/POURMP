# POURMP — Brand Guide

Related: [README.md](README.md) · [VISION.md](VISION.md) · [ARCHITECTURE.md](ARCHITECTURE.md)

## Official Name

**POURMP**

## Meaning

**P**lanning • **O**perations • **U**nified • **R**eadiness **M**anagement **P**latform

*(rendered as the acronym expansion: Planning • Operations • Unified • Readiness Platform)*

## Subtitle

**Manhattan Project Beer Company's Internal Events & Reservations Operations Platform**

> **Consistency note:** the current codebase's tooltip text (`AppShell.tsx`, `SideNav.tsx`) and page metadata (`layout.tsx`) read *"Manhattan Project's Internal Events & Reservations Operations System"* — shorter ("Manhattan Project's" rather than "Manhattan Project Beer Company's") and using "System" rather than "Platform." This guide establishes the full wording above as canonical going forward — this drift should be reconciled the next time those files are touched for any other reason. This document does not modify code.

## Core Statement

> **Exceptional hospitality is never accidental. It is the result of exceptional preparation.**

This is the single guiding statement behind why POURMP exists — the reasoning is laid out in full in [VISION.md](VISION.md). Use it sparingly: it belongs at most once per surface (the README, the Dashboard welcome area, presentation materials) as a foundational reminder of purpose, never as a repeated slogan or tagline sprinkled throughout the UI.

## Brand Voice

POURMP speaks the way an experienced ops lead talks to their own team: direct, plain, and specific. No marketing language, no exclamation points, no vague reassurance.

- **Instructional, not promotional.** Copy tells staff exactly what to do — *"Confirm with the client that MP is the exclusive caterer,"* not *"Great job keeping things on track!"*
- **Precise about certainty.** The Policy Conflict risk rules are explicitly labeled best-effort in the code, not asserted as fact. Say what you know and flag what you're guessing at.
- **Internal-facing by default.** Every surface except the `/book` inquiry form assumes the reader is Manhattan Project staff, not a customer — so it can and should use venue-specific shorthand (chafers, half-chafers, "the main bar," Toast) without over-explaining it.
- **Calm under real stakes.** Even the most severe language in the app — "OVER CAPACITY — exceeds 75-guest maximum. Do not confirm without owner approval." — is a flat statement of fact and an instruction, not an alarm.

## Design Philosophy

POURMP is a light, clean, utilitarian interface: white cards on a warm off-white background, with the gold accent reserved for what actually matters — active navigation, key numbers, primary actions — rather than spread across the whole page. It should read as *operational*, not decorative: the uppercase, letter-spaced headings give it a slightly official, dashboard-like feel appropriate for a tool staff will glance at mid-shift, not linger in.

Printable documents get their own deliberate typographic treatment (see Typography below) because they leave the screen entirely — a Kitchen Sheet or BEO is handed to someone as a physical page, so it's built print-first: `@page` CSS, MP-branded masthead, and a serif body face chosen for legibility on paper.

## Typography

| Face | Role |
|---|---|
| **Josefin Sans** (`--font-josefin`) | Headings, navigation, labels, buttons, and section titles. `h1`/`h2` render uppercase with wide tracking (`letter-spacing: 0.06em`); `h3`–`h6` use tighter tracking, same uppercase treatment. This is the "operational" voice of the UI. |
| **Crimson Text** (`--font-crimson`) | Body copy, longer descriptive text, and quoted/printed content — supports regular and italic in two weights (400/600). This is the "readable" voice, used deliberately wherever there's real prose to read (proposal-style text, printable doc body copy, longer notes). |

Base body text uses Josefin Sans at normal case with slight letter-spacing (`0.01em`) for on-screen UI; Crimson Text is reserved for where it earns its serif — printable documents and longer text blocks.

## Colors

| Token | Value | Use |
|---|---|---|
| **Gold** (`--primary`, `gold`) | `#C8973A` | The one accent color. Active nav indicator, key stat numbers, primary buttons, section-label uppercase text, focus rings. Used sparingly — it marks what's important, not what's decorative. |
| **Navy** (`navy` token) | `#1F3348` | Deep secondary tone — brand mark, some structural accents. |
| **Foreground / body text** | `#16202c` | Primary text color across the app. |
| **Background** | `#f9f8f6` / HSL `210 20% 98%` | The warm off-white app background every page sits on. |
| **Card / surface** | White | Every content card, table, and panel. |
| **Selection** | `rgba(200, 151, 58, 0.3)` | Gold-tinted text selection — a small, deliberate branding touch. |

**Status/severity color convention** — reused identically across the Event Risk Scanner, Task Complexity score, and Main Bar Impact rating, so severity always *looks* the same no matter which module is showing it:

| Level | Background | Text | Border |
|---|---|---|---|
| Low / Confirmed | `bg-green-50` | `text-green-700` | `border-green-200` |
| Moderate / Planning | `bg-yellow-50` / `bg-blue-500` (Kanban) | `text-yellow-700` | `border-yellow-200` |
| High / Ready | `bg-orange-50` | `text-orange-700` | `border-orange-200` |
| Critical / Active | `bg-red-50` | `text-red-700` | `border-red-200` |

**Any new severity/status indicator should reuse this exact bg-50/text-700/border-200 pattern rather than introduce a new color scale** — this is called out directly in the codebase's own comments as an intentional, shared convention (see [ARCHITECTURE.md](ARCHITECTURE.md) and [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)).

## Icons

POURMP uses **emoji, not a custom icon set**, for every feature-level icon a user actually sees: 📋 Toast Notes, 🗓️ Pre-Shift Brief, 🍺 Main Bar Impact, 🕐 Run of Show, 🍳 Kitchen Sheet, 🪑 FOH Notes, 📌 Bar Notes, 🗝️ Leads Pack, 📦 Handoff Pack, ✅ Setup Checklist, 📝 Debrief, 📅 date navigation, ⚠ warnings, ☐/☑ task checkboxes.

`lucide-react` is a dependency, but it is scoped **only** to shadcn/ui's internal primitives (the checkmark inside a checkbox, the close X on a dialog, a select dropdown's chevron) — it is never used for a feature icon, a nav item, or anything brand-facing. Keep it that way: if a new feature needs an icon a user will notice, reach for an emoji consistent with the existing set, not an SVG icon library.

## UI Consistency

- **One accent color.** Gold is the only color used to mean "this is active/important/actionable." Don't introduce a second accent color for a new feature — reuse gold, or fall back to the shared severity scale above.
- **One severity scale.** See Colors above — Risk Scanner, Task Complexity, and Main Bar Impact all render severity with the same four-tier scale. A new severity-style indicator should match it exactly.
- **Uppercase, tracked headings; sentence-case body copy.** Don't mix the two conventions within one component.
- **Printable documents share one wrapper.** Every printable Prep Doc renders through the same `PrintDoc` component (masthead, print CSS, MP branding) — a new printable document should use it rather than building its own header treatment.
- **Emoji for feature icons, not SVGs.** See Icons above.

## Naming Conventions (Brand-Level)

- Write it **POURMP** — all caps, one word. Never "PourMP," "Pourmp," or "Pour MP."
- The document suite is called **Prep Docs** (not "Prep Tools," an earlier internal name that's no longer accurate — see [CHANGELOG.md](CHANGELOG.md) 0.1–0.2).
- **Toast** always refers to the third-party product, Toast Catering & Events — never write "the Toast system" or "our Toast" as if it's part of POURMP. POURMP and Toast are two distinct systems that work alongside each other (see [README.md](README.md)).
- Refer to the venue as **Manhattan Project Beer Co.** on first mention in a document, **MP** or **Manhattan Project** afterward — matching how the codebase itself abbreviates it (`MPBC_CONTACT`, `production_close_time`, etc.).
