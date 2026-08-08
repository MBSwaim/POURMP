'use client'

import { useState } from 'react'
import { Trophy, UserCheck, Gem, Handshake, ShieldCheck, Sparkles } from 'lucide-react'

// POURMP is FOH behavior language derived from the official MP Core Values —
// it does not replace them. Each item's default state shows the POURMP
// behavior; hover/focus/tap reveals the official MP Core Value it comes from.
// People Deserve Better is the MP company promise, not a POURMP letter — it
// lives only in the closing brand statement in page.tsx. Single-open-at-a-time
// by design — restrained, not six permanently expanded blocks.
//
// Icon language is a deliberate, explicitly-approved exception to this app's
// documented emoji-only icon convention (see docs/BRAND_GUIDE.md) — scoped to
// this one brand-statement component, not a precedent for SideNav/feature
// icons elsewhere. lucide-react is already a dependency; no new icon library
// was added.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b355]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e] rounded'

const FRAMEWORK = [
  {
    letter: 'P',
    behavior: 'Passion for Excellence',
    icon: Trophy,
    sourceLabel: 'MP Core Value',
    source: 'Passion for Excellence',
    meaning: "We're here to win the championship!",
  },
  {
    letter: 'O',
    behavior: 'Ownership',
    icon: UserCheck,
    sourceLabel: 'MP Core Value',
    source: 'Ownership',
    meaning: 'Take total responsibility for outcomes. No excuses.',
  },
  {
    letter: 'U',
    behavior: 'Understands Quality',
    icon: Gem,
    sourceLabel: 'MP Core Value',
    source: 'Understands Quality',
    meaning: 'Distinguish between mediocrity and excellence.',
  },
  {
    letter: 'R',
    behavior: 'Respect Everyone',
    icon: Handshake,
    sourceLabel: 'MP Core Value',
    source: 'Respectful',
    meaning: "Don't be an @$$.",
  },
  {
    letter: 'M',
    behavior: 'Mean What You Say',
    icon: ShieldCheck,
    sourceLabel: 'MP Core Value',
    source: 'Truth',
    meaning: 'No compromises, seek the truth.',
  },
  {
    letter: 'P',
    behavior: 'Positive Energy',
    icon: Sparkles,
    sourceLabel: 'MP Core Value',
    source: 'Positive Energy',
    meaning: 'Uplift those around you.',
  },
]

export function PourmpFramework() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  // Live hover/focus always wins over a stale click-pin — otherwise clicking
  // one item (the mobile-tap fallback) would leave it stuck open while
  // tabbing/hovering over the others, which never revealed as a result.
  const activeIndex = hoverIndex ?? openIndex

  return (
    <div>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-y-6 lg:gap-y-0 lg:divide-x lg:divide-white/10">
        {FRAMEWORK.map((item, i) => {
          const isActive = activeIndex === i
          const Icon = item.icon
          return (
            <button
              key={`${item.letter}-${item.behavior}`}
              type="button"
              aria-expanded={isActive}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onFocus={() => setHoverIndex(i)}
              onBlur={() => setHoverIndex(null)}
              className={`min-w-0 px-1.5 sm:px-4 lg:px-8 text-center outline-none transition-colors ${FOCUS_RING}`}
            >
              <Icon
                className={`mx-auto h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 transition-colors ${
                  isActive ? 'text-[#e0b355]' : 'text-[#C8973A]'
                }`}
                strokeWidth={1.75}
              />
              <p
                className={`mt-2 lg:mt-3 text-[9px] sm:text-[11px] lg:text-xs font-bold uppercase tracking-widest leading-tight transition-colors ${
                  isActive ? 'text-white' : 'text-white/80'
                }`}
              >
                {item.behavior}
              </p>

              <div
                className={`grid overflow-hidden transition-all duration-200 ease-out ${
                  isActive ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                    {item.sourceLabel}
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#C8973A] mt-0.5">
                    {item.source}
                  </p>
                  <p className="text-[11px] text-white/50 mt-1 leading-snug">{item.meaning}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
