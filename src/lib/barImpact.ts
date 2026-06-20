import { to12Hour } from './timeUtils'
import { DRINK_TICKET_PRICE } from './constants'
import type { EventForNotes } from './noteGenerators'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImpactLevel = 'Low' | 'Moderate' | 'High' | 'Critical'

export interface BarImpactResult {
  level: ImpactLevel
  score: number
  factors: string[]
  congestionNotes: string[]
  guestFlowNotes: string[]
  alertText: string
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function dayOfWeek(dateStr: string): number {
  // 0=Sun, 1=Mon ... 6=Sat
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).getDay()
  } catch { return -1 }
}

function hour(timeStr: string): number {
  try { return parseInt(timeStr.split(':')[0], 10) } catch { return -1 }
}

export function calcBarImpact(ev: EventForNotes): BarImpactResult {
  let score = 0
  const factors: string[] = []
  const congestionNotes: string[] = []
  const guestFlowNotes: string[] = []

  // ── Guest count ──────────────────────────────────────────────────────────
  const guests = ev.guest_count ?? 0
  if (guests >= 66) {
    score += 4; factors.push(`Very large group (${guests} guests)`)
  } else if (guests >= 51) {
    score += 3; factors.push(`Large group (${guests} guests)`)
  } else if (guests >= 36) {
    score += 2; factors.push(`Medium-large group (${guests} guests)`)
  } else if (guests >= 20) {
    score += 1; factors.push(`Medium group (${guests} guests)`)
  } else {
    factors.push(`Small group (${guests} guests)`)
  }

  // ── Beverage option ──────────────────────────────────────────────────────
  if (ev.bar_tab_type === 'Individual Tabs') {
    score += 2
    factors.push('Individual Tabs — highest main bar interaction')
    congestionNotes.push('Individual tabs require each guest to open and manage their own tab at the main bar.')
    congestionNotes.push('Expect increased open tab volume throughout the event.')
  } else if (ev.bar_tab_type === 'By Consumption') {
    score += 1
    factors.push('By Consumption — event tab requires bar staff coordination')
    congestionNotes.push('By Consumption requires all beverages rung to the event tab — bar staff must confirm tab holder at event start.')
    congestionNotes.push('Guests still order at the main bar; all drinks captured under the event tab, not individual tickets.')
  } else if (ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)') {
    factors.push('Pre-Paid Drink Tickets — controlled ordering flow')
    congestionNotes.push('Pre-paid drink tickets may create quick redemption waves, especially in the first 15–30 minutes.')
    if ((ev.drink_tickets ?? 0) > 0 && guests > 0) {
      const ticketsPerGuest = ((ev.drink_tickets ?? 0) / guests).toFixed(1)
      congestionNotes.push(`${ticketsPerGuest} tickets per guest — monitor redemption rate during peak ordering window.`)
    }
  }

  // ── Day of week ──────────────────────────────────────────────────────────
  const dow = dayOfWeek(ev.event_date)
  if (dow === 6) {
    score += 2; factors.push('Saturday — highest taproom traffic day')
    congestionNotes.push('Event begins on a Saturday during likely peak taproom traffic.')
  } else if (dow === 5) {
    score += 1; factors.push('Friday — high taproom traffic day')
    congestionNotes.push('Event falls on a Friday — expect elevated taproom bar volume alongside event orders.')
  } else if (dow === 0) {
    score += 1; factors.push('Sunday — moderate taproom traffic')
  }

  // ── Start time ──────────────────────────────────────────────────────────
  const h = hour(ev.event_time)
  if (h >= 18 && h <= 20) {
    score += 2; factors.push(`Peak bar hours (${to12Hour(ev.event_time)} start)`)
    congestionNotes.push('Event begins during peak bar hours (6–9 PM). Expect first-hour ordering surge.')
  } else if (h >= 16 && h < 18) {
    score += 1; factors.push(`Shoulder hours (${to12Hour(ev.event_time)} start)`)
    congestionNotes.push('Event begins during shoulder hours — taproom traffic building toward evening peak.')
  } else if (h >= 21) {
    factors.push(`Late start (${to12Hour(ev.event_time)})`)
    congestionNotes.push('Late-evening event — taproom guests may be winding down but bar remains active.')
  }

  // ── Capacity flags ───────────────────────────────────────────────────────
  if (guests >= 50) {
    congestionNotes.push('Large guest count — monitor queue formation at main bar. Consider proactive communication to taproom lead.')
  }
  if (guests < 30) {
    congestionNotes.push('Guest count under 30 — production space may be shared with other guests. Maintain clear boundaries.')
  }

  // ── Impact level ─────────────────────────────────────────────────────────
  let level: ImpactLevel
  if (score >= 7)      level = 'Critical'
  else if (score >= 5) level = 'High'
  else if (score >= 3) level = 'Moderate'
  else                 level = 'Low'

  // ── Guest flow notes ─────────────────────────────────────────────────────
  guestFlowNotes.push('Guests enter the event space through the taproom/event space glass door.')
  guestFlowNotes.push('Restrooms accessed by exiting through the glass door closest to the event space — guests pass through taproom briefly.')
  guestFlowNotes.push('Guests may NOT walk through employee-only production areas at any time.')
  guestFlowNotes.push('Production exit doors are emergency-use only.')

  if (ev.bar_tab_type === 'Individual Tabs' || ev.bar_tab_type === 'By Consumption') {
    guestFlowNotes.push('Guests will walk to and from the main bar throughout the event — anticipate foot traffic in the taproom corridor.')
  }
  if (ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)') {
    guestFlowNotes.push('Initial drink ticket redemption will drive a burst of traffic to the main bar at event start.')
  }
  if (ev.package_name) {
    guestFlowNotes.push('Buffet is located in the event space — guests do not need to visit the main bar for food.')
  }
  if (guests >= 40) {
    guestFlowNotes.push('With a larger group, position signage at the glass door to direct guests and prevent wandering into production areas.')
  }

  // ── Alert copy/paste block ────────────────────────────────────────────────
  const alertLines: string[] = [
    'PRIVATE EVENT BAR ALERT',
    '',
    `Event:            ${ev.event_name}`,
    `Host:             ${ev.first_name} ${ev.last_name}${ev.company ? ' / ' + ev.company : ''}`,
    `Date / Time:      ${ev.event_date}  ${to12Hour(ev.event_time)} – ${to12Hour(ev.teardown_time)}`,
    `Space:            ${ev.space || '—'}`,
    `Guest Count:      ${guests > 0 ? guests : '—'}`,
    `Beverage Option:  ${ev.bar_tab_type ? `BAR TAB | ${ev.bar_tab_type}` : '—'}`,
  ]

  if (ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && (ev.drink_tickets ?? 0) > 0) {
    alertLines.push(`Ticket Count:     ${ev.drink_tickets} tickets @ $${DRINK_TICKET_PRICE.toFixed(2)} each`)
  }

  alertLines.push(`Expected Impact:  ${level.toUpperCase()}`)
  alertLines.push('')
  alertLines.push('Notes for Main Bar:')
  congestionNotes.forEach(n => alertLines.push(`  • ${n}`))

  const alertText = alertLines.join('\n')

  return { level, score, factors, congestionNotes, guestFlowNotes, alertText }
}

// ─── Impact level display helpers ─────────────────────────────────────────────

export const IMPACT_COLORS: Record<ImpactLevel, { bg: string; text: string; border: string; dot: string }> = {
  Low:      { bg: 'bg-green-900/30',  text: 'text-green-300',  border: 'border-green-700/50',  dot: 'bg-green-400'  },
  Moderate: { bg: 'bg-yellow-900/30', text: 'text-yellow-300', border: 'border-yellow-700/50', dot: 'bg-yellow-400' },
  High:     { bg: 'bg-orange-900/30', text: 'text-orange-300', border: 'border-orange-700/50', dot: 'bg-orange-400' },
  Critical: { bg: 'bg-red-900/30',    text: 'text-red-300',    border: 'border-red-700/50',    dot: 'bg-red-400'    },
}

export const IMPACT_PRINT_COLORS: Record<ImpactLevel, string> = {
  Low:      '#15803d',
  Moderate: '#a16207',
  High:     '#c2410c',
  Critical: '#b91c1c',
}
