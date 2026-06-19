import { NextRequest, NextResponse } from 'next/server'
import { addEventPackage, updateEventPackage, removeEventPackage } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { event_id, package_id, guest_count, buffer_pct } = await req.json()
    const id = addEventPackage(Number(event_id), package_id, Number(guest_count) || 0, Number(buffer_pct) || 0)
    return NextResponse.json({ id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...data } = await req.json()
    updateEventPackage(Number(id), data)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    removeEventPackage(Number(id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
