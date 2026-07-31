/**
 * Shared BEO import helpers — store PDF on an event, seed empty fields, and
 * match scraped Toast BEO highlights to existing POURMP events.
 */

import {
  getEvents, getEventFull, upsertBeoUpload, getBeoUploadPath,
  upsertEventDetails, updateEvent, updateClient, updateEventPackage,
  createClient, createEvent, addEventPackage,
  type EventWithClient, type EventBeoUpload,
} from '@/lib/db'
import { formatHighlightsSummary, type BeoHighlights } from '@/lib/beoParse'
import { randomBytes } from 'crypto'
import fs from 'fs'

export type BeoMatchReason = 'order_number' | 'date_name' | 'date_contact'

export interface BeoMatchCandidate {
  eventId: number
  eventName: string
  eventDate: string
  status: string
  clientName: string
  orderNumber: string | null
  reason: BeoMatchReason
  score: number
}

export function parseStoredHighlights(json: string): BeoHighlights {
  try {
    return JSON.parse(json) as BeoHighlights
  } catch {
    return { menuItems: [], orderLines: [], otherFields: {} }
  }
}

function normalizePhone(p: string): string {
  return p.replace(/\D/g, '')
}

function nameScore(a: string, b: string): number {
  const na = a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const nb = b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (!na || !nb) return 0
  if (na === nb) return 100
  if (na.includes(nb) || nb.includes(na)) return 80
  const aw = na.split(' ').filter(Boolean)
  const bw = nb.split(' ').filter(Boolean)
  const overlap = bw.filter(w => aw.some(x => x === w || x.includes(w) || w.includes(x))).length
  if (overlap === 0) return 0
  return Math.round((overlap / Math.max(aw.length, bw.length)) * 70)
}

/** Rank existing events that look like they belong to this BEO. */
export function matchEventsForBeo(h: BeoHighlights): BeoMatchCandidate[] {
  const events = getEvents()
  const candidates: BeoMatchCandidate[] = []

  for (const e of events) {
    const clientName = [e.first_name, e.last_name].filter(Boolean).join(' ')
    let reason: BeoMatchReason | null = null
    let score = 0

    if (h.orderNumber && e.external_order_number && String(e.external_order_number) === String(h.orderNumber)) {
      reason = 'order_number'
      score = 200
    } else if (h.eventDate && e.event_date === h.eventDate) {
      const nScore = h.eventName ? nameScore(h.eventName, e.event_name || '') : 0
      const contactBits = [
        h.contactEmail && e.email && h.contactEmail.toLowerCase() === e.email.toLowerCase(),
        h.contactPhone && e.phone && normalizePhone(h.contactPhone) === normalizePhone(e.phone),
        h.contactName && nameScore(h.contactName, clientName) >= 60,
      ].filter(Boolean).length

      if (nScore >= 50) {
        reason = 'date_name'
        score = 100 + nScore + contactBits * 10
      } else if (contactBits > 0) {
        reason = 'date_contact'
        score = 80 + contactBits * 20
      } else if (h.eventDate) {
        // Same date only — weak candidate for the picker
        reason = 'date_name'
        score = 40
      }
    }

    if (reason && score > 0) {
      candidates.push({
        eventId: e.id,
        eventName: e.event_name,
        eventDate: e.event_date,
        status: e.status,
        clientName,
        orderNumber: e.external_order_number,
        reason,
        score,
      })
    }
  }

  return candidates.sort((a, b) => b.score - a.score)
}

export function storeBeoOnEvent(
  eventId: number,
  opts: {
    buffer: Buffer
    originalFilename: string
    mimeType: string
    highlights: BeoHighlights
    rawText: string
  }
): EventBeoUpload {
  const stored = `${eventId}-${Date.now()}-${randomBytes(4).toString('hex')}.pdf`
  const dest = getBeoUploadPath(stored)
  fs.writeFileSync(dest, opts.buffer)

  return upsertBeoUpload(eventId, {
    original_filename: opts.originalFilename,
    stored_filename: stored,
    mime_type: opts.mimeType || 'application/pdf',
    file_size: opts.buffer.length,
    parsed_json: JSON.stringify(opts.highlights),
    raw_text: opts.rawText.slice(0, 100_000),
  })
}

/** Seed empty operational fields from scraped highlights. Never overwrites existing values. */
export function applyHighlightsToEvent(
  eventId: number,
  existing: NonNullable<ReturnType<typeof getEventFull>>,
  h: BeoHighlights
) {
  const eventPatch: Record<string, string | number> = {}
  if (h.eventName && !existing.event.event_name) eventPatch.event_name = h.eventName
  if (h.eventDate && !existing.event.event_date) eventPatch.event_date = h.eventDate
  if (h.startTime && !existing.event.event_time) eventPatch.event_time = h.startTime
  if (h.endTime && !existing.event.teardown_time) eventPatch.teardown_time = h.endTime
  if (h.productionCloseTime && !existing.event.production_close_time) {
    eventPatch.production_close_time = h.productionCloseTime
  }
  if (h.setupTime && !existing.event.setup_time) eventPatch.setup_time = h.setupTime
  if (!existing.event.decorate_time && h.startTime && h.setupDetails && /one\s*\(1\)\s*hour prior/i.test(h.setupDetails)) {
    const [hh, mm] = h.startTime.split(':').map(Number)
    const total = ((hh * 60 + mm - 60) % 1440 + 1440) % 1440
    eventPatch.decorate_time = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }
  if (h.space && !existing.event.space) eventPatch.space = h.space
  if (h.orderNumber && !existing.event.external_order_number) {
    eventPatch.external_order_number = h.orderNumber
  }
  if (Object.keys(eventPatch).length) updateEvent(eventId, eventPatch)

  if (existing.event.client_id && existing.client) {
    const clientPatch: Record<string, string> = {}
    if (h.contactName) {
      const parts = h.contactName.trim().split(/\s+/)
      if (!existing.client.first_name && parts.length) {
        if (parts.length === 1) {
          clientPatch.first_name = parts[0]
        } else {
          clientPatch.first_name = parts.slice(0, -1).join(' ')
          if (!existing.client.last_name) clientPatch.last_name = parts[parts.length - 1]
        }
      } else if (!existing.client.last_name && parts.length > 1) {
        clientPatch.last_name = parts[parts.length - 1]
      }
    }
    if (h.contactEmail && !existing.client.email) clientPatch.email = h.contactEmail
    if (h.contactPhone && !existing.client.phone) clientPatch.phone = h.contactPhone
    if (h.company && !existing.client.company) clientPatch.company = h.company
    if (Object.keys(clientPatch).length) updateClient(existing.event.client_id, clientPatch)
  }

  const detailsPatch: Record<string, string | number> = {}
  if (h.dietaryRestrictions && !existing.details?.dietary_restrictions) {
    detailsPatch.dietary_restrictions = h.dietaryRestrictions
  }
  if (h.guestCount && !existing.details?.guest_count) {
    detailsPatch.guest_count = h.guestCount
  }
  const primaryPkg = existing.packages?.[0]
  if (h.guestCount && primaryPkg && !primaryPkg.guest_count) {
    updateEventPackage(primaryPkg.id, { guest_count: h.guestCount })
  }
  if (h.drinkTickets != null && !existing.details?.drink_tickets) {
    detailsPatch.drink_tickets = h.drinkTickets
  }
  if (h.barTabType && !existing.details?.bar_tab_type) {
    detailsPatch.bar_tab_type = h.barTabType
  }
  if (h.tabDetails && !existing.details?.tab_details) {
    detailsPatch.tab_details = h.tabDetails
  }
  if (h.setupDetails && !existing.details?.setup_notes) {
    detailsPatch.setup_notes = h.setupDetails
  }
  if (h.floorPlanNotes && !existing.details?.floor_plan_notes) {
    detailsPatch.floor_plan_notes = h.floorPlanNotes
  }
  const staffingBits = [h.eventLead && `Lead: ${h.eventLead}`, h.assignedBeertenders && `Beertenders: ${h.assignedBeertenders}`]
    .filter(Boolean)
    .join(' · ')
  if (staffingBits && !existing.details?.staffing_notes) {
    detailsPatch.staffing_notes = staffingBits
  }
  const summary = formatHighlightsSummary(h)
  const existingNotes = existing.details?.beo_notes?.trim() ?? ''
  if (!existingNotes) {
    detailsPatch.beo_notes = summary
  } else if (!existingNotes.includes('Imported from Toast BEO PDF')) {
    detailsPatch.beo_notes = `${existingNotes}\n\n${summary}`
  }
  const foodBits = [
    h.foodOptions && `Food Options: ${h.foodOptions}`,
    h.specialRequests,
    h.menuItems.length ? `Buffet:\n${h.menuItems.map(i => `• ${i}`).join('\n')}` : '',
    h.serviceDetails && `Service: ${h.serviceDetails}`,
  ].filter(Boolean).join('\n')
  if (foodBits && !existing.details?.food_notes?.trim()) {
    detailsPatch.food_notes = foodBits
  }
  if (h.barNotes && !existing.details?.bar_notes?.trim()) {
    detailsPatch.bar_notes = h.barNotes
  }
  // Toast "Confirmed • Paid" → mark toast_confirmed_date if empty
  if (h.toastStatus && /confirmed/i.test(h.toastStatus) && !existing.details?.toast_confirmed_date) {
    detailsPatch.toast_confirmed_date = h.eventDate || new Date().toISOString().slice(0, 10)
  }
  if (Object.keys(detailsPatch).length) upsertEventDetails(eventId, detailsPatch)
}

/** Create a Confirmed event + client from a scraped BEO (ops import of an already-booked Toast order). */
export function createEventFromBeo(h: BeoHighlights): number {
  const nameParts = (h.contactName || 'Guest').trim().split(/\s+/)
  const first_name = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0]
  const last_name = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''

  const clientId = createClient({
    first_name,
    last_name,
    email: h.contactEmail || '',
    phone: h.contactPhone || '',
    company: h.company || '',
  })

  let decorate_time = ''
  if (h.startTime && h.setupDetails && /one\s*\(1\)\s*hour prior/i.test(h.setupDetails)) {
    const [hh, mm] = h.startTime.split(':').map(Number)
    const total = ((hh * 60 + mm - 60) % 1440 + 1440) % 1440
    decorate_time = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  const eventId = createEvent({
    event_name: h.eventName || 'Imported BEO Event',
    event_date: h.eventDate || new Date().toISOString().slice(0, 10),
    event_time: h.startTime || '',
    setup_time: h.setupTime || '',
    teardown_time: h.endTime || '',
    production_close_time: h.productionCloseTime || '',
    decorate_time,
    event_duration_mins: 180,
    status: 'Confirmed',
    space: h.space || '',
    client_id: clientId,
  })

  if (h.orderNumber) {
    updateEvent(eventId, { external_order_number: h.orderNumber })
  }

  upsertEventDetails(eventId, {
    guest_count: h.guestCount || 0,
    dietary_restrictions: h.dietaryRestrictions || '',
    drink_tickets: h.drinkTickets || 0,
    bar_tab_type: h.barTabType || '',
    tab_details: h.tabDetails || '',
    setup_notes: h.setupDetails || '',
    floor_plan_notes: h.floorPlanNotes || '',
    staffing_notes: [h.eventLead && `Lead: ${h.eventLead}`, h.assignedBeertenders && `Beertenders: ${h.assignedBeertenders}`]
      .filter(Boolean).join(' · '),
    food_notes: [
      h.foodOptions && `Food Options: ${h.foodOptions}`,
      h.specialRequests,
      h.menuItems.length ? `Buffet:\n${h.menuItems.map(i => `• ${i}`).join('\n')}` : '',
      h.serviceDetails && `Service: ${h.serviceDetails}`,
    ].filter(Boolean).join('\n'),
    bar_notes: h.barNotes || '',
    beo_notes: formatHighlightsSummary(h),
    toast_confirmed_date: h.toastStatus && /confirmed/i.test(h.toastStatus)
      ? (h.eventDate || new Date().toISOString().slice(0, 10))
      : null,
  })

  if (h.guestCount) {
    addEventPackage(eventId, '', h.guestCount, 0)
  }

  return eventId
}

export function toUploadResponse(upload: EventBeoUpload, highlights?: BeoHighlights) {
  return {
    id: upload.id,
    event_id: upload.event_id,
    original_filename: upload.original_filename,
    file_size: upload.file_size,
    uploaded_at: upload.uploaded_at,
    highlights: highlights ?? parseStoredHighlights(upload.parsed_json),
  }
}

export function summarizeEvent(e: EventWithClient | { id: number; event_name: string; event_date: string; status: string }) {
  return {
    id: e.id,
    event_name: e.event_name,
    event_date: e.event_date,
    status: e.status,
  }
}
