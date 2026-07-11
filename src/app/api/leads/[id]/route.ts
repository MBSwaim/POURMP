import { NextResponse } from 'next/server'
import { updateLeadStatus, deleteLead } from '@/lib/db'
import { LEAD_STATUSES } from '@/lib/constants'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { status } = await req.json()
    if (!LEAD_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${LEAD_STATUSES.join(', ')}` }, { status: 400 })
    }
    updateLeadStatus(Number(params.id), status)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    deleteLead(Number(params.id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
