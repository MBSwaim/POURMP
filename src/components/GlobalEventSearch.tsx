'use client'
import { useState, useRef, useEffect } from 'react'
import { searchEvents } from '@/lib/eventSearch'
import { EventSearchResults } from '@/components/EventSearchResults'
import type { EventWithClient } from '@/lib/db'

const RESULT_LIMIT = 8

export function GlobalEventSearch({ onNavigate }: { onNavigate?: () => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<EventWithClient[] | null>(null)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function ensureEventsLoaded() {
    if (events !== null || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/events')
      setEvents(await res.json())
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const results = events ? searchEvents(events, query, RESULT_LIMIT) : []

  return (
    <div ref={containerRef} className="relative px-1 pb-2">
      <input
        type="text"
        value={query}
        onFocus={() => { setOpen(true); ensureEventsLoaded() }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        placeholder="Search events…"
        className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-700
          focus:outline-none focus:border-[#C8973A]/50 focus:text-gray-900 transition-colors"
      />

      {open && query.trim() && (
        <div className="absolute z-50 top-full left-1 right-1 mt-1 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden max-h-80 overflow-y-auto">
          {loading ? (
            <p className="px-3 py-3 text-xs text-gray-500">Loading…</p>
          ) : (
            <EventSearchResults
              results={results}
              query={query}
              compact
              onSelect={() => { setOpen(false); setQuery(''); onNavigate?.() }}
            />
          )}
        </div>
      )}
    </div>
  )
}
