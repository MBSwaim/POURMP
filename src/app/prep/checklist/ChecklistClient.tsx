'use client'
import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Event, EventWithClient, EventPackageWithItems } from '@/lib/db'
import { to12Hour } from '@/lib/timeUtils'
import { getTotalGuestCount } from '@/lib/calculations'

interface EventFull {
  event: Event
  details: { big_screen_tv?: number; guest_count?: number; bar_tab_type?: string; beo_notes?: string; kitchen_notes?: string } | null | undefined
  client: { first_name?: string; last_name?: string } | null | undefined
  packages?: EventPackageWithItems[]
}

const CHECKLIST_ITEMS = [
  { key: 'tablecloths',   phase: 'Setup',    label: 'Cover all tables with black tablecloths',               note: 'Check BEO for any exemptions' },
  { key: 'menus',         phase: 'Setup',    label: 'Beer list & wine list on every table',                  note: 'For guests to review before ordering' },
  { key: 'ropes',         phase: 'Setup',    label: 'Black velvet ropes at all marked positions',            note: null },
  { key: 'lights_music',  phase: 'Setup',    label: 'Lights dimmed · Music on Source 2, volume ≥ 90',        note: null },
  { key: 'garage_door',   phase: 'Setup',    label: 'Garage door: open only if weather 65°–75°',             note: 'One warning for chain misuse, then close' },
  { key: 'tv',            phase: 'Setup',    label: 'Big Screen TV set up and tested',                       note: null, requiresTv: true },
  { key: 'buffet_hot',    phase: 'Kitchen',  label: 'All food set, hot, and ready 15 min before event start', note: null },
  { key: 'buffet_equip',  phase: 'Kitchen',  label: 'All servingware, utensils & sauces in place',           note: null },
  { key: 'linens_wash',   phase: 'Teardown', label: 'Start linens in washing machine immediately',           note: 'Do not wait — do it as soon as event ends' },
]

const PHASE_ORDER = ['Setup', 'Kitchen', 'Teardown']

interface Props {
  events: EventWithClient[]
  initialEventId: string
  eventFull: EventFull | null
  initialChecked: Record<string, string | null>
}

export function ChecklistClient({ events, initialEventId, eventFull: initialEventFull, initialChecked }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(initialEventId)
  const [eventFull, setEventFull] = useState<EventFull | null>(initialEventFull)
  const [checked, setChecked] = useState<Record<string, string | null>>(initialChecked)
  const [, startTransition] = useTransition()

  const hasTv = !!(eventFull?.details?.big_screen_tv)
  const visibleItems = CHECKLIST_ITEMS.filter(item => !item.requiresTv || hasTv)

  const totalCount = visibleItems.length
  const doneCount = visibleItems.filter(item => checked[item.key] != null).length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const allDone = doneCount === totalCount

  async function loadEvent(id: string) {
    setSelectedId(id)
    setChecked({})
    setEventFull(null)
    if (!id) return
    router.push(`/prep/checklist?event=${id}`)
    const [evRes, clRes] = await Promise.all([
      fetch(`/api/events/${id}`),
      fetch(`/api/checklist/${id}`),
    ])
    const evData = await evRes.json()
    const clData = await clRes.json()
    setEventFull(evData)
    setChecked(clData.checked ?? {})
  }

  async function toggle(itemKey: string) {
    if (!selectedId) return
    const isChecked = checked[itemKey] != null
    const newChecked = { ...checked }
    if (isChecked) {
      delete newChecked[itemKey]
    } else {
      newChecked[itemKey] = new Date().toISOString()
    }
    setChecked(newChecked)
    startTransition(() => {})
    await fetch(`/api/checklist/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_key: itemKey, checked: !isChecked }),
    })
  }

  async function resetAll() {
    if (!selectedId || !confirm('Reset all checklist items for this event?')) return
    await fetch(`/api/checklist/${selectedId}`, { method: 'DELETE' })
    setChecked({})
  }

  const event = eventFull?.event
  const client = eventFull?.client
  const clientName = client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : null

  const phases = PHASE_ORDER.map(phase => ({
    phase,
    items: visibleItems.filter(i => i.phase === phase),
  })).filter(g => g.items.length > 0)

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[#C8973A] tracking-widest uppercase">Setup Checklist</h1>
        <p className="text-xs text-gray-500 mt-0.5">Tap each item to check it off</p>
      </div>

      {/* Event selector */}
      <select
        value={selectedId}
        onChange={e => loadEvent(e.target.value)}
        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
      >
        <option value="">— Select an event —</option>
        {events.map(e => (
          <option key={e.id} value={String(e.id)}>
            {e.event_date} · {e.event_name}
            {e.first_name ? ` (${e.first_name} ${e.last_name})` : ''}
          </option>
        ))}
      </select>

      {selectedId && event && (
        <>
          {/* Event summary */}
          <div className="rounded-xl bg-white border border-gray-200 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{event.event_name}</p>
                {clientName && <p className="text-xs text-[#C8973A] mt-0.5">{clientName}</p>}
              </div>
              <div className="text-right text-xs text-gray-500 shrink-0">
                {event.event_time && (
                  <p className="font-semibold text-gray-900">{to12Hour(event.event_time)}</p>
                )}
                {(() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const totalGuestCount = getTotalGuestCount((eventFull?.packages ?? []) as any, eventFull?.details?.guest_count ?? 0)
                  return totalGuestCount > 0 ? <p>{totalGuestCount} guests</p> : null
                })()}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className={`font-semibold ${allDone ? 'text-green-400' : 'text-gray-700'}`}>
                {allDone ? '✓ All done!' : `${doneCount} / ${totalCount} complete`}
              </span>
              <span className={`font-bold tabular-nums ${allDone ? 'text-green-400' : 'text-[#C8973A]'}`}>
                {pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${allDone ? 'bg-green-500' : 'bg-[#C8973A]'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Checklist phases */}
          {phases.map(({ phase, items }) => (
            <div key={phase}>
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-2">{phase}</p>
              <div className="space-y-2">
                {items.map(item => {
                  const isChecked = checked[item.key] != null
                  return (
                    <button
                      key={item.key}
                      onClick={() => toggle(item.key)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-4 rounded-xl border transition-all active:scale-[0.98]
                        ${isChecked
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300'
                        }`}
                    >
                      {/* Checkbox circle */}
                      <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                        ${isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                      >
                        {isChecked && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug ${isChecked ? 'line-through opacity-60' : ''}`}>
                          {item.label}
                        </p>
                        {item.note && !isChecked && (
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.note}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* BEO / Kitchen notes */}
          {(eventFull?.details?.beo_notes || eventFull?.details?.kitchen_notes) && (
            <div className="space-y-3">
              {eventFull.details?.beo_notes && (
                <div className="rounded-xl bg-white border border-gray-200 px-4 py-3">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-[#C8973A] mb-1">BEO Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{eventFull.details.beo_notes}</p>
                </div>
              )}
              {eventFull.details?.kitchen_notes && (
                <div className="rounded-xl bg-white border border-gray-200 px-4 py-3">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-[#C8973A] mb-1">Kitchen Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{eventFull.details.kitchen_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Reset */}
          <div className="text-center pt-2">
            <button onClick={resetAll} className="text-xs text-gray-600 hover:text-gray-500 transition-colors">
              Reset checklist
            </button>
          </div>
        </>
      )}

      {selectedId && !event && (
        <div className="text-center py-10 text-gray-500 text-sm">Loading…</div>
      )}

      {!selectedId && (
        <div className="text-center py-10 text-gray-500 text-sm italic">Select an event to begin</div>
      )}
    </div>
  )
}
