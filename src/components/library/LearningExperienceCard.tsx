'use client'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// C-002 — the second component in the shared POURMP Component Library
// (src/components/library/). Sibling to JourneyCard (C-001) — same visual
// language, same architectural pattern, fully academy-agnostic.
//
// Answers one question: "What am I about to learn?" Self-contained styling —
// safe to render inside or outside the Academy layout, and reusable across
// any future academy, workspace, or search/recommendation surface without
// modification. Deliberately does not model trainer sign-off, estimated-time
// derivation, or lesson-detail navigation — those belong to the future
// Learning Experience Player and curriculum-data work.

export type LearningExperienceCardState = 'ready' | 'in_progress' | 'completed' | 'locked'

export interface LearningExperienceCardProps {
  /** e.g. "Taproom Academy" */
  academy: string
  /** e.g. "LE-001" */
  experienceId: string
  /** e.g. "Welcome to Manhattan Project" */
  title: string
  /** e.g. "10 Minutes" */
  estimatedTime: string
  /** A short line building curiosity about what's inside — not curriculum detail */
  learningObjective: string
  state: LearningExperienceCardState

  /** Locked — a clear, plain-language prerequisite explanation */
  lockedReason?: string

  /** Overrides the state's default primary action label */
  primaryActionLabel?: string
  /** If provided, the primary action renders as a real link */
  primaryActionHref?: string
  /** If provided instead of a href, the primary action renders as a button */
  onPrimaryAction?: () => void
}

const DEFAULT_ACTION_LABEL: Record<LearningExperienceCardState, string> = {
  ready: 'Begin Learning',
  in_progress: 'Continue Learning',
  completed: 'Review Learning',
  locked: '',
}

// Text-first status labels — never rely on color alone to communicate state.
const STATUS_LABEL: Record<LearningExperienceCardState, string> = {
  ready: 'Ready',
  in_progress: 'In Progress',
  completed: '✓ Completed',
  locked: 'Locked',
}

const STATUS_STYLE: Record<LearningExperienceCardState, string> = {
  ready: 'border-[#1b1b1b]/40 text-[#1b1b1b]',
  in_progress: 'border-[#b07d2e] text-[#8a5a1e]',
  completed: 'border-[#111] text-[#111] bg-[#111]/5',
  locked: 'border-[#d7d0c5] text-[#999]',
}

export function LearningExperienceCard(props: LearningExperienceCardProps) {
  const {
    academy,
    experienceId,
    title,
    estimatedTime,
    learningObjective,
    state,
    lockedReason,
    primaryActionLabel,
    primaryActionHref,
    onPrimaryAction,
  } = props

  const actionLabel = primaryActionLabel ?? DEFAULT_ACTION_LABEL[state]
  const actionEnabled = state !== 'locked' && (!!primaryActionHref || !!onPrimaryAction)

  return (
    <section
      aria-label={`${title} — ${academy} learning experience`}
      className="rounded-2xl border border-[#e8e2d7] bg-[#fffdf8] px-5 py-4 sm:px-6 sm:py-5 flex flex-col gap-3"
    >
      {/* Academy + Learning Experience identifier */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#999]">
        {academy} · {experienceId}
      </p>

      {/* Title */}
      <h3 className="text-base sm:text-lg font-semibold text-[#1b1b1b] leading-snug">{title}</h3>

      {/* Estimated time */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-0.5">Estimated Time</p>
        <p className="text-sm text-[#1b1b1b]">{estimatedTime}</p>
      </div>

      {/* Learning objective — invites curiosity, not curriculum detail */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-0.5">Learning Objective</p>
        <p className="text-sm text-[#777] leading-relaxed">{learningObjective}</p>
      </div>

      {/* Status — text-based, not color-only; subtle checkmark for Completed, no animation */}
      <span
        className={cn(
          'inline-flex w-fit items-center text-[10px] font-bold uppercase tracking-widest rounded-full border px-2.5 py-1 whitespace-nowrap',
          STATUS_STYLE[state]
        )}
      >
        {STATUS_LABEL[state]}
      </span>

      {/* Primary action */}
      <div className="pt-1">
        {actionEnabled ? (
          primaryActionHref ? (
            <Link
              href={primaryActionHref}
              className="inline-flex items-center justify-center min-h-11 rounded-full bg-[#111] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5
                transition-colors motion-reduce:transition-none hover:bg-[#1b1b1b]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b07d2e] focus-visible:ring-offset-2"
            >
              {actionLabel} →
            </Link>
          ) : (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="inline-flex items-center justify-center min-h-11 rounded-full bg-[#111] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5
                transition-colors motion-reduce:transition-none hover:bg-[#1b1b1b]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b07d2e] focus-visible:ring-offset-2"
            >
              {actionLabel} →
            </button>
          )
        ) : state === 'locked' ? (
          <p role="status" className="text-sm text-[#777] leading-relaxed">
            🔒 {lockedReason ?? 'This learning experience isn’t available yet.'}
          </p>
        ) : null}
      </div>
    </section>
  )
}
