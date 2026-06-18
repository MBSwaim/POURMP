import { NextResponse } from 'next/server'
import { getSetting, setSetting } from '@/lib/db'
import { GENERAL_INFO, CANCELLATION_POLICY, MPBC_CONTACT } from '@/lib/constants'

export async function GET() {
  try {
    return NextResponse.json({
      general_info:          getSetting('general_info',          GENERAL_INFO),
      cancellation_policy:   getSetting('cancellation_policy',   CANCELLATION_POLICY),
      contact:               getSetting('contact',               MPBC_CONTACT),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { key, value } = await req.json()
    setSetting(key, String(value))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
