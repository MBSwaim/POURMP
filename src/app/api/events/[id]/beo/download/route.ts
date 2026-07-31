import { NextResponse } from 'next/server'
import { getEventFull, getBeoUpload, getBeoUploadPath } from '@/lib/db'
import fs from 'fs'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const eventId = Number(params.id)
    if (!getEventFull(eventId)) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const upload = getBeoUpload(eventId)
    if (!upload) {
      return NextResponse.json({ error: 'No BEO uploaded' }, { status: 404 })
    }

    const filePath = getBeoUploadPath(upload.stored_filename)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'BEO file missing on disk' }, { status: 404 })
    }

    const bytes = fs.readFileSync(filePath)
    const filename = upload.original_filename.replace(/[^\w.\- ()]+/g, '_') || 'beo.pdf'

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': upload.mime_type || 'application/pdf',
        'Content-Length': String(bytes.length),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
