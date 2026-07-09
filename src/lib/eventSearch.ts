import type { EventWithClient } from './db'

// Shared matching logic for the global event search (Events page search bar +
// compact sidebar search). Matches on client name, event name, company, email,
// phone, and event date — nothing else. Read-only, no writes, no event-system logic.

function normalizeDigits(s: string): string {
  return s.replace(/\D/g, '')
}

export function eventMatchesQuery(ev: EventWithClient, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false

  const clientName = `${ev.first_name ?? ''} ${ev.last_name ?? ''}`.trim().toLowerCase()
  const haystacks = [ev.event_name, clientName, ev.company, ev.email, ev.event_date]
    .filter(Boolean)
    .map(s => String(s).toLowerCase())

  if (haystacks.some(h => h.includes(q))) return true

  const qDigits = normalizeDigits(query)
  if (qDigits.length >= 3 && ev.phone && normalizeDigits(ev.phone).includes(qDigits)) return true

  return false
}

export function searchEvents(events: EventWithClient[], query: string, limit?: number): EventWithClient[] {
  if (!query.trim()) return []
  const results = events
    .filter(ev => eventMatchesQuery(ev, query))
    .sort((a, b) => b.event_date.localeCompare(a.event_date))
  return limit ? results.slice(0, limit) : results
}
