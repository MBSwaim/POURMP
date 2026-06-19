import { NextRequest, NextResponse } from 'next/server'
import { getChecklist, setChecklistItem, resetChecklist } from '@/lib/db'

export function GET(_req: NextRequest, { params }: { params: { eventId: string } }) {
  const eventId = Number(params.eventId)
  if (!eventId) return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  return NextResponse.json({ checked: getChecklist(eventId) })
}

export async function PATCH(req: NextRequest, { params }: { params: { eventId: string } }) {
  const eventId = Number(params.eventId)
  if (!eventId) return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  const { item_key, checked } = await req.json()
  setChecklistItem(eventId, item_key, checked)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { eventId: string } }) {
  const eventId = Number(params.eventId)
  if (!eventId) return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  resetChecklist(eventId)
  return NextResponse.json({ ok: true })
}
