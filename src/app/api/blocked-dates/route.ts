import { NextResponse } from 'next/server'
import { getBlockedDates, blockDates, unblockDates } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : undefined
  return NextResponse.json(getBlockedDates(year, month))
}

export async function POST(req: Request) {
  try {
    const { dates, reason, notes } = await req.json()
    if (!dates?.length || !reason) {
      return NextResponse.json({ error: 'dates and reason are required' }, { status: 400 })
    }
    blockDates(dates, reason, notes)
    return NextResponse.json({ ok: true, count: dates.length }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { dates } = await req.json()
    if (!dates?.length) return NextResponse.json({ error: 'dates required' }, { status: 400 })
    unblockDates(dates)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
