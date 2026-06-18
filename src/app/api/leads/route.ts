import { NextResponse } from 'next/server'
import { getLeads, createLead } from '@/lib/db'

// Allow cross-origin POST from the MPBC website form
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function GET() {
  try {
    return NextResponse.json(getLeads())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { first_name, last_name, email, phone, event_date, event_type, guest_count, message } = body

    if (!first_name || !last_name) {
      return NextResponse.json({ error: 'first_name and last_name are required' }, { status: 400 })
    }

    const id = createLead({ first_name, last_name, email: email ?? '', phone: phone ?? '', event_date: event_date ?? '', event_type: event_type ?? '', guest_count: Number(guest_count) || 0, message: message ?? '' })

    const res = NextResponse.json({ id }, { status: 201 })
    res.headers.set('Access-Control-Allow-Origin', '*')
    return res
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
