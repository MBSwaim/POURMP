export const EVENT_STATUSES = ['Confirmed', 'Planning', 'Ready', 'Active', 'Closed'] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

// One-shot intake, not a tracked CRM pipeline: a lead is either awaiting triage, or
// has been resolved one of two ways. There is deliberately no "Contacted"/nurture
// stage — that kind of lead management belongs in Toast (see docs/V1_FEATURE_LOCK.md).
export const LEAD_STATUSES = ['New', 'Converted', 'Dismissed'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const CALC_METHODS = ['guests_per_unit', 'pieces_per_guest', 'servings_per_guest', 'manual'] as const
export type CalcMethod = (typeof CALC_METHODS)[number]

export const DRINK_TICKET_PRICE = 9.00

export const GENERAL_INFO =
  'All events require a signed contract and 20% deposit to confirm. Final balance is due day of event. Prices are per person and subject to change based on final guest count confirmed 72 hours prior.'

export const CANCELLATION_POLICY =
  'Cancellations made 14+ days prior: deposit refunded minus 10% processing fee. Cancellations within 7–13 days: 50% of deposit retained. Cancellations within 7 days: deposit non-refundable. No-shows: full event total charged.'

export const MPBC_CONTACT = 'Manhattan Project Beer Co. | events@manhattanproject.beer | (555) 000-0000'

// Business hours — index = day of week (0=Sun)
// minStart = opening + 1 hour (earliest allowed event start)
export const BUSINESS_HOURS: Record<number, { open: string; close: string; minStart: string }> = {
  0: { open: '10:00', close: '22:00', minStart: '11:00' }, // Sun
  1: { open: '07:00', close: '22:00', minStart: '08:00' }, // Mon
  2: { open: '07:00', close: '22:00', minStart: '08:00' }, // Tue
  3: { open: '07:00', close: '22:00', minStart: '08:00' }, // Wed
  4: { open: '07:00', close: '22:00', minStart: '08:00' }, // Thu
  5: { open: '07:00', close: '23:59', minStart: '08:00' }, // Fri
  6: { open: '08:00', close: '23:59', minStart: '09:00' }, // Sat
}

export const RESERVATION_STATUSES = ['Confirmed', 'Seated', 'Completed', 'Cancelled', 'No-Show'] as const

// Taproom table layout — number and seating capacity of each physical table.
export const TAPROOM_TABLES = [
  { number: 200, seats: 2 },
  { number: 201, seats: 2 },
  { number: 202, seats: 2 },
  { number: 203, seats: 2 },
  { number: 204, seats: 2 },
  { number: 205, seats: 2 },
  { number: 206, seats: 2 },
  { number: 302, seats: 6 },
  { number: 303, seats: 6 },
  { number: 301, seats: 8 },
  { number: 304, seats: 8 },
] as const

// The only two tables that ever get physically joined into one long table.
export const TABLE_COMBOS = [
  { tables: [301, 302] as const, seats: 14 },
  { tables: [303, 304] as const, seats: 14 },
] as const

export const BLOCK_REASONS = ['Company Event', 'Holiday'] as const
export type BlockReason = (typeof BLOCK_REASONS)[number]
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

export const STATUS_COLORS: Record<string, string> = {
  Confirmed: 'bg-green-500',
  Planning: 'bg-blue-500',
  Ready: 'bg-yellow-500',
  Active: 'bg-orange-500',
  Closed: 'bg-slate-500',
}

