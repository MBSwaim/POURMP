import { NextRequest, NextResponse } from 'next/server'
import { getDrinkTicketLog, upsertDrinkTicketLog } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const log = getDrinkTicketLog(Number(params.id))
  return NextResponse.json(log ?? null)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { tickets_issued, tickets_redeemed, notes } = body
  upsertDrinkTicketLog(Number(params.id), {
    tickets_issued: Number(tickets_issued) || 0,
    tickets_redeemed: Number(tickets_redeemed) || 0,
    notes: notes ?? '',
  })
  return NextResponse.json({ ok: true })
}
