import { NextResponse } from 'next/server'
import { getEvents, createEvent, createClient, upsertEventDetails, generatePayments, getPackage, isDateBlocked } from '@/lib/db'

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
      event_name, event_date, event_time, setup_time, teardown_time, production_close_time, decorate_time, event_duration_mins, status, space,
      first_name, last_name, email, phone, company, referral_source,
      guest_count, package_id, buffer_pct, food_notes, dietary_restrictions,
      bar_tab_limit, drink_tickets, tab_details, staffing_notes, contract_signed,
      date_flexible, setup_notes, bar_tab_type,
      client_id: existingClientId,
    } = body

    // Reject dates within 21 days
    if (event_date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const eventDay = new Date(event_date + 'T00:00:00')
      const diffDays = Math.floor((eventDay.getTime() - today.getTime()) / 86400000)
      if (diffDays < 21) {
        return NextResponse.json(
          { error: `Events must be booked at least 21 days in advance. ${event_date} is only ${diffDays} day${diffDays === 1 ? '' : 's'} away.` },
          { status: 409 }
        )
      }
    }

    // Reject blocked dates
    if (event_date) {
      const block = isDateBlocked(event_date)
      if (block) {
        return NextResponse.json(
          { error: `${event_date} is blocked: ${block.reason}${block.notes ? ` — ${block.notes}` : ''}` },
          { status: 409 }
        )
      }
    }

    // create or use existing client
    let client_id = existingClientId
    if (!client_id) {
      client_id = createClient({ first_name, last_name, email, phone, company, notes: '', referral_source })
    }

    const eventId = createEvent({ event_name, event_date, event_time, setup_time, teardown_time, production_close_time, decorate_time, event_duration_mins: Number(event_duration_mins) || 180, status: status || 'New', space, client_id })

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
      date_flexible: date_flexible ? 1 : 0,
      setup_notes,
      bar_tab_type,
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
