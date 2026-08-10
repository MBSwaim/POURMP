import Link from 'next/link'

// A Taproom-local presentation adapter for the "Where You Are" journey
// summary — NOT a reimplementation of JourneyCard's state machine.
// src/components/library/JourneyCard.tsx is shared with /home and the
// component library and is deliberately left untouched: it has no
// className escape hatch, so a wrapper cannot cleanly repaint its
// hardcoded cream surface/button/focus-ring classes from outside without
// fighting Tailwind specificity — exactly the "still reads as a foreign
// cream component" outcome we're avoiding. Taproom Academy's JourneyCard
// usage is always the "active" state (see taproom/page.tsx), so this
// renders only that one view — it does not model ready/completed/locked/
// paused, and never derives progression itself: every value here is
// passed in from the same getCurrentShift()-derived data the page already
// computes. This is a presentation adapter, not a new journey system.
type TaproomJourneyCardProps = {
  journeyTitle: string
  currentPosition: string
  currentMilestone: string
  todaysFocus?: string
  coachingMessage?: string
  primaryActionHref: string
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b355]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]'

export function TaproomJourneyCard({
  journeyTitle,
  currentPosition,
  currentMilestone,
  todaysFocus,
  coachingMessage,
  primaryActionHref,
}: TaproomJourneyCardProps) {
  return (
    <section
      aria-label={`${journeyTitle} — journey status`}
      className="rounded-xl border border-[#C8973A]/20 bg-white/[0.03] px-5 py-4 sm:px-6 sm:py-5 flex flex-col gap-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold text-white leading-snug">{journeyTitle}</h3>
        <span className="inline-flex w-fit items-center text-[10px] font-bold uppercase tracking-widest rounded-full border border-[#e0b355]/40 text-[#e0b355] px-2.5 py-1 whitespace-nowrap">
          In Progress
        </span>
      </div>

      <p className="text-sm font-medium text-white">{currentPosition}</p>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Current Milestone</p>
        <p className="text-sm text-white/70">{currentMilestone}</p>
      </div>

      {todaysFocus && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Today&apos;s Focus</p>
          <p className="text-sm text-white/70">{todaysFocus}</p>
        </div>
      )}

      {coachingMessage && (
        <p className="text-sm text-[#e0b355]/80 italic leading-relaxed">{coachingMessage}</p>
      )}

      <div className="pt-1">
        <Link
          href={primaryActionHref}
          className={`inline-flex items-center justify-center min-h-11 rounded-lg bg-[#C8973A] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 hover:bg-[#b07d2e] transition-colors ${FOCUS_RING}`}
        >
          Continue My Journey →
        </Link>
      </div>
    </section>
  )
}
