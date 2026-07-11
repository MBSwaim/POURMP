'use client'
import { useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { to12Hour } from '@/lib/timeUtils'
import { IMPACT_COLORS, type ImpactLevel } from '@/lib/barImpact'
import { readinessColor } from '@/lib/readiness'
import type { OperationalDashboard, OpsEventSummary } from '@/lib/db'

interface Props {
  data: OperationalDashboard
}

// Task Awareness color scale — deliberately separate from readinessColor() in lib/readiness.ts.
// Task completion (execution) and readiness score (planning/admin) are different metrics
// and must not share logic, even for display.
function taskCompletionColor(pct: number) {
  if (pct >= 90) return { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  }
  if (pct >= 50) return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' }
  return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
}

type SectionKey = 'thisWeek' | 'awaitingDeposit' | 'awaitingMenu' | 'awaitingInvoice' | 'highRisk' | 'highBarImpact' | 'needsAttention'

const SECTIONS: Array<{ key: SectionKey; label: string; hint: string; emptyText: string }> = [
  { key: 'thisWeek',       label: 'Events This Week',        hint: 'All events on the books this calendar week',              emptyText: 'No events scheduled this week.' },
  { key: 'awaitingDeposit',label: 'Awaiting Deposit',        hint: 'Confirmed events with no deposit marked received in Toast', emptyText: 'No confirmed events awaiting a deposit.' },
  { key: 'awaitingMenu',   label: 'Awaiting Menu',           hint: 'Booked events with no catering package selected yet',      emptyText: 'Every booked event has a menu selected.' },
  { key: 'awaitingInvoice',label: 'Awaiting Toast Invoice',  hint: 'Confirmed events with no invoice marked sent in Toast',    emptyText: 'No confirmed events awaiting an invoice.' },
  { key: 'highRisk',       label: 'High-Risk Events',        hint: `Booked events within 14 days scoring below 70% readiness`, emptyText: 'No high-risk events in the next 14 days.' },
  { key: 'highBarImpact',  label: 'High Bar Impact Events',  hint: 'Booked events with a High or Critical main bar impact level', emptyText: 'No upcoming High/Critical bar-impact events.' },
  { key: 'needsAttention', label: 'Needs Attention',         hint: 'Booked events within 24 hours with an execution gap — low task completion, setup incomplete, or a critical special requirement outstanding', emptyText: 'No events behind on task execution in the next 24 hours.' },
]

export function OperationsClient({ data }: Props) {
  const [expanded, setExpanded] = useState<Set<SectionKey>>(new Set<SectionKey>(['thisWeek', 'highRisk', 'highBarImpact']))

  function toggle(key: SectionKey) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function scrollTo(key: SectionKey) {
    setExpanded(prev => new Set(prev).add(key))
    document.getElementById(`ops-section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mb-1">
          Week of {format(parseISO(data.weekStart), 'MMM d')} – {format(parseISO(data.weekEnd), 'MMM d')}
        </p>
        <h1 className="text-xl font-bold tracking-widest uppercase text-gray-900 leading-none">Operations</h1>
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed max-w-2xl">
          Internal ops layer alongside Toast Catering &amp; Events — what needs attention this week. Not a payments or invoicing view; Toast remains the system of record.
        </p>
      </div>

      {/* Stat card grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="text-left rounded-xl bg-white border border-gray-200 border-l-2 border-l-[#C8973A] px-4 py-3.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 leading-tight mb-2">Awaiting Deposit</p>
          <p className="text-2xl font-bold leading-none text-gray-900 tabular-nums">{data.awaitingDeposit.length}</p>
        </div>
        <div className="text-left rounded-xl bg-white border border-gray-200 border-l-2 border-l-[#C8973A] px-4 py-3.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 leading-tight mb-2">Ready This Week</p>
          <p className="text-2xl font-bold leading-none text-gray-900 tabular-nums">{data.readyThisWeekCount}/{data.thisWeek.length}</p>
        </div>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => scrollTo(s.key)}
            className="text-left rounded-xl bg-white border border-gray-200 border-l-2 border-l-[#C8973A] px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 leading-tight mb-2">{s.label}</p>
            <p className="text-2xl font-bold leading-none text-gray-900 tabular-nums">{data[s.key].length}</p>
          </button>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map(s => (
          <Section
            key={s.key}
            id={`ops-section-${s.key}`}
            title={s.label}
            hint={s.hint}
            emptyText={s.emptyText}
            events={data[s.key]}
            isOpen={expanded.has(s.key)}
            onToggle={() => toggle(s.key)}
            showBarImpact={s.key === 'highBarImpact'}
            showReadiness={s.key === 'highRisk'}
            showTaskCompletion={s.key === 'needsAttention'}
          />
        ))}
      </div>
    </div>
  )
}

function Section({ id, title, hint, emptyText, events, isOpen, onToggle, showBarImpact, showReadiness, showTaskCompletion }: {
  id: string
  title: string
  hint: string
  emptyText: string
  events: OpsEventSummary[]
  isOpen: boolean
  onToggle: () => void
  showBarImpact?: boolean
  showReadiness?: boolean
  showTaskCompletion?: boolean
}) {
  return (
    <div id={id} className="rounded-xl bg-white border border-gray-200 overflow-hidden scroll-mt-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <div className="text-left">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-700">{title}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{hint}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-[#C8973A] tabular-nums">{events.length}</span>
          <span className={`text-[10px] text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
        </div>
      </button>

      {isOpen && (
        events.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500">{emptyText}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map(ev => {
              let d: Date | null = null
              try { d = parseISO(ev.event_date) } catch { /* */ }
              const impactColors = IMPACT_COLORS[ev.barImpactLevel as ImpactLevel]
              const readyColors = readinessColor(ev.readinessScore)
              const taskColors = taskCompletionColor(ev.taskCompletionPct)

              return (
                <div key={ev.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="shrink-0 w-10 text-center">
                    <p className="text-base font-bold text-gray-900 leading-none tabular-nums">{d ? format(d, 'd') : '—'}</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">{d ? format(d, 'MMM') : ''}</p>
                  </div>
                  <div className="w-px h-7 bg-gray-200 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/events/${ev.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#C8973A] truncate block transition-colors">
                      {ev.event_name}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {ev.client_name}{ev.event_time ? ` · ${to12Hour(ev.event_time)}` : ''}{ev.guest_count > 0 ? ` · ${ev.guest_count} guests` : ''}
                    </p>
                    {/* Task Awareness (execution) — always shown, kept visually separate from the readiness/status badge (planning) on the right */}
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
                      {ev.operationallyReady ? (
                        <span className="text-[9px] font-semibold text-green-400">✓ Operationally Ready</span>
                      ) : (
                        <>
                          <span className={`text-[9px] ${ev.setupReady ? 'text-green-400' : 'text-gray-500'}`}>
                            {ev.setupReady ? 'Setup Ready' : `Setup: ${ev.setupIncomplete} left`}
                          </span>
                          <span className="text-[9px] text-gray-600">·</span>
                          <span className={`text-[9px] ${ev.breakdownPending ? 'text-amber-400' : ev.breakdownIncomplete === 0 ? 'text-green-400' : 'text-gray-500'}`}>
                            {ev.breakdownPending
                              ? `Breakdown Pending (${ev.breakdownIncomplete})`
                              : ev.breakdownIncomplete === 0
                                ? 'Breakdown Done'
                                : `Breakdown: ${ev.breakdownIncomplete} scheduled`}
                          </span>
                          {ev.dynamicIncomplete > 0 && (
                            <>
                              <span className="text-[9px] text-gray-600">·</span>
                              <span className="text-[9px] text-gray-500">{ev.dynamicIncomplete} Special left</span>
                            </>
                          )}
                          <span className="text-[9px] text-gray-600">·</span>
                          <span className="text-[9px] text-gray-500 tabular-nums">{ev.taskCompletionPct}% tasks done</span>
                        </>
                      )}
                      {ev.needsAttention && (
                        <span className="text-[9px] font-bold text-red-400">⚠ Needs Attention</span>
                      )}
                    </p>
                  </div>
                  {showBarImpact && (
                    <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${impactColors.bg} ${impactColors.text} ${impactColors.border}`}>
                      {ev.barImpactLevel}
                    </span>
                  )}
                  {showReadiness && (
                    <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${readyColors.bg} ${readyColors.text} ${readyColors.border}`}>
                      {ev.readinessScore}% ready
                    </span>
                  )}
                  {showTaskCompletion && (
                    <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${taskColors.bg} ${taskColors.text} ${taskColors.border}`}>
                      {ev.taskCompletionPct}% tasks
                    </span>
                  )}
                  {!showBarImpact && !showReadiness && !showTaskCompletion && (
                    <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border bg-gray-50 text-gray-500 border-gray-200">
                      {ev.status}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
