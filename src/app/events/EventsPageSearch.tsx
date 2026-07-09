'use client'
import { useState } from 'react'
import { searchEvents } from '@/lib/eventSearch'
import { EventSearchResults } from '@/components/EventSearchResults'
import type { EventWithClient } from '@/lib/db'

// Searches across ALL events (not just the currently selected year) by client name,
// event name, company, email, phone, or event date — independent of the year picker
// and status filter below. Read-only lookup; does not touch the events table's own logic.
export function EventsPageSearch({ allEvents }: { allEvents: EventWithClient[] }) {
  const [query, setQuery] = useState('')
  const results = searchEvents(allEvents, query)

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by client, event, company, email, phone, or date…"
        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900
          focus:outline-none focus:ring-1 focus:ring-[#C8973A] placeholder:text-gray-500"
      />

      {query.trim() && (
        <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden max-h-96 overflow-y-auto">
          <EventSearchResults results={results} query={query} />
        </div>
      )}
    </div>
  )
}
