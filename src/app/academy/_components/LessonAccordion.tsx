'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { LessonStateBadge } from './LessonStateBadge'
import type { Lesson } from '../taproom/placeholderData'

// Compact, collapsed-by-default treatment for the four-part Learning
// Framework (Purpose / The MP Standard / Practice / Verification) — proves
// the structure without dumping unfinished curriculum copy onto the page.
// Visual-only POURMP restyle: open/close state, aria-expanded, and all
// lesson data/copy are unchanged. The expanded panel sits on a slightly
// lifted warm-near-black surface (#141414, the same neutral documented in
// the approved palette) rather than pure black, for reading comfort.
export function LessonAccordion({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-4 py-3.5 text-left
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b355]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{lesson.title}</p>
          {lesson.note && (
            <p className="text-xs text-[#c4914a] mt-1 leading-relaxed">{lesson.note}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
          <span
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wide rounded-full border px-2 py-0.5 whitespace-nowrap',
              lesson.requiresVerification
                ? 'border-[#c4914a]/40 text-[#c4914a]'
                : 'border-white/15 text-white/40'
            )}
          >
            {lesson.requiresVerification ? 'Trainer Verification Required' : 'Self-Paced'}
          </span>
          <LessonStateBadge state={lesson.state} />
          <span className="text-white/30 text-xs shrink-0">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 bg-[#141414] px-4 py-4 space-y-3">
          <FrameworkSection label="Purpose" text={lesson.purpose} />
          <FrameworkSection label="The MP Standard" text={lesson.standard} />
          <FrameworkSection label="Practice" text={lesson.practice} />
          <FrameworkSection label="Verification" text={lesson.verification} />
        </div>
      )}
    </div>
  )
}

function FrameworkSection({ label, text }: { label: string; text?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <p className="text-sm text-white/60 italic leading-relaxed">{text ?? 'Pending curriculum design.'}</p>
    </div>
  )
}
