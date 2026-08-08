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
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b355]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]'

const ACCENT_COLOR = {
  copper: '#A85C3F',
  green: '#5B7A5E',
} as const

// Deep, near-black undertone per accent — oxidized-copper/burgundy-black for
// Event Workspace, industrial-green/military-equipment-black for Daily
// Operations. Layered under the base accent tint via gradient so each
// Coming Soon card reads as a distinct material, not a lighter/darker copy
// of the same swatch.
const ACCENT_SHADE = {
  copper: '#241410',
  green: '#111a14',
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
  const accentShade = accent ? ACCENT_SHADE[accent] : null

  const iconColorClass = comingSoon
    ? accent === 'green'
      ? 'text-[#5B7A5E]/70'
      : 'text-[#C8973A]/40'
    : flagship
      ? 'text-[#e0b355]'
      : 'text-[#C8973A]'

  // Mission-insignia badge ring behind each icon — the same restrained
  // circular-emblem treatment across all four destinations so they read as
  // a matched set of insignias, distinguished only by their accent color.
  const badgeClass = comingSoon
    ? accentColor
      ? ''
      : 'border-white/10 bg-white/[0.02]'
    : flagship
      ? 'border-[#e0b355]/35 bg-[#e0b355]/[0.06]'
      : accent === 'copper'
        ? 'border-[#A85C3F]/40 bg-[#A85C3F]/[0.08]'
        : 'border-[#C8973A]/25 bg-[#C8973A]/[0.05]'

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
        {!flagship && accent === 'copper' && !comingSoon && (
          <div
            aria-hidden="true"
            className="absolute -inset-2 rounded-full opacity-10 blur-md"
            style={{ background: 'radial-gradient(circle, #A85C3F 0%, transparent 70%)' }}
          />
        )}
        <div
          className={`relative flex items-center justify-center h-9 w-9 sm:h-11 sm:w-11 rounded-full border ${badgeClass}`}
          style={
            comingSoon && accentColor
              ? { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}0d` }
              : undefined
          }
        >
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColorClass}`} strokeWidth={1.75} />
        </div>
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
          backgroundImage: accentColor && accentShade
            ? `linear-gradient(160deg, ${accentColor}14 0%, ${accentShade} 100%)`
            : undefined,
          backgroundColor: accentColor ? undefined : 'rgba(255,255,255,0.02)',
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
