'use client'
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { generateToastNotes, type EventForNotes } from '@/lib/noteGenerators'
import { PrintStyles, RunOfShowDoc, KitchenSheetDoc, FOHNotesDoc, BarNotesDoc, SetupChecklistDoc } from './PrintableDoc'
import { BarImpactTab } from './BarImpactTab'
import { to12Hour } from '@/lib/timeUtils'
import type { DrinkTicketLog } from '@/lib/db'

const TABS = [
  { key: 'toast',   label: 'Toast Notes',    icon: '📋', printable: false },
  { key: 'impact',  label: 'Bar Impact',     icon: '🍺', printable: false },
  { key: 'ros',     label: 'Run of Show',    icon: '🕐', printable: true  },
  { key: 'kitchen', label: 'Kitchen Sheet',  icon: '🍳', printable: true  },
  { key: 'foh',     label: 'FOH Notes',      icon: '🪑', printable: true  },
  { key: 'bar',     label: 'Bar Notes',      icon: '📌', printable: true  },
  { key: 'setup',   label: 'Setup Checklist',icon: '✅', printable: true  },
] as const

type TabKey = typeof TABS[number]['key']

interface Props {
  ev: EventForNotes
  initialTicketLog: DrinkTicketLog | null
}

export function PrepOutputsClient({ ev, initialTicketLog }: Props) {
  const [active, setActive] = useState<TabKey>('toast')
  const activeTab = TABS.find(t => t.key === active)!

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(generateToastNotes(ev))
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
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Link href={`/events/${ev.id}`} className="hover:text-[#C8973A] transition-colors">
                ← {ev.event_name}
              </Link>
              <span>/</span>
              <span className="text-gray-500">Prep Outputs</span>
            </div>
            <h1 className="text-lg font-bold text-white">{ev.event_name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {ev.event_date} · {to12Hour(ev.event_time)} – {to12Hour(ev.teardown_time)} · {ev.space || '—'}
            </p>
          </div>
          <span className="shrink-0 text-[10px] tracking-widest uppercase text-gray-500 border border-white/10 rounded px-2 py-1">
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
                  : 'bg-[#1F3348] border border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
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
          <div className="rounded-xl bg-[#1F3348] border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-xs font-bold tracking-widest uppercase text-gray-400">
                📋 Toast Notes — Copy &amp; Paste
              </p>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C8973A] hover:bg-[#b07d2e] text-white text-xs font-semibold transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
            <pre className="p-4 text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap overflow-x-auto">
              {generateToastNotes(ev)}
            </pre>
          </div>
        </div>
      )}

      {/* ── Bar Impact ── */}
      {active === 'impact' && (
        <div className="max-w-4xl mx-auto px-4 no-print">
          <BarImpactTab ev={ev} initialLog={initialTicketLog} />
        </div>
      )}

      {/* ── Printable docs ── */}
      {activeTab.printable && (
        <div className="max-w-4xl mx-auto px-4 space-y-3">
          <div className="flex justify-end no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1F3348] border border-white/15 text-gray-300 hover:text-white hover:border-white/30 text-xs font-medium transition-colors"
            >
              🖨 Print / Save as PDF
            </button>
          </div>
          {active === 'ros'     && <RunOfShowDoc ev={ev} />}
          {active === 'kitchen' && <KitchenSheetDoc ev={ev} />}
          {active === 'foh'     && <FOHNotesDoc ev={ev} />}
          {active === 'bar'     && <BarNotesDoc ev={ev} />}
          {active === 'setup'   && <SetupChecklistDoc ev={ev} />}
        </div>
      )}
    </>
  )
}
