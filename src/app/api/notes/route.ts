import { NextResponse } from 'next/server'
import { createEventNote } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { event_id, note } = await req.json()
    const id = createEventNote(Number(event_id), note)
    return NextResponse.json({ id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
