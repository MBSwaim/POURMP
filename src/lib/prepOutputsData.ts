import { getEventFull, getDrinkTicketLog, getDebrief, getClientDebriefHistory, syncEventTasks, getEventRisks } from './db'
import type { DrinkTicketLog, EventDebrief, EventTask } from './db'
import type { RiskFlag } from './riskScanner'
import type { EventForNotes } from './noteGenerators'
import { getTotalGuestCount } from './calculations'

export interface ClientHistoryEntry {
  id: number; event_name: string; event_date: string; actual_guest_count: number | null
  went_well: string; issues: string; catering_accuracy: string; bar_impact_accuracy: string
  would_repeat_client: string; recommendations: string
}

export interface PrepOutputsData {
  ev: EventForNotes
  ticketLog: DrinkTicketLog | null
  debrief: EventDebrief | null
  clientHistory: ClientHistoryEntry[]
  tasks: EventTask[]
  risks: RiskFlag[]
}

// Shared data-loading for the Prep Outputs system — used by both the event-scoped
// /events/[id]/prep route and the sidebar-accessible /prep-docs?event= route, so the
// two entry points never drift out of sync.
export function getPrepOutputsData(eventId: number): PrepOutputsData | null {
  const data = getEventFull(eventId)
  if (!data) return null

  const { event, client, details, pkg } = data

  const ev: EventForNotes = {
    id: event.id,
    event_name: event.event_name,
    event_date: event.event_date,
    event_time: event.event_time,
    setup_time: event.setup_time,
    decorate_time: event.decorate_time,
    teardown_time: event.teardown_time,
    production_close_time: event.production_close_time,
    event_duration_mins: event.event_duration_mins,
    space: event.space,
    status: event.status,
    first_name: client?.first_name ?? '',
    last_name: client?.last_name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    company: client?.company ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    guest_count: getTotalGuestCount(data.packages as any, details?.guest_count ?? 0),
    package_name: pkg?.name ?? '',
    price_per_guest: pkg?.price_per_guest ?? 0,
    food_notes: details?.food_notes ?? '',
    dietary_restrictions: details?.dietary_restrictions ?? '',
    bar_tab_type: details?.bar_tab_type ?? '',
    drink_tickets: details?.drink_tickets ?? 0,
    tab_details: details?.tab_details ?? '',
    setup_notes: details?.setup_notes ?? '',
    floor_plan_notes: details?.floor_plan_notes ?? '',
    big_screen_tv: details?.big_screen_tv ?? 0,
    selected_sauces: details?.selected_sauces ?? '',
    serve_style_json: details?.serve_style_json ?? '',
    menu_item_overrides_json: details?.menu_item_overrides_json ?? '',
    beo_notes: details?.beo_notes ?? '',
    kitchen_notes: details?.kitchen_notes ?? '',
    staffing_notes: details?.staffing_notes ?? '',
    buffer_pct: details?.buffer_pct ?? 0,
    contract_signed: details?.contract_signed ?? 0,
    toast_proposal_sent_date: details?.toast_proposal_sent_date ?? null,
    toast_confirmed_date: details?.toast_confirmed_date ?? null,
    toast_invoice_sent_date: details?.toast_invoice_sent_date ?? null,
    toast_deposit_received_date: details?.toast_deposit_received_date ?? null,
    toast_final_payment_date: details?.toast_final_payment_date ?? null,
    kids_attending: details?.kids_attending ?? 0,
    dessert_expected: details?.dessert_expected ?? 0,
    final_menu_locked: details?.final_menu_locked ?? 0,
    menuItems: data.menuItems as import('./calculations').MenuItem[],
    packages: data.packages,
  }

  return {
    ev,
    ticketLog: getDrinkTicketLog(event.id) ?? null,
    debrief: getDebrief(event.id) ?? null,
    clientHistory: client ? getClientDebriefHistory(client.id, event.id) : [],
    tasks: syncEventTasks(event.id),
    risks: getEventRisks(event.id),
  }
}
