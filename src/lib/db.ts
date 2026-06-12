import Database from 'better-sqlite3'
import path from 'path'
import { seedDatabase } from './seed'
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
      contract_signed INTEGER DEFAULT 0
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
  `)
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
  teardown_time: string
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

export function getEvents(): EventWithClient[] {
  refreshOverduePayments()
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
    ORDER BY e.event_date DESC
  `).all() as EventWithClient[]
}

export function getEvent(id: number): Event | undefined {
  return getDb().prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined
}

export function getEventFull(id: number) {
  const event = getDb().prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined
  if (!event) return null
  const client = event.client_id ? getClient(event.client_id) : null
  const details = getDb().prepare('SELECT * FROM event_details WHERE event_id = ?').get(id) as EventDetails | undefined
  const payments = getPayments(id)
  const addOns = getAddOns(id)
  const notes = getEventNotes(id)
  let pkg: Package | null = null
  let menuItems: MenuItem[] = []
  if (details?.package_id) {
    pkg = getPackage(details.package_id)
    menuItems = getMenuItems(details.package_id)
  }
  return { event, client, details, payments, addOns, notes, pkg, menuItems }
}

export function createEvent(data: {
  event_name: string
  event_date: string
  event_time: string
  setup_time: string
  teardown_time: string
  status: string
  space: string
  client_id: number
}): number {
  const now = new Date().toISOString()
  const result = getDb()
    .prepare(
      `INSERT INTO events (event_name, event_date, event_time, setup_time, teardown_time, status, space, client_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.event_name, data.event_date, data.event_time,
      data.setup_time, data.teardown_time, data.status,
      data.space, data.client_id, now, now
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
  return getDb().prepare(`
    SELECT e.*, c.first_name, c.last_name, ed.guest_count, ed.package_id,
           p.name as package_name, p.price_per_guest
    FROM events e
    LEFT JOIN clients c ON c.id = e.client_id
    LEFT JOIN event_details ed ON ed.event_id = e.id
    LEFT JOIN packages p ON p.id = ed.package_id
    ORDER BY e.event_date ASC
  `).all() as EventWithClient[]
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
