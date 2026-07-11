import Database from 'better-sqlite3'
import path from 'path'
import { seedDatabase, seedHistoricalEvents } from './seed'
import { addDays, format } from 'date-fns'
import { calcBarImpact } from './barImpact'
import { calcReadiness } from './readiness'
import { generateTasksForEvent, CRITICAL_DYNAMIC_TASK_KEYS, type TaskContext } from './tasks'
import { scanEventRisks, highestRiskLevel, type RiskFlag, type RiskLevel } from './riskScanner'
import type { EventForNotes } from './noteGenerators'

declare global {
  // eslint-disable-next-line no-var
  var __mpbc_db: Database.Database | undefined
}

function getDb(): Database.Database {
  if (!global.__mpbc_db) {
    const dbPath = path.join(process.cwd(), 'data', 'mpbc.db')
    // ensure data dir exists
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs')
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    global.__mpbc_db = new Database(dbPath)
    global.__mpbc_db.pragma('journal_mode = WAL')
    global.__mpbc_db.pragma('foreign_keys = ON')
    initSchema(global.__mpbc_db)
    seedDatabase(global.__mpbc_db)
    seedHistoricalEvents(global.__mpbc_db)
  }
  return global.__mpbc_db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      company TEXT,
      notes TEXT,
      referral_source TEXT
    );
    -- company is kept as an operational field (host identity for company/group-booked
    -- events); notes and referral_source are dropped below as CRM data with no
    -- execution value (see docs/V1_FEATURE_LOCK.md §5.2).

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT,
      event_date TEXT,
      event_time TEXT,
      setup_time TEXT,
      teardown_time TEXT,
      status TEXT DEFAULT 'New',
      space TEXT,
      client_id INTEGER REFERENCES clients(id),
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS event_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER UNIQUE REFERENCES events(id) ON DELETE CASCADE,
      guest_count INTEGER,
      package_id TEXT,
      buffer_pct REAL DEFAULT 0,
      food_notes TEXT,
      dietary_restrictions TEXT,
      bar_tab_limit REAL,
      drink_tickets INTEGER,
      tab_details TEXT,
      staffing_notes TEXT,
      contract_signed INTEGER DEFAULT 0,
      date_flexible INTEGER DEFAULT 0,
      setup_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      name TEXT,
      price_per_guest REAL,
      description TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id TEXT REFERENCES packages(id),
      item_name TEXT,
      calc_method TEXT,
      qty_per_guest REAL,
      yield_per_unit REAL,
      unit_name TEXT,
      sort_order INTEGER DEFAULT 0,
      UNIQUE(package_id, item_name, sort_order)
    );

    CREATE TABLE IF NOT EXISTS event_add_ons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      item_name TEXT,
      qty REAL,
      unit TEXT,
      price_each REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS event_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      note TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS blocked_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      reason TEXT NOT NULL DEFAULT 'Holiday',
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      event_date TEXT,
      event_type TEXT,
      guest_count INTEGER,
      message TEXT,
      status TEXT DEFAULT 'New',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      party_size INTEGER,
      reservation_date TEXT NOT NULL,
      reservation_time TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'Confirmed',
      created_at TEXT
    );
  `)

  // Migrate: add columns added after initial schema (safe to re-run)
  const migrations = [
    `ALTER TABLE event_details ADD COLUMN date_flexible INTEGER DEFAULT 0`,
    `ALTER TABLE event_details ADD COLUMN setup_notes TEXT DEFAULT ''`,
    `ALTER TABLE event_details ADD COLUMN bar_tab_type TEXT DEFAULT ''`,
    `ALTER TABLE events ADD COLUMN production_close_time TEXT`,
    `ALTER TABLE events ADD COLUMN event_duration_mins INTEGER DEFAULT 180`,
    `ALTER TABLE events ADD COLUMN decorate_time TEXT`,
    `ALTER TABLE event_details ADD COLUMN service_fee REAL DEFAULT 0`,
    `ALTER TABLE event_details ADD COLUMN gratuity_pct REAL DEFAULT 0`,
    `ALTER TABLE event_details ADD COLUMN tax_pct REAL DEFAULT 0.0825`,
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
    // 2026 menu corrections
    `DELETE FROM menu_items WHERE package_id = 'fried_chicken' AND item_name = 'Asian Chopped Salad'`,
    `UPDATE menu_items SET item_name = 'Thai Slaw' WHERE package_id = 'sliders_buffet' AND item_name = 'Cole Slaw'`,
    `UPDATE menu_items SET item_name = 'Cheese Board' WHERE package_id = 'snack_buffet' AND item_name = 'Cheese Platter'`,
    // Floor plan fields
    `ALTER TABLE event_details ADD COLUMN floor_plan_notes TEXT DEFAULT ''`,
    `ALTER TABLE event_details ADD COLUMN big_screen_tv INTEGER DEFAULT 0`,
    `ALTER TABLE event_details ADD COLUMN selected_sauces TEXT DEFAULT ''`,
    `ALTER TABLE event_details ADD COLUMN serve_style_json TEXT DEFAULT '{}'`,
    `ALTER TABLE event_details ADD COLUMN beo_notes TEXT DEFAULT ''`,
    `ALTER TABLE event_details ADD COLUMN kitchen_notes TEXT DEFAULT ''`,
    `CREATE TABLE IF NOT EXISTS event_setup_checklist (event_id INTEGER NOT NULL, item_key TEXT NOT NULL, checked INTEGER DEFAULT 0, checked_at TEXT, PRIMARY KEY (event_id, item_key))`,
    `CREATE TABLE IF NOT EXISTS event_packages (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, package_id TEXT NOT NULL DEFAULT '', guest_count INTEGER NOT NULL DEFAULT 0, buffer_pct REAL NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS drink_ticket_log (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, tickets_issued INTEGER DEFAULT 0, tickets_redeemed INTEGER DEFAULT 0, notes TEXT DEFAULT '', created_at TEXT, updated_at TEXT)`,
    `ALTER TABLE menu_items ADD COLUMN purchase_unit TEXT DEFAULT ''`,
    `INSERT OR IGNORE INTO menu_items (package_id, item_name, calc_method, qty_per_guest, yield_per_unit, unit_name, sort_order) VALUES ('fried_chicken', 'Veggie Plate', 'guests_per_unit', NULL, 20, 'Platter', 5)`,
    // Notification engine
    `CREATE TABLE IF NOT EXISTS staff_members (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT DEFAULT '', email TEXT DEFAULT '', active INTEGER DEFAULT 1, created_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      alert_key TEXT NOT NULL,
      trigger_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      completed_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(entity_type, entity_id, alert_key)
    )`,
    `ALTER TABLE reservations ADD COLUMN tables_required INTEGER DEFAULT 0`,
    `ALTER TABLE reservations ADD COLUMN assigned_staff_id INTEGER REFERENCES staff_members(id)`,
    `ALTER TABLE reservations ADD COLUMN tables_assigned_at TEXT`,
    `ALTER TABLE reservations ADD COLUMN alert_offset_mins INTEGER`,
    // Specific table-number assignment replaces the plain tables_required count.
    `ALTER TABLE reservations ADD COLUMN table_numbers TEXT DEFAULT ''`,
    `ALTER TABLE reservations DROP COLUMN tables_required`,
    `ALTER TABLE event_details ADD COLUMN foh_notes TEXT DEFAULT ''`,
    `ALTER TABLE event_details ADD COLUMN bar_notes TEXT DEFAULT ''`,
    `ALTER TABLE event_details ADD COLUMN alert_offsets_json TEXT DEFAULT '{}'`,
    // Links an event to its order number in the online ordering/catering system
    `ALTER TABLE events ADD COLUMN external_order_number TEXT`,
    // Arepa Buffet: 1.5 pcs/guest was being applied to EACH of the 3 arepa types (4.5 total/guest).
    // Split evenly so the buffet totals 1.5 arepas/guest across all three.
    `UPDATE menu_items SET qty_per_guest = 0.5 WHERE package_id = 'arepa_buffet' AND item_name IN ('Braised Pork Arepa', 'Pickled Green Tomato Arepa', 'Black Bean Arepa')`,
    // Same bug in Kabob Buffet (2 pcs/guest each → 1 pc/guest each, 2 total/guest) and
    // Sliders Buffet (2 pcs/guest each → 2/3 pc/guest each, 2 total/guest).
    `UPDATE menu_items SET qty_per_guest = 1 WHERE package_id = 'kabob_buffet' AND item_name IN ('Shrimp Kabob', 'Thai Chicken Kabob')`,
    `UPDATE menu_items SET qty_per_guest = 0.6667 WHERE package_id = 'sliders_buffet' AND item_name IN ('Pulled Pork Slider', 'Mini Burger Slider', 'Fried Buffalo Chicken Slider')`,
    // Per-event manual override of individual item piece counts (e.g. rebalance an
    // arepa/kabob/slider split for a specific order without changing the package default).
    `ALTER TABLE event_details ADD COLUMN menu_item_overrides_json TEXT DEFAULT '{}'`,
    // Toast Status Tracker — mirrors where the event stands in Toast Catering & Events
    // (proposal/invoice/payment workflow lives in Toast; this is a manual status mirror,
    // not payment processing). Each is a date string, null = not done yet.
    `ALTER TABLE event_details ADD COLUMN toast_proposal_sent_date TEXT`,
    `ALTER TABLE event_details ADD COLUMN toast_confirmed_date TEXT`,
    `ALTER TABLE event_details ADD COLUMN toast_invoice_sent_date TEXT`,
    `ALTER TABLE event_details ADD COLUMN toast_deposit_received_date TEXT`,
    `ALTER TABLE event_details ADD COLUMN toast_final_payment_date TEXT`,
    // Post-Event Debrief — internal review + repeat-event intelligence
    `CREATE TABLE IF NOT EXISTS event_debriefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER UNIQUE REFERENCES events(id) ON DELETE CASCADE,
      actual_guest_count INTEGER,
      went_well TEXT DEFAULT '',
      issues TEXT DEFAULT '',
      catering_accuracy TEXT DEFAULT '',
      bar_impact_accuracy TEXT DEFAULT '',
      staffing_notes TEXT DEFAULT '',
      would_repeat_client TEXT DEFAULT '',
      recommendations TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    )`,
    // Event flags that drive dynamic task generation
    `ALTER TABLE event_details ADD COLUMN kids_attending INTEGER DEFAULT 0`,
    `ALTER TABLE event_details ADD COLUMN dessert_expected INTEGER DEFAULT 0`,
    // Internal Task Management — modular, event-driven checklist (Setup/Breakdown/Dynamic)
    `CREATE TABLE IF NOT EXISTS event_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      label TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Lead',
      source_key TEXT,
      sort_order INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT,
      UNIQUE(event_id, source_key)
    )`,
    // Financial Tracking — manual mirror of what Toast shows for this event's money
    // status. Internal visibility only; POURMP does not process payments (Toast does).
    `ALTER TABLE event_details ADD COLUMN total_event_value REAL`,
    `ALTER TABLE event_details ADD COLUMN deposit_due REAL`,
    `ALTER TABLE event_details ADD COLUMN deposit_received REAL`,
    `ALTER TABLE event_details ADD COLUMN final_amount_due REAL`,
    `ALTER TABLE event_details ADD COLUMN final_amount_received REAL`,
    // Package & Food — whether the final menu selections are locked in with the client
    `ALTER TABLE event_details ADD COLUMN final_menu_locked INTEGER DEFAULT 0`,
    // Status model realignment — POURMP now only tracks events once they're
    // operationally active (already confirmed in Toast). The pre-Toast pipeline
    // stages (New/Contacted/Converted) and Tentative no longer exist; remap any
    // rows still carrying those values onto the new lifecycle's entry point.
    `UPDATE events SET status = 'Confirmed' WHERE status IN ('New','Contacted','Converted','Tentative')`,
    // Task templates realignment — Setup/Breakdown/Dynamic task content replaced with
    // Manhattan Project's official operational checklist (lib/tasks.ts TASK_RULES).
    // Retire event_tasks rows generated under the old template keys so already-synced
    // events regenerate cleanly under the new keys instead of ending up with both.
    `DELETE FROM event_tasks WHERE source_key IN (
      'setup_production_close','setup_tables_chairs','setup_linens','setup_prep_station',
      'setup_trash','setup_signage','setup_confirm_host','setup_bar_station',
      'breakdown_last_call','breakdown_clear_tables','breakdown_linens','breakdown_reset_layout',
      'breakdown_trash','breakdown_sweep','breakdown_buffet_clear','breakdown_equipment',
      'breakdown_production','breakdown_walkthrough',
      'dyn_dessert','dyn_drink_tickets','dyn_tv_hdmi','dyn_buffet','dyn_individual_tabs',
      'dyn_by_consumption','dyn_dietary','dyn_over_capacity','dyn_multi_package','dyn_large_group'
    )`,
    // V1.0 Toast/POURMP realignment (see docs/V1_FEATURE_LOCK.md) — the payments table,
    // the numeric Financial Tracking fields, and the fee-grid fields all duplicated what
    // Toast already tracks, and had drifted out of sync with the Toast Status Tracker
    // (see docs/V1_REALIGNMENT_REVIEW.md §3). The Toast Status Tracker above is now the
    // only financial-status representation in POURMP.
    `DROP TABLE IF EXISTS payments`,
    `ALTER TABLE event_details DROP COLUMN total_event_value`,
    `ALTER TABLE event_details DROP COLUMN deposit_due`,
    `ALTER TABLE event_details DROP COLUMN deposit_received`,
    `ALTER TABLE event_details DROP COLUMN final_amount_due`,
    `ALTER TABLE event_details DROP COLUMN final_amount_received`,
    `ALTER TABLE event_details DROP COLUMN tax_pct`,
    `ALTER TABLE event_details DROP COLUMN gratuity_pct`,
    `ALTER TABLE event_details DROP COLUMN service_fee`,
    // Client records simplified to an operational contact card (see docs/V1_FEATURE_LOCK.md
    // §5.2) — referral_source and notes are sales/CRM attribution data with no execution
    // value. company is kept: it's the operational host identity for company/group-booked
    // events with no personal contact name (printed on the BEO/Kitchen Sheet/bar-impact
    // "Host" line).
    `ALTER TABLE clients DROP COLUMN referral_source`,
    `ALTER TABLE clients DROP COLUMN notes`,
  ]
  for (const sql of migrations) {
    try { db.exec(sql) } catch { /* column already exists */ }
  }

  // One-time migration: copy single package from event_details → event_packages
  try {
    const eventsWithPkg = db.prepare(`
      SELECT ed.event_id, ed.package_id, ed.guest_count, ed.buffer_pct
      FROM event_details ed
      WHERE ed.package_id IS NOT NULL AND ed.package_id != ''
        AND NOT EXISTS (SELECT 1 FROM event_packages ep WHERE ep.event_id = ed.event_id)
    `).all() as { event_id: number; package_id: string; guest_count: number; buffer_pct: number }[]
    for (const row of eventsWithPkg) {
      db.prepare(`INSERT INTO event_packages (event_id, package_id, guest_count, buffer_pct, sort_order) VALUES (?, ?, ?, ?, 0)`)
        .run(row.event_id, row.package_id, row.guest_count ?? 0, row.buffer_pct ?? 0)
    }
  } catch { /* table may not exist yet on very first run */ }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Client {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
}

export interface Event {
  id: number
  event_name: string
  event_date: string
  event_time: string
  setup_time: string
  teardown_time: string       // repurposed as event_end_time
  production_close_time: string
  decorate_time: string
  event_duration_mins: number
  status: string
  space: string
  client_id: number
  created_at: string
  updated_at: string
  external_order_number: string | null
}

export interface EventDetails {
  id: number
  event_id: number
  guest_count: number
  package_id: string
  buffer_pct: number
  food_notes: string
  dietary_restrictions: string
  bar_tab_limit: number
  drink_tickets: number
  tab_details: string
  staffing_notes: string
  contract_signed: number
  date_flexible: number
  setup_notes: string
  bar_tab_type: string
  floor_plan_notes: string
  big_screen_tv: number
  selected_sauces: string
  serve_style_json: string
  beo_notes: string
  kitchen_notes: string
  foh_notes: string
  bar_notes: string
  alert_offsets_json: string
  menu_item_overrides_json: string
  toast_proposal_sent_date: string | null
  toast_confirmed_date: string | null
  toast_invoice_sent_date: string | null
  toast_deposit_received_date: string | null
  toast_final_payment_date: string | null
  kids_attending: number
  dessert_expected: number
  final_menu_locked: number
}

export interface EventTask {
  id: number
  event_id: number
  category: string
  label: string
  role: string
  source_key: string | null
  sort_order: number
  completed: number
  completed_at: string | null
  notes: string
  created_at: string
}

export interface EventDebrief {
  id: number
  event_id: number
  actual_guest_count: number | null
  went_well: string
  issues: string
  catering_accuracy: string
  bar_impact_accuracy: string
  staffing_notes: string
  would_repeat_client: string
  recommendations: string
  created_at: string
  updated_at: string
}

export interface EventPackage {
  id: number
  event_id: number
  package_id: string
  guest_count: number
  buffer_pct: number
  sort_order: number
}

export interface EventPackageWithItems extends EventPackage {
  pkg: Package | null
  menuItems: MenuItem[]
}

export interface Package {
  id: string
  name: string
  price_per_guest: number
  description: string
  active: number
}

export interface MenuItem {
  id: number
  package_id: string
  item_name: string
  calc_method: string
  qty_per_guest: number | null
  yield_per_unit: number | null
  unit_name: string
  sort_order: number
  purchase_unit: string | null
}

export interface AddOn {
  id: number
  event_id: number
  item_name: string
  qty: number
  unit: string
  price_each: number
  notes: string
}

export interface EventNote {
  id: number
  event_id: number
  note: string
  created_at: string
}

export interface EventWithClient extends Event {
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
  guest_count: number
  package_id: string
  package_name: string
  price_per_guest: number
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export function getClients(): Client[] {
  return getDb().prepare('SELECT * FROM clients ORDER BY last_name, first_name').all() as Client[]
}

export function getClient(id: number): Client | undefined {
  return getDb().prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client | undefined
}

export function createClient(data: Omit<Client, 'id'>): number {
  const result = getDb()
    .prepare(
      `INSERT INTO clients (first_name, last_name, email, phone, company)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(data.first_name, data.last_name, data.email, data.phone, data.company)
  return result.lastInsertRowid as number
}

export function updateClient(id: number, data: Partial<Omit<Client, 'id'>>) {
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ')
  getDb()
    .prepare(`UPDATE clients SET ${fields} WHERE id = ?`)
    .run(...Object.values(data), id)
}

// ─── Events ───────────────────────────────────────────────────────────────────

// Primary (first-added) catering package per event — event_packages is the source of
// truth for catering, so list/card views that show one package name + one guest count
// per event (Events table, Kanban, Archive) read the first package (by sort_order) from
// there, not the legacy event_details.package_id. The COALESCE against ed/p falls back to
// that legacy field only for the rare historical event that predates the event_packages
// migration in db.ts's initSchema().
//
// The `prime` subquery relies on SQLite's documented bare-column-with-MIN() behavior:
// https://www.sqlite.org/lang_select.html#bare_columns_in_an_aggregate_query — package_id
// and guest_count are guaranteed to come from the same row that produced MIN(sort_order).
const PRIMARY_PACKAGE_JOIN = `
    LEFT JOIN event_details ed ON ed.event_id = e.id
    LEFT JOIN packages p ON p.id = ed.package_id
    LEFT JOIN (
      SELECT event_id, package_id, guest_count, MIN(sort_order)
      FROM event_packages
      GROUP BY event_id
    ) prime ON prime.event_id = e.id
    LEFT JOIN packages p2 ON p2.id = prime.package_id
`
const PRIMARY_PACKAGE_FIELDS = `
      COALESCE(prime.guest_count, ed.guest_count) as guest_count,
      COALESCE(prime.package_id, ed.package_id) as package_id,
      COALESCE(p2.name, p.name) as package_name,
      COALESCE(p2.price_per_guest, p.price_per_guest) as price_per_guest
`

export function getEvents(year?: number): EventWithClient[] {
  const yearClause = year ? `WHERE strftime('%Y', e.event_date) = '${year}'` : ''
  return getDb().prepare(`
    SELECT e.*,
      c.first_name, c.last_name, c.email, c.phone, c.company,
      ${PRIMARY_PACKAGE_FIELDS}
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    ${PRIMARY_PACKAGE_JOIN}
    ${yearClause}
    ORDER BY e.event_date DESC
  `).all() as EventWithClient[]
}

export function getEvent(id: number): Event | undefined {
  return getDb().prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined
}

export function getEventPackages(eventId: number): EventPackageWithItems[] {
  const rows = getDb().prepare(
    `SELECT * FROM event_packages WHERE event_id = ? ORDER BY sort_order ASC, id ASC`
  ).all(eventId) as EventPackage[]
  return rows.map(row => ({
    ...row,
    pkg: getPackage(row.package_id),
    menuItems: getMenuItems(row.package_id),
  }))
}

export function addEventPackage(eventId: number, packageId: string, guestCount: number, bufferPct: number): number {
  const maxOrder = (getDb().prepare(`SELECT MAX(sort_order) as m FROM event_packages WHERE event_id = ?`).get(eventId) as { m: number | null }).m ?? -1
  const result = getDb().prepare(
    `INSERT INTO event_packages (event_id, package_id, guest_count, buffer_pct, sort_order) VALUES (?, ?, ?, ?, ?)`
  ).run(eventId, packageId, guestCount, bufferPct, maxOrder + 1)
  return result.lastInsertRowid as number
}

export function updateEventPackage(id: number, data: Partial<{ package_id: string; guest_count: number; buffer_pct: number }>) {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ')
  getDb().prepare(`UPDATE event_packages SET ${fields} WHERE id = ?`).run(...Object.values(data), id)
}

export function removeEventPackage(id: number) {
  getDb().prepare(`DELETE FROM event_packages WHERE id = ?`).run(id)
}

export function getEventFull(id: number) {
  const event = getDb().prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined
  if (!event) return null
  const client = event.client_id ? getClient(event.client_id) : null
  const details = getDb().prepare('SELECT * FROM event_details WHERE event_id = ?').get(id) as EventDetails | undefined
  const addOns = getAddOns(id)
  const notes = getEventNotes(id)
  const packages = getEventPackages(id)
  // backward compat: first package = primary
  const pkg = packages[0]?.pkg ?? null
  const menuItems = packages[0]?.menuItems ?? []
  return { event, client, details, addOns, notes, pkg, menuItems, packages }
}

export function createEvent(data: {
  event_name: string
  event_date: string
  event_time: string
  setup_time: string
  teardown_time: string
  production_close_time?: string
  decorate_time?: string
  event_duration_mins?: number
  status: string
  space: string
  client_id: number
}): number {
  const now = new Date().toISOString()
  const result = getDb()
    .prepare(
      `INSERT INTO events (event_name, event_date, event_time, setup_time, teardown_time, production_close_time, decorate_time, event_duration_mins, status, space, client_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.event_name, data.event_date, data.event_time,
      data.setup_time, data.teardown_time,
      data.production_close_time ?? '', data.decorate_time ?? '',
      data.event_duration_mins ?? 180,
      data.status, data.space, data.client_id, now, now
    )
  return result.lastInsertRowid as number
}

export function updateEvent(id: number, data: Partial<Omit<Event, 'id' | 'created_at'>>) {
  const payload = { ...data, updated_at: new Date().toISOString() }
  const fields = Object.keys(payload).map((k) => `${k} = ?`).join(', ')
  getDb().prepare(`UPDATE events SET ${fields} WHERE id = ?`).run(...Object.values(payload), id)
}

export function deleteEvent(id: number) {
  const db = getDb()
  const tx = db.transaction(() => {
    // These tables key on event_id without an enforced FK, so ON DELETE CASCADE
    // on `events` doesn't reach them — clean them up explicitly.
    db.prepare('DELETE FROM event_packages WHERE event_id = ?').run(id)
    db.prepare('DELETE FROM event_setup_checklist WHERE event_id = ?').run(id)
    db.prepare('DELETE FROM drink_ticket_log WHERE event_id = ?').run(id)
    db.prepare(`DELETE FROM notifications WHERE entity_type = 'event' AND entity_id = ?`).run(id)
    db.prepare('DELETE FROM events WHERE id = ?').run(id)
  })
  tx()
}

// ─── Event Details ────────────────────────────────────────────────────────────

export function getEventDetails(eventId: number): EventDetails | undefined {
  return getDb().prepare('SELECT * FROM event_details WHERE event_id = ?').get(eventId) as EventDetails | undefined
}

export function upsertEventDetails(eventId: number, data: Partial<Omit<EventDetails, 'id' | 'event_id'>>) {
  const existing = getEventDetails(eventId)
  if (existing) {
    const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ')
    getDb().prepare(`UPDATE event_details SET ${fields} WHERE event_id = ?`).run(...Object.values(data), eventId)
  } else {
    const keys = ['event_id', ...Object.keys(data)]
    const vals = [eventId, ...Object.values(data)]
    const placeholders = keys.map(() => '?').join(', ')
    getDb()
      .prepare(`INSERT INTO event_details (${keys.join(', ')}) VALUES (${placeholders})`)
      .run(...vals)
  }
}

// ─── Packages ─────────────────────────────────────────────────────────────────

export function getPackages(): Package[] {
  return getDb().prepare('SELECT * FROM packages WHERE active = 1 ORDER BY name').all() as Package[]
}

export function getPackage(id: string): Package | null {
  return (getDb().prepare('SELECT * FROM packages WHERE id = ?').get(id) as Package) ?? null
}

export function getMenuItems(packageId: string): MenuItem[] {
  return getDb()
    .prepare('SELECT * FROM menu_items WHERE package_id = ? ORDER BY sort_order')
    .all(packageId) as MenuItem[]
}

export function updateMenuItemPurchaseUnit(id: number, purchaseUnit: string) {
  getDb().prepare('UPDATE menu_items SET purchase_unit = ? WHERE id = ?').run(purchaseUnit, id)
}

// ─── Add-ons ──────────────────────────────────────────────────────────────────

export function getAddOns(eventId: number): AddOn[] {
  return getDb().prepare('SELECT * FROM event_add_ons WHERE event_id = ?').all(eventId) as AddOn[]
}

export function createAddOn(data: Omit<AddOn, 'id'>): number {
  const result = getDb()
    .prepare(
      `INSERT INTO event_add_ons (event_id, item_name, qty, unit, price_each, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(data.event_id, data.item_name, data.qty, data.unit, data.price_each, data.notes)
  return result.lastInsertRowid as number
}

export function updateAddOn(id: number, data: Partial<Omit<AddOn, 'id'>>) {
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ')
  getDb().prepare(`UPDATE event_add_ons SET ${fields} WHERE id = ?`).run(...Object.values(data), id)
}

export function deleteAddOn(id: number) {
  getDb().prepare('DELETE FROM event_add_ons WHERE id = ?').run(id)
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function getEventNotes(eventId: number): EventNote[] {
  return getDb()
    .prepare('SELECT * FROM event_notes WHERE event_id = ? ORDER BY created_at ASC')
    .all(eventId) as EventNote[]
}

export function createEventNote(eventId: number, note: string): number {
  const result = getDb()
    .prepare('INSERT INTO event_notes (event_id, note, created_at) VALUES (?, ?, ?)')
    .run(eventId, note, new Date().toISOString())
  return result.lastInsertRowid as number
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function getDashboardStats() {
  const db = getDb()
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = today.substring(0, 7) + '-01'
  const monthEnd = today.substring(0, 7) + '-31'
  const in14 = format(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd')

  const eventsThisMonth = (db.prepare(
    `SELECT COUNT(*) as c FROM events WHERE event_date >= ? AND event_date <= ?`
  ).get(monthStart, monthEnd) as { c: number }).c

  const eventsThisWeek = (db.prepare(
    `SELECT COUNT(*) as c FROM events WHERE event_date >= ? AND event_date <= ?`
  ).get(today, in14) as { c: number }).c

  // High Risk / High Bar Impact — next 14 days. Reuses the Risk Scanner (for the app's
  // canonical "High Risk" definition) and the Operational Dashboard's bar-impact bucket
  // (unbounded there; windowed here to 14 days for this KPI) rather than re-deriving
  // either threshold a third time.
  const highRiskCount = getEventRiskAssessment().events
    .filter(e => (e.highestLevel === 'High' || e.highestLevel === 'Critical') && e.event_date <= in14).length
  const highBarImpactCount = getOperationalDashboard().highBarImpact
    .filter(e => e.event_date <= in14).length

  const upcomingEvents = db.prepare(`
    SELECT e.*, c.first_name, c.last_name, ed.guest_count
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    LEFT JOIN event_details ed ON ed.event_id = e.id
    WHERE e.event_date >= ? AND e.event_date <= ?
    ORDER BY e.event_date ASC
  `).all(today, in14) as Array<Event & { first_name: string; last_name: string; guest_count: number }>

  return {
    eventsThisMonth, eventsThisWeek, upcomingEvents,
    highRiskCount, highBarImpactCount,
  }
}

// ─── Operational Dashboard ──────────────────────────────────────────────────────
// Internal ops layer alongside Toast Catering & Events — surfaces what needs
// staff attention. Not a payments/invoicing view; Toast remains system of record.

export interface OpsEventSummary {
  id: number
  event_name: string
  event_date: string
  event_time: string
  status: string
  guest_count: number
  client_name: string
  barImpactLevel: string
  readinessScore: number
  missingLabels: string[]
  // Task Awareness — execution/operations tracking, kept separate from readinessScore
  // (planning/admin). Never merge these two into a single number.
  setupIncomplete: number
  breakdownIncomplete: number
  dynamicIncomplete: number
  taskCompletionPct: number
  needsAttention: boolean
  setupReady: boolean
  breakdownPending: boolean
  operationallyReady: boolean
}

export interface OperationalDashboard {
  weekStart: string
  weekEnd: string
  thisWeek: OpsEventSummary[]
  awaitingDeposit: OpsEventSummary[]
  awaitingMenu: OpsEventSummary[]
  awaitingInvoice: OpsEventSummary[]
  highRisk: OpsEventSummary[]
  highBarImpact: OpsEventSummary[]
  needsAttention: OpsEventSummary[]
  readyThisWeekCount: number
}

const RISK_READINESS_THRESHOLD = 70
const RISK_WINDOW_DAYS = 14

// Task Awareness thresholds — separate from the readiness-based "High Risk" bucket above.
// "Needs Attention" flags events close to start where task execution is behind, regardless
// of how complete the planning/admin (readiness) side is.
const TASK_ATTENTION_WINDOW_HOURS = 24
const TASK_ATTENTION_COMPLETION_THRESHOLD = 50

// True once the event is imminent — today, or starting within the next N hours.
function isWithinAttentionWindow(eventDate: string, eventTime: string, now: Date): boolean {
  if (eventDate === format(now, 'yyyy-MM-dd')) return true
  const target = new Date(`${eventDate}T${eventTime && eventTime.length >= 4 ? eventTime : '00:00'}`)
  if (Number.isNaN(target.getTime())) return false
  const hoursUntil = (target.getTime() - now.getTime()) / (1000 * 60 * 60)
  return hoursUntil >= 0 && hoursUntil <= TASK_ATTENTION_WINDOW_HOURS
}

export function getOperationalDashboard(): OperationalDashboard {
  const db = getDb()

  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const dow = now.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const weekStartDate = addDays(now, mondayOffset)
  const weekStart = format(weekStartDate, 'yyyy-MM-dd')
  const weekEnd = format(addDays(weekStartDate, 6), 'yyyy-MM-dd')
  const riskWindowEnd = format(addDays(now, RISK_WINDOW_DAYS), 'yyyy-MM-dd')

  const rows = db.prepare(`
    SELECT e.id, e.event_name, e.event_date, e.event_time, e.teardown_time, e.space, e.status,
           c.first_name, c.last_name, c.company,
           ed.guest_count, ed.bar_tab_type, ed.drink_tickets, ed.setup_notes, ed.floor_plan_notes,
           ed.dietary_restrictions, ed.staffing_notes, ed.contract_signed,
           ed.toast_invoice_sent_date, ed.toast_deposit_received_date,
           (SELECT p.name FROM event_packages ep JOIN packages p ON p.id = ep.package_id
              WHERE ep.event_id = e.id AND ep.package_id != '' ORDER BY ep.sort_order LIMIT 1) AS package_name,
           (SELECT COUNT(*) FROM event_packages ep WHERE ep.event_id = e.id AND ep.package_id != '') AS package_count
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    LEFT JOIN event_details ed ON ed.event_id = e.id
    WHERE e.event_date >= ? AND e.status != 'Closed'
    ORDER BY e.event_date ASC
  `).all(today) as Array<{
    id: number; event_name: string; event_date: string; event_time: string; teardown_time: string
    space: string; status: string; first_name: string | null; last_name: string | null; company: string | null
    guest_count: number | null; bar_tab_type: string | null; drink_tickets: number | null
    setup_notes: string | null; floor_plan_notes: string | null; dietary_restrictions: string | null
    staffing_notes: string | null; contract_signed: number | null
    toast_invoice_sent_date: string | null; toast_deposit_received_date: string | null
    package_name: string | null; package_count: number
  }>

  const thisWeek: OpsEventSummary[] = []
  const awaitingDeposit: OpsEventSummary[] = []
  const awaitingMenu: OpsEventSummary[] = []
  const awaitingInvoice: OpsEventSummary[] = []
  const highRisk: OpsEventSummary[] = []
  const highBarImpact: OpsEventSummary[] = []
  const needsAttention: OpsEventSummary[] = []

  for (const row of rows) {
    const evForCalc: EventForNotes = {
      id: row.id,
      event_name: row.event_name,
      event_date: row.event_date,
      event_time: row.event_time ?? '',
      setup_time: '',
      decorate_time: '',
      teardown_time: row.teardown_time ?? '',
      production_close_time: '',
      event_duration_mins: 180,
      space: row.space ?? '',
      status: row.status,
      first_name: row.first_name ?? '',
      last_name: row.last_name ?? '',
      email: '',
      company: row.company ?? '',
      guest_count: row.guest_count ?? 0,
      package_name: row.package_name ?? '',
      bar_tab_type: row.bar_tab_type ?? '',
      drink_tickets: row.drink_tickets ?? 0,
    }

    const hasPackage = row.package_count > 0
    const readiness = calcReadiness({
      guest_count: row.guest_count ?? 0,
      hasPackage,
      bar_tab_type: row.bar_tab_type,
      setup_notes: row.setup_notes,
      floor_plan_notes: row.floor_plan_notes,
      dietary_restrictions: row.dietary_restrictions,
      staffing_notes: row.staffing_notes,
      contract_signed: row.contract_signed,
    })
    const barLevel = calcBarImpact(evForCalc).level

    // Task Awareness — execution/operations. Tasks are generated once per event and persisted;
    // read them first and only auto-generate (sync) when none exist yet, so an event nobody has
    // opened still gets its Setup/Breakdown tasks rather than reading as falsely "complete" with
    // zero tasks — without re-running task generation (and its own bar-impact lookup, already
    // computed above as `barLevel`) on every dashboard load for events already synced.
    let tasks = getEventTasks(row.id)
    if (tasks.length === 0) tasks = syncEventTasks(row.id)
    const setupTasks = tasks.filter(t => t.category === 'Setup')
    const breakdownTasks = tasks.filter(t => t.category === 'Breakdown')
    const dynamicTasks = tasks.filter(t => t.category === 'Dynamic')
    const setupIncomplete = setupTasks.filter(t => !t.completed).length
    const breakdownIncomplete = breakdownTasks.filter(t => !t.completed).length
    const dynamicIncomplete = dynamicTasks.filter(t => !t.completed).length
    const criticalDynamicIncomplete = dynamicTasks.filter(t => !t.completed && t.source_key && CRITICAL_DYNAMIC_TASK_KEYS.has(t.source_key)).length
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.completed).length
    const taskCompletionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const setupReady = setupTasks.length > 0 && setupIncomplete === 0
    // The query only returns event_date >= today, so "has passed" can only be true for
    // today's events once we're past their teardown (or, lacking that, start) time.
    const eventEndTime = row.teardown_time || row.event_time
    const eventHasPassed = row.event_date === today && !!eventEndTime
      && new Date(`${row.event_date}T${eventEndTime}`).getTime() < now.getTime()
    const breakdownPending = eventHasPassed && breakdownIncomplete > 0
    const operationallyReady = setupIncomplete === 0 && breakdownIncomplete === 0 && dynamicIncomplete === 0
    const isBooked = row.status !== 'Closed'
    // Stronger Needs Attention: also flag imminent events carrying a Critical risk flag
    // (e.g. over-capacity, critical bar load, policy conflicts) even if task execution
    // happens to be on track — only checked for events already within the attention
    // window, so this doesn't run the risk scanner against every future booked event.
    const withinAttentionWindow = isBooked && isWithinAttentionWindow(row.event_date, row.event_time, now)
    const criticalRiskPresent = withinAttentionWindow && getEventRisks(row.id).some(r => r.level === 'Critical')
    const needsAttentionFlag = withinAttentionWindow
      && (taskCompletionPct < TASK_ATTENTION_COMPLETION_THRESHOLD || setupIncomplete > 0 || criticalDynamicIncomplete > 0 || criticalRiskPresent)

    const summary: OpsEventSummary = {
      id: row.id,
      event_name: row.event_name,
      event_date: row.event_date,
      event_time: row.event_time ?? '',
      status: row.status,
      guest_count: row.guest_count ?? 0,
      client_name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.company || '—',
      barImpactLevel: barLevel,
      readinessScore: readiness.score,
      missingLabels: readiness.missingLabels,
      setupIncomplete,
      breakdownIncomplete,
      dynamicIncomplete,
      taskCompletionPct,
      needsAttention: needsAttentionFlag,
      setupReady,
      breakdownPending,
      operationallyReady,
    }

    if (row.event_date >= weekStart && row.event_date <= weekEnd) thisWeek.push(summary)

    if (row.status !== 'Closed') {
      if (!row.toast_deposit_received_date) awaitingDeposit.push(summary)
      if (!row.toast_invoice_sent_date) awaitingInvoice.push(summary)
    }
    if (isBooked) {
      if (!hasPackage) awaitingMenu.push(summary)
      if (row.event_date <= riskWindowEnd && readiness.score < RISK_READINESS_THRESHOLD) highRisk.push(summary)
      if (barLevel === 'High' || barLevel === 'Critical') highBarImpact.push(summary)
      if (needsAttentionFlag) needsAttention.push(summary)
    }
  }

  const readyThisWeekCount = thisWeek.filter(s => s.operationallyReady).length

  return {
    weekStart, weekEnd, thisWeek, awaitingDeposit, awaitingMenu, awaitingInvoice, highRisk, highBarImpact, needsAttention,
    readyThisWeekCount,
  }
}

// ─── Event Risk Assessment ──────────────────────────────────────────────────────
// A separate, read-only intelligence layer (see lib/riskScanner.ts for the rules).
// It does not write anything and does not feed back into Toast, the Task system,
// Event Readiness, or Main Bar Impact — it only reads their fields/outputs. Some
// inputs (bar impact, task counts) are necessarily recomputed here rather than
// shared with getOperationalDashboard(), since the two are independent read paths —
// see the audit notes in the implementation summary for the resulting overlap.

export interface EventRiskSummary {
  id: number
  event_name: string
  event_date: string
  event_time: string
  status: string
  client_name: string
  guest_count: number
  risks: RiskFlag[]
  highestLevel: RiskLevel
}

export interface EventRiskAssessment {
  generatedAt: string
  scannedCount: number
  flaggedCount: number
  events: EventRiskSummary[]
}

export function getEventRiskAssessment(): EventRiskAssessment {
  const db = getDb()

  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const depositWindowEnd = format(addDays(now, 7), 'yyyy-MM-dd')
  const menuDeadlineWindowEnd = format(addDays(now, 14), 'yyyy-MM-dd')

  // Same-date active-event counts, for Shared Space Risk — one query up front instead
  // of a per-row lookup.
  const sameDateCounts = new Map<string, number>(
    (db.prepare(`
      SELECT event_date, COUNT(*) as cnt FROM events
      WHERE event_date >= ? AND status != 'Closed'
      GROUP BY event_date
    `).all(today) as Array<{ event_date: string; cnt: number }>).map(r => [r.event_date, r.cnt])
  )

  const rows = db.prepare(`
    SELECT e.id, e.event_name, e.event_date, e.event_time, e.teardown_time, e.space, e.status,
           c.first_name, c.last_name, c.company,
           ed.guest_count, ed.bar_tab_type, ed.drink_tickets,
           ed.setup_notes, ed.floor_plan_notes, ed.staffing_notes, ed.bar_notes,
           ed.food_notes, ed.beo_notes, ed.kitchen_notes, ed.foh_notes, ed.tab_details,
           ed.dietary_restrictions, ed.dessert_expected, ed.kids_attending,
           ed.toast_deposit_received_date,
           (SELECT COUNT(*) FROM event_packages ep WHERE ep.event_id = e.id AND ep.package_id != '') AS package_count
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    LEFT JOIN event_details ed ON ed.event_id = e.id
    WHERE e.event_date >= ? AND e.status != 'Closed'
    ORDER BY e.event_date ASC
  `).all(today) as Array<{
    id: number; event_name: string; event_date: string; event_time: string; teardown_time: string
    space: string; status: string; first_name: string | null; last_name: string | null; company: string | null
    guest_count: number | null; bar_tab_type: string | null; drink_tickets: number | null
    setup_notes: string | null; floor_plan_notes: string | null; staffing_notes: string | null; bar_notes: string | null
    food_notes: string | null; beo_notes: string | null; kitchen_notes: string | null; foh_notes: string | null
    tab_details: string | null; dietary_restrictions: string | null
    dessert_expected: number | null; kids_attending: number | null
    toast_deposit_received_date: string | null
    package_count: number
  }>

  const events: EventRiskSummary[] = []

  for (const row of rows) {
    const evForCalc: EventForNotes = {
      id: row.id,
      event_name: row.event_name,
      event_date: row.event_date,
      event_time: row.event_time ?? '',
      setup_time: '',
      decorate_time: '',
      teardown_time: row.teardown_time ?? '',
      production_close_time: '',
      event_duration_mins: 180,
      space: row.space ?? '',
      status: row.status,
      first_name: row.first_name ?? '',
      last_name: row.last_name ?? '',
      email: '',
      company: row.company ?? '',
      guest_count: row.guest_count ?? 0,
      package_name: '',
      bar_tab_type: row.bar_tab_type ?? '',
      drink_tickets: row.drink_tickets ?? 0,
    }
    const barImpactLevel = calcBarImpact(evForCalc).level

    // Read-only — never generates tasks. An event with no tasks yet is simply
    // excluded from Task Completion Risk rather than treated as "complete."
    const tasks = getEventTasks(row.id)
    const setupIncomplete = tasks.filter(t => t.category === 'Setup' && !t.completed).length
    const breakdownIncomplete = tasks.filter(t => t.category === 'Breakdown' && !t.completed).length
    const dynamicIncomplete = tasks.filter(t => t.category === 'Dynamic' && !t.completed).length
    const operationallyReady = tasks.length > 0 && setupIncomplete === 0 && breakdownIncomplete === 0 && dynamicIncomplete === 0

    const noteText = [
      row.setup_notes, row.floor_plan_notes, row.staffing_notes, row.bar_notes,
      row.food_notes, row.beo_notes, row.kitchen_notes, row.foh_notes, row.tab_details,
    ].filter(Boolean).join(' \n ')

    const risks = scanEventRisks({
      isBooked: row.status !== 'Closed',
      guestCount: row.guest_count ?? 0,
      hasPackage: row.package_count > 0,
      depositReceived: !!row.toast_deposit_received_date,
      barImpactLevel,
      floorPlanNotesPresent: !!row.floor_plan_notes?.trim(),
      dessertExpected: !!row.dessert_expected,
      kidsAttending: !!row.kids_attending,
      otherActiveEventsSameDate: (sameDateCounts.get(row.event_date) ?? 1) - 1,
      hasTaskData: tasks.length > 0,
      setupIncomplete,
      operationallyReady,
      noteText,
      withinDepositWindow: row.event_date <= depositWindowEnd,
      withinMenuDeadlineWindow: row.event_date <= menuDeadlineWindowEnd,
      within24Hours: isWithinAttentionWindow(row.event_date, row.event_time, now),
    })

    if (risks.length > 0) {
      events.push({
        id: row.id,
        event_name: row.event_name,
        event_date: row.event_date,
        event_time: row.event_time ?? '',
        status: row.status,
        client_name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.company || '—',
        guest_count: row.guest_count ?? 0,
        risks,
        highestLevel: highestRiskLevel(risks),
      })
    }
  }

  events.sort((a, b) => {
    const rankDiff = { Low: 1, Moderate: 2, High: 3, Critical: 4 }[b.highestLevel] - { Low: 1, Moderate: 2, High: 3, Critical: 4 }[a.highestLevel]
    return rankDiff !== 0 ? rankDiff : a.event_date.localeCompare(b.event_date)
  })

  return {
    generatedAt: now.toISOString(),
    scannedCount: rows.length,
    flaggedCount: events.length,
    events,
  }
}

// Single-event risk lookup — mirrors the per-row logic inside getEventRiskAssessment()
// above (kept as a separate, simpler implementation rather than a shared helper, same
// intentional-duplication tradeoff already documented for getOperationalDashboard() vs.
// getEventRiskAssessment()). Used by Prep Outputs / Pre-Shift Brief / Leads Pack /
// Operations so they don't each re-derive risk thresholds a third time.
export function getEventRisks(eventId: number): RiskFlag[] {
  const db = getDb()
  const now = new Date()
  const depositWindowEnd = format(addDays(now, 7), 'yyyy-MM-dd')
  const menuDeadlineWindowEnd = format(addDays(now, 14), 'yyyy-MM-dd')

  const row = db.prepare(`
    SELECT e.id, e.event_name, e.event_date, e.event_time, e.teardown_time, e.space, e.status,
           ed.guest_count, ed.bar_tab_type, ed.drink_tickets,
           ed.setup_notes, ed.floor_plan_notes, ed.staffing_notes, ed.bar_notes,
           ed.food_notes, ed.beo_notes, ed.kitchen_notes, ed.foh_notes, ed.tab_details,
           ed.dietary_restrictions, ed.dessert_expected, ed.kids_attending,
           ed.toast_deposit_received_date,
           (SELECT COUNT(*) FROM event_packages ep WHERE ep.event_id = e.id AND ep.package_id != '') AS package_count
    FROM events e
    LEFT JOIN event_details ed ON ed.event_id = e.id
    WHERE e.id = ?
  `).get(eventId) as {
    id: number; event_name: string; event_date: string; event_time: string; teardown_time: string
    space: string; status: string
    guest_count: number | null; bar_tab_type: string | null; drink_tickets: number | null
    setup_notes: string | null; floor_plan_notes: string | null; staffing_notes: string | null; bar_notes: string | null
    food_notes: string | null; beo_notes: string | null; kitchen_notes: string | null; foh_notes: string | null
    tab_details: string | null; dietary_restrictions: string | null
    dessert_expected: number | null; kids_attending: number | null
    toast_deposit_received_date: string | null
    package_count: number
  } | undefined
  if (!row) return []

  const otherActiveEventsSameDate = (db.prepare(
    `SELECT COUNT(*) as c FROM events WHERE event_date = ? AND status != 'Closed' AND id != ?`
  ).get(row.event_date, eventId) as { c: number }).c

  const barImpactLevel = calcBarImpact({
    id: row.id, event_name: row.event_name, event_date: row.event_date, event_time: row.event_time ?? '',
    setup_time: '', decorate_time: '', teardown_time: row.teardown_time ?? '', production_close_time: '',
    event_duration_mins: 180, space: row.space ?? '', status: row.status,
    first_name: '', last_name: '', email: '', guest_count: row.guest_count ?? 0,
    bar_tab_type: row.bar_tab_type ?? '', drink_tickets: row.drink_tickets ?? 0,
  }).level

  const tasks = getEventTasks(row.id)
  const setupIncomplete = tasks.filter(t => t.category === 'Setup' && !t.completed).length
  const breakdownIncomplete = tasks.filter(t => t.category === 'Breakdown' && !t.completed).length
  const dynamicIncomplete = tasks.filter(t => t.category === 'Dynamic' && !t.completed).length
  const operationallyReady = tasks.length > 0 && setupIncomplete === 0 && breakdownIncomplete === 0 && dynamicIncomplete === 0

  const noteText = [
    row.setup_notes, row.floor_plan_notes, row.staffing_notes, row.bar_notes,
    row.food_notes, row.beo_notes, row.kitchen_notes, row.foh_notes, row.tab_details,
  ].filter(Boolean).join(' \n ')

  return scanEventRisks({
    isBooked: row.status !== 'Closed',
    guestCount: row.guest_count ?? 0,
    hasPackage: row.package_count > 0,
    depositReceived: !!row.toast_deposit_received_date,
    barImpactLevel,
    floorPlanNotesPresent: !!row.floor_plan_notes?.trim(),
    dessertExpected: !!row.dessert_expected,
    kidsAttending: !!row.kids_attending,
    otherActiveEventsSameDate,
    hasTaskData: tasks.length > 0,
    setupIncomplete,
    operationallyReady,
    noteText,
    withinDepositWindow: row.event_date <= depositWindowEnd,
    withinMenuDeadlineWindow: row.event_date <= menuDeadlineWindowEnd,
    within24Hours: isWithinAttentionWindow(row.event_date, row.event_time, now),
  })
}

export function getKanbanEvents() {
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  return getDb().prepare(`
    SELECT e.*, c.first_name, c.last_name,
      ${PRIMARY_PACKAGE_FIELDS}
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    ${PRIMARY_PACKAGE_JOIN}
    WHERE e.status != 'Closed'
       OR strftime('%Y-%m', e.event_date) = ?
    ORDER BY e.event_date ASC
  `).all(currentMonth) as EventWithClient[]
}

export function getArchivedEvents(year?: number) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const yearFilter = year ? `AND strftime('%Y', e.event_date) = '${year}'` : ''
  return getDb().prepare(`
    SELECT e.*, c.first_name, c.last_name,
      ${PRIMARY_PACKAGE_FIELDS}
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    ${PRIMARY_PACKAGE_JOIN}
    WHERE e.status = 'Closed'
      AND strftime('%Y-%m', e.event_date) < ?
      ${yearFilter}
    ORDER BY e.event_date DESC
  `).all(currentMonth) as EventWithClient[]
}

// ─── Blocked Dates ────────────────────────────────────────────────────────────

export interface BlockedDate {
  id: number
  date: string
  reason: string
  notes: string
  created_at: string
}

export { BLOCK_REASONS } from './constants'
export type { BlockReason } from './constants'

export function getBlockedDates(year?: number, month?: number): BlockedDate[] {
  if (year && month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return getDb()
      .prepare(`SELECT * FROM blocked_dates WHERE date LIKE ? ORDER BY date`)
      .all(`${prefix}-%`) as BlockedDate[]
  }
  return getDb().prepare('SELECT * FROM blocked_dates ORDER BY date').all() as BlockedDate[]
}

export function isDateBlocked(date: string): BlockedDate | undefined {
  return getDb().prepare('SELECT * FROM blocked_dates WHERE date = ?').get(date) as BlockedDate | undefined
}

export function blockDates(dates: string[], reason: string, notes?: string): void {
  const stmt = getDb().prepare(
    `INSERT OR IGNORE INTO blocked_dates (date, reason, notes, created_at) VALUES (?, ?, ?, ?)`
  )
  const now = new Date().toISOString()
  const tx = getDb().transaction(() => {
    for (const date of dates) stmt.run(date, reason, notes ?? '', now)
  })
  tx()
}

export function unblockDate(id: number): void {
  getDb().prepare('DELETE FROM blocked_dates WHERE id = ?').run(id)
}

export function unblockDates(dates: string[]): void {
  const stmt = getDb().prepare('DELETE FROM blocked_dates WHERE date = ?')
  const tx = getDb().transaction(() => { for (const d of dates) stmt.run(d) })
  tx()
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export interface Reservation {
  id: number
  client_name: string
  phone: string
  email: string
  party_size: number
  reservation_date: string
  reservation_time: string
  notes: string
  status: string
  created_at: string
  table_numbers: string
  assigned_staff_id: number | null
  tables_assigned_at: string | null
  alert_offset_mins: number | null
}

export { RESERVATION_STATUSES } from './constants'

export function getReservations(date?: string): Reservation[] {
  if (date) {
    return getDb()
      .prepare('SELECT * FROM reservations WHERE reservation_date = ? ORDER BY reservation_time')
      .all(date) as Reservation[]
  }
  return getDb()
    .prepare('SELECT * FROM reservations ORDER BY reservation_date DESC, reservation_time')
    .all() as Reservation[]
}

export function getReservation(id: number): Reservation | undefined {
  return getDb().prepare('SELECT * FROM reservations WHERE id = ?').get(id) as Reservation | undefined
}

export function getUpcomingReservations(limit = 20): Reservation[] {
  const today = format(new Date(), 'yyyy-MM-dd')
  return getDb()
    .prepare(`SELECT * FROM reservations WHERE reservation_date >= ? ORDER BY reservation_date, reservation_time LIMIT ?`)
    .all(today, limit) as Reservation[]
}

export function createReservation(data: {
  client_name: string
  phone: string
  email: string
  party_size: number
  reservation_date: string
  reservation_time: string
  notes: string
  status?: string
  table_numbers?: string
  assigned_staff_id?: number | null
  alert_offset_mins?: number | null
}): number {
  const result = getDb()
    .prepare(
      `INSERT INTO reservations (client_name, phone, email, party_size, reservation_date, reservation_time, notes, status, table_numbers, assigned_staff_id, alert_offset_mins, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.client_name, data.phone, data.email, data.party_size,
      data.reservation_date, data.reservation_time, data.notes,
      data.status || 'Confirmed',
      data.table_numbers ?? '',
      data.assigned_staff_id ?? null,
      data.alert_offset_mins ?? null,
      new Date().toISOString()
    )
  return result.lastInsertRowid as number
}

export function updateReservation(id: number, data: Partial<Omit<Reservation, 'id' | 'created_at'>>) {
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ')
  getDb().prepare(`UPDATE reservations SET ${fields} WHERE id = ?`).run(...Object.values(data), id)
}

export function deleteReservation(id: number) {
  getDb().prepare('DELETE FROM reservations WHERE id = ?').run(id)
}

export function getAvailableYears(): number[] {
  const rows = getDb()
    .prepare(`SELECT DISTINCT CAST(strftime('%Y', event_date) AS INTEGER) as y FROM events WHERE event_date IS NOT NULL ORDER BY y DESC`)
    .all() as { y: number }[]
  return rows.map((r) => r.y)
}

export function getCalendarEvents(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = `${year}-${String(month).padStart(2, '0')}-31`
  return getDb().prepare(`
    SELECT e.id, e.event_name, e.event_date, e.status,
           c.first_name, c.last_name
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    WHERE e.event_date >= ? AND e.event_date <= ?
    ORDER BY e.event_date
  `).all(start, end)
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface Lead {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  event_date: string
  event_type: string
  guest_count: number
  message: string
  status: string
  created_at: string
}

export function getLeads(status?: string): Lead[] {
  if (status) {
    return getDb().prepare(`SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC`).all(status) as Lead[]
  }
  return getDb().prepare(`SELECT * FROM leads ORDER BY created_at DESC`).all() as Lead[]
}

export function getNewLeads(): Lead[] {
  return getDb().prepare(`SELECT * FROM leads WHERE status = 'New' ORDER BY created_at DESC`).all() as Lead[]
}

export function createLead(data: Omit<Lead, 'id' | 'created_at' | 'status'>): number {
  const now = new Date().toISOString()
  const result = getDb().prepare(`
    INSERT INTO leads (first_name, last_name, email, phone, event_date, event_type, guest_count, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'New', ?)
  `).run(data.first_name, data.last_name, data.email, data.phone, data.event_date, data.event_type, data.guest_count, data.message, now)
  return result.lastInsertRowid as number
}

export function updateLeadStatus(id: number, status: string) {
  getDb().prepare(`UPDATE leads SET status = ? WHERE id = ?`).run(status, id)
}

export function deleteLead(id: number) {
  getDb().prepare(`DELETE FROM leads WHERE id = ?`).run(id)
}

// ─── Setup Checklist ──────────────────────────────────────────────────────────

export function getChecklist(eventId: number): Record<string, string | null> {
  const rows = getDb().prepare(
    `SELECT item_key, checked_at FROM event_setup_checklist WHERE event_id = ?`
  ).all(eventId) as { item_key: string; checked_at: string | null }[]
  return Object.fromEntries(rows.map(r => [r.item_key, r.checked_at]))
}

export function setChecklistItem(eventId: number, itemKey: string, checked: boolean) {
  const now = checked ? new Date().toISOString() : null
  getDb().prepare(`
    INSERT INTO event_setup_checklist (event_id, item_key, checked, checked_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(event_id, item_key) DO UPDATE SET checked = excluded.checked, checked_at = excluded.checked_at
  `).run(eventId, itemKey, checked ? 1 : 0, now)
}

export function resetChecklist(eventId: number) {
  getDb().prepare(`DELETE FROM event_setup_checklist WHERE event_id = ?`).run(eventId)
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSetting(key: string, defaultValue: string): string {
  const row = getDb().prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined
  return row?.value ?? defaultValue
}

export function setSetting(key: string, value: string): void {
  getDb().prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value)
}

export function getSettings(): Record<string, string> {
  const rows = getDb().prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

// ─── Package management ───────────────────────────────────────────────────────

export function getAllPackages(): Package[] {
  return getDb().prepare(`SELECT * FROM packages ORDER BY active DESC, name`).all() as Package[]
}

export function createPackage(data: { id: string; name: string; price_per_guest: number; description: string }): void {
  getDb().prepare(`INSERT INTO packages (id, name, price_per_guest, description, active) VALUES (?, ?, ?, ?, 1)`)
    .run(data.id, data.name, data.price_per_guest, data.description)
}

export function updatePackage(id: string, data: Partial<{ name: string; price_per_guest: number; description: string; active: number }>): void {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ')
  getDb().prepare(`UPDATE packages SET ${fields} WHERE id = ?`).run(...Object.values(data), id)
}


// ─── Drink Ticket Log ─────────────────────────────────────────────────────────

export interface DrinkTicketLog {
  id: number
  event_id: number
  tickets_issued: number
  tickets_redeemed: number
  notes: string
  created_at: string
  updated_at: string
}

export function getDrinkTicketLog(eventId: number): DrinkTicketLog | undefined {
  return getDb().prepare(`SELECT * FROM drink_ticket_log WHERE event_id = ?`).get(eventId) as DrinkTicketLog | undefined
}

export function upsertDrinkTicketLog(eventId: number, data: { tickets_issued: number; tickets_redeemed: number; notes: string }): void {
  const now = new Date().toISOString()
  const existing = getDrinkTicketLog(eventId)
  if (existing) {
    getDb().prepare(`UPDATE drink_ticket_log SET tickets_issued = ?, tickets_redeemed = ?, notes = ?, updated_at = ? WHERE event_id = ?`)
      .run(data.tickets_issued, data.tickets_redeemed, data.notes, now, eventId)
  } else {
    getDb().prepare(`INSERT INTO drink_ticket_log (event_id, tickets_issued, tickets_redeemed, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(eventId, data.tickets_issued, data.tickets_redeemed, data.notes, now, now)
  }
}

// ─── Post-Event Debrief ─────────────────────────────────────────────────────────

export function getDebrief(eventId: number): EventDebrief | undefined {
  return getDb().prepare(`SELECT * FROM event_debriefs WHERE event_id = ?`).get(eventId) as EventDebrief | undefined
}

export function upsertDebrief(eventId: number, data: Omit<EventDebrief, 'id' | 'event_id' | 'created_at' | 'updated_at'>): void {
  const now = new Date().toISOString()
  const existing = getDebrief(eventId)
  if (existing) {
    getDb().prepare(`
      UPDATE event_debriefs SET actual_guest_count = ?, went_well = ?, issues = ?, catering_accuracy = ?,
        bar_impact_accuracy = ?, staffing_notes = ?, would_repeat_client = ?, recommendations = ?, updated_at = ?
      WHERE event_id = ?
    `).run(data.actual_guest_count, data.went_well, data.issues, data.catering_accuracy,
      data.bar_impact_accuracy, data.staffing_notes, data.would_repeat_client, data.recommendations, now, eventId)
  } else {
    getDb().prepare(`
      INSERT INTO event_debriefs (event_id, actual_guest_count, went_well, issues, catering_accuracy,
        bar_impact_accuracy, staffing_notes, would_repeat_client, recommendations, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, data.actual_guest_count, data.went_well, data.issues, data.catering_accuracy,
      data.bar_impact_accuracy, data.staffing_notes, data.would_repeat_client, data.recommendations, now, now)
  }
}

// Repeat-event intelligence: past closed events + debriefs for the same client, excluding the current event
export function getClientDebriefHistory(clientId: number, excludeEventId: number) {
  return getDb().prepare(`
    SELECT e.id, e.event_name, e.event_date, ed.actual_guest_count, ed.went_well, ed.issues,
           ed.catering_accuracy, ed.bar_impact_accuracy, ed.would_repeat_client, ed.recommendations
    FROM events e
    JOIN event_debriefs ed ON ed.event_id = e.id
    WHERE e.client_id = ? AND e.id != ?
    ORDER BY e.event_date DESC
  `).all(clientId, excludeEventId) as Array<{
    id: number; event_name: string; event_date: string; actual_guest_count: number | null
    went_well: string; issues: string; catering_accuracy: string; bar_impact_accuracy: string
    would_repeat_client: string; recommendations: string
  }>
}

// ─── Internal Task Management ───────────────────────────────────────────────
// Modular, event-driven: Setup/Breakdown tasks always generated, Dynamic tasks
// only when the triggering condition is true for this event (see lib/tasks.ts).

function buildTaskContext(eventId: number): TaskContext | null {
  const full = getEventFull(eventId)
  if (!full) return null
  const { event, details, packages } = full
  const hasPackage = packages.some(p => !!p.package_id)
  const packageCount = packages.filter(p => !!p.package_id).length

  const evForImpact: EventForNotes = {
    id: event.id,
    event_name: event.event_name,
    event_date: event.event_date,
    event_time: event.event_time,
    setup_time: '',
    decorate_time: '',
    teardown_time: event.teardown_time,
    production_close_time: '',
    event_duration_mins: event.event_duration_mins,
    space: event.space,
    status: event.status,
    first_name: '',
    last_name: '',
    email: '',
    guest_count: details?.guest_count ?? 0,
    bar_tab_type: details?.bar_tab_type ?? '',
    drink_tickets: details?.drink_tickets ?? 0,
  }
  const barImpactLevel = calcBarImpact(evForImpact).level

  return {
    guestCount: details?.guest_count ?? 0,
    hasPackage,
    packageCount,
    barTabType: details?.bar_tab_type ?? null,
    drinkTickets: details?.drink_tickets ?? 0,
    bigScreenTv: details?.big_screen_tv ?? 0,
    kidsAttending: details?.kids_attending ?? 0,
    dessertExpected: details?.dessert_expected ?? 0,
    dietaryRestrictions: details?.dietary_restrictions ?? '',
    barImpactLevel,
  }
}

export function getEventTasks(eventId: number): EventTask[] {
  return getDb().prepare(`SELECT * FROM event_tasks WHERE event_id = ? ORDER BY category, sort_order, id`).all(eventId) as EventTask[]
}

// Idempotent: only INSERTs templates that don't already have a matching source_key
// for this event. Never removes or overwrites an existing (possibly completed) task.
export function syncEventTasks(eventId: number): EventTask[] {
  const ctx = buildTaskContext(eventId)
  if (ctx) {
    const templates = generateTasksForEvent(ctx)
    const existing = new Set(
      (getDb().prepare(`SELECT source_key FROM event_tasks WHERE event_id = ? AND source_key IS NOT NULL`).all(eventId) as { source_key: string }[])
        .map(r => r.source_key)
    )
    const now = new Date().toISOString()
    const insert = getDb().prepare(`INSERT INTO event_tasks (event_id, category, label, role, source_key, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    const tx = getDb().transaction(() => {
      for (const t of templates) {
        if (!existing.has(t.key)) insert.run(eventId, t.category, t.label, t.role, t.key, now)
      }
    })
    tx()
  }
  return getEventTasks(eventId)
}

export function toggleTask(id: number, completed: boolean): void {
  const now = completed ? new Date().toISOString() : null
  getDb().prepare(`UPDATE event_tasks SET completed = ?, completed_at = ? WHERE id = ?`).run(completed ? 1 : 0, now, id)
}

export function updateTaskNotes(id: number, notes: string): void {
  getDb().prepare(`UPDATE event_tasks SET notes = ? WHERE id = ?`).run(notes, id)
}

export function addManualTask(eventId: number, data: { category: string; label: string; role: string }): number {
  const now = new Date().toISOString()
  const result = getDb()
    .prepare(`INSERT INTO event_tasks (event_id, category, label, role, source_key, created_at) VALUES (?, ?, ?, ?, NULL, ?)`)
    .run(eventId, data.category, data.label, data.role, now)
  return result.lastInsertRowid as number
}

export function deleteTask(id: number): void {
  getDb().prepare(`DELETE FROM event_tasks WHERE id = ?`).run(id)
}

// ─── Staff Members ────────────────────────────────────────────────────────────

export interface StaffMember {
  id: number
  name: string
  phone: string
  email: string
  active: number
  created_at: string
}

export function getStaffMembers(activeOnly = true): StaffMember[] {
  const where = activeOnly ? 'WHERE active = 1' : ''
  return getDb().prepare(`SELECT * FROM staff_members ${where} ORDER BY name`).all() as StaffMember[]
}

export function createStaffMember(data: { name: string; phone?: string; email?: string }): number {
  const result = getDb()
    .prepare(`INSERT INTO staff_members (name, phone, email, active, created_at) VALUES (?, ?, ?, 1, ?)`)
    .run(data.name, data.phone ?? '', data.email ?? '', new Date().toISOString())
  return result.lastInsertRowid as number
}

export function updateStaffMember(id: number, data: Partial<{ name: string; phone: string; email: string; active: number }>): void {
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ')
  getDb().prepare(`UPDATE staff_members SET ${fields} WHERE id = ?`).run(...Object.values(data), id)
}

export function deleteStaffMember(id: number): void {
  getDb().prepare(`DELETE FROM staff_members WHERE id = ?`).run(id)
}

// ─── Notifications (Alert Engine) ─────────────────────────────────────────────

export interface Notification {
  id: number
  entity_type: 'reservation' | 'event'
  entity_id: number
  alert_key: string
  trigger_at: string
  status: 'pending' | 'completed'
  completed_at: string | null
  created_at: string
}

export function getNotifications(): Notification[] {
  return getDb().prepare(`SELECT * FROM notifications ORDER BY trigger_at`).all() as Notification[]
}

/** Inserts a notification row if one doesn't already exist for this (entity, alert_key). Returns true if newly created. */
export function createNotificationIfNew(entityType: 'reservation' | 'event', entityId: number, alertKey: string, triggerAt: string): boolean {
  const result = getDb()
    .prepare(`INSERT OR IGNORE INTO notifications (entity_type, entity_id, alert_key, trigger_at, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`)
    .run(entityType, entityId, alertKey, triggerAt, new Date().toISOString())
  return result.changes > 0
}

export function completeNotification(id: number): void {
  getDb().prepare(`UPDATE notifications SET status = 'completed', completed_at = ? WHERE id = ?`).run(new Date().toISOString(), id)
}

export function completeNotificationsForEntity(entityType: 'reservation' | 'event', entityId: number): void {
  getDb()
    .prepare(`UPDATE notifications SET status = 'completed', completed_at = ? WHERE entity_type = ? AND entity_id = ? AND status = 'pending'`)
    .run(new Date().toISOString(), entityType, entityId)
}

/** Reservations eligible for alerting: not cancelled/completed/no-show, and tables not yet physically blocked off. */
export function getActiveReservationsForAlerts(): Reservation[] {
  const today = format(new Date(), 'yyyy-MM-dd')
  return getDb()
    .prepare(`SELECT * FROM reservations WHERE status NOT IN ('Cancelled', 'Completed', 'No-Show') AND tables_assigned_at IS NULL AND reservation_date >= ?`)
    .all(today) as Reservation[]
}

/** Active (non-Closed) events with their details, for the private-event alert engine. */
/** Active events today or in the future — past events are excluded so their alerts don't linger forever unactioned. */
export function getActiveEventsForAlerts(): (Event & { alert_offsets_json: string; guest_count: number | null })[] {
  const today = format(new Date(), 'yyyy-MM-dd')
  return getDb().prepare(`
    SELECT e.*, ed.alert_offsets_json, ed.guest_count
    FROM events e
    LEFT JOIN event_details ed ON ed.event_id = e.id
    WHERE e.status != 'Closed' AND e.event_date >= ?
  `).all(today) as (Event & { alert_offsets_json: string; guest_count: number | null })[]
}

/** Non-Closed events whose date has arrived/passed with final payment not yet marked received
 * in the Toast Status Tracker — for the "final balance overdue" alert. Deliberately looks at
 * past events (unlike getActiveEventsForAlerts), since final payment is only ever "overdue"
 * once the event has already happened. Status-only, per the Toast Status Tracker (Toast
 * remains system of record for the actual balance) — see docs/V1_FEATURE_LOCK.md. */
export function getOverdueFinalBalanceEvents(): Array<{ id: number; event_name: string; event_date: string }> {
  const today = format(new Date(), 'yyyy-MM-dd')
  return getDb().prepare(`
    SELECT e.id, e.event_name, e.event_date
    FROM events e
    LEFT JOIN event_details ed ON ed.event_id = e.id
    WHERE e.status != 'Closed' AND e.event_date <= ?
      AND ed.toast_final_payment_date IS NULL
  `).all(today) as Array<{ id: number; event_name: string; event_date: string }>
}
