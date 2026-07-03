'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { calcBarImpact } from '@/lib/barImpact'
import type { EventForNotes } from '@/lib/noteGenerators'
import type { EventDebrief } from '@/lib/db'

interface ClientHistoryEntry {
  id: number; event_name: string; event_date: string; actual_guest_count: number | null
  went_well: string; issues: string; catering_accuracy: string; bar_impact_accuracy: string
  would_repeat_client: string; recommendations: string
}

interface Props {
  ev: EventForNotes
  initialDebrief: EventDebrief | null
  clientHistory: ClientHistoryEntry[]
}

const CATERING_OPTIONS = ['', 'Too Much', 'Just Right', 'Not Enough']
const BAR_IMPACT_OPTIONS = ['', 'Busier Than Predicted', 'As Predicted', 'Quieter Than Predicted']
const REPEAT_OPTIONS = ['', 'Yes', 'Maybe', 'No']

export function DebriefTab({ ev, initialDebrief, clientHistory }: Props) {
  const predictedImpact = calcBarImpact(ev).level

  const [actualGuestCount, setActualGuestCount] = useState(String(initialDebrief?.actual_guest_count ?? ''))
  const [wentWell, setWentWell] = useState(initialDebrief?.went_well ?? '')
  const [issues, setIssues] = useState(initialDebrief?.issues ?? '')
  const [cateringAccuracy, setCateringAccuracy] = useState(initialDebrief?.catering_accuracy ?? '')
  const [barImpactAccuracy, setBarImpactAccuracy] = useState(initialDebrief?.bar_impact_accuracy ?? '')
  const [staffingNotes, setStaffingNotes] = useState(initialDebrief?.staffing_notes ?? '')
  const [wouldRepeat, setWouldRepeat] = useState(initialDebrief?.would_repeat_client ?? '')
  const [recommendations, setRecommendations] = useState(initialDebrief?.recommendations ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const guestDelta = actualGuestCount && ev.guest_count > 0
    ? Number(actualGuestCount) - ev.guest_count
    : null

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${ev.id}/debrief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_guest_count: actualGuestCount ? Number(actualGuestCount) : null,
          went_well: wentWell,
          issues,
          catering_accuracy: cateringAccuracy,
          bar_impact_accuracy: barImpactAccuracy,
          staffing_notes: staffingNotes,
          would_repeat_client: wouldRepeat,
          recommendations,
        }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      toast.success('Debrief saved')
    } catch {
      toast.error('Failed to save debrief')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white border border-gray-200 p-4">
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-1">Post-Event Debrief</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Internal review for repeat-event intelligence — capture what happened so the next similar event benefits. Not visible to the client.
        </p>
      </div>

      {clientHistory.length > 0 && (
        <div className="rounded-xl bg-white border border-[#C8973A]/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-[10px] font-bold tracking-widest uppercase text-[#C8973A]">
              Repeat Client — {clientHistory.length} Past Debrief{clientHistory.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {clientHistory.map(h => (
              <div key={h.id} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{h.event_name}</p>
                  <p className="text-xs text-gray-500">{h.event_date}</p>
                </div>
                {h.recommendations && <p className="text-xs text-gray-700"><span className="text-gray-500">Recommended:</span> {h.recommendations}</p>}
                {h.issues && <p className="text-xs text-gray-700"><span className="text-gray-500">Issues:</span> {h.issues}</p>}
                {h.would_repeat_client && <p className="text-xs text-gray-700"><span className="text-gray-500">Would repeat:</span> {h.would_repeat_client}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500">Planned Guest Count</label>
            <p className="text-sm text-gray-700 py-2">{ev.guest_count > 0 ? ev.guest_count : '—'}</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500">Actual Guest Count</label>
            <input
              type="number" min="0"
              value={actualGuestCount}
              onChange={e => setActualGuestCount(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C8973A]/50"
            />
          </div>
        </div>
        {guestDelta !== null && guestDelta !== 0 && (
          <p className="text-xs text-gray-500">
            {guestDelta > 0 ? `${guestDelta} more guests than planned` : `${Math.abs(guestDelta)} fewer guests than planned`}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500">Predicted Bar Impact</label>
            <p className="text-sm text-gray-700 py-2">{predictedImpact}</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500">Actual Bar Impact</label>
            <select
              value={barImpactAccuracy}
              onChange={e => setBarImpactAccuracy(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C8973A]/50"
            >
              {BAR_IMPACT_OPTIONS.map(o => <option key={o} value={o}>{o || 'Select…'}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-500">Catering Accuracy</label>
          <select
            value={cateringAccuracy}
            onChange={e => setCateringAccuracy(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C8973A]/50"
          >
            {CATERING_OPTIONS.map(o => <option key={o} value={o}>{o || 'Select…'}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-500">What Went Well</label>
          <textarea
            rows={2}
            value={wentWell}
            onChange={e => setWentWell(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#C8973A]/50 resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-500">Issues / What Didn&apos;t Go Well</label>
          <textarea
            rows={2}
            value={issues}
            onChange={e => setIssues(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#C8973A]/50 resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-500">Staffing Notes</label>
          <textarea
            rows={2}
            value={staffingNotes}
            onChange={e => setStaffingNotes(e.target.value)}
            placeholder="Coverage, floor staff, coordinator notes…"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-600 focus:outline-none focus:border-[#C8973A]/50 resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-500">Would Repeat This Client / Event Type</label>
          <select
            value={wouldRepeat}
            onChange={e => setWouldRepeat(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C8973A]/50"
          >
            {REPEAT_OPTIONS.map(o => <option key={o} value={o}>{o || 'Select…'}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-500">Recommendations for Next Time</label>
          <textarea
            rows={2}
            value={recommendations}
            onChange={e => setRecommendations(e.target.value)}
            placeholder="e.g. Order fewer sliders, add a second staging table…"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-600 focus:outline-none focus:border-[#C8973A]/50 resize-none"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            saved ? 'bg-green-700 text-white' : 'bg-[#C8973A] hover:bg-[#b07d2e] text-white disabled:opacity-50'
          }`}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Debrief'}
        </button>
      </div>
    </div>
  )
}
