import Link from 'next/link'
import { OrbitalBackdrop } from '../../OrbitalBackdrop'
import { TapHandleGlyph } from '../_components/LaunchPadGlyphs'
import { TaproomJourneyCard } from '../_components/TaproomJourneyCard'
import { ShiftProgressTrack } from '../_components/ShiftProgressTrack'
import {
  TAPROOM_SHIFTS,
  FUTURE_CERTIFICATIONS,
  FUTURE_SPECIALTY_TRAINING,
  getCurrentShift,
} from './placeholderData'

export const dynamic = 'force-dynamic'

// Taproom Academy hub — full-bleed dark POURMP treatment owned entirely by
// this page, not academy/layout.tsx (which stays cream for any future
// Academy destination that hasn't opted in yet) — the same route-owned-
// background pattern already proven on the Launch Pad hub. No training
// logic touched: TAPROOM_SHIFTS/getCurrentShift/FUTURE_CERTIFICATIONS/
// FUTURE_SPECIALTY_TRAINING are read exactly as before, unchanged.
//
// The TapHandleGlyph identity mark appears once, here, at the Academy's
// entry point — deliberately not repeated on the shift-detail page, per
// "one strong identity treatment, not stamped on every screen."
export default function TaproomAcademyPage() {
  const current = getCurrentShift()

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d0e10] to-[#0b0c0e]">
      {/* Header band — the only place this page uses any background
          geometry, and only at OrbitalBackdrop's already-extremely-subtle
          default opacity, confined to this band so it never sits behind
          the lesson content below. */}
      <div className="relative px-4 pt-10 pb-8 sm:pt-14 sm:pb-10 overflow-hidden">
        <OrbitalBackdrop />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-[#C8973A]/30 bg-[#C8973A]/[0.06] flex items-center justify-center shrink-0">
              <TapHandleGlyph className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#e0b355' }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#C8973A]">
                Launch Pad · Employee Development
              </p>
              <div className="flex items-center gap-2.5 flex-wrap mt-1">
                <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white leading-tight">
                  Taproom Academy
                </h1>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border border-[#C8973A]/40 text-[#C8973A] rounded-full px-2.5 py-1 whitespace-nowrap">
                  Core Certification
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs sm:text-sm text-white/50 max-w-xl leading-relaxed">
            A five-shift journey built around confidence, not departments or checklists — each shift moves you closer
            to running a standard taproom shift on your own.
          </p>
        </div>
      </div>

      <div className="px-4 pb-10 sm:pb-14 max-w-3xl mx-auto space-y-6">
        {/* Graduation outcome */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Graduation Outcome</p>
          <p className="text-sm text-white/70 leading-relaxed">
            At the completion of Core Certification, a team member should be able to independently work a standard
            Manhattan Project taproom shift while consistently delivering our operational standards and guest experience.
          </p>
        </section>

        {/* Where you are */}
        <TaproomJourneyCard
          journeyTitle="Taproom Core Certification"
          currentPosition={`Shift ${current.number} of ${TAPROOM_SHIFTS.length}: ${current.title}`}
          currentMilestone={current.confidenceStatement}
          todaysFocus={current.todaysFocus}
          coachingMessage={current.coachingMessage}
          primaryActionHref="/academy/taproom/1"
        />

        {/* Shift progression */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/40">Training Progression</p>
          <ShiftProgressTrack shifts={TAPROOM_SHIFTS} currentShiftNumber={current.number} />
        </div>

        {/* Trainer partnership */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Trainer Partnership</p>
          <p className="text-sm text-white/60 leading-relaxed">
            You&apos;re not learning alone. A trainer will observe your work, coach you in the moment, and confirm
            you&apos;re ready before you move forward. Lessons that need trainer verification are marked clearly —
            everything else, you can move through at your own pace.
          </p>
        </section>

        {/* What comes next — separate, locked future paths */}
        <section className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/40 mb-2">
            What Comes Next — Unlocks After Core Certification
          </p>
          <div className="flex flex-wrap gap-2">
            {FUTURE_CERTIFICATIONS.map(cert => (
              <Link
                key={cert.shiftNumber}
                href={`/academy/taproom/${cert.shiftNumber}`}
                className="text-xs font-semibold text-white/50 hover:text-white/80 border border-dashed border-white/15 rounded-full px-3 py-1.5 transition-colors"
              >
                🔒 {cert.name}
              </Link>
            ))}
            {FUTURE_SPECIALTY_TRAINING.map(t => (
              <span
                key={t}
                className="text-xs font-medium text-white/30 border border-dashed border-white/10 rounded-full px-3 py-1.5"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
