import { NextResponse } from 'next/server'
import { getPackages } from '@/lib/db'

export async function GET() {
  try {
    const packages = getPackages()
    return NextResponse.json(packages)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
