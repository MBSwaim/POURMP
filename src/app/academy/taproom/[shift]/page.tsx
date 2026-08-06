import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LessonAccordion } from '../../_components/LessonAccordion'
import { TAPROOM_SHIFTS, getShift, getFutureCertification } from '../placeholderData'

export const dynamic = 'force-dynamic'

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
      <div className="px-4 py-5 space-y-6 max-w-3xl mx-auto">
        <div>
          <Link href="/academy/taproom" className="text-xs font-semibold text-[#b07d2e] hover:text-[#8a5a1e] transition-colors">
            ← Taproom Academy
          </Link>
          <p className="text-[10px] text-[#999] tracking-[0.2em] uppercase mt-3 mb-1">Locked · Future Certification</p>
          <h1 className="text-xl font-bold tracking-widest uppercase leading-none text-[#1b1b1b]">
            🔒 {futureCert.name}
          </h1>
          <p className="mt-1.5 text-sm text-[#777] leading-relaxed">{futureCert.description}</p>
        </div>

        <div className="rounded-2xl border border-dashed border-[#d7d0c5] bg-[#fffdf8]/60 px-5 py-8 text-center">
          <p className="text-sm font-medium text-[#1b1b1b]">This is a separate learning path.</p>
          <p className="text-xs text-[#777] mt-1">
            {futureCert.name} is not part of Core Certification — it opens up once Core Certification is complete.
          </p>
        </div>

        <div className="pt-2 border-t border-[#e8e2d7]">
          <Link href="/academy/taproom" className="text-xs font-semibold text-[#777] hover:text-[#1b1b1b] transition-colors">
            ← Back to Core Certification
          </Link>
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
    <div className="px-4 py-5 space-y-6 max-w-3xl mx-auto">
      <div>
        <Link href="/academy/taproom" className="text-xs font-semibold text-[#b07d2e] hover:text-[#8a5a1e] transition-colors">
          ← Taproom Academy
        </Link>
        <p className="text-[10px] text-[#999] tracking-[0.2em] uppercase mt-3 mb-1">
          {current.isGraduation ? 'Graduation Shift · Core Certification' : `Shift ${current.number} of 5 · Core Certification`}
        </p>
        <h1 className="text-xl font-bold tracking-widest uppercase leading-none text-[#1b1b1b]">
          Shift {current.number}: {current.title}
        </h1>
        <p className="mt-1.5 text-sm text-[#8a5a1e] italic">“{current.confidenceStatement}”</p>
        <p className="mt-1.5 text-sm text-[#777] leading-relaxed">{current.summary}</p>
      </div>

      {isSample ? (
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">Lessons</p>
          {current.lessons.map(lesson => (
            <LessonAccordion key={lesson.id} lesson={lesson} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#d7d0c5] bg-[#fffdf8]/60 px-5 py-8 text-center">
          <p className="text-sm font-medium text-[#1b1b1b]">Full lesson content coming soon.</p>
          <p className="text-xs text-[#777] mt-1">
            This shift is a placeholder — Shift 1 shows the complete training experience.
          </p>
        </div>
      )}

      {/* What comes next */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#e8e2d7]">
        {prev ? (
          <Link href={`/academy/taproom/${prev.number}`} className="text-xs font-semibold text-[#777] hover:text-[#1b1b1b] transition-colors">
            ← Shift {prev.number}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/academy/taproom/${next.number}`} className="text-xs font-semibold text-[#777] hover:text-[#1b1b1b] transition-colors">
            Shift {next.number} →
          </Link>
        ) : (
          <span className="text-xs font-semibold text-[#999]">End of Core Certification</span>
        )}
      </div>
    </div>
  )
}
