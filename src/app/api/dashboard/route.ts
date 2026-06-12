import { NextResponse } from 'next/server'
import { getDashboardStats, getKanbanEvents } from '@/lib/db'

export async function GET() {
  try {
    const stats = getDashboardStats()
    const kanban = getKanbanEvents()
    return NextResponse.json({ stats, kanban })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
