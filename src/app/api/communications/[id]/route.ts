import { NextResponse } from 'next/server'
import { deleteEventCommunication } from '@/lib/db'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    deleteEventCommunication(Number(params.id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
