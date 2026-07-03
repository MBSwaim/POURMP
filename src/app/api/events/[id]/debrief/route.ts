import { NextRequest, NextResponse } from 'next/server'
import { getDebrief, upsertDebrief } from '@/lib/db'

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
  upsertDebrief(Number(params.id), {
    actual_guest_count: actual_guest_count !== null && actual_guest_count !== undefined ? Number(actual_guest_count) : null,
    went_well: went_well ?? '',
    issues: issues ?? '',
    catering_accuracy: catering_accuracy ?? '',
    bar_impact_accuracy: bar_impact_accuracy ?? '',
    staffing_notes: staffing_notes ?? '',
    would_repeat_client: would_repeat_client ?? '',
    recommendations: recommendations ?? '',
  })
  return NextResponse.json({ ok: true })
}
