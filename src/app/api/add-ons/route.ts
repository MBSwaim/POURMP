import { NextResponse } from 'next/server'
import { createAddOn, updateAddOn, deleteAddOn } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const id = createAddOn(body)
    return NextResponse.json({ id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, ...data } = await req.json()
    updateAddOn(id, data)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    deleteAddOn(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
