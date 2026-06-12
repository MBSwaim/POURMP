import { NextResponse } from 'next/server'
import { getCalendarEvents } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const year = Number(searchParams.get('year') ?? new Date().getFullYear())
    const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)
    const events = getCalendarEvents(year, month)
    return NextResponse.json(events)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
