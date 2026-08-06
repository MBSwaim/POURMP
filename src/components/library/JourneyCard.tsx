'use client'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// C-001 — the first component in the shared POURMP Component Library
// (src/components/library/). Distinct from src/components/ui/ (generic
// primitives) and src/app/academy/_components/ (Academy-local only).
//
// Answers one question: "Where am I on my journey?" Self-contained styling —
// safe to render inside or outside the Academy layout, and reusable across
// any future workspace without modification.

export type JourneyCardState = 'active' | 'ready' | 'completed' | 'locked' | 'paused'

export interface JourneyCardProps {
  /** e.g. "Taproom Core Certification" */
  journeyTitle: string
  state: JourneyCardState

  /** Active / Paused — a fully custom position label, e.g. "Shift 2 of 5". Takes
   *  precedence over currentStep/totalSteps when provided. */
  currentPosition?: string
  /** Active / Paused — generic step number, used with totalSteps to derive a
   *  position label ("Step 2 of 5") when currentPosition isn't given. Journeys
   *  are not assumed to be five steps, or shift-based at all. */
  currentStep?: number
  /** Active / Paused — the journey's total step count, paired with currentStep. */
  totalSteps?: number
  /** Active / Paused — e.g. "I Know How We Serve" */
  currentMilestone?: string
  /** Active only — e.g. "Guest Hospitality" */
  todaysFocus?: string
  /** Active / Ready / Completed — a short, calm, supportive line */
  coachingMessage?: string

  /** Completed — the milestone or certification earned */
  completedMilestone?: string

  /** Locked — what prerequisite unlocks this, explained plainly */
  lockedReason?: string

  /** Paused — why it's paused, and that resuming is fine, phrased without blame */
  pausedReason?: string

  /** Overrides the state's default primary action label */
  primaryActionLabel?: string
  /** If provided, the primary action renders as a real link (e.g. a Taproom route) */
  primaryActionHref?: string
  /** If provided instead of a href, the primary action renders as a button */
  onPrimaryAction?: () => void
}

const DEFAULT_ACTION_LABEL: Record<JourneyCardState, string> = {
  active: 'Continue My Journey',
  ready: 'Begin My Journey',
  completed: 'View My Journey',
  locked: '',
  paused: 'Resume When Ready',
}

// Text-first status labels — never rely on color alone to communicate state.
const STATUS_LABEL: Record<JourneyCardState, string> = {
  active: 'In Progress',
  ready: 'Ready to Start',
  completed: 'Completed',
  locked: 'Locked',
  paused: 'Paused',
}

const STATUS_STYLE: Record<JourneyCardState, string> = {
  active: 'border-[#b07d2e] text-[#8a5a1e]',
  ready: 'border-[#1b1b1b]/40 text-[#1b1b1b]',
  completed: 'border-[#111] text-[#111] bg-[#111]/5',
  locked: 'border-[#d7d0c5] text-[#999]',
  paused: 'border-[#d7d0c5] text-[#777]',
}

export function JourneyCard(props: JourneyCardProps) {
  const {
    journeyTitle,
    state,
    currentPosition,
    currentStep,
    totalSteps,
    currentMilestone,
    todaysFocus,
    coachingMessage,
    completedMilestone,
    lockedReason,
    pausedReason,
    primaryActionLabel,
    primaryActionHref,
    onPrimaryAction,
  } = props

  // A fully custom label always wins; otherwise derive a generic, journey-length-
  // agnostic label from currentStep/totalSteps when both are given.
  const derivedPosition = currentPosition
    ?? (currentStep != null && totalSteps != null ? `Step ${currentStep} of ${totalSteps}` : undefined)

  const actionLabel = primaryActionLabel ?? DEFAULT_ACTION_LABEL[state]
  // Paused gets an informational line, not a fully-enabled action — matching
  // Locked's treatment rather than Active/Ready/Completed's real CTA.
  const actionEnabled = (state === 'active' || state === 'ready' || state === 'completed')
    && (!!primaryActionHref || !!onPrimaryAction)

  return (
    <section
      aria-label={`${journeyTitle} — journey status`}
      className="rounded-2xl border border-[#e8e2d7] bg-[#fffdf8] px-5 py-4 sm:px-6 sm:py-5 flex flex-col gap-3"
    >
      {/* Journey title + status (text-based, not color-only) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold text-[#1b1b1b] leading-snug">{journeyTitle}</h3>
        <span
          className={cn(
            'inline-flex w-fit items-center text-[10px] font-bold uppercase tracking-widest rounded-full border px-2.5 py-1 whitespace-nowrap',
            STATUS_STYLE[state]
          )}
        >
          {STATUS_LABEL[state]}
        </span>
      </div>

      {/* Current position (Active / Paused) */}
      {(state === 'active' || state === 'paused') && derivedPosition && (
        <p className="text-sm font-medium text-[#1b1b1b]">{derivedPosition}</p>
      )}

      {/* Current milestone (Active / Paused) */}
      {(state === 'active' || state === 'paused') && currentMilestone && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-0.5">Current Milestone</p>
          <p className="text-sm text-[#1b1b1b]">{currentMilestone}</p>
        </div>
      )}

      {/* Today's focus (Active only) */}
      {state === 'active' && todaysFocus && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-0.5">Today&apos;s Focus</p>
          <p className="text-sm text-[#1b1b1b]">{todaysFocus}</p>
        </div>
      )}

      {/* Completed — the milestone/certification earned */}
      {state === 'completed' && completedMilestone && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-0.5">Earned</p>
          <p className="text-sm text-[#1b1b1b]">{completedMilestone}</p>
        </div>
      )}

      {/* Locked — plain explanation, no punitive language */}
      {state === 'locked' && lockedReason && (
        <p className="text-sm text-[#777] leading-relaxed">{lockedReason}</p>
      )}

      {/* Paused — calm, non-punitive framing */}
      {state === 'paused' && pausedReason && (
        <p className="text-sm text-[#777] leading-relaxed">{pausedReason}</p>
      )}

      {/* Contextual coaching message (Active / Ready / Completed) */}
      {coachingMessage && (state === 'active' || state === 'ready' || state === 'completed') && (
        <p className="text-sm text-[#8a5a1e] italic leading-relaxed">{coachingMessage}</p>
      )}

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
          <p role="status" className="text-xs font-semibold uppercase tracking-widest text-[#999]">
            🔒 Not yet available
          </p>
        ) : state === 'paused' ? (
          <p role="status" className="text-xs font-semibold uppercase tracking-widest text-[#999]">
            ⏸ Resume anytime — no rush
          </p>
        ) : null}
      </div>
    </section>
  )
}
