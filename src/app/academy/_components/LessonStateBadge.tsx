import { cn } from '@/lib/utils'
import type { LessonState } from '../taproom/placeholderData'

const LABELS: Record<LessonState, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
  trainer_signoff: 'Trainer Sign-Off Required',
}

// Restrained, mostly-monochrome badge styling — Academy-local only, not the
// shared multi-color StatusBadge used elsewhere in POURMP.
const STYLES: Record<LessonState, string> = {
  not_started: 'bg-transparent border border-[#d7d0c5] text-[#777]',
  in_progress: 'bg-[#f0e9da] border border-[#d7d0c5] text-[#3a3a3a]',
  complete: 'bg-[#111] border border-[#111] text-white',
  trainer_signoff: 'bg-transparent border border-[#b07d2e] text-[#8a5a1e]',
}

export function LessonStateBadge({ state }: { state: LessonState }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap',
        STYLES[state]
      )}
    >
      {LABELS[state]}
    </span>
  )
}
