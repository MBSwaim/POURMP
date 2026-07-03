import { notFound } from 'next/navigation'
import { getEventFull, getDrinkTicketLog, getDebrief, getClientDebriefHistory } from '@/lib/db'
import { PrepOutputsClient } from './PrepOutputsClient'
import type { EventForNotes } from '@/lib/noteGenerators'

export const dynamic = 'force-dynamic'

export default function PrepPage({ params }: { params: { id: string } }) {
  const data = getEventFull(Number(params.id))
  if (!data) notFound()

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
    guest_count: details?.guest_count ?? 0,
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
    service_fee: details?.service_fee ?? 100,
    gratuity_pct: details?.gratuity_pct ?? 20,
    tax_pct: details?.tax_pct ?? 8.25,
    buffer_pct: details?.buffer_pct ?? 0,
    contract_signed: details?.contract_signed ?? 0,
    toast_proposal_sent_date: details?.toast_proposal_sent_date ?? null,
    toast_confirmed_date: details?.toast_confirmed_date ?? null,
    toast_invoice_sent_date: details?.toast_invoice_sent_date ?? null,
    toast_deposit_received_date: details?.toast_deposit_received_date ?? null,
    toast_final_payment_date: details?.toast_final_payment_date ?? null,
    menuItems: data.menuItems as import('@/lib/calculations').MenuItem[],
  }

  const ticketLog = getDrinkTicketLog(event.id) ?? null
  const debrief = getDebrief(event.id) ?? null
  const clientHistory = client ? getClientDebriefHistory(client.id, event.id) : []

  return <PrepOutputsClient ev={ev} initialTicketLog={ticketLog} initialDebrief={debrief} clientHistory={clientHistory} />
}
