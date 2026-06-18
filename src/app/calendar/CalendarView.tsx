'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDaysInMonth, getDay, format, addMonths } from 'date-fns'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { STATUS_COLORS, BLOCK_REASONS } from '@/lib/constants'
import { toast } from 'sonner'
import type { BlockedDate } from '@/lib/db'

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
  blockedDates: BlockedDate[]
}

const REASON_STYLES: Record<string, string> = {
  'Company Event': 'bg-purple-500/20 border-purple-400/40 text-purple-200',
  'Holiday':       'bg-red-500/20 border-red-400/40 text-red-200',
}

export function CalendarView({ events, year, month, blockedDates: initialBlocked }: Props) {
  const router = useRouter()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<BlockedDate[]>(initialBlocked)

  // Multi-select blocking mode
  const [blockMode, setBlockMode] = useState(false)
  const [selectedToBlock, setSelectedToBlock] = useState<Set<string>>(new Set())
  const [blockReason, setBlockReason] = useState<string>('Holiday')
  const [blockNotes, setBlockNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = getDaysInMonth(firstDay)
  const startDow = getDay(firstDay)

  const eventsByDay: Record<string, CalEvent[]> = {}
  for (const ev of events) {
    const key = ev.event_date.substring(0, 10)
    if (!eventsByDay[key]) eventsByDay[key] = []
    eventsByDay[key].push(ev)
  }

  const blockedByDay: Record<string, BlockedDate> = {}
  for (const b of blocked) blockedByDay[b.date] = b

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

  function handleDayClick(date: string) {
    if (blockMode) {
      setSelectedToBlock((prev) => {
        const next = new Set(prev)
        next.has(date) ? next.delete(date) : next.add(date)
        return next
      })
    } else {
      setSelectedDay(selectedDay === date ? null : date)
    }
  }

  async function saveBlock() {
    if (!selectedToBlock.size) return
    setSaving(true)
    try {
      const res = await fetch('/api/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: Array.from(selectedToBlock), reason: blockReason, notes: blockNotes }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(`${selectedToBlock.size} date${selectedToBlock.size > 1 ? 's' : ''} blocked`)
      setSelectedToBlock(new Set())
      setBlockNotes('')
      setBlockMode(false)
      router.refresh()
    } catch {
      toast.error('Failed to block dates')
    } finally {
      setSaving(false)
    }
  }

  async function unblock(date: string) {
    try {
      await fetch('/api/blocked-dates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: [date] }),
      })
      setBlocked((prev) => prev.filter((b) => b.date !== date))
      toast.success('Date unblocked')
    } catch {
      toast.error('Failed to unblock date')
    }
  }

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : []
  const selectedBlock = selectedDay ? blockedByDay[selectedDay] : null

  return (
    <div className="space-y-4">
      {/* Nav + Block Mode Toggle */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => nav(-1)}>←</Button>
        <h2 className="text-lg font-semibold">{MONTHS[month - 1]} {year}</h2>
        <Button variant="outline" size="sm" onClick={() => nav(1)}>→</Button>

        <div className="ml-auto flex items-center gap-2">
          {blockMode ? (
            <>
              <span className="text-xs text-gray-400 tracking-wide uppercase">
                {selectedToBlock.size} day{selectedToBlock.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setBlockMode(false); setSelectedToBlock(new Set()) }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => { setBlockMode(true); setSelectedDay(null) }}
              className="bg-[#1F3348] border border-white/20 hover:bg-red-900/30 hover:border-red-500/40 text-gray-300 hover:text-red-300 text-xs tracking-widest uppercase"
            >
              Block Dates
            </Button>
          )}
        </div>
      </div>

      {/* Block panel — shown when in block mode */}
      {blockMode && (
        <div className="rounded-xl border border-red-500/20 bg-red-900/10 p-4 space-y-3">
          <p className="text-xs text-red-300 tracking-widest uppercase font-medium">
            Click dates on the calendar to select, then confirm below
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 tracking-widest uppercase">Reason</label>
              <div className="flex gap-2">
                {BLOCK_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setBlockReason(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      blockReason === r
                        ? r === 'Holiday'
                          ? 'bg-red-500/30 border-red-400 text-red-200'
                          : 'bg-purple-500/30 border-purple-400 text-purple-200'
                        : 'bg-white/5 border-white/20 text-gray-400 hover:border-white/40'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-48 space-y-1">
              <label className="text-xs text-gray-400 tracking-widest uppercase">Notes (optional)</label>
              <Textarea
                value={blockNotes}
                onChange={(e) => setBlockNotes(e.target.value)}
                placeholder="e.g. Christmas Day, Staff retreat…"
                rows={1}
                className="text-sm"
              />
            </div>
            <Button
              onClick={saveBlock}
              disabled={saving || selectedToBlock.size === 0}
              className="bg-red-700/60 hover:bg-red-700/80 text-white border border-red-500/40 text-xs tracking-widest uppercase"
            >
              {saving ? 'Saving…' : `Block ${selectedToBlock.size || ''} Date${selectedToBlock.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-7 bg-[#1F3348] border-b border-white/10">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 py-2 font-medium tracking-widest uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (!cell.date) return <div key={i} className="border-b border-r border-white/5 min-h-[88px]" />
            const dayEvents = eventsByDay[cell.date] ?? []
            const isSelected = blockMode ? selectedToBlock.has(cell.date) : selectedDay === cell.date
            const today = format(new Date(), 'yyyy-MM-dd')
            const isToday = cell.date === today
            const blockInfo = blockedByDay[cell.date]
            const isBlocked = !!blockInfo

            let cellBg = 'hover:bg-white/5'
            if (isBlocked) cellBg = blockInfo.reason === 'Holiday' ? 'bg-red-900/20' : 'bg-purple-900/20'
            if (isSelected && blockMode) cellBg = 'bg-amber-500/20 border-amber-400/30'
            else if (isSelected) cellBg = 'bg-[#C8973A]/10'

            return (
              <div
                key={i}
                onClick={() => cell.date && handleDayClick(cell.date)}
                className={`border-b border-r border-white/5 min-h-[88px] p-1.5 cursor-pointer transition-colors relative
                  ${cellBg}
                  ${isSelected ? 'ring-1 ring-inset ring-[#C8973A]/40' : ''}
                  ${i % 7 === 6 ? 'border-r-0' : ''}`}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-[#C8973A] text-white' : 'text-gray-300'}`}>
                  {cell.day}
                </div>

                {isBlocked && (
                  <div className={`text-[10px] px-1.5 py-0.5 rounded border truncate mb-0.5 ${REASON_STYLES[blockInfo.reason] ?? 'bg-gray-700/40 border-gray-500/40 text-gray-300'}`}>
                    🚫 {blockInfo.reason}
                  </div>
                )}

                <div className="space-y-0.5">
                  {dayEvents.slice(0, isBlocked ? 1 : 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={`text-xs truncate px-1 rounded ${STATUS_COLORS[ev.status] ?? 'bg-gray-500'} bg-opacity-80`}
                    >
                      {ev.event_name}
                    </div>
                  ))}
                  {dayEvents.length > (isBlocked ? 1 : 3) && (
                    <div className="text-xs text-gray-400 pl-1">+{dayEvents.length - (isBlocked ? 1 : 3)} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-900/40 border border-red-400/40 inline-block" />
          Holiday
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-purple-900/40 border border-purple-400/40 inline-block" />
          Company Event
        </span>
      </div>

      {/* Day detail panel */}
      {selectedDay && !blockMode && (selectedEvents.length > 0 || selectedBlock) && (
        <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A]">{selectedDay}</h3>
            {selectedBlock && (
              <button
                onClick={() => unblock(selectedDay)}
                className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded px-2 py-0.5"
              >
                Unblock this date
              </button>
            )}
          </div>

          {selectedBlock && (
            <div className={`rounded-lg border px-3 py-2 text-sm ${REASON_STYLES[selectedBlock.reason] ?? ''}`}>
              <span className="font-medium">{selectedBlock.reason}</span>
              {selectedBlock.notes && <span className="ml-2 opacity-75">— {selectedBlock.notes}</span>}
            </div>
          )}

          {selectedEvents.length > 0 && (
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
          )}
        </div>
      )}

      {/* Selected day with no events but is blocked */}
      {selectedDay && !blockMode && !selectedBlock && selectedEvents.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-[#1F3348]/30 p-4 text-sm text-gray-400 text-center">
          No events on {selectedDay}
        </div>
      )}
    </div>
  )
}
