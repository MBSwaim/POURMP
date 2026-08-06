import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LessonRow } from '../../_components/LessonRow'
import { TAPROOM_SHIFTS, getShift } from '../placeholderData'

export const dynamic = 'force-dynamic'

export default function ShiftDetailPage({ params }: { params: { shift: string } }) {
  const shiftNumber = Number(params.shift)
  const shift = Number.isFinite(shiftNumber) ? getShift(shiftNumber) : undefined
  if (!shift) notFound()

  const prev = TAPROOM_SHIFTS.find(s => s.number === shift.number - 1)
  const next = TAPROOM_SHIFTS.find(s => s.number === shift.number + 1)
  const isSample = shift.number === 1

  return (
    <div className="px-4 py-5 space-y-6 max-w-3xl mx-auto">
      <div>
        <Link href="/academy/taproom" className="text-xs font-semibold text-[#b07d2e] hover:text-[#8a5a1e] transition-colors">
          ← Taproom Academy
        </Link>
        <p className="text-[10px] text-[#999] tracking-[0.2em] uppercase mt-3 mb-1">
          {shift.isOptional ? 'Optional Shift' : `Shift ${shift.number} of 5`}
        </p>
        <h1 className="text-xl font-bold tracking-widest uppercase leading-none text-[#1b1b1b]">
          {shift.isOptional ? `Optional Shift ${shift.number}` : `Shift ${shift.number}`}: {shift.title}
        </h1>
        <p className="mt-1.5 text-sm text-[#777] leading-relaxed">{shift.summary}</p>
      </div>

      {isSample ? (
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">Lessons</p>
          {shift.lessons.map(lesson => (
            <LessonRow key={lesson.id} lesson={lesson} />
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
          <span className="text-xs font-semibold text-[#999]">End of current progression</span>
        )}
      </div>
    </div>
  )
}
