import { NextResponse } from 'next/server'
import { getMenuItems } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const items = getMenuItems(params.id)
    return NextResponse.json(items)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
