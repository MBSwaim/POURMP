import { NextResponse } from 'next/server'
import { getEventFull, getBeoUpload, deleteBeoUpload } from '@/lib/db'
import { parseBeoPdf } from '@/lib/beoParse'
import {
  storeBeoOnEvent, applyHighlightsToEvent, parseStoredHighlights, toUploadResponse,
} from '@/lib/beoImport'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const eventId = Number(params.id)
    if (!getEventFull(eventId)) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    const upload = getBeoUpload(eventId)
    if (!upload) return NextResponse.json({ upload: null })
    return NextResponse.json({ upload: toUploadResponse(upload) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const eventId = Number(params.id)
    const existing = getEventFull(eventId)
    if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const form = await req.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing PDF file' }, { status: 400 })
    }

    const name = file.name || 'beo.pdf'
    if (!name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF must be 15 MB or smaller' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { text, highlights } = await parseBeoPdf(buffer)
    const upload = storeBeoOnEvent(eventId, {
      buffer,
      originalFilename: name,
      mimeType: file.type || 'application/pdf',
      highlights,
      rawText: text,
    })

    const apply = form.get('apply') === '1' || form.get('apply') === 'true'
    if (apply) applyHighlightsToEvent(eventId, existing, highlights)

    return NextResponse.json({ upload: toUploadResponse(upload, highlights), applied: apply })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const eventId = Number(params.id)
    const existing = getEventFull(eventId)
    if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const upload = getBeoUpload(eventId)
    if (!upload) return NextResponse.json({ error: 'No BEO uploaded' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    if (body.apply) {
      const highlights = parseStoredHighlights(upload.parsed_json)
      applyHighlightsToEvent(eventId, existing, highlights)
      return NextResponse.json({ ok: true, applied: true, highlights })
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const eventId = Number(params.id)
    if (!getEventFull(eventId)) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    deleteBeoUpload(eventId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
