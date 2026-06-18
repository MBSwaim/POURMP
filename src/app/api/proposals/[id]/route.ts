import { NextResponse } from 'next/server'
import { getEventFull, getSetting } from '@/lib/db'
import { GENERAL_INFO, CANCELLATION_POLICY, MPBC_CONTACT } from '@/lib/constants'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = getEventFull(Number(params.id))
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    ...data,
    generalInfo:         getSetting('general_info',        GENERAL_INFO),
    cancellationPolicy:  getSetting('cancellation_policy', CANCELLATION_POLICY),
    contact:             getSetting('contact',             MPBC_CONTACT),
  })
}
