import { NextResponse } from 'next/server'
import { getClients } from '@/lib/db'

export async function GET() {
  try {
    return NextResponse.json(getClients())
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
