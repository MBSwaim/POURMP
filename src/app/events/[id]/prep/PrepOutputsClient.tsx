'use client'
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { generateToastNotes, generatePreShiftBrief, type EventForNotes } from '@/lib/noteGenerators'
import { PrintStyles, RunOfShowDoc, KitchenSheetDoc, FOHNotesDoc, BarNotesDoc, SetupChecklistDoc, LeadsPackDoc } from './PrintableDoc'
import { BarImpactTab } from './BarImpactTab'
import { DebriefTab } from './DebriefTab'
import { to12Hour } from '@/lib/timeUtils'
import type { DrinkTicketLog, EventDebrief, EventTask } from '@/lib/db'
import type { RiskFlag } from '@/lib/riskScanner'
import type { ClientHistoryEntry } from '@/lib/prepOutputsData'

const TABS = [
  { key: 'toast',    label: 'Toast Notes',    icon: '📋', printable: false },
  { key: 'brief',    label: 'Pre-Shift Brief',icon: '🗓️', printable: false },
  { key: 'impact',   label: 'Main Bar Impact',icon: '🍺', printable: false },
  { key: 'ros',      label: 'Run of Show',    icon: '🕐', printable: true  },
  { key: 'kitchen',  label: 'Kitchen Sheet',  icon: '🍳', printable: true  },
  { key: 'foh',      label: 'FOH Notes',      icon: '🪑', printable: true  },
  { key: 'bar',      label: 'Bar Notes',      icon: '📌', printable: true  },
  { key: 'leads',    label: 'Leads Pack',     icon: '🗝️', printable: true  },
  { key: 'handoff',  label: 'Handoff Pack',   icon: '📦', printable: false },
  { key: 'setup',    label: 'Setup Checklist',icon: '✅', printable: true  },
  { key: 'debrief',  label: 'Debrief',        icon: '📝', printable: false },
] as const

type TabKey = typeof TABS[number]['key']

interface Props {
  ev: EventForNotes
  initialTicketLog: DrinkTicketLog | null
  initialDebrief: EventDebrief | null
  clientHistory: ClientHistoryEntry[]
  tasks: EventTask[]
  risks: RiskFlag[]
}

export function PrepOutputsClient({ ev, initialTicketLog, initialDebrief, clientHistory, tasks, risks }: Props) {
  const [active, setActive] = useState<TabKey>('toast')
  const activeTab = TABS.find(t => t.key === active)!

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(generateToastNotes(ev, tasks))
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Copy failed — try selecting the text manually')
    }
  }

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(generatePreShiftBrief(ev, tasks, risks))
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Copy failed — try selecting the text manually')
    }
  }

  return (
    <>
      <PrintStyles />

      <div className="p-4 max-w-4xl mx-auto space-y-4 no-print">
        {/* Breadcrumb */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link href={`/events/${ev.id}`} className="hover:text-[#C8973A] transition-colors">
                ← {ev.event_name}
              </Link>
              <span>/</span>
              <span className="text-gray-500">Prep Outputs</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">{ev.event_name}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {ev.event_date} · {to12Hour(ev.event_time)} – {to12Hour(ev.teardown_time)} · {ev.space || '—'}
            </p>
          </div>
          <span className="shrink-0 text-[10px] tracking-widest uppercase text-gray-500 border border-gray-200 rounded px-2 py-1">
            Internal · Pre-Toast
          </span>
        </div>

        {/* Tabs — horizontal scroll on mobile, wrap on desktop */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] shrink-0 whitespace-nowrap rounded-lg text-sm md:text-xs font-medium transition-colors ${
                active === tab.key
                  ? 'bg-[#C8973A] text-white'
                  : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toast Notes ── */}
      {active === 'toast' && (
        <div className="max-w-4xl mx-auto px-4 no-print">
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-xs font-bold tracking-widest uppercase text-gray-500">
                📋 Toast Notes — Copy &amp; Paste
              </p>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C8973A] hover:bg-[#b07d2e] text-white text-xs font-semibold transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
            <pre className="p-4 text-xs text-gray-700 leading-relaxed font-mono whitespace-pre-wrap overflow-x-auto">
              {generateToastNotes(ev, tasks)}
            </pre>
          </div>
        </div>
      )}

      {/* ── Pre-Shift Brief ── */}
      {active === 'brief' && (
        <div className="max-w-4xl mx-auto px-4 no-print">
          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-xs font-bold tracking-widest uppercase text-gray-500">
                🗓️ Pre-Shift Brief — Copy &amp; Paste
              </p>
              <button
                onClick={copyBrief}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C8973A] hover:bg-[#b07d2e] text-white text-xs font-semibold transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
            <pre className="p-4 text-xs text-gray-700 leading-relaxed font-mono whitespace-pre-wrap overflow-x-auto">
              {generatePreShiftBrief(ev, tasks, risks)}
            </pre>
          </div>
        </div>
      )}

      {/* ── Main Bar Impact ── */}
      {active === 'impact' && (
        <div className="max-w-4xl mx-auto px-4 no-print">
          <BarImpactTab ev={ev} initialLog={initialTicketLog} tasks={tasks} />
        </div>
      )}

      {/* ── Debrief ── */}
      {active === 'debrief' && (
        <div className="max-w-4xl mx-auto px-4 no-print">
          <DebriefTab ev={ev} initialDebrief={initialDebrief} clientHistory={clientHistory} />
        </div>
      )}

      {/* ── Handoff Pack: all four role docs in one print job ── */}
      {active === 'handoff' && (
        <div className="max-w-4xl mx-auto px-4 space-y-3">
          <div className="flex items-center justify-between no-print">
            <p className="text-xs text-gray-500">
              Complete internal handoff — Kitchen, FOH, Bar, and Leads in one document. Each section prints on its own page.
            </p>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400 text-xs font-medium transition-colors shrink-0"
            >
              🖨 Print Full Handoff Pack
            </button>
          </div>
          <div className="print-page-break"><LeadsPackDoc ev={ev} tasks={tasks} risks={risks} clientHistory={clientHistory} /></div>
          <div className="print-page-break"><KitchenSheetDoc ev={ev} tasks={tasks} /></div>
          <div className="print-page-break"><FOHNotesDoc ev={ev} tasks={tasks} /></div>
          <BarNotesDoc ev={ev} tasks={tasks} />
        </div>
      )}

      {/* ── Printable docs ── */}
      {activeTab.printable && (
        <div className="max-w-4xl mx-auto px-4 space-y-3">
          <div className="flex justify-end no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400 text-xs font-medium transition-colors"
            >
              🖨 Print / Save as PDF
            </button>
          </div>
          {active === 'ros'     && <RunOfShowDoc ev={ev} tasks={tasks} />}
          {active === 'kitchen' && <KitchenSheetDoc ev={ev} tasks={tasks} />}
          {active === 'foh'     && <FOHNotesDoc ev={ev} tasks={tasks} />}
          {active === 'bar'     && <BarNotesDoc ev={ev} tasks={tasks} />}
          {active === 'leads'   && <LeadsPackDoc ev={ev} tasks={tasks} risks={risks} clientHistory={clientHistory} />}
          {active === 'setup'   && <SetupChecklistDoc ev={ev} tasks={tasks} />}
        </div>
      )}
    </>
  )
}
