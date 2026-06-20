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
  New:       'bg-gray-600/30 text-gray-400 border-gray-500/30',
  Contacted: 'bg-blue-900/40 text-blue-300 border-blue-500/30',
  Converted: 'bg-purple-900/40 text-purple-300 border-purple-500/30',
  Tentative: 'bg-yellow-900/40 text-yellow-300 border-yellow-500/30',
  Confirmed: 'bg-green-900/40 text-green-300 border-green-500/30',
  Closed:    'bg-slate-700/40 text-slate-400 border-slate-500/30',
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
    <div className="rounded-xl bg-[#1F3348] border border-white/10 overflow-hidden">

      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500">Upcoming Events</p>

        {/* Range pill toggles */}
        <div className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide transition-colors ${
                i === rangeIdx
                  ? 'bg-[#C8973A] text-white'
                  : 'text-gray-500 hover:text-gray-300'
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
        <div className="divide-y divide-white/5">
          {filtered.map((ev) => {
            let d: Date | null = null
            try { d = parseISO(ev.event_date) } catch { /* */ }

            return (
              <div key={ev.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">

                {/* Date block */}
                <div className="shrink-0 w-10 text-center">
                  <p className="text-base font-bold text-white leading-none tabular-nums">
                    {d ? format(d, 'd') : '—'}
                  </p>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">
                    {d ? format(d, 'MMM') : ''}
                  </p>
                </div>

                {/* Divider */}
                <div className="w-px h-7 bg-white/8 shrink-0" />

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/events/${ev.id}`}
                    className="text-sm font-semibold text-white hover:text-[#C8973A] truncate block transition-colors"
                  >
                    {ev.event_name}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {ev.first_name} {ev.last_name}
                    {ev.event_time ? ` · ${to12Hour(ev.event_time)}` : ''}
                  </p>
                </div>

                {/* Status badge */}
                <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${STATUS_COLORS[ev.status] ?? 'bg-gray-700 text-gray-400 border-gray-600/30'}`}>
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
