import { NextResponse } from 'next/server'
import { getEventFull } from '@/lib/db'
import { parseBeoPdf } from '@/lib/beoParse'
import {
  matchEventsForBeo, storeBeoOnEvent, applyHighlightsToEvent,
  createEventFromBeo, toUploadResponse,
} from '@/lib/beoImport'

export const runtime = 'nodejs'

/**
 * Dashboard BEO import.
 *
 * 1. POST file only → scrape + match. Auto-attaches when there's a clear match.
 * 2. POST file + eventId → attach to that event (and seed empty fields).
 * 3. POST file + create=1 → create a new Confirmed event from the BEO.
 */
export async function POST(req: Request) {
  try {
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
    const candidates = matchEventsForBeo(highlights)

    const forcedEventId = form.get('eventId') ? Number(form.get('eventId')) : null
    const createNew = form.get('create') === '1' || form.get('create') === 'true'
    const apply = form.get('apply') !== '0' && form.get('apply') !== 'false'

    // Explicit attach to chosen event
    if (forcedEventId) {
      const existing = getEventFull(forcedEventId)
      if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      const upload = storeBeoOnEvent(forcedEventId, {
        buffer, originalFilename: name, mimeType: file.type || 'application/pdf',
        highlights, rawText: text,
      })
      if (apply) applyHighlightsToEvent(forcedEventId, getEventFull(forcedEventId)!, highlights)
      return NextResponse.json({
        status: 'attached',
        event: {
          id: forcedEventId,
          event_name: existing.event.event_name,
          event_date: existing.event.event_date,
          status: existing.event.status,
        },
        upload: toUploadResponse(upload, highlights),
        highlights,
        applied: apply,
      })
    }

    // Create a new event from the BEO
    if (createNew) {
      const eventId = createEventFromBeo(highlights)
      const upload = storeBeoOnEvent(eventId, {
        buffer, originalFilename: name, mimeType: file.type || 'application/pdf',
        highlights, rawText: text,
      })
      // createEventFromBeo already wrote fields; apply is a no-op for empties but fine
      const full = getEventFull(eventId)!
      return NextResponse.json({
        status: 'created',
        event: {
          id: eventId,
          event_name: full.event.event_name,
          event_date: full.event.event_date,
          status: full.event.status,
        },
        upload: toUploadResponse(upload, highlights),
        highlights,
        applied: true,
      }, { status: 201 })
    }

    // Auto-attach when there's one clear match (order # or strong date+name)
    const top = candidates[0]
    const second = candidates[1]
    const clearMatch = top && top.score >= 100 && (!second || top.score - second.score >= 30)

    if (clearMatch) {
      const existing = getEventFull(top.eventId)
      if (!existing) {
        return NextResponse.json({ error: 'Matched event missing' }, { status: 500 })
      }
      const upload = storeBeoOnEvent(top.eventId, {
        buffer, originalFilename: name, mimeType: file.type || 'application/pdf',
        highlights, rawText: text,
      })
      if (apply) applyHighlightsToEvent(top.eventId, getEventFull(top.eventId)!, highlights)
      return NextResponse.json({
        status: 'attached',
        matchReason: top.reason,
        event: {
          id: top.eventId,
          event_name: existing.event.event_name,
          event_date: existing.event.event_date,
          status: existing.event.status,
        },
        upload: toUploadResponse(upload, highlights),
        highlights,
        applied: apply,
        candidates,
      })
    }

    // Needs staff to pick an event or create one
    return NextResponse.json({
      status: 'needs_choice',
      highlights,
      candidates,
      filename: name,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
