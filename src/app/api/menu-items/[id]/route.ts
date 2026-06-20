import { NextResponse } from 'next/server'
import { updateMenuItemPurchaseUnit } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { purchase_unit } = await req.json()
    updateMenuItemPurchaseUnit(Number(params.id), purchase_unit ?? '')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
