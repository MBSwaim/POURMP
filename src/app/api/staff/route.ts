import { NextResponse } from 'next/server'
import { getStaffMembers, createStaffMember } from '@/lib/db'

export async function GET() {
  try {
    return NextResponse.json(getStaffMembers(false))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name, phone, email } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    const id = createStaffMember({ name, phone, email })
    return NextResponse.json({ id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
