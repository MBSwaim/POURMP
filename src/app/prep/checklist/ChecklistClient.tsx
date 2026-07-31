'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Event, EventWithClient, EventPackageWithItems, EventTask } from '@/lib/db'
import { to12Hour } from '@/lib/timeUtils'
import { getTotalGuestCount } from '@/lib/calculations'

interface EventFull {
  event: Event
  details: { big_screen_tv?: number; guest_count?: number; bar_tab_type?: string; beo_notes?: string; kitchen_notes?: string } | null | undefined
  client: { first_name?: string; last_name?: string } | null | undefined
  packages?: EventPackageWithItems[]
}

// Display-only labels for this FOH-facing screen. Version 1 is Front of House
// only, so ownership is framed in FOH operational terms rather than by
// department — the underlying event_tasks.role values (and every other
// consumer of them, like the Kitchen Sheet) are unchanged; this map only
// affects what badge shows here.
const FOH_ROLE_LABELS: Record<string, string> = {
  Lead: 'Shift Lead',
  FOH: 'Event Team',
  Bar: 'Bar',
  Kitchen: 'Coordination',
}

// This screen covers Setup and Breakdown only — the same scope the legacy
// checklist covered. Dynamic tasks remain visible on the Event Workspace's
// Tasks tab for anyone who needs them.
const CHECKLIST_CATEGORIES = ['Setup', 'Breakdown'] as const

interface Props {
  events: EventWithClient[]
  initialEventId: string
  eventFull: EventFull | null
  initialTasks: EventTask[]
}

export function ChecklistClient({ events, initialEventId, eventFull: initialEventFull, initialTasks }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(initialEventId)
  const [eventFull, setEventFull] = useState<EventFull | null>(initialEventFull)
  const [tasks, setTasks] = useState<EventTask[]>(initialTasks)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetReason, setResetReason] = useState('')
  const [resetting, setResetting] = useState(false)

  const event = eventFull?.event
  const client = eventFull?.client
  const clientName = client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : null

  const visibleTasks = tasks.filter(t => (CHECKLIST_CATEGORIES as readonly string[]).includes(t.category))
  const totalCount = visibleTasks.length
  const doneCount = visibleTasks.filter(t => t.completed).length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const allDone = totalCount > 0 && doneCount === totalCount

  const groups = CHECKLIST_CATEGORIES.map(category => ({
    category,
    items: visibleTasks.filter(t => t.category === category),
  })).filter(g => g.items.length > 0)

  async function loadEvent(id: string) {
    setSelectedId(id)
    setTasks([])
    setEventFull(null)
    setResetOpen(false)
    if (!id) return
    router.push(`/prep/checklist?event=${id}`)
    const [evRes, taskRes] = await Promise.all([
      fetch(`/api/events/${id}`),
      fetch(`/api/events/${id}/tasks`),
    ])
    const evData = await evRes.json()
    const taskData = await taskRes.json()
    setEventFull(evData)
    setTasks(Array.isArray(taskData) ? taskData : [])
  }

  async function toggle(task: EventTask) {
    const next = !task.completed
    const completedAt = next ? new Date().toISOString() : null
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: next ? 1 : 0, completed_at: completedAt } : t))
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: next }),
    })
  }

  async function confirmReset() {
    if (!selectedId || !event) return
    if (resetConfirmText.trim().toLowerCase() !== event.event_name.trim().toLowerCase()) {
      toast.error('Type the event name exactly to confirm.')
      return
    }
    if (!resetReason.trim()) {
      toast.error('Your name and a reason are required to reset.')
      return
    }
    setResetting(true)
    await fetch(`/api/events/${selectedId}/tasks/reset`, { method: 'POST' })
    await fetch(`/api/communications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: Number(selectedId),
        activity_type: 'Internal Note',
        occurred_at: new Date().toISOString(),
        notes: `Event Setup checklist reset — ${resetReason.trim()}`,
      }),
    })
    setTasks(prev => prev.map(t =>
      (CHECKLIST_CATEGORIES as readonly string[]).includes(t.category) ? { ...t, completed: 0, completed_at: null } : t
    ))
    setResetting(false)
    setResetOpen(false)
    setResetConfirmText('')
    setResetReason('')
    toast.success('Checklist reset')
  }

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

          {/* Checklist groups */}
          {groups.map(({ category, items }) => (
            <div key={category}>
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-2">{category}</p>
              <div className="space-y-2">
                {items.map(task => {
                  const isChecked = !!task.completed
                  return (
                    <button
                      key={task.id}
                      onClick={() => toggle(task)}
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
                          {task.label}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">
                          {FOH_ROLE_LABELS[task.role] ?? task.role}
                        </p>
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

          {/* Leadership Actions */}
          <div className="pt-2 border-t border-gray-200">
            {!resetOpen ? (
              <div className="text-center pt-3">
                <button onClick={() => setResetOpen(true)} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                  Leadership: Reset this checklist
                </button>
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 space-y-2">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Reset Event Setup Checklist</p>
                <p className="text-xs text-red-700">
                  This is a Shift Lead / leadership action. Type the event name, then your name and reason, to confirm.
                </p>
                <input
                  value={resetConfirmText}
                  onChange={e => setResetConfirmText(e.target.value)}
                  placeholder={`Type "${event.event_name}" to confirm`}
                  className="w-full bg-white border border-red-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-400"
                />
                <textarea
                  value={resetReason}
                  onChange={e => setResetReason(e.target.value)}
                  placeholder="Your name and reason for resetting"
                  rows={2}
                  className="w-full bg-white border border-red-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setResetOpen(false); setResetConfirmText(''); setResetReason('') }}
                    className="text-xs text-gray-600 px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmReset}
                    disabled={resetting}
                    className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {resetting ? 'Resetting…' : 'Reset Checklist'}
                  </button>
                </div>
              </div>
            )}
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
