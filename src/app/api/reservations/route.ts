import { NextResponse } from 'next/server'
import { getUpcomingReservations, createReservation, isDateBlocked } from '@/lib/db'

export async function GET() {
  try {
    return NextResponse.json(getUpcomingReservations(50))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { client_name, phone, email, party_size, reservation_date, reservation_time, notes, status } = body
    if (!client_name || !reservation_date || !reservation_time) {
      return NextResponse.json({ error: 'Name, date, and time are required' }, { status: 400 })
    }
    const block = isDateBlocked(reservation_date)
    if (block) {
      return NextResponse.json(
        { error: `${reservation_date} is blocked: ${block.reason}${block.notes ? ` — ${block.notes}` : ''}` },
        { status: 409 }
      )
    }
    const id = createReservation({ client_name, phone, email, party_size: Number(party_size) || 0, reservation_date, reservation_time, notes, status: status || 'Confirmed' })
    return NextResponse.json({ id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
