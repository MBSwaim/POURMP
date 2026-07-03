'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { calcBarImpact, IMPACT_COLORS, type ImpactLevel } from '@/lib/barImpact'
import type { EventForNotes } from '@/lib/noteGenerators'
import type { DrinkTicketLog, EventTask } from '@/lib/db'

interface Props {
  ev: EventForNotes
  initialLog: DrinkTicketLog | null
  tasks?: EventTask[]
}

export function BarImpactTab({ ev, initialLog, tasks }: Props) {
  const impact = calcBarImpact(ev)
  const colors = IMPACT_COLORS[impact.level]
  const isTicketEvent = ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)'

  const [copied, setCopied] = useState(false)
  async function copyAlert() {
    await navigator.clipboard.writeText(impact.alertText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Bar alert copied to clipboard')
  }

  return (
    <div className="space-y-4">
      {/* Impact Level Banner */}
      <div className={`rounded-xl border px-5 py-4 ${colors.bg} ${colors.border}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-1">Main Bar Impact Level</p>
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full shrink-0 ${colors.dot}`} />
              <span className={`text-2xl font-bold tracking-wide ${colors.text}`}>{impact.level.toUpperCase()}</span>
              <span className="text-xs text-gray-500">(score: {impact.score})</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Contributing Factors</p>
            {impact.factors.map((f, i) => (
              <p key={i} className="text-xs text-gray-500">{f}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Two-col: Congestion Notes + Guest Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Congestion Notes */}
        <div className="rounded-xl bg-white border border-gray-200 p-4 space-y-3">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Bar Congestion Notes</p>
          <div className="space-y-2">
            {impact.congestionNotes.map((note, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="text-[#C8973A] shrink-0 mt-0.5">•</span>
                <p className="text-sm text-gray-700 leading-snug">{note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Guest Flow Notes */}
        <div className="rounded-xl bg-white border border-gray-200 p-4 space-y-3">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Guest Flow Notes</p>
          <div className="space-y-2">
            {impact.guestFlowNotes.map((note, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="text-[#C8973A] shrink-0 mt-0.5">•</span>
                <p className="text-sm text-gray-700 leading-snug">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Bar Event Alert */}
      <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
            Main Bar Event Alert — Copy for Taproom Lead
          </p>
          <button
            onClick={copyAlert}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              copied
                ? 'bg-green-700 text-white'
                : 'bg-[#C8973A] hover:bg-[#b07d2e] text-white'
            }`}
          >
            {copied ? '✓ Copied' : 'Copy Alert'}
          </button>
        </div>
        <pre className="p-4 text-xs text-gray-700 leading-relaxed font-mono whitespace-pre-wrap">
          {impact.alertText}
        </pre>
      </div>

      {/* Bar Tasks */}
      {tasks && (
        <div className="rounded-xl bg-white border border-gray-200 p-4 space-y-2">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Bar Tasks</p>
          {tasks.filter(t => t.role === 'Bar' && !t.completed).length === 0 ? (
            <p className="text-sm text-gray-500 italic">No open bar tasks.</p>
          ) : (
            <div className="space-y-1.5">
              {tasks.filter(t => t.role === 'Bar' && !t.completed).map(t => (
                <div key={t.id} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="w-4 h-4 mt-0.5 shrink-0 border border-gray-500 rounded-sm inline-block" />
                  {t.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drink Ticket Tracker — only for ticket events */}
      {isTicketEvent && (
        <TicketTracker ev={ev} initialLog={initialLog} />
      )}
    </div>
  )
}

// ─── Drink Ticket Efficiency Tracker ─────────────────────────────────────────

function TicketTracker({ ev, initialLog }: { ev: EventForNotes; initialLog: DrinkTicketLog | null }) {
  const [issued, setIssued] = useState(String(initialLog?.tickets_issued ?? ev.drink_tickets ?? ''))
  const [redeemed, setRedeemed] = useState(String(initialLog?.tickets_redeemed ?? ''))
  const [notes, setNotes] = useState(initialLog?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const issuedNum = parseInt(issued) || 0
  const redeemedNum = parseInt(redeemed) || 0
  const unused = issuedNum > 0 ? Math.max(0, issuedNum - redeemedNum) : 0
  const redemptionPct = issuedNum > 0 ? Math.round((redeemedNum / issuedNum) * 100) : 0

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${ev.id}/ticket-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets_issued: issuedNum, tickets_redeemed: redeemedNum, notes }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      toast.success('Ticket log saved')
    } catch {
      toast.error('Failed to save ticket log')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
          Drink Ticket Efficiency Tracker
        </p>
        {initialLog && (
          <span className="text-[10px] text-gray-500">Last saved: {new Date(initialLog.updated_at).toLocaleDateString()}</span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Input row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500">Tickets Issued</label>
            <input
              type="number" min="0"
              value={issued}
              onChange={e => setIssued(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C8973A]/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500">Tickets Redeemed</label>
            <input
              type="number" min="0"
              value={redeemed}
              onChange={e => setRedeemed(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C8973A]/50"
            />
          </div>
        </div>

        {/* Auto-calc stats */}
        {issuedNum > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <StatChip label="Unused" value={String(unused)} />
            <StatChip label="Redemption Rate" value={`${redemptionPct}%`} highlight={redemptionPct >= 80} />
            <StatChip label="Est. Ticket Revenue" value={`$${(redeemedNum * 9).toFixed(2)}`} />
          </div>
        )}

        {/* Recommendation based on redemption */}
        {issuedNum > 0 && redeemedNum > 0 && (
          <div className={`rounded-lg px-3 py-2 text-xs ${
            redemptionPct >= 90 ? 'bg-green-50 text-green-700 border border-green-200' :
            redemptionPct >= 70 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {redemptionPct >= 90 && `Strong redemption (${redemptionPct}%) — consider offering slightly more tickets per guest at future events of this size.`}
            {redemptionPct >= 70 && redemptionPct < 90 && `Good redemption rate (${redemptionPct}%) — ticket quantity was well-calibrated for this event.`}
            {redemptionPct < 70 && `Lower redemption (${redemptionPct}%) — ${unused} unused tickets. Consider fewer tickets per guest or a different beverage option next time.`}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-500">Notes for Future Recommendations</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Guests wanted more tickets, redemption happened in first 20 min..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-600 focus:outline-none focus:border-[#C8973A]/50 resize-none"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            saved
              ? 'bg-green-700 text-white'
              : 'bg-[#C8973A] hover:bg-[#b07d2e] text-white disabled:opacity-50'
          }`}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Tracker'}
        </button>
      </div>
    </div>
  )
}

function StatChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">{label}</p>
      <p className={`text-lg font-bold leading-none ${highlight ? 'text-[#C8973A]' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
