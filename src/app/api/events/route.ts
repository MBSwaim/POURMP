import { NextResponse } from 'next/server'
import { getEvents, createEvent, createClient, upsertEventDetails, generatePayments, getPackage } from '@/lib/db'

export async function GET() {
  try {
    const events = getEvents()
    return NextResponse.json(events)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      event_name, event_date, event_time, setup_time, teardown_time, status, space,
      first_name, last_name, email, phone, company, referral_source,
      guest_count, package_id, buffer_pct, food_notes, dietary_restrictions,
      bar_tab_limit, drink_tickets, tab_details, staffing_notes, contract_signed,
      client_id: existingClientId,
    } = body

    // create or use existing client
    let client_id = existingClientId
    if (!client_id) {
      client_id = createClient({ first_name, last_name, email, phone, company, notes: '', referral_source })
    }

    const eventId = createEvent({ event_name, event_date, event_time, setup_time, teardown_time, status: status || 'New', space, client_id })

    upsertEventDetails(eventId, {
      guest_count: Number(guest_count) || 0,
      package_id,
      buffer_pct: Number(buffer_pct) || 0,
      food_notes,
      dietary_restrictions,
      bar_tab_limit: Number(bar_tab_limit) || 0,
      drink_tickets: Number(drink_tickets) || 0,
      tab_details,
      staffing_notes,
      contract_signed: contract_signed ? 1 : 0,
    })

    // auto-generate payments if Confirmed
    if (status === 'Confirmed' && package_id && guest_count) {
      const pkg = getPackage(package_id)
      if (pkg) {
        generatePayments(eventId, Number(guest_count), pkg.price_per_guest, event_date)
      }
    }

    return NextResponse.json({ id: eventId }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
