import { NextResponse } from 'next/server'
import { getPackages, createPackage } from '@/lib/db'

export async function GET() {
  try {
    return NextResponse.json(getPackages())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { id, name, price_per_guest, description } = await req.json()
    if (!id || !name) return NextResponse.json({ error: 'id and name are required' }, { status: 400 })
    createPackage({ id, name, price_per_guest: Number(price_per_guest) || 0, description: description ?? '' })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
