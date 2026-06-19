import Database from 'better-sqlite3'
import path from 'path'
import { seedDatabase, seedHistoricalEvents } from './seed'
import { DEPOSIT_PCT, FINAL_PCT, DEPOSIT_DAYS_BEFORE } from './constants'
import { subDays, format, parseISO } from 'date-fns'

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

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      payment_type TEXT,
      amount_due REAL,
      amount_paid REAL DEFAULT 0,
      due_date TEXT,
      paid_date TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT
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
    `CREATE TABLE IF NOT EXISTS event_packages (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, package_id TEXT NOT NULL, guest_count INTEGER DEFAULT 0, buffer_pct REAL DEFAULT 0, sort_order INTEGER DEFAULT 0)`,
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
  notes: string
  referral_source: string
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
  service_fee: number
  gratuity_pct: number
  tax_pct: number
  floor_plan_notes: string
  big_screen_tv: number
  selected_sauces: string
  serve_style_json: string
  beo_notes: string
  kitchen_notes: string
}

export interface EventPackage {
  id: number
  event_id: number
  package_id: string
  guest_count: number
  buffer_pct: number
  sort_order: number
}

export interface EventPackageWithItems {
  id: number
  event_id: number
  package_id: string
  guest_count: number
  buffer_pct: number
  sort_order: number
  pkg: Package | null
  menuItems: MenuItem[]
}

export interface Payment {
  id: number
  event_id: number
  payment_type: string
  amount_due: number
  amount_paid: number
  due_date: string
  paid_date: string
  status: string
  notes: string
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
  company: string
  guest_count: number
  package_id: string
  package_name: string
  price_per_guest: number
  deposit_status: string | null
  final_status: string | null
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
      `INSERT INTO clients (first_name, last_name, email, phone, company, notes, referral_source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(data.first_name, data.last_name, data.email, data.phone, data.company, data.notes, data.referral_source)
  return result.lastInsertRowid as number
}

export function updateClient(id: number, data: Partial<Omit<Client, 'id'>>) {
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ')
  getDb()
    .prepare(`UPDATE clients SET ${fields} WHERE id = ?`)
    .run(...Object.values(data), id)
}

// ─── Events ───────────────────────────────────────────────────────────────────

export function getEvents(year?: number): EventWithClient[] {
  refreshOverduePayments()
  const yearClause = year ? `WHERE strftime('%Y', e.event_date) = '${year}'` : ''
  return getDb().prepare(`
    SELECT e.*,
      c.first_name, c.last_name, c.email, c.company,
      ed.guest_count, ed.package_id,
      p.name as package_name, p.price_per_guest,
      dep.status as deposit_status,
      fin.status as final_status
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    LEFT JOIN event_details ed ON ed.event_id = e.id
    LEFT JOIN packages p ON p.id = ed.package_id
    LEFT JOIN payments dep ON dep.event_id = e.id AND dep.payment_type = 'deposit'
    LEFT JOIN payments fin ON fin.event_id = e.id AND fin.payment_type = 'final'
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
  const payments = getPayments(id)
  const addOns = getAddOns(id)
  const notes = getEventNotes(id)
  const packages = getEventPackages(id)
  // backward compat: first package = primary
  const pkg = packages[0]?.pkg ?? null
  const menuItems = packages[0]?.menuItems ?? []
  return { event, client, details, payments, addOns, notes, pkg, menuItems, packages }
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
  getDb().prepare('DELETE FROM events WHERE id = ?').run(id)
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

// ─── Payments ─────────────────────────────────────────────────────────────────

export function getPayments(eventId: number): Payment[] {
  return getDb().prepare('SELECT * FROM payments WHERE event_id = ? ORDER BY payment_type').all(eventId) as Payment[]
}

export function createPayment(data: Omit<Payment, 'id'>): number {
  const result = getDb()
    .prepare(
      `INSERT INTO payments (event_id, payment_type, amount_due, amount_paid, due_date, paid_date, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.event_id, data.payment_type, data.amount_due, data.amount_paid,
      data.due_date, data.paid_date, data.status, data.notes
    )
  return result.lastInsertRowid as number
}

export function updatePayment(id: number, data: Partial<Omit<Payment, 'id'>>) {
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ')
  getDb().prepare(`UPDATE payments SET ${fields} WHERE id = ?`).run(...Object.values(data), id)
}

export function generatePayments(eventId: number, guestCount: number, pricePerGuest: number, eventDate: string) {
  const existing = getPayments(eventId)
  if (existing.length > 0) return

  const total = guestCount * pricePerGuest
  const depositAmt = total * DEPOSIT_PCT
  const finalAmt = total * FINAL_PCT
  const depositDue = format(subDays(parseISO(eventDate), DEPOSIT_DAYS_BEFORE), 'yyyy-MM-dd')

  createPayment({
    event_id: eventId,
    payment_type: 'deposit',
    amount_due: depositAmt,
    amount_paid: 0,
    due_date: depositDue,
    paid_date: '',
    status: 'pending',
    notes: '',
  })
  createPayment({
    event_id: eventId,
    payment_type: 'final',
    amount_due: finalAmt,
    amount_paid: 0,
    due_date: eventDate,
    paid_date: '',
    status: 'pending',
    notes: '',
  })
}

export function refreshOverduePayments() {
  const today = format(new Date(), 'yyyy-MM-dd')
  getDb()
    .prepare(`UPDATE payments SET status = 'overdue' WHERE status = 'pending' AND due_date < ?`)
    .run(today)
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
  refreshOverduePayments()
  const db = getDb()
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = today.substring(0, 7) + '-01'
  const in14 = format(new Date(Date.now() + 14 * 86400000), 'yyyy-MM-dd')

  const eventsThisMonth = (db.prepare(
    `SELECT COUNT(*) as c FROM events WHERE event_date >= ? AND event_date <= ?`
  ).get(monthStart, today.substring(0, 7) + '-31') as { c: number }).c

  const revenueProjected = (db.prepare(
    `SELECT COALESCE(SUM(ed.guest_count * p.price_per_guest), 0) as total
     FROM events e
     JOIN event_details ed ON ed.event_id = e.id
     JOIN packages p ON p.id = ed.package_id
     WHERE e.event_date >= ? AND e.status NOT IN ('Closed')`
  ).get(monthStart) as { total: number }).total

  const depositsOutstanding = (db.prepare(
    `SELECT COALESCE(SUM(amount_due - amount_paid), 0) as total
     FROM payments WHERE payment_type = 'deposit' AND status != 'paid'`
  ).get() as { total: number }).total

  const eventsThisWeek = (db.prepare(
    `SELECT COUNT(*) as c FROM events WHERE event_date >= ? AND event_date <= ?`
  ).get(today, in14) as { c: number }).c

  const upcomingEvents = db.prepare(`
    SELECT e.*, c.first_name, c.last_name, ed.guest_count
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    LEFT JOIN event_details ed ON ed.event_id = e.id
    WHERE e.event_date >= ? AND e.event_date <= ?
    ORDER BY e.event_date ASC
  `).all(today, in14) as Array<Event & { first_name: string; last_name: string; guest_count: number }>

  return { eventsThisMonth, revenueProjected, depositsOutstanding, eventsThisWeek, upcomingEvents }
}

export function getKanbanEvents() {
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  return getDb().prepare(`
    SELECT e.*, c.first_name, c.last_name, ed.guest_count, ed.package_id,
           p.name as package_name, p.price_per_guest
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    LEFT JOIN event_details ed ON ed.event_id = e.id
    LEFT JOIN packages p ON p.id = ed.package_id
    WHERE e.status NOT IN ('Tentative','Confirmed','Closed')
       OR strftime('%Y-%m', e.event_date) = ?
    ORDER BY e.event_date ASC
  `).all(currentMonth) as EventWithClient[]
}

export function getArchivedEvents(year?: number) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const yearFilter = year ? `AND strftime('%Y', e.event_date) = '${year}'` : ''
  return getDb().prepare(`
    SELECT e.*, c.first_name, c.last_name, ed.guest_count, ed.package_id,
           p.name as package_name, p.price_per_guest
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    LEFT JOIN event_details ed ON ed.event_id = e.id
    LEFT JOIN packages p ON p.id = ed.package_id
    WHERE e.status = 'Closed'
      AND strftime('%Y-%m', e.event_date) < ?
      ${yearFilter}
    ORDER BY e.event_date DESC
  `).all(currentMonth) as EventWithClient[]
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface YOYMonthData {
  month: number
  event_count: number
  invoiced: number
  collected: number
}

export function getYearMonthly(year: number): YOYMonthData[] {
  return getDb().prepare(`
    SELECT
      CAST(strftime('%m', e.event_date) AS INTEGER) as month,
      COUNT(DISTINCT e.id) as event_count,
      COALESCE(SUM(p.amount_due), 0) as invoiced,
      COALESCE(SUM(p.amount_paid), 0) as collected
    FROM events e
    LEFT JOIN payments p ON p.event_id = e.id
    WHERE strftime('%Y', e.event_date) = ?
    GROUP BY month
    ORDER BY month
  `).all(String(year)) as YOYMonthData[]
}

export function getYearTotals(year: number) {
  return getDb().prepare(`
    SELECT
      COUNT(DISTINCT e.id) as event_count,
      COALESCE(SUM(p.amount_due), 0) as invoiced,
      COALESCE(SUM(p.amount_paid), 0) as collected
    FROM events e
    LEFT JOIN payments p ON p.event_id = e.id
    WHERE strftime('%Y', e.event_date) = ?
  `).get(String(year)) as { event_count: number; invoiced: number; collected: number }
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

export function getUpcomingReservations(limit = 20): Reservation[] {
  const today = format(new Date(), 'yyyy-MM-dd')
  return getDb()
    .prepare(`SELECT * FROM reservations WHERE reservation_date >= ? ORDER BY reservation_date, reservation_time LIMIT ?`)
    .all(today, limit) as Reservation[]
}

export function createReservation(data: Omit<Reservation, 'id' | 'created_at'>): number {
  const result = getDb()
    .prepare(
      `INSERT INTO reservations (client_name, phone, email, party_size, reservation_date, reservation_time, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.client_name, data.phone, data.email, data.party_size,
      data.reservation_date, data.reservation_time, data.notes,
      data.status || 'Confirmed', new Date().toISOString()
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

