import { NextResponse } from 'next/server'
import { updateReservation, deleteReservation } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()
    updateReservation(Number(params.id), data)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    deleteReservation(Number(params.id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
