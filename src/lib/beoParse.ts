/**
 * BEO PDF text extraction + field scraping.
 *
 * Tuned for Manhattan Project Beer Company's Toast Catering & Events BEO
 * (label-on-one-line / value-on-next layout with MP custom form fields).
 * Parsed values seed operational fields only — Toast remains system of record.
 */

export interface BeoHighlights {
  eventName?: string
  eventDate?: string
  startTime?: string
  endTime?: string
  productionCloseTime?: string
  setupTime?: string
  foodServedTime?: string
  decorateNote?: string
  guestCount?: number
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  company?: string
  space?: string
  orderNumber?: string
  toastStatus?: string
  foodOptions?: string
  dietaryRestrictions?: string
  specialRequests?: string
  drinkTickets?: number
  barTabType?: string
  tabDetails?: string
  barNotes?: string
  eventLead?: string
  assignedBeertenders?: string
  setupDetails?: string
  floorPlanNotes?: string
  serviceDetails?: string
  menuItems: string[]
  orderLines: string[]
  /** Other Label → Value pairs that didn't map to a known field */
  otherFields: Record<string, string>
}

export interface BeoParseResult {
  text: string
  highlights: BeoHighlights
}

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08',
  sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
}

const WEEKDAYS = 'sunday|monday|tuesday|wednesday|thursday|friday|saturday'

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Convert assorted date strings to YYYY-MM-DD when possible. */
export function normalizeDate(raw: string): string | undefined {
  const s = clean(raw)
    .replace(new RegExp(`^(${WEEKDAYS}),?\\s+`, 'i'), '')

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const slash = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (slash) {
    const mm = slash[1].padStart(2, '0')
    const dd = slash[2].padStart(2, '0')
    let yyyy = slash[3]
    if (yyyy.length === 2) yyyy = Number(yyyy) > 50 ? `19${yyyy}` : `20${yyyy}`
    return `${yyyy}-${mm}-${dd}`
  }

  const named = s.match(
    /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i
  )
  if (named) {
    const mm = MONTHS[named[1].toLowerCase()]
    if (mm) return `${named[3]}-${mm}-${named[2].padStart(2, '0')}`
  }

  return undefined
}

/** Convert assorted time strings to HH:mm (24h) when possible. */
export function normalizeTime(raw: string): string | undefined {
  const s = clean(raw)
  const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)$/i)
  if (m12) {
    let h = Number(m12[1])
    const min = m12[2] ?? '00'
    const ap = m12[3].replace(/\./g, '').toLowerCase()
    if (ap.startsWith('p') && h < 12) h += 12
    if (ap.startsWith('a') && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${min}`
  }
  const m24 = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (m24) return `${m24[1].padStart(2, '0')}:${m24[2]}`
  return undefined
}

function isSectionLabel(line: string): boolean {
  const l = normalizeLabel(line)
  return [
    'customer', 'date', 'number of guests', 'event details occasion etc',
    'event details', 'food options', 'food notes special requests dietary restrictions',
    'food notes', 'number of drink tickets', 'tab details', 'event location',
    'event lead', 'assigned beertenders', 'setup details decorations etc',
    'setup details', 'event floor plan including space restrictions',
    'event floor plan', 'service details multicourse meal etc', 'service details',
    'order', 'qty item modifiers',
  ].some(k => l === k || l.startsWith(k))
}

/** Collect consecutive non-label lines after `start` until the next section label. */
function sectionBody(lines: string[], start: number): { body: string[]; end: number } {
  const body: string[] = []
  let i = start
  while (i < lines.length) {
    const line = lines[i]
    if (body.length > 0 && isSectionLabel(line)) break
    // Stop at page break markers
    if (/^--\s*\d+\s+of\s+\d+\s*--$/.test(line)) break
    if (/^Created\s+\d/.test(line) && body.length > 0) break
    body.push(line)
    i++
  }
  return { body, end: i }
}

function findSection(lines: string[], aliases: string[]): { body: string[]; index: number } | null {
  const normalizedAliases = aliases.map(normalizeLabel)
  for (let i = 0; i < lines.length; i++) {
    const l = normalizeLabel(lines[i])
    if (normalizedAliases.some(a => l === a || l.startsWith(a))) {
      const { body, end } = sectionBody(lines, i + 1)
      return { body, index: end }
    }
  }
  return null
}

function parseTimeline(lines: string[]): {
  productionCloseTime?: string
  setupTime?: string
  foodServedTime?: string
  startTime?: string
  decorateNote?: string
} {
  const out: ReturnType<typeof parseTimeline> = {}
  for (const line of lines) {
    const m = line.match(/^(.+?)\s*@\s*(\d{1,2}:\d{2}\s*[ap]\.?m\.?)$/i)
      || line.match(/^(.+?)\s*@\s*(\d{1,2}\s*[ap]\.?m\.?)$/i)
    if (!m) continue
    const label = m[1].toLowerCase()
    const time = normalizeTime(m[2])
    if (!time) continue
    if (label.includes('production') || label.includes('close off')) out.productionCloseTime = time
    else if (label.includes('setup')) out.setupTime = time
    else if (label.includes('food served') || label.includes('food ready')) out.foodServedTime = time
    else if (label.includes('event start') || label.includes('starts')) out.startTime = time
    else if (label.includes('decorat')) out.decorateNote = clean(line)
  }
  return out
}

function mapBarTabType(raw: string): string | undefined {
  const s = clean(raw)
  if (/pre-?paid\s*drink\s*ticket/i.test(s)) return 'Pre-Paid Drink Ticket(s)'
  if (/by\s*consumption/i.test(s)) return 'By Consumption'
  if (/individual\s*tabs?/i.test(s)) return 'Individual Tabs'
  return undefined
}

function extractMenuFromFoodNotes(lines: string[]): string[] {
  const items: string[] = []
  let inBuffet = false
  for (const line of lines) {
    if (/^custom\s+buffet$/i.test(line) || /^buffet$/i.test(line)) {
      inBuffet = true
      continue
    }
    if (/please note:/i.test(line)) break
    if (inBuffet || /^\(\d+\)\s+/.test(line)) {
      if (/^\(\d+\)\s+/.test(line) || /^[-•]/.test(line)) items.push(clean(line.replace(/^[-•]\s*/, '')))
    }
  }
  // Also grab "Food Restrictions: ..." separately via caller
  return items
}

function extractOrderLines(lines: string[]): string[] {
  const items: string[] = []
  let started = false
  for (const line of lines) {
    if (/^qty\s+item/i.test(line) || /^order$/i.test(line)) { started = true; continue }
    // Page chrome — skip, don't abort (order table often spans pages)
    if (/^--\s*\d+\s+of\s+\d+\s*--$/.test(line) || /^created\s+/i.test(line)) continue
    if (/^manhattan\s+project/i.test(line)) continue
    // Toast order rows always begin with a quantity; modifiers/includes wrap below.
    if (/^\d+\s+\S+/.test(line)) {
      items.push(clean(line))
      started = true
      continue
    }
    // Append short modifier lines onto the previous qty row
    if (started && items.length && /^(includes:|\(\d+\)\s+per person|\(event\))/i.test(line)) {
      items[items.length - 1] = `${items[items.length - 1]} — ${clean(line)}`
    }
  }
  return items.slice(0, 40)
}

/**
 * Primary parser for MP Toast BEOs. Falls back to lighter heuristics when the
 * expected section labels aren't present.
 */
export function scrapeBeoText(text: string): BeoHighlights {
  const normalized = text.replace(/\u00a0/g, ' ')
  const lines = normalized
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    // Drop page chrome that repeats
    .filter(l => !/^--\s*\d+\s+of\s+\d+\s*--$/.test(l))

  const highlights: BeoHighlights = { menuItems: [], orderLines: [], otherFields: {} }

  // Event name: first content line, or line before "On-Site Catering BEO"
  const beoTypeIdx = lines.findIndex(l => /catering\s+beo/i.test(l))
  if (beoTypeIdx > 0 && !/^created\s+/i.test(lines[beoTypeIdx - 1]) && !/^manhattan\s+project/i.test(lines[beoTypeIdx - 1])) {
    highlights.eventName = clean(lines[beoTypeIdx - 1])
  } else if (lines[0] && !/^created\s+/i.test(lines[0]) && !/^manhattan\s+project/i.test(lines[0])) {
    highlights.eventName = clean(lines[0])
  }

  // Customer block: name, then email / phone on following lines
  const customer = findSection(lines, ['customer'])
  if (customer?.body.length) {
    highlights.contactName = clean(customer.body[0])
    for (const line of customer.body.slice(1)) {
      if (/@/.test(line) && !highlights.contactEmail) highlights.contactEmail = clean(line)
      else if (/[\d][\d\s().\-+]{6,}/.test(line) && !highlights.contactPhone) highlights.contactPhone = clean(line)
      else if (!highlights.company && !/@/.test(line) && !/catering\s+beo/i.test(line)) {
        // rarely a company line under customer
      }
    }
  }

  // Date block: weekday date, then start time
  const dateSec = findSection(lines, ['date'])
  if (dateSec?.body.length) {
    for (const line of dateSec.body) {
      const d = normalizeDate(line)
      if (d && !highlights.eventDate) { highlights.eventDate = d; continue }
      const t = normalizeTime(line)
      if (t && !highlights.startTime) { highlights.startTime = t; continue }
      // Stop once we hit the event name / BEO type echo
      if (/catering\s+beo/i.test(line) || (highlights.eventName && line === highlights.eventName)) break
    }
  }

  // Order #
  for (const line of lines) {
    const m = line.match(/order\s*#\s*([A-Za-z0-9\-]+)/i)
    if (m) { highlights.orderNumber = m[1]; break }
  }
  for (const line of lines) {
    if (/^(confirmed|tentative|cancelled|paid|unpaid)/i.test(line) && /•|paid|confirmed/i.test(line)) {
      highlights.toastStatus = clean(line)
      break
    }
  }

  const guests = findSection(lines, ['number of guests', 'guest count', 'guests'])
  if (guests?.body[0]) {
    const n = Number(guests.body[0].match(/\d{1,4}/)?.[0])
    if (n > 0) highlights.guestCount = n
  }

  const details = findSection(lines, ['event details occasion etc', 'event details'])
  if (details?.body.length) {
    const timeline = parseTimeline(details.body)
    if (timeline.productionCloseTime) highlights.productionCloseTime = timeline.productionCloseTime
    if (timeline.setupTime) highlights.setupTime = timeline.setupTime
    if (timeline.foodServedTime) highlights.foodServedTime = timeline.foodServedTime
    if (timeline.startTime) highlights.startTime = timeline.startTime
    if (timeline.decorateNote) highlights.decorateNote = timeline.decorateNote
    // Keep raw timeline in otherFields for display
    highlights.otherFields.timeline = details.body.join(' · ')
  }

  const foodOpts = findSection(lines, ['food options'])
  if (foodOpts?.body[0]) highlights.foodOptions = clean(foodOpts.body[0])

  const foodNotes = findSection(lines, [
    'food notes special requests dietary restrictions',
    'food notes',
  ])
  if (foodNotes?.body.length) {
    const restrictionLine = foodNotes.body.find(l => /food\s*restrictions?\s*:/i.test(l) || /allerg/i.test(l))
    if (restrictionLine) {
      highlights.dietaryRestrictions = clean(restrictionLine.replace(/^food\s*restrictions?\s*:\s*/i, ''))
    }
    // Real "special request" copy sits above the CUSTOM BUFFET block; skip
    // restrictions, buffet lines, and the taproom-menu disclaimer.
    const requestLines: string[] = []
    for (const l of foodNotes.body) {
      if (/^custom\s+buffet$/i.test(l) || /^\(\d+\)\s+/.test(l)) break
      if (/food\s*restrictions?\s*:/i.test(l) || /allerg/i.test(l)) continue
      if (/please note:/i.test(l) || /taproom food menu/i.test(l) || /^permitted\.?\)$/i.test(l)) continue
      requestLines.push(l)
    }
    if (requestLines.length) highlights.specialRequests = requestLines.map(clean).join(' ')
    highlights.menuItems = extractMenuFromFoodNotes(foodNotes.body)
  }

  const drinkTickets = findSection(lines, ['number of drink tickets', 'drink tickets'])
  if (drinkTickets?.body[0]) {
    const n = Number(drinkTickets.body[0].match(/\d{1,5}/)?.[0])
    if (n > 0) highlights.drinkTickets = n
  }

  const tab = findSection(lines, ['tab details'])
  if (tab?.body.length) {
    highlights.tabDetails = tab.body.map(clean).join('\n')
    highlights.barTabType = mapBarTabType(tab.body[0]) ?? mapBarTabType(tab.body.join(' '))
    const drinkRestrict = tab.body.find(l => /drink\s*restrictions?\s*:/i.test(l))
    if (drinkRestrict && !/:\s*n\/?a\s*$/i.test(drinkRestrict)) {
      highlights.barNotes = clean(drinkRestrict)
    } else {
      highlights.barNotes = clean(tab.body.join(' · '))
    }
  }

  const location = findSection(lines, ['event location', 'location', 'space'])
  if (location?.body[0]) highlights.space = clean(location.body[0])

  const lead = findSection(lines, ['event lead'])
  if (lead?.body[0]) highlights.eventLead = clean(lead.body[0])

  const beertenders = findSection(lines, ['assigned beertenders', 'beertenders'])
  if (beertenders?.body[0]) highlights.assignedBeertenders = clean(beertenders.body.join(', '))

  const setup = findSection(lines, ['setup details decorations etc', 'setup details'])
  if (setup?.body.length) highlights.setupDetails = setup.body.map(clean).join(' ')

  const floor = findSection(lines, ['event floor plan including space restrictions', 'event floor plan'])
  if (floor?.body.length) highlights.floorPlanNotes = floor.body.map(clean).join(' ')

  const service = findSection(lines, ['service details multicourse meal etc', 'service details'])
  if (service?.body.length) highlights.serviceDetails = service.body.map(clean).join(' ')

  // Order table (page 2)
  const orderIdx = lines.findIndex(l => /^order$/i.test(l) || /^qty\s+item/i.test(l))
  if (orderIdx >= 0) {
    highlights.orderLines = extractOrderLines(lines.slice(orderIdx))
  }

  // Fallback email/phone if customer block missed them
  if (!highlights.contactEmail) {
    const em = normalized.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    if (em) highlights.contactEmail = em[0]
  }
  if (!highlights.contactPhone) {
    const ph = normalized.match(/\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/)
    if (ph) highlights.contactPhone = ph[0]
  }

  return highlights
}

export async function parseBeoPdf(buffer: Buffer): Promise<BeoParseResult> {
  // pdf-parse v2: class-based API (data accepts Buffer / Uint8Array)
  const mod = await import('pdf-parse')
  const PDFParse = mod.PDFParse
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    const text = (result.text || '').trim()
    return { text, highlights: scrapeBeoText(text) }
  } finally {
    await parser.destroy?.()
  }
}

/** Build a short staff-facing summary suitable for beo_notes. */
export function formatHighlightsSummary(h: BeoHighlights): string {
  const lines: string[] = ['— Imported from Toast BEO PDF —']
  if (h.eventName) lines.push(`Event: ${h.eventName}`)
  if (h.eventDate) lines.push(`Date: ${h.eventDate}`)
  if (h.startTime || h.endTime) lines.push(`Time: ${[h.startTime, h.endTime].filter(Boolean).join(' – ')}`)
  if (h.productionCloseTime) lines.push(`Production Closes: ${h.productionCloseTime}`)
  if (h.setupTime) lines.push(`Setup: ${h.setupTime}`)
  if (h.foodServedTime) lines.push(`Food Served: ${h.foodServedTime}`)
  if (h.guestCount) lines.push(`Guests: ${h.guestCount}`)
  if (h.space) lines.push(`Space: ${h.space}`)
  if (h.orderNumber) lines.push(`Toast Order #: ${h.orderNumber}`)
  if (h.toastStatus) lines.push(`Toast Status: ${h.toastStatus}`)
  if (h.contactName) lines.push(`Contact: ${h.contactName}`)
  if (h.contactPhone) lines.push(`Phone: ${h.contactPhone}`)
  if (h.contactEmail) lines.push(`Email: ${h.contactEmail}`)
  if (h.eventLead) lines.push(`Event Lead: ${h.eventLead}`)
  if (h.assignedBeertenders) lines.push(`Beertenders: ${h.assignedBeertenders}`)
  if (h.foodOptions) lines.push(`Food Options: ${h.foodOptions}`)
  if (h.dietaryRestrictions) lines.push(`Dietary: ${h.dietaryRestrictions}`)
  if (h.specialRequests) lines.push(`Requests: ${h.specialRequests}`)
  if (h.drinkTickets) lines.push(`Drink Tickets: ${h.drinkTickets}`)
  if (h.barTabType) lines.push(`Bar Tab: ${h.barTabType}`)
  if (h.tabDetails) lines.push(`Tab Details: ${h.tabDetails.replace(/\n/g, ' | ')}`)
  if (h.setupDetails) lines.push(`Setup: ${h.setupDetails}`)
  if (h.floorPlanNotes) lines.push(`Floor Plan: ${h.floorPlanNotes}`)
  if (h.serviceDetails) lines.push(`Service: ${h.serviceDetails}`)
  if (h.menuItems.length) {
    lines.push('Buffet:')
    for (const item of h.menuItems.slice(0, 20)) lines.push(`  • ${item}`)
  }
  if (h.orderLines.length) {
    lines.push('Order lines:')
    for (const item of h.orderLines.slice(0, 20)) lines.push(`  • ${item}`)
  }
  return lines.join('\n')
}
