'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EVENT_STATUSES } from '@/lib/constants'
import { StatusBadge } from './StatusBadge'
import { formatCurrency } from '@/lib/calculations'
import { toast } from 'sonner'
import type { EventWithClient } from '@/lib/db'

interface Props {
  initialEvents: EventWithClient[]
}

// Thin top-border color per status column
const COLUMN_ACCENT: Record<string, string> = {
  New:       'border-t-gray-500',
  Contacted: 'border-t-blue-500',
  Converted: 'border-t-purple-500',
  Tentative: 'border-t-yellow-500',
  Confirmed: 'border-t-green-500',
  Closed:    'border-t-slate-500',
}

export function KanbanBoard({ initialEvents }: Props) {
  const router = useRouter()
  const [events, setEvents] = useState(initialEvents)
  const [dragging, setDragging] = useState<number | null>(null)

  const byStatus = (status: string) => events.filter((e) => e.status === status)

  async function drop(status: string) {
    if (dragging === null) return
    const event = events.find((e) => e.id === dragging)
    if (!event || event.status === status) { setDragging(null); return }

    setEvents((prev) => prev.map((e) => e.id === dragging ? { ...e, status } : e))
    setDragging(null)

    try {
      await fetch(`/api/events/${dragging}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { status } }),
      })
      toast.success(`Moved to ${status}`)
      router.refresh()
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
      {EVENT_STATUSES.map((status) => {
        const col = byStatus(status)
        return (
          <div
            key={status}
            className={`flex-shrink-0 w-48 rounded-xl bg-[#1a2e42] border border-white/10 border-t-2 ${COLUMN_ACCENT[status] ?? 'border-t-white/20'} overflow-hidden`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/8">
              <StatusBadge status={status} />
              <span className="text-[10px] font-bold text-gray-500 tabular-nums">{col.length}</span>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[64px]">
              {col.map((ev) => (
                <div
                  key={ev.id}
                  draggable
                  onDragStart={() => setDragging(ev.id)}
                  onClick={() => router.push(`/events/${ev.id}`)}
                  className="cursor-pointer rounded-lg bg-[#0f1e2d]/70 border border-white/8 px-3 py-2.5 hover:border-[#C8973A]/40 hover:bg-[#0f1e2d] transition-all select-none group"
                >
                  <p className="text-xs font-semibold text-white truncate group-hover:text-[#C8973A] transition-colors">
                    {ev.event_name}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                    {ev.first_name} {ev.last_name}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{ev.event_date}</p>
                  {ev.guest_count > 0 && ev.price_per_guest > 0 && (
                    <p className="text-[10px] text-[#C8973A]/80 mt-1 font-medium">
                      {formatCurrency(ev.guest_count * ev.price_per_guest)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
