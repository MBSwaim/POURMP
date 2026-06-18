import { NextResponse } from 'next/server'
import { createPayment, updatePayment } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { event_id, payment_type, amount_due, amount_paid, due_date, paid_date, status, notes } = await req.json()
    const id = createPayment({
      event_id,
      payment_type,
      amount_due: Number(amount_due),
      amount_paid: Number(amount_paid) || 0,
      due_date: due_date || '',
      paid_date: paid_date || '',
      status: status || 'pending',
      notes: notes || '',
    })
    return NextResponse.json({ id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, ...data } = await req.json()
    updatePayment(id, data)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
