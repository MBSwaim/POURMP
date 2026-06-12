'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDaysInMonth, getDay, format, addMonths } from 'date-fns'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { STATUS_COLORS } from '@/lib/constants'

interface CalEvent {
  id: number
  event_name: string
  event_date: string
  status: string
  first_name: string
  last_name: string
}

interface Props {
  events: CalEvent[]
  year: number
  month: number
}

export function CalendarView({ events, year, month }: Props) {
  const router = useRouter()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = getDaysInMonth(firstDay)
  const startDow = getDay(firstDay) // 0=Sun

  const eventsByDay: Record<string, CalEvent[]> = {}
  for (const ev of events) {
    const d = ev.event_date.substring(8, 10)
    const key = `${year}-${String(month).padStart(2, '0')}-${d}`
    if (!eventsByDay[key]) eventsByDay[key] = []
    eventsByDay[key].push(ev)
  }

  function nav(delta: number) {
    const d = addMonths(firstDay, delta)
    router.push(`/calendar?year=${d.getFullYear()}&month=${d.getMonth() + 1}`)
  }

  const cells: Array<{ date: string | null; day: number | null }> = []
  for (let i = 0; i < startDow; i++) cells.push({ date: null, day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date, day: d })
  }

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : []

  return (
    <div className="space-y-4">
      {/* Nav */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => nav(-1)}>←</Button>
        <h2 className="text-lg font-semibold">{MONTHS[month - 1]} {year}</h2>
        <Button variant="outline" size="sm" onClick={() => nav(1)}>→</Button>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-7 bg-[#1F3348] border-b border-white/10">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 py-2 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (!cell.date) return <div key={i} className="border-b border-r border-white/5 min-h-[80px]" />
            const dayEvents = eventsByDay[cell.date] ?? []
            const isSelected = selectedDay === cell.date
            const today = format(new Date(), 'yyyy-MM-dd')
            const isToday = cell.date === today
            return (
              <div
                key={i}
                onClick={() => setSelectedDay(isSelected ? null : cell.date)}
                className={`border-b border-r border-white/5 min-h-[80px] p-1.5 cursor-pointer transition-colors
                  ${isSelected ? 'bg-[#C8973A]/10 border-[#C8973A]/30' : 'hover:bg-white/5'}
                  ${i % 7 === 6 ? 'border-r-0' : ''}`}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-[#C8973A] text-white' : 'text-gray-300'}`}>
                  {cell.day}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={`text-xs truncate px-1 rounded ${STATUS_COLORS[ev.status] ?? 'bg-gray-500'} bg-opacity-80`}
                    >
                      {ev.event_name}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-400 pl-1">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day detail */}
      {selectedDay && selectedEvents.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
          <h3 className="text-sm font-semibold text-[#C8973A] mb-3">{selectedDay}</h3>
          <div className="space-y-2">
            {selectedEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => router.push(`/events/${ev.id}`)}
                className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <div>
                  <span className="font-medium text-sm">{ev.event_name}</span>
                  <span className="text-gray-400 text-xs ml-2">{ev.first_name} {ev.last_name}</span>
                </div>
                <StatusBadge status={ev.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
