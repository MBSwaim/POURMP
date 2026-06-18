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
  { label: 'Next 7 Days',  days: 7  },
  { label: 'Next 14 Days', days: 14 },
  { label: 'Next 30 Days', days: 30 },
]

const STATUS_COLORS: Record<string, string> = {
  New:       'bg-gray-700/60 text-gray-300',
  Contacted: 'bg-blue-900/60 text-blue-300',
  Converted: 'bg-purple-900/60 text-purple-300',
  Tentative: 'bg-yellow-900/60 text-yellow-300',
  Confirmed: 'bg-green-900/60 text-green-300',
  Closed:    'bg-slate-700/60 text-slate-300',
}

function formatEventDate(dateStr: string, timeStr: string) {
  try {
    const d = parseISO(dateStr)
    const dayLabel = format(d, 'EEE M/d')
    const time = to12Hour(timeStr)
    return `${dayLabel}${timeStr ? ', ' + time : ''}`
  } catch {
    return dateStr
  }
}

export function UpcomingEventsCard({ events }: { events: UpcomingEvent[] }) {
  const [rangeIdx, setRangeIdx] = useState(1) // default: Next 14 Days
  const [open, setOpen] = useState(false)

  const { label, days } = RANGES[rangeIdx]
  const today = new Date()
  const cutoff = format(addDays(today, days), 'yyyy-MM-dd')
  const todayStr = format(today, 'yyyy-MM-dd')

  const filtered = events.filter(
    (e) => e.event_date >= todayStr && e.event_date <= cutoff
  )

  const rangeDisplay = `${format(today, 'MMM d')} – ${format(addDays(today, days), 'MMM d')}`

  return (
    <div className="rounded-xl bg-[#1F3348] border border-white/10 overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-400">Upcoming Events</p>

        {/* Date range dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-400 border border-white/15 rounded-md px-2.5 py-1 hover:bg-white/5 transition-colors"
          >
            <span>{label}</span>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-1 w-36 rounded-lg border border-white/15 bg-[#1a2e42] shadow-xl z-10">
              {RANGES.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => { setRangeIdx(i); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5 ${
                    i === rangeIdx ? 'text-[#C8973A] font-medium' : 'text-gray-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event rows */}
      {filtered.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500 italic">No events in this range.</p>
      ) : (
        <div>
          {filtered.map((ev, i) => (
            <div
              key={ev.id}
              className={`flex items-center gap-3 px-4 py-2.5 ${
                i < filtered.length - 1 ? 'border-b border-white/5' : ''
              }`}
            >
              {/* Date + time */}
              <span className="text-xs text-gray-400 w-36 shrink-0">
                {formatEventDate(ev.event_date, ev.event_time)}
              </span>

              {/* Status badge */}
              <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_COLORS[ev.status] ?? 'bg-gray-700 text-gray-300'}`}>
                {ev.status}
              </span>

              {/* Event name */}
              <Link
                href={`/events/${ev.id}`}
                className="text-sm font-medium text-[#C8973A] hover:text-[#e0a84a] truncate flex-1 transition-colors"
              >
                {ev.event_name}
              </Link>

              {/* Client name */}
              <span className="text-xs text-gray-500 shrink-0 hidden sm:block">
                {ev.first_name} {ev.last_name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
