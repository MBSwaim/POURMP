'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { EVENT_STATUSES } from '@/lib/constants'
// EVENT_STATUSES used in status dropdown
import type { EventWithClient } from '@/lib/db'

// Defines the natural progression order
const STATUS_FLOW: Record<string, string> = {
  'Confirmed': 'Planning',
  'Planning':  'Ready',
  'Ready':     'Active',
  'Active':    'Closed',
  'Closed':    'Closed',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Confirmed': { bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200' },
  'Planning':  { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
  'Ready':     { bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200' },
  'Active':    { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
  'Closed':    { bg: 'bg-slate-50',   text: 'text-slate-700',  border: 'border-slate-200' },
}

interface Props {
  initialEvents: EventWithClient[]
  year: number
  isCurrentYear: boolean
  statusFilter: string | null
}

export function EventsTable({ initialEvents, year, isCurrentYear, statusFilter }: Props) {
  const [events, setEvents] = useState(initialEvents)
  const [openId, setOpenId] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const today = new Date().toISOString().slice(0, 10)

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenId(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function setStatus(eventId: number, status: string) {
    setOpenId(null)
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status } : e))
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { status } }),
      })
      if (!res.ok) throw new Error()
      toast.success(`→ ${status}`)
    } catch {
      // Revert on failure
      setEvents(initialEvents)
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-visible">
      {events.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-sm">
          No {statusFilter ?? ''} events in {year}.
        </div>
      ) : (
      <table className="w-full text-sm">
        <thead className="bg-white border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-gray-500 font-medium tracking-widest uppercase text-xs">Event</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium tracking-widest uppercase text-xs">Client</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium tracking-widest uppercase text-xs">Date</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium tracking-widest uppercase text-xs">Guests</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium tracking-widest uppercase text-xs">Package</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium tracking-widest uppercase text-xs">Status</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, i) => {
            const isPast = ev.event_date < today
            const colors = STATUS_COLORS[ev.status] ?? STATUS_COLORS['Confirmed']
            const nextStatus = STATUS_FLOW[ev.status]
            const isOpen = openId === ev.id

            return (
              <tr
                key={ev.id}
                className={`border-b border-gray-200 hover:bg-gray-50 transition-colors
                  ${i % 2 !== 0 ? 'bg-gray-50/50' : ''}
                  ${isPast && isCurrentYear ? 'opacity-60' : ''}`}
              >
                <td className="px-4 py-3">
                  <Link href={`/events/${ev.id}`} className="hover:text-[#C8973A] transition-colors font-medium">
                    {ev.event_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {ev.first_name || ev.last_name
                    ? `${ev.first_name} ${ev.last_name}`.trim()
                    : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{ev.event_date}</td>
                <td className="px-4 py-3 text-gray-700">{ev.guest_count ?? <span className="text-gray-600">—</span>}</td>
                <td className="px-4 py-3 text-gray-700">{ev.package_name ?? <span className="text-gray-600">—</span>}</td>

                {/* Status dropdown */}
                <td className="px-4 py-3">
                  <div className="relative inline-block" ref={isOpen ? dropdownRef : undefined}>
                    <button
                      onClick={() => setOpenId(isOpen ? null : ev.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all
                        ${colors.bg} ${colors.text} ${colors.border}
                        hover:brightness-125 active:scale-95`}
                    >
                      {ev.status}
                      <span className="opacity-50 text-[10px]">▾</span>
                    </button>

                    {isOpen && (
                      <div className="absolute z-50 top-full left-0 mt-1 w-40 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                        {/* Next step hint */}
                        {nextStatus !== ev.status && (
                          <div className="px-3 pt-2 pb-1">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Next step</p>
                            <button
                              onClick={() => setStatus(ev.id, nextStatus)}
                              className={`w-full text-left mt-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                                ${STATUS_COLORS[nextStatus].bg} ${STATUS_COLORS[nextStatus].text} ${STATUS_COLORS[nextStatus].border}
                                hover:brightness-125`}
                            >
                              → {nextStatus}
                            </button>
                          </div>
                        )}
                        {/* All statuses */}
                        <div className="px-3 pt-1.5 pb-2 space-y-0.5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">All statuses</p>
                          {EVENT_STATUSES.map((s) => (
                            <button
                              key={s}
                              onClick={() => setStatus(ev.id, s)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                                ${ev.status === s
                                  ? `${STATUS_COLORS[s].bg} ${STATUS_COLORS[s].text} ${STATUS_COLORS[s].border} border`
                                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            >
                              {ev.status === s && <span className="mr-1">✓</span>}{s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      )}
    </div>
  )
}
