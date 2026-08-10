'use client'
import Link from 'next/link'
import { StatusBadge } from '@/components/StatusBadge'
import type { EventWithClient } from '@/lib/db'

interface Props {
  results: EventWithClient[]
  query: string
  onSelect?: () => void
  compact?: boolean
  // Opt-in dark treatment for the SideNav's dark-shell search popover.
  // Defaults to the original light styling so /events' own search
  // (EventsPageSearch, on a light page) renders exactly as before.
  dark?: boolean
}

export function EventSearchResults({ results, query, onSelect, compact, dark }: Props) {
  if (!query.trim()) return null

  if (results.length === 0) {
    return (
      <div
        className={`${compact ? 'px-3 py-3 text-xs' : 'px-4 py-6 text-sm text-center'} ${
          dark ? 'text-white/40' : 'text-gray-500'
        }`}
      >
        No events match &ldquo;{query}&rdquo;.
      </div>
    )
  }

  return (
    <div className={dark ? 'divide-y divide-white/10' : 'divide-y divide-gray-200'}>
      {results.map(ev => {
        const clientName = `${ev.first_name ?? ''} ${ev.last_name ?? ''}`.trim()
        return (
          <Link
            key={ev.id}
            href={`/events/${ev.id}`}
            onClick={onSelect}
            className={`flex items-center justify-between gap-3 transition-colors ${compact ? 'px-3 py-2' : 'px-4 py-3'} ${
              dark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
            }`}
          >
            <div className="min-w-0">
              <p className={`font-medium truncate ${compact ? 'text-xs' : 'text-sm'} ${dark ? 'text-white' : 'text-gray-900'}`}>
                {ev.event_name}
              </p>
              <p className={`truncate ${compact ? 'text-[11px]' : 'text-xs'} ${dark ? 'text-white/50' : 'text-gray-500'}`}>
                {clientName || ev.company || '—'} · {ev.event_date}
              </p>
            </div>
            <div className="shrink-0">
              <StatusBadge status={ev.status} />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
