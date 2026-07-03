import { NextRequest, NextResponse } from 'next/server'
import { toggleTask, updateTaskNotes, deleteTask } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const id = Number(params.id)
  if (typeof body.completed === 'boolean') toggleTask(id, body.completed)
  if (typeof body.notes === 'string') updateTaskNotes(id, body.notes)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  deleteTask(Number(params.id))
  return NextResponse.json({ ok: true })
}
