import { NextResponse } from 'next/server'
import { createEventCommunication } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { event_id, activity_type, occurred_at, notes } = await req.json()
    const id = createEventCommunication(Number(event_id), { activity_type, occurred_at, notes })
    return NextResponse.json({ id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
