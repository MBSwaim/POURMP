import Link from 'next/link'
import { JourneyCard } from '@/components/library/JourneyCard'
import { ShiftProgressTrack } from '../_components/ShiftProgressTrack'
import {
  TAPROOM_SHIFTS,
  FUTURE_CERTIFICATIONS,
  FUTURE_SPECIALTY_TRAINING,
  getCurrentShift,
} from './placeholderData'

export const dynamic = 'force-dynamic'

export default function TaproomAcademyPage() {
  const current = getCurrentShift()

  return (
    <div className="px-4 py-5 space-y-6 max-w-3xl mx-auto">
      <div>
        <p className="text-[10px] text-[#999] tracking-[0.2em] uppercase mb-1">Learning · Taproom Academy</p>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-bold tracking-widest uppercase leading-none text-[#1b1b1b]">Taproom Academy</h1>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-[#111] text-white rounded-full px-2.5 py-1">
            Core Certification
          </span>
        </div>
        <p className="mt-1.5 text-sm text-[#777] leading-relaxed">
          A five-shift journey built around confidence, not departments or checklists — each shift moves you closer
          to running a standard taproom shift on your own.
        </p>
      </div>

      {/* Graduation outcome */}
      <div className="rounded-2xl border border-[#e8e2d7] bg-[#fffdf8] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-1.5">Graduation Outcome</p>
        <p className="text-sm text-[#1b1b1b] leading-relaxed">
          At the completion of Core Certification, a team member should be able to independently work a standard
          Manhattan Project taproom shift while consistently delivering our operational standards and guest experience.
        </p>
      </div>

      {/* Where you are — C-001 Journey Card, replacing the old inline prototype */}
      <JourneyCard
        journeyTitle="Taproom Core Certification"
        state="active"
        currentPosition={`Shift ${current.number} of ${TAPROOM_SHIFTS.length}: ${current.title}`}
        currentStep={current.number}
        totalSteps={TAPROOM_SHIFTS.length}
        currentMilestone={current.confidenceStatement}
        todaysFocus={current.todaysFocus}
        coachingMessage={current.coachingMessage}
        primaryActionHref="/academy/taproom/1"
      />

      {/* Shift progression */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">Training Progression</p>
        <ShiftProgressTrack shifts={TAPROOM_SHIFTS} currentShiftNumber={current.number} />
      </div>

      {/* Trainer partnership */}
      <div className="rounded-2xl border border-[#e8e2d7] bg-[#fffdf8] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-1.5">Trainer Partnership</p>
        <p className="text-sm text-[#777] leading-relaxed">
          You&apos;re not learning alone. A trainer will observe your work, coach you in the moment, and confirm
          you&apos;re ready before you move forward. Lessons that need trainer verification are marked clearly —
          everything else, you can move through at your own pace.
        </p>
      </div>

      {/* What comes next — separate, locked future paths */}
      <div className="rounded-2xl border border-dashed border-[#d7d0c5] bg-[#fffdf8]/60 px-5 py-4">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999] mb-2">
          What Comes Next — Unlocks After Core Certification
        </p>
        <div className="flex flex-wrap gap-2">
          {FUTURE_CERTIFICATIONS.map(cert => (
            <Link
              key={cert.shiftNumber}
              href={`/academy/taproom/${cert.shiftNumber}`}
              className="text-xs font-semibold text-[#777] hover:text-[#1b1b1b] border border-dashed border-[#d7d0c5] rounded-full px-3 py-1.5 transition-colors"
            >
              🔒 {cert.name}
            </Link>
          ))}
          {FUTURE_SPECIALTY_TRAINING.map(t => (
            <span
              key={t}
              className="text-xs font-medium text-[#999] border border-dashed border-[#e8e2d7] rounded-full px-3 py-1.5"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
