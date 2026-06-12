import { NextResponse } from 'next/server'
import { getEventFull } from '@/lib/db'
import { GENERAL_INFO, CANCELLATION_POLICY, MPBC_CONTACT } from '@/lib/constants'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const data = getEventFull(Number(params.id))
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    ...data,
    generalInfo: GENERAL_INFO,
    cancellationPolicy: CANCELLATION_POLICY,
    contact: MPBC_CONTACT,
  })
}
