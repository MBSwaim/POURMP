import { NextResponse } from 'next/server'
import { getMenuItems, updatePackage } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(getMenuItems(params.id))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json()
    updatePackage(params.id, data)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
