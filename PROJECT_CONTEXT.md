# POURMP — Manhattan Project Beer Co. Event Management System

## What This App Does

POURMP is an internal private-event management platform for **Manhattan Project Beer Co.** (MPBC). It covers the full event lifecycle:

- **Lead capture** — public-facing customer booking form (`/book`) creates leads staff can review
- **Event pipeline** — Kanban board tracks events from New → Contacted → Converted → Tentative → Confirmed → Closed
- **Event management** — full detail view with catering calculator, payment tracking, add-ons, and activity log
- **Proposal PDF** — client-facing proposal generated from event data via `@react-pdf/renderer`
- **Calendar** — month view of all events + blocked dates
- **Reservations** — lightweight table-reservation log for small parties (1–19 guests)
- **Analytics** — year-over-year revenue dashboard with monthly breakdown chart
- **Archive** — read-only view of closed/historical events

This is a **staff-only internal tool** — no authentication, no multi-tenancy. Runs locally.

---

## Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | SQLite via `better-sqlite3` — file at `data/mpbc.db` |
| Styling | Tailwind CSS + shadcn/ui components |
| PDF | `@react-pdf/renderer` |
| Toasts | `sonner` |
| Fonts | Josefin Sans (UI) + Crimson Text (body/quotes) |
| Date math | `date-fns` |

**Design tokens:**
- Background: `#0f1e2d` (dark navy)
- Card/sidebar: `#1F3348` (mid navy)
- Accent: `#C8973A` (amber gold)
- Dark theme forced (`<html class="dark">`)

**Key patterns:**
- All DB access is synchronous (better-sqlite3) — called directly in Server Components and API routes
- Client components fetch via API routes (`/api/*`) and call `reload()` to re-fetch from server
- `getDb()` singleton — initializes schema + seeds on first call, stored on `global.__mpbc_db`
- Schema migrations are appended in `initSchema()` as `ALTER TABLE` statements wrapped in try/catch

---

## Routes & Pages

### Internal (sidebar nav)

| Route | Page | Notes |
|---|---|---|
| `/` | Dashboard | Stat cards, new leads, upcoming events, Kanban pipeline |
| `/events` | Events table | Filterable by status via `?status=` query param |
| `/events/new` | New event form | Creates client + event + details + payments in one shot |
| `/events/[id]` | Event detail | 4 tabs: Overview, Catering, Payments, Notes |
| `/calendar` | Calendar | Month view, blocked-date management |
| `/reservations` | Reservations | Small-party table bookings (not private events) |
| `/archive` | Archive | Closed events by year |
| `/analytics` | Analytics | YOY monthly revenue; bar chart + table |
| `/prep/kitchen-sheet` | Kitchen Sheet | **STUB — not built yet** |
| `/prep/beo` | Banquet Event Order | **STUB — not built yet** |
| `/settings` | Settings | **STUB — not built yet** |

### Public (no nav)

| Route | Notes |
|---|---|
| `/book` | Customer-facing event inquiry form — submits to `leads` table |

### API Routes

| Method | Route | Purpose |
|---|---|---|
| GET/POST | `/api/events` | List all events / create new event |
| GET/PATCH/DELETE | `/api/events/[id]` | Fetch, update, or delete event (PATCH accepts `{event, client, details}`) |
| GET | `/api/clients` | List all clients |
| GET | `/api/packages` | List active packages |
| GET/PATCH | `/api/packages/[id]` | Get or update a package |
| POST/DELETE | `/api/add-ons` | Add or remove event add-ons |
| POST | `/api/notes` | Add note to event |
| GET/POST/DELETE | `/api/payments` | List/create/delete payments |
| GET/POST/DELETE | `/api/blocked-dates` | Manage calendar blocked dates |
| GET/POST | `/api/leads` | List leads / submit public form |
| GET/PATCH/DELETE | `/api/leads/[id]` | Update lead status or delete |
| GET/POST | `/api/reservations` | List/create table reservations |
| PATCH/DELETE | `/api/reservations/[id]` | Update or delete reservation |
| GET | `/api/calendar` | Events for a given month |
| GET | `/api/dashboard` | Dashboard aggregate stats |
| GET | `/api/proposals/[id]` | Data for PDF proposal generation |

---

## Database Structure (`data/mpbc.db`)

### `clients`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| first_name | TEXT | |
| last_name | TEXT | |
| email | TEXT | |
| phone | TEXT | |
| company | TEXT | |
| notes | TEXT | |
| referral_source | TEXT | e.g. "Google", "Referral", "Historical" |

### `events`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| event_name | TEXT | |
| event_date | TEXT | ISO date `YYYY-MM-DD` |
| event_time | TEXT | 24-hr `HH:MM` — event start |
| setup_time | TEXT | 24-hr — auto-computed as start − 90 min |
| teardown_time | TEXT | **Repurposed as event_end_time** — start + duration |
| production_close_time | TEXT | start − 120 min (added via migration) |
| decorate_time | TEXT | start − 60 min / customer access (added via migration) |
| event_duration_mins | INTEGER | Default 180; 180 or 240 (added via migration) |
| status | TEXT | New / Contacted / Converted / Tentative / Confirmed / Closed |
| space | TEXT | e.g. "Taproom", "Patio" |
| client_id | INTEGER FK → clients | |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### `event_details`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| event_id | INTEGER UNIQUE FK → events | One-to-one |
| guest_count | INTEGER | |
| package_id | TEXT FK → packages | |
| buffer_pct | REAL | 0.0–1.0 (e.g. 0.1 = 10% buffer) |
| food_notes | TEXT | |
| dietary_restrictions | TEXT | |
| bar_tab_limit | REAL | |
| drink_tickets | INTEGER | Used when bar_tab_type = 'Pre-Paid Drink Ticket(s)' |
| tab_details | TEXT | Auto-filled from bar_tab_type selection |
| staffing_notes | TEXT | |
| contract_signed | INTEGER | 0 or 1 |
| date_flexible | INTEGER | 0 or 1 (added via migration) |
| setup_notes | TEXT | Decorations, A/V, etc. (added via migration) |
| bar_tab_type | TEXT | 'Pre-Paid Drink Ticket(s)' / 'By Consumption' / 'Individual Tabs' (added via migration) |

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| event_id | INTEGER FK → events | |
| payment_type | TEXT | 'deposit' / 'final' / 'other' |
| amount_due | REAL | |
| amount_paid | REAL | |
| due_date | TEXT | ISO date |
| paid_date | TEXT | ISO date |
| status | TEXT | 'pending' / 'paid' / 'overdue' |
| notes | TEXT | |

**Payment auto-generation:** When an event is Confirmed with a package + guest count, two payments are created automatically: 20% deposit (due 7 days before event) and 80% final (due on event date).

### `packages`
6 packages seeded at startup:
| ID | Name | $/guest |
|---|---|---|
| snack_buffet | Snack Buffet | $16 |
| a_la_carte | A La Carte Buffet | $12 |
| arepa_buffet | Arepa Buffet | $17 |
| sliders_buffet | Sliders Buffet | $17 |
| fried_chicken | Fried Chicken Buffet | $18 |
| kabob_buffet | Kabob Buffet | $22 |

### `menu_items`
Per-package items with quantity calculation rules:
- `guests_per_unit` — divide guest count by yield (e.g. 1 platter per 20 guests)
- `pieces_per_guest` — multiply qty_per_guest × guests ÷ yield_per_unit
- `servings_per_guest` — multiply qty_per_guest × guests ÷ yield_per_unit
- `manual` — displayed as "Enter Manually"

Special rule: 2+ half-chafers auto-collapse to 200 Pans.

### `event_add_ons`
Line items added per event (item_name, qty, unit, price_each, notes).

### `event_notes`
Timestamped activity log per event.

### `blocked_dates`
Calendar blackout dates with reason ('Holiday' / 'Company Event') and optional notes.

### `leads`
Public booking form submissions (first_name, last_name, email, phone, event_date, event_type, guest_count, message, status). Status: 'New' / 'Contacted' / 'Converted' / 'Dismissed'.

### `reservations`
Table reservations for parties of 1–19 (below private-event threshold). Separate from events. Statuses: Confirmed / Seated / Completed / Cancelled / No-Show.

---

## Business Rules & Constants (`src/lib/constants.ts`)

- **Deposit:** 20% due 7 days before event
- **Final payment:** 80% due on event date
- **Drink ticket price:** $9.00 each
- **Min booking lead time:** 21 days in advance (enforced in API + UI)
- **Event statuses (ordered):** New → Contacted → Converted → Tentative → Confirmed → Closed
- **Business hours** (`BUSINESS_HOURS`): vary by day of week; events must start ≥ 1 hour after open
- **Overdue payments:** auto-flipped from 'pending' to 'overdue' on every `getEvents()` call

---

## Key Components

| Component | File | Purpose |
|---|---|---|
| `AppShell` | `src/components/AppShell.tsx` | Layout wrapper — renders SideNav for internal routes, plain wrapper for `/book` |
| `SideNav` | `src/components/SideNav.tsx` | Left sidebar nav with collapsible Events and Prep Tools submenus |
| `KanbanBoard` | `src/components/KanbanBoard.tsx` | Drag-free kanban pipeline on dashboard |
| `CateringCalculator` | `src/components/CateringCalculator.tsx` | Renders calculated prep quantities from package + guest count |
| `PaymentPanel` | `src/components/PaymentPanel.tsx` | Payment status display and recording |
| `ProposalPDF` | `src/components/ProposalPDF.tsx` | PDF proposal generator (client-side only, loaded dynamically) |
| `StatusBadge` | `src/components/StatusBadge.tsx` | Colored event status pill |
| `NewLeadsCard` | `src/components/NewLeadsCard.tsx` | Dashboard card showing new/unreviewed leads |
| `UpcomingEventsCard` | `src/components/UpcomingEventsCard.tsx` | Dashboard card for next 14 days of events |

---

## Environment Variables

**None required.** The app is fully self-contained:
- SQLite database lives at `data/mpbc.db` (created automatically on first run)
- No external APIs, auth providers, or services

---

## How to Run

```bash
# Development (standard)
npm run dev
# → http://localhost:3000

# Mac double-click launcher
./start.command
# Starts dev server + opens browser automatically

# Production build
npm run build && npm start
```

**Node path note:** `start.command` hardcodes `/usr/local/bin/node` — update if Node is installed elsewhere (e.g. via nvm → `/Users/the4leafclovr-pc/.nvm/versions/node/.../bin/node`).

---

## Deployment

No deployment pipeline is configured yet. Options:
- **Vercel** — easiest, but SQLite file won't persist between deployments; would need to swap to Turso/LibSQL or Postgres
- **Fly.io / Railway / Render** — can persist a volume-mounted SQLite file
- **Local-only** — current model; runs on a Mac at the venue or office

---

## Current Unfinished Work

### Stubs (UI exists, feature not built)
| Page | What's planned |
|---|---|
| `/prep/kitchen-sheet` | Consolidated prep quantities across all confirmed upcoming events, print-ready |
| `/prep/beo` | Print-ready Banquet Event Order — timeline, food, beverage, staffing |
| `/settings` | Package editor, logo upload, cancellation policy text, default buffer %, tax rate, contact info for PDF footer |

### Known gaps based on git status
All code in the working tree is uncommitted (only 2 commits total — initial scaffold + start.command). The following features were added since initial commit but haven't been committed:

- Analytics page (`/analytics`)
- Blocked dates API + calendar integration
- Leads API + `NewLeadsCard` on dashboard
- Reservations system (page + API)
- Archive page
- Public booking form (`/book`) + leads flow
- `EventsTable` component
- `AppShell` + `SideNav` (nav refactor)
- `timeUtils.ts` (event time auto-computation)
- All the event detail tabs (catering calculator, payments, notes)
- Prep tools section (stubs)

### Ideas captured in Settings page stub
- Tax rate configuration (not currently applied to any totals)
- Logo upload for proposals
- Default buffer percentage
- Editable cancellation policy / general info text (currently hardcoded in `constants.ts`)

---

## Contact / Business Info

- **Business:** Manhattan Project Beer Co.
- **Email:** events@manhattanproject.beer
- **Contact constant:** `MPBC_CONTACT` in `src/lib/constants.ts`
- **Git user:** MBSwaim
