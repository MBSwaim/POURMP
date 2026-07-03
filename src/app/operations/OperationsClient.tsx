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

type SectionKey = 'thisWeek' | 'awaitingDeposit' | 'awaitingMenu' | 'awaitingInvoice' | 'highRisk' | 'highBarImpact'

const SECTIONS: Array<{ key: SectionKey; label: string; hint: string; emptyText: string }> = [
  { key: 'thisWeek',       label: 'Events This Week',        hint: 'All events on the books this calendar week',              emptyText: 'No events scheduled this week.' },
  { key: 'awaitingDeposit',label: 'Awaiting Deposit',        hint: 'Confirmed events with no deposit marked received in Toast', emptyText: 'No confirmed events awaiting a deposit.' },
  { key: 'awaitingMenu',   label: 'Awaiting Menu',           hint: 'Booked events with no catering package selected yet',      emptyText: 'Every booked event has a menu selected.' },
  { key: 'awaitingInvoice',label: 'Awaiting Toast Invoice',  hint: 'Confirmed events with no invoice marked sent in Toast',    emptyText: 'No confirmed events awaiting an invoice.' },
  { key: 'highRisk',       label: 'High-Risk Events',        hint: `Booked events within 14 days scoring below 70% readiness`, emptyText: 'No high-risk events in the next 14 days.' },
  { key: 'highBarImpact',  label: 'High Bar Impact Events',  hint: 'Booked events with a High or Critical main bar impact level', emptyText: 'No upcoming High/Critical bar-impact events.' },
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
        <h1 className="text-xl font-bold tracking-widest uppercase text-white leading-none">Operations</h1>
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed max-w-2xl">
          Internal ops layer alongside Toast Catering &amp; Events — what needs attention this week. Not a payments or invoicing view; Toast remains the system of record.
        </p>
      </div>

      {/* Stat card grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => scrollTo(s.key)}
            className="text-left rounded-xl bg-[#1F3348] border border-white/10 border-l-2 border-l-[#C8973A] px-4 py-3.5 hover:bg-white/[0.04] transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 leading-tight mb-2">{s.label}</p>
            <p className="text-2xl font-bold leading-none text-white tabular-nums">{data[s.key].length}</p>
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
          />
        ))}
      </div>
    </div>
  )
}

function Section({ id, title, hint, emptyText, events, isOpen, onToggle, showBarImpact, showReadiness }: {
  id: string
  title: string
  hint: string
  emptyText: string
  events: OpsEventSummary[]
  isOpen: boolean
  onToggle: () => void
  showBarImpact?: boolean
  showReadiness?: boolean
}) {
  return (
    <div id={id} className="rounded-xl bg-[#1F3348] border border-white/10 overflow-hidden scroll-mt-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-white/8 hover:bg-white/[0.02] transition-colors"
      >
        <div className="text-left">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-300">{title}</p>
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
          <div className="divide-y divide-white/5">
            {events.map(ev => {
              let d: Date | null = null
              try { d = parseISO(ev.event_date) } catch { /* */ }
              const impactColors = IMPACT_COLORS[ev.barImpactLevel as ImpactLevel]
              const readyColors = readinessColor(ev.readinessScore)

              return (
                <div key={ev.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                  <div className="shrink-0 w-10 text-center">
                    <p className="text-base font-bold text-white leading-none tabular-nums">{d ? format(d, 'd') : '—'}</p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">{d ? format(d, 'MMM') : ''}</p>
                  </div>
                  <div className="w-px h-7 bg-white/8 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/events/${ev.id}`} className="text-sm font-semibold text-white hover:text-[#C8973A] truncate block transition-colors">
                      {ev.event_name}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {ev.client_name}{ev.event_time ? ` · ${to12Hour(ev.event_time)}` : ''}{ev.guest_count > 0 ? ` · ${ev.guest_count} guests` : ''}
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
                  {!showBarImpact && !showReadiness && (
                    <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border bg-white/5 text-gray-400 border-white/10">
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
