'use client'
import { useState } from 'react'
import Link from 'next/link'
import { to12Hour } from '@/lib/timeUtils'
import { format, addDays, parseISO } from 'date-fns'

type UpcomingEvent = {
  id: number
  event_name: string
  event_date: string
  event_time: string
  status: string
  first_name: string
  last_name: string
}

const RANGES = [
  { label: '7d',  days: 7  },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
]

const STATUS_COLORS: Record<string, string> = {
  New:       'bg-gray-50 text-gray-700 border-gray-200',
  Contacted: 'bg-blue-50 text-blue-700 border-blue-200',
  Converted: 'bg-purple-50 text-purple-700 border-purple-200',
  Tentative: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Confirmed: 'bg-green-50 text-green-700 border-green-200',
  Closed:    'bg-slate-50 text-slate-700 border-slate-200',
}

export function UpcomingEventsCard({ events }: { events: UpcomingEvent[] }) {
  const [rangeIdx, setRangeIdx] = useState(1) // default: 14 days

  const { days } = RANGES[rangeIdx]
  const today = new Date()
  const cutoff = format(addDays(today, days), 'yyyy-MM-dd')
  const todayStr = format(today, 'yyyy-MM-dd')

  const filtered = events.filter(
    (e) => e.event_date >= todayStr && e.event_date <= cutoff
  )

  return (
    <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">

      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500">Upcoming Events</p>

        {/* Range pill toggles */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide transition-colors ${
                i === rangeIdx
                  ? 'bg-[#C8973A] text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Event rows */}
      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">No events in this window</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {filtered.map((ev) => {
            let d: Date | null = null
            try { d = parseISO(ev.event_date) } catch { /* */ }

            return (
              <div key={ev.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">

                {/* Date block */}
                <div className="shrink-0 w-10 text-center">
                  <p className="text-base font-bold text-gray-900 leading-none tabular-nums">
                    {d ? format(d, 'd') : '—'}
                  </p>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">
                    {d ? format(d, 'MMM') : ''}
                  </p>
                </div>

                {/* Divider */}
                <div className="w-px h-7 bg-gray-100 shrink-0" />

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/events/${ev.id}`}
                    className="text-sm font-semibold text-gray-900 hover:text-[#C8973A] truncate block transition-colors"
                  >
                    {ev.event_name}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {ev.first_name} {ev.last_name}
                    {ev.event_time ? ` · ${to12Hour(ev.event_time)}` : ''}
                  </p>
                </div>

                {/* Status badge */}
                <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${STATUS_COLORS[ev.status] ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                  {ev.status}
                </span>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
