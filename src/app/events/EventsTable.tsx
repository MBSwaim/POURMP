'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PaymentStatusBadge } from '@/components/StatusBadge'
import { formatCurrency } from '@/lib/calculations'
import { EVENT_STATUSES } from '@/lib/constants'
// EVENT_STATUSES used in status dropdown
import type { EventWithClient } from '@/lib/db'

// Defines the natural progression order
const STATUS_FLOW: Record<string, string> = {
  'New':       'Contacted',
  'Contacted': 'Converted',
  'Converted': 'Tentative',
  'Tentative': 'Confirmed',
  'Confirmed': 'Closed',
  'Closed':    'Closed',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'New':       { bg: 'bg-gray-600/30',    text: 'text-gray-300',   border: 'border-gray-500/40' },
  'Contacted': { bg: 'bg-blue-600/30',    text: 'text-blue-300',   border: 'border-blue-500/40' },
  'Converted': { bg: 'bg-purple-600/30',  text: 'text-purple-300', border: 'border-purple-500/40' },
  'Tentative': { bg: 'bg-yellow-600/30',  text: 'text-yellow-300', border: 'border-yellow-500/40' },
  'Confirmed': { bg: 'bg-green-600/30',   text: 'text-green-300',  border: 'border-green-500/40' },
  'Closed':    { bg: 'bg-slate-600/30',   text: 'text-slate-300',  border: 'border-slate-500/40' },
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
    <div className="rounded-xl border border-white/10 overflow-visible">
      {events.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-sm">
          No {statusFilter ?? ''} events in {year}.
        </div>
      ) : (
      <table className="w-full text-sm">
        <thead className="bg-[#1F3348] border-b border-white/10">
          <tr>
            <th className="text-left px-4 py-3 text-gray-400 font-medium tracking-widest uppercase text-xs">Event</th>
            <th className="text-left px-4 py-3 text-gray-400 font-medium tracking-widest uppercase text-xs">Client</th>
            <th className="text-left px-4 py-3 text-gray-400 font-medium tracking-widest uppercase text-xs">Date</th>
            <th className="text-left px-4 py-3 text-gray-400 font-medium tracking-widest uppercase text-xs">Guests</th>
            <th className="text-left px-4 py-3 text-gray-400 font-medium tracking-widest uppercase text-xs">Package</th>
            <th className="text-left px-4 py-3 text-gray-400 font-medium tracking-widest uppercase text-xs">Value</th>
            <th className="text-left px-4 py-3 text-gray-400 font-medium tracking-widest uppercase text-xs">Status</th>
            <th className="text-left px-4 py-3 text-gray-400 font-medium tracking-widest uppercase text-xs">Deposit</th>
            <th className="text-left px-4 py-3 text-gray-400 font-medium tracking-widest uppercase text-xs">Final</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, i) => {
            const isPast = ev.event_date < today
            const colors = STATUS_COLORS[ev.status] ?? STATUS_COLORS['New']
            const nextStatus = STATUS_FLOW[ev.status]
            const isOpen = openId === ev.id

            return (
              <tr
                key={ev.id}
                className={`border-b border-white/5 hover:bg-white/5 transition-colors
                  ${i % 2 !== 0 ? 'bg-white/[0.02]' : ''}
                  ${isPast && isCurrentYear ? 'opacity-60' : ''}`}
              >
                <td className="px-4 py-3">
                  <Link href={`/events/${ev.id}`} className="hover:text-[#C8973A] transition-colors font-medium">
                    {ev.event_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {ev.first_name || ev.last_name
                    ? `${ev.first_name} ${ev.last_name}`.trim()
                    : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{ev.event_date}</td>
                <td className="px-4 py-3 text-gray-300">{ev.guest_count ?? <span className="text-gray-600">—</span>}</td>
                <td className="px-4 py-3 text-gray-300">{ev.package_name ?? <span className="text-gray-600">—</span>}</td>
                <td className="px-4 py-3 text-gray-300">
                  {ev.guest_count && ev.price_per_guest
                    ? formatCurrency(ev.guest_count * ev.price_per_guest)
                    : <span className="text-gray-600">—</span>}
                </td>

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
                      <div className="absolute z-50 top-full left-0 mt-1 w-40 rounded-xl border border-white/10 bg-[#0f1e2d] shadow-xl overflow-hidden">
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
                                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
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

                <td className="px-4 py-3">
                  {ev.deposit_status
                    ? <PaymentStatusBadge status={ev.deposit_status} />
                    : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  {ev.final_status
                    ? <PaymentStatusBadge status={ev.final_status} />
                    : <span className="text-gray-600">—</span>}
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
