import { NextRequest, NextResponse } from 'next/server'
import { resetEventTasks } from '@/lib/db'

// Leadership-action reset for the interactive Setup Checklist — un-completes
// every Setup and Breakdown task for this event. Dynamic tasks are untouched;
// they aren't shown on that screen.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  resetEventTasks(Number(params.id), ['Setup', 'Breakdown'])
  return NextResponse.json({ ok: true })
}
