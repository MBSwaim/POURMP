'use client'
import Link from 'next/link'
import { StatusBadge } from '@/components/StatusBadge'
import type { EventWithClient } from '@/lib/db'

interface Props {
  results: EventWithClient[]
  query: string
  onSelect?: () => void
  compact?: boolean
}

export function EventSearchResults({ results, query, onSelect, compact }: Props) {
  if (!query.trim()) return null

  if (results.length === 0) {
    return (
      <div className={compact ? 'px-3 py-3 text-xs text-gray-500' : 'px-4 py-6 text-sm text-gray-500 text-center'}>
        No events match &ldquo;{query}&rdquo;.
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {results.map(ev => {
        const clientName = `${ev.first_name ?? ''} ${ev.last_name ?? ''}`.trim()
        return (
          <Link
            key={ev.id}
            href={`/events/${ev.id}`}
            onClick={onSelect}
            className={`flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
          >
            <div className="min-w-0">
              <p className={`font-medium text-gray-900 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{ev.event_name}</p>
              <p className={`text-gray-500 truncate ${compact ? 'text-[11px]' : 'text-xs'}`}>
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
