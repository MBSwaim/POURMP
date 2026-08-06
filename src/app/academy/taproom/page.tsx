import Link from 'next/link'
import { ShiftProgressTrack } from '../_components/ShiftProgressTrack'
import { TAPROOM_SHIFTS, FUTURE_SPECIALTY_TRAINING, getCurrentShift } from './placeholderData'

export const dynamic = 'force-dynamic'

export default function TaproomAcademyPage() {
  const current = getCurrentShift()
  const doneCount = current.lessons.filter(l => l.state === 'complete').length

  return (
    <div className="px-4 py-5 space-y-6 max-w-3xl mx-auto">
      <div>
        <p className="text-[10px] text-[#999] tracking-[0.2em] uppercase mb-1">Learning · Taproom Academy</p>
        <h1 className="text-xl font-bold tracking-widest uppercase leading-none text-[#1b1b1b]">Taproom Academy</h1>
        <p className="mt-1.5 text-sm text-[#777] leading-relaxed">
          A guided training journey for new taproom team members — five core shifts, with room to extend.
        </p>
      </div>

      {/* Where you are */}
      <div className="rounded-2xl border border-[#b07d2e]/40 bg-[#fffdf8] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#b07d2e]">You are currently on</p>
          <p className="text-lg font-semibold text-[#1b1b1b] mt-0.5">
            Shift {current.number}: {current.title}
          </p>
          <p className="text-xs text-[#777] mt-1">
            {doneCount}/{current.lessons.length} lessons complete this shift
          </p>
        </div>
        <Link
          href="/academy/taproom/1"
          className="shrink-0 inline-flex items-center justify-center rounded-full bg-[#111] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 hover:bg-[#1b1b1b] transition-colors"
        >
          Continue Training →
        </Link>
      </div>

      {/* Shift progression */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">Training Progression</p>
        <ShiftProgressTrack shifts={TAPROOM_SHIFTS} currentShiftNumber={current.number} />
      </div>

      {/* Future specialty training — labeled only, not functional */}
      <div className="rounded-2xl border border-dashed border-[#d7d0c5] bg-[#fffdf8]/60 px-5 py-4">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999] mb-2">Specialty Training — Coming Later</p>
        <div className="flex flex-wrap gap-2">
          {FUTURE_SPECIALTY_TRAINING.map(t => (
            <span
              key={t}
              className="text-xs font-medium text-[#777] border border-[#e8e2d7] rounded-full px-3 py-1"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
