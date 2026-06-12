import { NextResponse } from 'next/server'
import { updatePayment } from '@/lib/db'

export async function PATCH(req: Request) {
  try {
    const { id, ...data } = await req.json()
    updatePayment(id, data)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
