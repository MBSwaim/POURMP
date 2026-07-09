import { NextRequest, NextResponse } from 'next/server'
import { getDebrief, upsertDebrief, createEventNote } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const debrief = getDebrief(Number(params.id))
  return NextResponse.json(debrief ?? null)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const {
    actual_guest_count, went_well, issues, catering_accuracy,
    bar_impact_accuracy, staffing_notes, would_repeat_client, recommendations,
  } = body
  const eventId = Number(params.id)
  upsertDebrief(eventId, {
    actual_guest_count: actual_guest_count !== null && actual_guest_count !== undefined ? Number(actual_guest_count) : null,
    went_well: went_well ?? '',
    issues: issues ?? '',
    catering_accuracy: catering_accuracy ?? '',
    bar_impact_accuracy: bar_impact_accuracy ?? '',
    staffing_notes: staffing_notes ?? '',
    would_repeat_client: would_repeat_client ?? '',
    recommendations: recommendations ?? '',
  })

  // Write back into the event's own activity history — completing a debrief should
  // show up alongside other event notes, not just live in the debrief table in isolation.
  const summaryParts = [
    actual_guest_count != null && actual_guest_count !== '' ? `actual guest count ${actual_guest_count}` : null,
    catering_accuracy ? `catering accuracy: ${catering_accuracy}` : null,
    would_repeat_client ? `would repeat: ${would_repeat_client}` : null,
  ].filter(Boolean)
  createEventNote(eventId, `Debrief completed${summaryParts.length ? ' — ' + summaryParts.join(', ') : ''}`)

  return NextResponse.json({ ok: true })
}
