export const EVENT_STATUSES = ['New', 'Contacted', 'Converted', 'Tentative', 'Confirmed', 'Closed'] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

export const PAYMENT_TYPES = ['deposit', 'final', 'other'] as const
export type PaymentType = (typeof PAYMENT_TYPES)[number]

export const PAYMENT_STATUSES = ['pending', 'paid', 'overdue'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const CALC_METHODS = ['guests_per_unit', 'pieces_per_guest', 'servings_per_guest', 'manual'] as const
export type CalcMethod = (typeof CALC_METHODS)[number]

export const DEPOSIT_PCT = 0.20
export const FINAL_PCT = 0.80
export const DEPOSIT_DAYS_BEFORE = 7

export const GENERAL_INFO =
  'All events require a signed contract and 20% deposit to confirm. Final balance is due day of event. Prices are per person and subject to change based on final guest count confirmed 72 hours prior.'

export const CANCELLATION_POLICY =
  'Cancellations made 14+ days prior: deposit refunded minus 10% processing fee. Cancellations within 7–13 days: 50% of deposit retained. Cancellations within 7 days: deposit non-refundable. No-shows: full event total charged.'

export const MPBC_CONTACT = 'Manhattan Project Beer Co. | events@manhattanproject.beer | (555) 000-0000'

export const STATUS_COLORS: Record<string, string> = {
  New: 'bg-gray-500',
  Contacted: 'bg-blue-500',
  Converted: 'bg-purple-500',
  Tentative: 'bg-yellow-500',
  Confirmed: 'bg-green-500',
  Closed: 'bg-slate-500',
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  paid: 'bg-green-500',
  overdue: 'bg-red-500',
}
