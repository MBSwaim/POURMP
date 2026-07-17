import { NextResponse } from 'next/server'
import { deleteCommunityGiving } from '@/lib/db'

// Field edits go through PATCH /api/events/[id] (community_giving key), matching every
// other Event Detail section. This route exists only for the one action that doesn't
// fit that shape: removing the record entirely, distinct from clearing its fields.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    deleteCommunityGiving(Number(params.id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
