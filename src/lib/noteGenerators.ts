import { to12Hour, shiftTime } from './timeUtils'
import { DRINK_TICKET_PRICE } from './constants'
import {
  calcAllItems,
  formatCateringText,
  formatEquipmentText,
  countChafingDishes,
  parseMenuItemOverrides,
  type MenuItem,
  type CalculatedItem,
} from './calculations'
import { calcBarImpact } from './barImpact'
import { calcReadiness } from './readiness'
import { calcTaskComplexity, TASK_ROLES, type TaskContext } from './tasks'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventForNotes {
  id: number
  event_name: string
  event_date: string
  event_time: string
  setup_time: string
  decorate_time: string
  teardown_time: string
  production_close_time: string
  event_duration_mins: number
  space: string
  status: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  company?: string
  guest_count: number
  package_name?: string
  price_per_guest?: number
  food_notes?: string
  dietary_restrictions?: string
  bar_tab_type?: string
  drink_tickets?: number
  tab_details?: string
  setup_notes?: string
  floor_plan_notes?: string
  big_screen_tv?: number
  selected_sauces?: string
  serve_style_json?: string
  menu_item_overrides_json?: string
  beo_notes?: string
  kitchen_notes?: string
  staffing_notes?: string
  service_fee?: number
  gratuity_pct?: number
  tax_pct?: number
  buffer_pct?: number
  contract_signed?: number
  toast_proposal_sent_date?: string | null
  toast_confirmed_date?: string | null
  toast_invoice_sent_date?: string | null
  toast_deposit_received_date?: string | null
  toast_final_payment_date?: string | null
  kids_attending?: number
  dessert_expected?: number
  // catering items from the package
  menuItems?: MenuItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return dateStr }
}

// Descriptions auto-populated into tab_details by the event form — skip if unchanged
const STANDARD_TAB_DESCRIPTIONS: Record<string, string> = {
  'Pre-Paid Drink Ticket(s)': 'Includes all beer selections on tap, wine, rosé, sparkling brut, beer- and wine-based cocktails, coffee, and non-alcoholic beverage options.',
  'By Consumption': 'All event beverages are to be rung to the event tab and charged according to actual consumption.',
  'Individual Tabs': 'Guests will open individual tabs directly at the bar for drink selections only.',
}

function extraTabNotes(ev: EventForNotes): string {
  if (!ev.tab_details) return ''
  const standard = STANDARD_TAB_DESCRIPTIONS[ev.bar_tab_type ?? ''] ?? ''
  const cleaned = ev.tab_details.trim()
  return cleaned === standard.trim() ? '' : cleaned
}

function beverageLine(ev: EventForNotes): string {
  if (!ev.bar_tab_type) return '—'
  if (ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)') {
    const qty = ev.drink_tickets ?? 0
    return `BAR TAB | Pre-Paid Drink Tickets${qty > 0 ? ` (${qty} @ $${DRINK_TICKET_PRICE.toFixed(2)} each)` : ''}`
  }
  if (ev.bar_tab_type === 'By Consumption') return 'BAR TAB | By Consumption'
  if (ev.bar_tab_type === 'Individual Tabs') return 'BAR TAB | Individual Tabs'
  return `BAR TAB | ${ev.bar_tab_type}`
}

function serveStyleMap(ev: EventForNotes): Record<string, 'all' | 'staggered'> {
  if (!ev.serve_style_json) return {}
  try { return JSON.parse(ev.serve_style_json) } catch { return {} }
}

function calcItems(ev: EventForNotes): CalculatedItem[] {
  if (!ev.menuItems || ev.menuItems.length === 0) return []
  return calcAllItems(ev.menuItems, ev.guest_count, (ev.buffer_pct ?? 0) / 100, parseMenuItemOverrides(ev.menu_item_overrides_json))
}

// ─── TOAST NOTES BUILDER ──────────────────────────────────────────────────────

export function generateToastNotes(ev: EventForNotes, tasks: BriefTask[] = []): string {
  const lines: string[] = []
  const foodServedTime = shiftTime(ev.event_time, -15)
  const items = calcItems(ev)
  const serveStyle = serveStyleMap(ev)
  const equipmentLine = items.length > 0 ? formatEquipmentText(items, serveStyle) : '—'
  const chafing = countChafingDishes(items, serveStyle)

  // EVENT DETAILS
  lines.push('EVENT DETAILS')
  lines.push('')
  if (ev.production_close_time) lines.push(`Close off Production Space @ ${to12Hour(ev.production_close_time)}`)
  if (ev.setup_time)            lines.push(`Event Setup @ ${to12Hour(ev.setup_time)}`)
  if (ev.decorate_time)         lines.push(`Host Arrival (for setup only) @ ${to12Hour(ev.decorate_time)}`)
  if (ev.event_time)            lines.push(`Food Served @ ${to12Hour(foodServedTime)}`)
  if (ev.event_time)            lines.push(`Event Starts @ ${to12Hour(ev.event_time)}`)
  if (ev.teardown_time)         lines.push(`Event Ends @ ${to12Hour(ev.teardown_time)}`)
  lines.push('')

  // FOOD DETAILS
  lines.push('FOOD DETAILS')
  lines.push('')
  lines.push(`DIETARY RESTRICTIONS: ${ev.dietary_restrictions || 'None noted'}`)

  if (items.length > 0 && ev.package_name) {
    const foodText = formatCateringText(
      [{ name: ev.package_name, items }],
      ev.selected_sauces
    )
    lines.push(foodText)
  } else if (ev.package_name) {
    lines.push(ev.package_name.toUpperCase())
    lines.push('(Guest count or menu items not set — open event to configure catering)')
  } else {
    lines.push('(No catering package selected)')
  }

  if (ev.food_notes) {
    lines.push(`Notes: ${ev.food_notes}`)
  }
  lines.push('Please Note: Ordering off our taproom food menu during events is not permitted.')
  lines.push('')

  // TAB DETAILS
  lines.push('TAB DETAILS')
  lines.push('')
  lines.push(beverageLine(ev))
  if (ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && (ev.drink_tickets ?? 0) > 0) {
    lines.push(`(${ev.drink_tickets}) Redeemable Drink Tickets per guest (host to distribute)`)
    lines.push('Drink tickets to be redeemed at bar and captured on event tab.')
  }
  if (ev.bar_tab_type === 'Individual Tabs') {
    lines.push('Guests open individual tabs directly at the bar for drink selections only.')
    lines.push('Food items may not be added to individual guest tabs during a private event.')
  }
  if (ev.bar_tab_type === 'By Consumption') {
    lines.push('All event beverages are to be rung to the event tab and charged according to actual consumption.')
  }
  const extraNotes = extraTabNotes(ev)
  if (extraNotes) {
    lines.push(extraNotes)
  }
  lines.push(`Main Bar Impact: ${calcBarImpact(ev).level.toUpperCase()} (see Main Bar Impact tab for details)`)
  if (tasks.length > 0) {
    const dynamicCount = tasks.filter(t => t.category === 'Dynamic').length
    const taskCtx: TaskContext = {
      guestCount: ev.guest_count,
      hasPackage: !!ev.package_name,
      packageCount: ev.package_name ? 1 : 0,
      barTabType: ev.bar_tab_type,
      drinkTickets: ev.drink_tickets,
      bigScreenTv: ev.big_screen_tv,
      barImpactLevel: calcBarImpact(ev).level,
    }
    const complexity = calcTaskComplexity(taskCtx, dynamicCount)
    lines.push(`Task Complexity: ${complexity.level.toUpperCase()} (see Internal Tasks section below for full checklist)`)
  }
  lines.push('')

  // SETUP DETAILS
  lines.push('SETUP DETAILS')
  lines.push('')
  // "MP EVENT SETUP" standard checklist removed from output per request (2026) — kept here for future reference:
  // lines.push('MP EVENT SETUP')
  // lines.push('\t• Space restrictions and safety boundaries in place')
  // lines.push('\t• Tables, linens, plates, utensils, and event materials prepared')
  // lines.push('\t• Lighting adjusted appropriately for event atmosphere')
  // lines.push('\t• Music source confirmed and volume adjusted appropriately')
  // if (ev.big_screen_tv) lines.push('\t• Audio/visual setup completed — TV/HDMI confirmed')
  // else lines.push('\t• Audio/visual setup completed if applicable')
  // lines.push('\t• Buffet tables and service areas prepared prior to guest arrival')
  // lines.push('\t• Reserved event area cleaned, organized, and guest-ready prior to host arrival')
  if (ev.setup_notes || ev.floor_plan_notes) {
    lines.push('\t• Setup Notes: ' + [ev.setup_notes, ev.floor_plan_notes].filter(Boolean).join(' | '))
  }
  lines.push('HOST EVENT SETUP')
  lines.push('\t• Host access begins one (1) hour prior to scheduled event start time')
  lines.push('\t• Decorations/setup must remain within reserved event area only')
  lines.push('\t• Dessert setup coordinated with Event Coordinator if applicable')
  lines.push('\t• Host responsible for bringing dessert plates, utensils, napkins, candles, serving tools, and related supplies')
  lines.push('\t• Event timeline, announcements, speeches, or presentations must be communicated in advance')
  lines.push('\t• Audio/visual requests or presentation needs must be confirmed prior to event date')
  lines.push('\t• All decorations, gifts, dessert items, signage, and personal items must be removed immediately following event conclusion')
  lines.push('\t• Outside items brought into brewery must remain manageable within scheduled setup and breakdown timeframe')
  lines.push('')

  // SERVICE DETAILS
  lines.push('SERVICE DETAILS')
  lines.push('')
  if (items.length > 0) {
    lines.push(equipmentLine)
    const sternosNeeded = chafing.total * 2
    if (sternosNeeded > 0) lines.push(`(${sternosNeeded}) Sternos`)
  } else {
    lines.push('(No catering items — open event to configure catering)')
  }
  lines.push('')

  // BREAKDOWN DETAILS
  lines.push('BREAKDOWN DETAILS')
  lines.push('')
  lines.push('HOST EVENT BREAKDOWN')
  lines.push('\t• Host responsible for removal of all outside items (including decorations, gifts, dessert items, etc.) brought into brewery')
  lines.push('\t• Host responsible for ensuring all guests have exited reserved event area at conclusion of scheduled event timeframe')
  lines.push('\t• Additional cleanup charges may apply for excessive mess, damages, or items left behind')

  // "MP EVENT BREAKDOWN" standard checklist removed from output per request (2026) — kept here for future reference:
  // lines.push('')
  // lines.push('MP EVENT BREAKDOWN')
  // lines.push('\t• Food service and buffet areas cleared and broken down')
  // lines.push('\t• Remaining catering equipment and service materials removed')
  // lines.push('\t• Linens, plates, utensils, and service wares collected and cleaned')
  // lines.push('\t• Trash removed from reserved event area')
  // lines.push('\t• Tables and seating returned to standard floorplan as applicable')
  // if (ev.big_screen_tv) lines.push('\t• Audio/visual equipment powered down and secured')
  // else lines.push('\t• Audio/visual equipment powered down and secured if applicable')
  // lines.push('\t• Production Space cleaned and reset for normal brewery operations')
  // lines.push('\t• Final event walkthrough completed by MP staff')

  // INTERNAL TASKS — staff prep reference only. Not part of the customer-facing
  // BEO/proposal/invoice content; Toast remains the system of record for those.
  if (tasks.length > 0) {
    lines.push('')
    lines.push('INTERNAL TASKS — STAFF USE ONLY (do not copy into customer-facing Toast fields)')

    const renderTaskLines = (category: string) => {
      const inCategory = tasks.filter(t => t.category === category)
      if (inCategory.length === 0) {
        lines.push('  None for this event')
        return
      }
      for (const t of inCategory) {
        lines.push(`  ${t.completed ? '☑' : '☐'} ${t.label} (${t.role})`)
      }
    }

    lines.push('')
    lines.push('SETUP TASKS SUMMARY')
    renderTaskLines('Setup')

    lines.push('')
    lines.push('BREAKDOWN TASKS SUMMARY')
    renderTaskLines('Breakdown')

    lines.push('')
    lines.push('SPECIAL EVENT TASKS')
    renderTaskLines('Dynamic')
  }

  return lines.join('\n')
}

// ─── RUN OF SHOW ──────────────────────────────────────────────────────────────

export function generateRunOfShow(ev: EventForNotes): string {
  const lines: string[] = []
  const decorateDisplay = ev.decorate_time ? to12Hour(ev.decorate_time) : to12Hour(ev.setup_time)
  const eventStart = to12Hour(ev.event_time)
  const eventEnd = to12Hour(ev.teardown_time)
  const foodServed = to12Hour(shiftTime(ev.event_time, -15))
  const lastCall = to12Hour(shiftTime(ev.teardown_time, -30))

  lines.push('RUN OF SHOW')
  lines.push(ev.event_name)
  lines.push(fmtDate(ev.event_date))
  lines.push('')

  lines.push(`SETUP ACCESS — ${decorateDisplay}`)
  lines.push(`  ${ev.production_close_time ? to12Hour(ev.production_close_time) : '—'}  Production space closed off`)
  lines.push(`  ${to12Hour(ev.setup_time)}  MP event setup begins`)
  lines.push(`  ${decorateDisplay}  Host/decorator access begins`)
  lines.push('  FOH confirms: tables, linens, buffet placement, drink ticket setup, signage, trash placement')
  if (ev.setup_notes)      lines.push(`  Setup Notes: ${ev.setup_notes}`)
  if (ev.floor_plan_notes) lines.push(`  Floor Plan: ${ev.floor_plan_notes}`)
  lines.push('')

  lines.push(`GUEST ARRIVAL — ${eventStart}`)
  lines.push(`  ${eventStart}  Guests enter through taproom/event space glass door`)
  lines.push(`  Bar service begins — ${beverageLine(ev)}`)
  lines.push(`  Main Bar Impact: ${calcBarImpact(ev).level.toUpperCase()} — give main bar a heads-up before guests arrive`)
  lines.push('  FOH monitors guest flow and answers host questions')
  lines.push('  Restrooms: exit through glass door closest to event space')
  lines.push('')

  lines.push(`FOOD SERVICE — ${foodServed}`)
  lines.push(`  ${ev.package_name || '(No package selected)'}`)
  lines.push(`  Guest count: ${ev.guest_count > 0 ? ev.guest_count : '—'}`)
  if (ev.dietary_restrictions) lines.push(`  Dietary: ${ev.dietary_restrictions}`)
  if (ev.selected_sauces)      lines.push(`  Sauces: ${ev.selected_sauces}`)
  if (ev.food_notes)           lines.push(`  Notes: ${ev.food_notes}`)
  if (ev.kitchen_notes)        lines.push(`  Kitchen: ${ev.kitchen_notes}`)
  lines.push('')

  lines.push('BEVERAGE SERVICE')
  lines.push(`  ${beverageLine(ev)}`)
  if (ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && (ev.drink_tickets ?? 0) > 0) {
    lines.push(`  ${ev.drink_tickets} tickets — host distributes, redeemed at bar on event tab`)
  }
  const rosExtra = extraTabNotes(ev)
  if (rosExtra) lines.push(`  ${rosExtra}`)
  lines.push(`  ${lastCall}  Last call`)
  lines.push('  Responsible service reminder: refuse service to visibly intoxicated guests')
  lines.push('  No outside alcohol permitted')
  lines.push('')

  lines.push(`EVENT CLOSE — ${eventEnd}`)
  lines.push(`  ${eventEnd}  Event ends — bar closed`)
  lines.push('  Host walkthrough — confirm all décor and personal items removed')
  lines.push('  Final payment reminder if balance outstanding')
  lines.push('')

  lines.push('RESET / BREAKDOWN')
  lines.push('  □ Clear all tables')
  lines.push('  □ Remove and bag linens')
  lines.push('  □ Reset high-tops and tables to standard layout')
  lines.push('  □ Trash check — replace liners')
  lines.push('  □ Sweep / spot clean floor')
  lines.push('  □ Return production space to standard configuration')

  return lines.join('\n')
}

// ─── KITCHEN SHEET ────────────────────────────────────────────────────────────

export function generateKitchenSheet(ev: EventForNotes): string {
  const lines: string[] = []
  const items = calcItems(ev)
  const serveStyle = serveStyleMap(ev)

  lines.push('KITCHEN SHEET — MANHATTAN PROJECT BEER CO.')
  lines.push('')
  lines.push(`Event: ${ev.event_name}`)
  lines.push(`Date:  ${fmtDate(ev.event_date)}`)
  lines.push(`Time:  ${to12Hour(ev.event_time)}  |  End: ${to12Hour(ev.teardown_time)}`)
  lines.push(`Space: ${ev.space || '—'}`)
  lines.push(`Production Close: ${ev.production_close_time ? to12Hour(ev.production_close_time) : '—'}`)
  lines.push('')

  lines.push('CATERING ORDER')
  lines.push('')
  if (items.length > 0 && ev.package_name) {
    const foodText = formatCateringText(
      [{ name: ev.package_name, items }],
      ev.selected_sauces
    )
    lines.push(foodText)
    lines.push('')
    lines.push('SERVICE EQUIPMENT')
    lines.push(formatEquipmentText(items, serveStyle))
    const chafing = countChafingDishes(items, serveStyle)
    if (chafing.total > 0) lines.push(`(${chafing.total * 2}) Sternos`)
  } else {
    lines.push(`Package: ${ev.package_name || '(none selected)'}`)
    lines.push(`Guest Count: ${ev.guest_count || '—'}`)
  }
  if (ev.buffer_pct && ev.buffer_pct > 0) {
    const buffered = Math.ceil(ev.guest_count * (1 + ev.buffer_pct / 100))
    lines.push('')
    lines.push(`Prep Count with buffer: ${buffered} (${ev.buffer_pct}% buffer)`)
  }
  lines.push('')

  lines.push('DIETARY / ALLERGY NOTES')
  lines.push(ev.dietary_restrictions || 'None noted')
  lines.push('')

  if (ev.food_notes) {
    lines.push('ADDITIONAL FOOD NOTES')
    lines.push(ev.food_notes)
    lines.push('')
  }

  lines.push('KITCHEN NOTES')
  lines.push(ev.kitchen_notes || 'None')
  lines.push('')
  lines.push('Taproom food menu is NOT available during private events.')
  lines.push(`All food production stops at production close: ${ev.production_close_time ? to12Hour(ev.production_close_time) : '—'}`)

  return lines.join('\n')
}

// ─── FOH NOTES ────────────────────────────────────────────────────────────────

export function generateFOHNotes(ev: EventForNotes): string {
  const lines: string[] = []
  const decorateDisplay = ev.decorate_time ? to12Hour(ev.decorate_time) : to12Hour(ev.setup_time)
  const lastCall = to12Hour(shiftTime(ev.teardown_time, -30))
  const impact = calcBarImpact(ev)

  lines.push('FOH NOTES — MANHATTAN PROJECT BEER CO.')
  lines.push('')
  lines.push(`Event: ${ev.event_name}`)
  lines.push(`Date:  ${fmtDate(ev.event_date)}`)
  lines.push(`Time:  ${to12Hour(ev.event_time)} – ${to12Hour(ev.teardown_time)}`)
  lines.push(`Host:  ${ev.first_name} ${ev.last_name}${ev.company ? ' / ' + ev.company : ''}`)
  lines.push(`Count: ${ev.guest_count > 0 ? ev.guest_count + ' guests' : '—'}`)
  lines.push('')

  lines.push('TIMELINE')
  lines.push(`  ${ev.production_close_time ? to12Hour(ev.production_close_time) : '—'}  Production space closed off`)
  lines.push(`  ${to12Hour(ev.setup_time)}  MP setup begins`)
  lines.push(`  ${decorateDisplay}  Host arrival / decorating access`)
  lines.push(`  ${to12Hour(shiftTime(ev.event_time, -15))}  Food service begins`)
  lines.push(`  ${to12Hour(ev.event_time)}  Event starts — guests arrive`)
  lines.push(`  ${lastCall}  Last call`)
  lines.push(`  ${to12Hour(ev.teardown_time)}  Event ends — reset begins`)
  lines.push('')

  lines.push(`MAIN BAR IMPACT — ${impact.level.toUpperCase()}`)
  impact.guestFlowNotes.forEach(n => lines.push(`  • ${n}`))
  lines.push('')

  lines.push('SETUP CHECKLIST')
  lines.push('  □ Tables and chairs set per floor plan')
  lines.push('  □ Linens placed')
  lines.push(`  □ Buffet station set${ev.setup_notes ? ' — ' + ev.setup_notes : ''}`)
  if (ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && (ev.drink_tickets ?? 0) > 0) {
    lines.push(`  □ Drink tickets staged — ${ev.drink_tickets} tickets for host distribution`)
  }
  lines.push('  □ Signage placed')
  lines.push('  □ Trash can with liner positioned')
  if (ev.big_screen_tv) lines.push('  □ TV / HDMI connected and tested')
  if (ev.floor_plan_notes) lines.push(`  Floor Plan: ${ev.floor_plan_notes}`)
  lines.push('')

  lines.push('SERVICE REMINDERS')
  lines.push('  • Guests enter through taproom/event space glass door')
  lines.push('  • Restrooms: exit through glass door closest to event space')
  lines.push('  • Guests may NOT walk through employee-only production areas')
  lines.push('  • Production exit doors are emergency-use only')
  if (ev.guest_count > 0 && ev.guest_count < 30) {
    lines.push('  • Guest count under 30 — production space may be shared with other guests')
  }
  lines.push('  • Children allowed but must remain supervised')
  lines.push('  • No outside vendors, musicians, DJs, or live performances')
  lines.push('  • Decorations must be free-standing — no glitter or confetti')
  lines.push('  • Cakes/cupcakes allowed — host provides plates, utensils, napkins, and cleanup')
  if (ev.staffing_notes) {
    lines.push('')
    lines.push(`Staffing Notes: ${ev.staffing_notes}`)
  }

  return lines.join('\n')
}

// ─── BAR NOTES ────────────────────────────────────────────────────────────────

export function generateBarNotes(ev: EventForNotes): string {
  const lines: string[] = []
  const lastCall = to12Hour(shiftTime(ev.teardown_time, -30))

  lines.push('BAR NOTES — MANHATTAN PROJECT BEER CO.')
  lines.push('')
  lines.push(`Event: ${ev.event_name}`)
  lines.push(`Date:  ${fmtDate(ev.event_date)}`)
  lines.push(`Time:  ${to12Hour(ev.event_time)} – ${to12Hour(ev.teardown_time)}`)
  lines.push(`Last Call: ${lastCall}`)
  lines.push(`Count: ${ev.guest_count > 0 ? ev.guest_count + ' guests' : '—'}`)
  lines.push('')

  lines.push('BEVERAGE SETUP')
  lines.push(beverageLine(ev))
  lines.push('')

  if (ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)') {
    const qty = ev.drink_tickets ?? 0
    if (qty > 0) {
      lines.push(`□ Stage ${qty} drink tickets for host distribution`)
      lines.push(`□ Tickets redeemed at bar — ring to event tab`)
      lines.push(`□ Total ticket value: $${(qty * DRINK_TICKET_PRICE).toFixed(2)}`)
    }
  }
  if (ev.bar_tab_type === 'By Consumption') {
    lines.push('□ Open host tab in Toast at event start')
    lines.push('□ All event beverages rung to event tab — confirm tab holder with host')
  }
  if (ev.bar_tab_type === 'Individual Tabs') {
    lines.push('□ Guests open individual tabs at bar — drink selections only')
    lines.push('□ Food items may NOT be added to individual guest tabs')
  }

  const extraNotes = extraTabNotes(ev)
  if (extraNotes) {
    lines.push('')
    lines.push(extraNotes)
  }
  lines.push('')

  const impact = calcBarImpact(ev)
  lines.push(`MAIN BAR IMPACT — ${impact.level.toUpperCase()}`)
  impact.congestionNotes.forEach(n => lines.push(`  • ${n}`))
  lines.push('')

  lines.push('POLICIES')
  lines.push('  • No outside alcohol permitted under any circumstances')
  lines.push('  • No capped open bars — budget control via pre-paid drink tickets only')
  lines.push(`  • Last call at ${lastCall} (30 min before event end)`)
  lines.push('  • In accordance with responsible alcohol service practices, Manhattan Project Beer Co.')
  lines.push('    reserves the right to refuse service to any guest who appears intoxicated.')
  lines.push('    Guests and hosts are expected to comply with all applicable alcohol laws.')
  lines.push('    Management decision on service is final.')

  return lines.join('\n')
}

// ─── SETUP CHECKLIST ──────────────────────────────────────────────────────────

export function generateSetupChecklist(ev: EventForNotes): string {
  const lines: string[] = []
  const decorateDisplay = ev.decorate_time ? to12Hour(ev.decorate_time) : to12Hour(ev.setup_time)

  lines.push('SETUP CHECKLIST — MANHATTAN PROJECT BEER CO.')
  lines.push('')
  lines.push(`Event:       ${ev.event_name}`)
  lines.push(`Date:        ${fmtDate(ev.event_date)}`)
  lines.push(`Host Access: ${decorateDisplay}`)
  lines.push(`Event Start: ${to12Hour(ev.event_time)}`)
  lines.push(`Event End:   ${to12Hour(ev.teardown_time)}`)
  lines.push(`Main Bar Impact: ${calcBarImpact(ev).level.toUpperCase()}`)
  lines.push('')

  lines.push('BEFORE HOST ARRIVES')
  lines.push('  □ Tables set per floor plan')
  lines.push('  □ Chairs set')
  lines.push('  □ Linens placed')
  lines.push('  □ Buffet station positioned and ready')
  lines.push('  □ Trash can with liner in place')
  lines.push('  □ Signage placed at entrance')
  if (ev.big_screen_tv)  lines.push('  □ TV powered on and HDMI cable available')
  if (ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && (ev.drink_tickets ?? 0) > 0) {
    lines.push(`  □ Drink tickets staged for host (${ev.drink_tickets} tickets)`)
  }
  if (ev.floor_plan_notes) lines.push(`  → Floor Plan: ${ev.floor_plan_notes}`)
  lines.push('')

  lines.push('AT HOST ARRIVAL')
  lines.push('  □ Greet host and confirm layout')
  lines.push('  □ Walk host through décor policy — free-standing only, no glitter or confetti')
  lines.push('  □ Confirm cake/dessert plan if applicable')
  lines.push('  □ Confirm final guest count')
  lines.push(`  □ Confirm beverage setup with host — ${beverageLine(ev)}`)
  lines.push('')

  lines.push('AT GUEST ARRIVAL')
  lines.push('  □ Guests entering through glass door only')
  lines.push('  □ Bar service started per beverage option')
  if (ev.bar_tab_type === 'By Consumption') lines.push('  □ Host tab opened in Toast')
  lines.push('  □ FOH in position to monitor flow')
  lines.push('')

  lines.push('DURING EVENT')
  lines.push('  □ Food service timed per run of show')
  lines.push('  □ Monitor guest count vs. capacity — max 75 total / ~50 seated')
  lines.push('  □ Check in with host mid-event')
  lines.push('')

  lines.push('CLOSE / RESET')
  lines.push(`  □ Last call at ${to12Hour(shiftTime(ev.teardown_time, -30))}`)
  lines.push(`  □ Bar closed at ${to12Hour(ev.teardown_time)}`)
  lines.push('  □ Host reminded to remove all personal items and décor')
  lines.push('  □ Tables cleared')
  lines.push('  □ Linens removed and bagged')
  lines.push('  □ Trash checked and replaced')
  lines.push('  □ Floor swept and spot cleaned')
  lines.push('  □ High-tops and tables reset to standard')
  lines.push('  □ Production space returned to standard configuration')

  return lines.join('\n')
}

// ─── PRE-SHIFT BRIEF ────────────────────────────────────────────────────────

export interface BriefTask {
  category: string
  role: string
  label: string
  completed: number | boolean
}

export function generatePreShiftBrief(ev: EventForNotes, tasks: BriefTask[]): string {
  const lines: string[] = []
  const impact = calcBarImpact(ev)
  const readiness = calcReadiness({
    guest_count: ev.guest_count,
    hasPackage: !!ev.package_name,
    bar_tab_type: ev.bar_tab_type,
    setup_notes: ev.setup_notes,
    floor_plan_notes: ev.floor_plan_notes,
    dietary_restrictions: ev.dietary_restrictions,
    staffing_notes: ev.staffing_notes,
    contract_signed: ev.contract_signed,
  })
  const dynamicCount = tasks.filter(t => t.category === 'Dynamic').length
  const taskCtx: TaskContext = {
    guestCount: ev.guest_count,
    hasPackage: !!ev.package_name,
    packageCount: ev.package_name ? 1 : 0,
    barTabType: ev.bar_tab_type,
    drinkTickets: ev.drink_tickets,
    bigScreenTv: ev.big_screen_tv,
    barImpactLevel: impact.level,
  }
  const complexity = calcTaskComplexity(taskCtx, dynamicCount)

  lines.push('PRE-SHIFT BRIEF')
  lines.push(ev.event_name)
  lines.push(fmtDate(ev.event_date))
  lines.push('')

  lines.push(`Time:   ${to12Hour(ev.event_time)} – ${to12Hour(ev.teardown_time)}`)
  lines.push(`Space:  ${ev.space || '—'}`)
  lines.push(`Guests: ${ev.guest_count > 0 ? ev.guest_count : '—'}`)
  lines.push('')

  lines.push(`READINESS: ${readiness.score}% operational`)
  lines.push(`COMPLEXITY: ${complexity.level}`)
  lines.push(`MAIN BAR IMPACT: ${impact.level}`)
  if (impact.congestionNotes[0]) lines.push(`  ${impact.congestionNotes[0]}`)
  lines.push('')

  lines.push('OPEN TASKS BY ROLE')
  for (const role of TASK_ROLES) {
    const open = tasks.filter(t => t.role === role && !t.completed)
    lines.push(`${role.toUpperCase()} (${open.length} open)`)
    if (open.length === 0) {
      lines.push('  — all clear')
    } else {
      for (const t of open) lines.push(`  • ${t.label}`)
    }
  }

  const reminders: string[] = []
  if (ev.kids_attending) reminders.push('Kids attending — patio supervision')
  if (ev.dessert_expected) reminders.push('Dessert expected — host-provided, coordinate space')
  if (ev.dietary_restrictions) reminders.push(`Dietary: ${ev.dietary_restrictions}`)
  if (readiness.missingLabels.length > 0) reminders.push(`Still needed: ${readiness.missingLabels.join(', ')}`)

  if (reminders.length > 0) {
    lines.push('')
    lines.push('KEY REMINDERS')
    for (const r of reminders) lines.push(`  • ${r}`)
  }

  return lines.join('\n')
}
