import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

// Page-local to /admin — not promoted to a shared ui/ primitive until a
// second real use case appears. Gold remains the dominant brand accent
// throughout; `accent` only adds a restrained secondary tint (deep
// copper/maroon or muted mission green) so the four destinations feel
// related but not cloned. No bright/generic colors — both tones are dark,
// desaturated, and read as industrial rather than a rainbow SaaS palette.
type DestinationCardProps = {
  icon: LucideIcon
  title: React.ReactNode
  tagline: string
  href?: string
  comingSoon?: boolean
  flagship?: boolean
  accent?: 'copper' | 'green'
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]'

const ACCENT_COLOR = {
  copper: '#A85C3F',
  green: '#5B7A5E',
} as const

export function DestinationCard({
  icon: Icon,
  title,
  tagline,
  href,
  comingSoon,
  flagship,
  accent,
}: DestinationCardProps) {
  const accentColor = accent ? ACCENT_COLOR[accent] : null

  const iconColorClass = comingSoon
    ? accent === 'green'
      ? 'text-[#5B7A5E]/60'
      : 'text-[#C8973A]/30'
    : flagship
      ? 'text-[#e0b355]'
      : 'text-[#C8973A]'

  const inner = (
    <>
      <div className="relative">
        {flagship && !comingSoon && (
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-full opacity-20 blur-lg"
            style={{ background: 'radial-gradient(circle, #e0b355 0%, transparent 70%)' }}
          />
        )}
        <Icon className={`relative h-5 w-5 sm:h-7 sm:w-7 ${iconColorClass}`} strokeWidth={1.75} />
      </div>
      <h3 className="mt-3 sm:mt-4 text-xs sm:text-sm font-bold uppercase tracking-wide text-white leading-snug">
        {title}
      </h3>
      <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-white/50 leading-snug">{tagline}</p>
      {comingSoon ? (
        <span
          className="mt-3 sm:mt-4 inline-block w-fit text-[9px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5"
          style={
            accentColor
              ? { color: `${accentColor}99`, borderWidth: 1, borderColor: `${accentColor}40` }
              : { color: 'rgba(255,255,255,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }
          }
        >
          Coming Soon
        </span>
      ) : (
        <p
          className={`mt-3 sm:mt-4 text-[11px] font-bold uppercase tracking-wide transition-colors ${
            flagship ? 'text-[#e0b355] group-hover:text-[#f0c56e]' : 'text-[#C8973A] group-hover:text-[#e0b355]'
          }`}
        >
          Open →
        </p>
      )}
    </>
  )

  if (comingSoon || !href) {
    return (
      <div
        className="flex flex-col rounded-xl border px-3 py-4 sm:px-5 sm:py-5 opacity-80 cursor-default"
        style={{
          borderColor: accentColor ? `${accentColor}26` : 'rgba(255,255,255,0.1)',
          backgroundColor: accentColor ? `${accentColor}0a` : 'rgba(255,255,255,0.02)',
        }}
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-xl px-3 py-4 sm:px-5 sm:py-5 transition-all hover:-translate-y-0.5 ${FOCUS_RING} ${
        flagship
          ? 'border border-[#C8973A]/25 bg-white/[0.04] hover:border-[#e0b355]/50 hover:bg-white/[0.06]'
          : accent === 'copper'
            ? 'border border-[#A85C3F]/20 bg-white/[0.03] hover:border-[#A85C3F]/60 hover:bg-white/[0.05]'
            : 'border border-white/10 bg-white/[0.03] hover:border-[#C8973A]/40 hover:bg-white/[0.05]'
      }`}
    >
      {inner}
    </Link>
  )
}
