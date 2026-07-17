import { NextResponse } from 'next/server'
import {
  getEventFull, updateEvent, updateClient, upsertEventDetails, upsertCommunityGiving, deleteEvent
} from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = getEventFull(Number(params.id))
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    const body = await req.json()
    const { event, client, details, community_giving } = body

    const existing = getEventFull(id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (event) updateEvent(id, event)
    if (client && existing.event.client_id) updateClient(existing.event.client_id, client)
    if (details) upsertEventDetails(id, details)
    if (community_giving) upsertCommunityGiving(id, community_giving)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    deleteEvent(Number(params.id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
