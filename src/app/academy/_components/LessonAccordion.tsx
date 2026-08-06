'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { LessonStateBadge } from './LessonStateBadge'
import type { Lesson } from '../taproom/placeholderData'

// Compact, collapsed-by-default treatment for the four-part Learning
// Framework (Purpose / The MP Standard / Practice / Verification) — proves
// the structure without dumping unfinished curriculum copy onto the page.
export function LessonAccordion({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-[#e8e2d7] bg-[#fffdf8] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-4 py-3.5 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#1b1b1b]">{lesson.title}</p>
          {lesson.note && (
            <p className="text-xs text-[#8a5a1e] mt-1 leading-relaxed">{lesson.note}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
          <span
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wide rounded-full border px-2 py-0.5 whitespace-nowrap',
              lesson.requiresVerification
                ? 'border-[#b07d2e] text-[#8a5a1e]'
                : 'border-[#d7d0c5] text-[#999]'
            )}
          >
            {lesson.requiresVerification ? 'Trainer Verification Required' : 'Self-Paced'}
          </span>
          <LessonStateBadge state={lesson.state} />
          <span className="text-[#999] text-xs shrink-0">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[#e8e2d7] px-4 py-4 space-y-3">
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
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-1">{label}</p>
      <p className="text-sm text-[#777] italic leading-relaxed">{text ?? 'Pending curriculum design.'}</p>
    </div>
  )
}
