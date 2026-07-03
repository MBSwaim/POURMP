import { NextRequest, NextResponse } from 'next/server'
import { syncEventTasks, addManualTask } from '@/lib/db'

// Sync-then-list: always reflects the event's current selections (event-driven).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const tasks = syncEventTasks(Number(params.id))
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { category, label, role } = body
  if (!label || !category || !role) {
    return NextResponse.json({ error: 'category, label, and role are required' }, { status: 400 })
  }
  const id = addManualTask(Number(params.id), { category, label, role })
  return NextResponse.json({ id }, { status: 201 })
}
