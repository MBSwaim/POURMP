import { cn } from '@/lib/utils'
import type { LessonState } from '../taproom/placeholderData'

const LABELS: Record<LessonState, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
  trainer_signoff: 'Trainer Sign-Off Required',
}

// Restrained POURMP mapping — labels/semantics unchanged, only the visual
// treatment moved from the old cream/amber system into the dark palette.
// Distinguished by weight AND color together, never color alone:
// Complete reads as settled/filled-in (white, no gold), In Progress is MP
// gold/active, Not Started is a quiet, low-presence outline, and Trainer
// Sign-Off Required uses a distinct warm copper-gold — a verification/
// attention cue, deliberately not red/danger, since it isn't an error.
const STYLES: Record<LessonState, string> = {
  not_started: 'bg-transparent border border-white/15 text-white/35',
  in_progress: 'bg-[#C8973A]/10 border border-[#C8973A]/40 text-[#e0b355]',
  complete: 'bg-white/[0.08] border border-white/25 text-white/80',
  trainer_signoff: 'bg-[#c4914a]/[0.08] border border-[#c4914a]/50 text-[#c4914a]',
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
