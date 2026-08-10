import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrbitalBackdrop } from '../../../OrbitalBackdrop'
import { LessonAccordion } from '../../_components/LessonAccordion'
import { TAPROOM_SHIFTS, getShift, getFutureCertification } from '../placeholderData'

export const dynamic = 'force-dynamic'

// Visual-only POURMP restyle, route-owned (academy/layout.tsx stays
// untouched/cream underneath — same pattern as the Taproom hub and Launch
// Pad). All routing/notFound/isSample/data logic below is byte-for-byte
// unchanged from the previous implementation; only className values moved.
export default function ShiftDetailPage({ params }: { params: { shift: string } }) {
  const shiftNumber = Number(params.shift)
  if (!Number.isFinite(shiftNumber)) notFound()

  const shift = getShift(shiftNumber)
  const futureCert = getFutureCertification(shiftNumber)

  if (!shift && !futureCert) notFound()

  // Shifts 6/7 — separate, locked future certifications, not part of the
  // five-shift Core Certification track.
  if (futureCert) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d0e10] to-[#0b0c0e]">
        <div className="px-4 py-10 sm:py-14 max-w-3xl mx-auto space-y-6">
          <div>
            <Link href="/academy/taproom" className="text-xs font-semibold text-[#C8973A] hover:text-[#e0b355] transition-colors">
              ← Taproom Academy
            </Link>
            <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase mt-4 mb-1">Locked · Future Certification</p>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-white leading-tight">
              🔒 {futureCert.name}
            </h1>
            <p className="mt-1.5 text-sm text-white/50 leading-relaxed">{futureCert.description}</p>
          </div>

          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-8 text-center">
            <p className="text-sm font-medium text-white/70">This is a separate learning path.</p>
            <p className="text-xs text-white/40 mt-1">
              {futureCert.name} is not part of Core Certification — it opens up once Core Certification is complete.
            </p>
          </div>

          <div className="pt-2 border-t border-white/10">
            <Link href="/academy/taproom" className="text-xs font-semibold text-white/50 hover:text-white/80 transition-colors">
              ← Back to Core Certification
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // shift is guaranteed defined past this point
  const current = shift!
  const prev = TAPROOM_SHIFTS.find(s => s.number === current.number - 1)
  const next = TAPROOM_SHIFTS.find(s => s.number === current.number + 1)
  const isSample = current.number === 1

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d0e10] to-[#0b0c0e]">
      <div className="relative px-4 pt-10 pb-8 sm:pt-14 sm:pb-10 overflow-hidden">
        <OrbitalBackdrop />
        <div className="relative z-10 max-w-3xl mx-auto">
          <Link href="/academy/taproom" className="text-xs font-semibold text-[#C8973A] hover:text-[#e0b355] transition-colors">
            ← Taproom Academy
          </Link>
          <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase mt-3 mb-1">
            {current.isGraduation ? 'Graduation Shift · Core Certification' : `Shift ${current.number} of 5 · Core Certification`}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white leading-tight">
            Shift {current.number}: {current.title}
          </h1>
          <p className="mt-1.5 text-sm text-[#e0b355] italic">“{current.confidenceStatement}”</p>
          <p className="mt-1.5 text-sm text-white/50 leading-relaxed">{current.summary}</p>
        </div>
      </div>

      <div className="px-4 pb-10 sm:pb-14 max-w-3xl mx-auto space-y-6">
        {isSample ? (
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold tracking-widest uppercase text-white/40">Lessons</p>
            {current.lessons.map(lesson => (
              <LessonAccordion key={lesson.id} lesson={lesson} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-8 text-center">
            <p className="text-sm font-medium text-white/70">Full lesson content coming soon.</p>
            <p className="text-xs text-white/40 mt-1">
              This shift is a placeholder — Shift 1 shows the complete training experience.
            </p>
          </div>
        )}

        {/* What comes next */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          {prev ? (
            <Link href={`/academy/taproom/${prev.number}`} className="text-xs font-semibold text-white/50 hover:text-white/80 transition-colors">
              ← Shift {prev.number}
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/academy/taproom/${next.number}`} className="text-xs font-semibold text-white/50 hover:text-white/80 transition-colors">
              Shift {next.number} →
            </Link>
          ) : (
            <span className="text-xs font-semibold text-white/30">End of Core Certification</span>
          )}
        </div>
      </div>
    </div>
  )
}
