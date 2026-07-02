import { NextResponse } from 'next/server'
import { generateAlerts, getNotificationFeed } from '@/lib/alerts'

export async function GET() {
  try {
    generateAlerts()
    return NextResponse.json(getNotificationFeed())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
