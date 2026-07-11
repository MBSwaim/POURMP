import { NextResponse } from 'next/server'
import { getSetting, setSetting } from '@/lib/db'

export async function GET() {
  try {
    return NextResponse.json({
      notif_sms_enabled:     getSetting('notif_sms_enabled',     'false'),
      notif_email_enabled:   getSetting('notif_email_enabled',   'false'),
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
