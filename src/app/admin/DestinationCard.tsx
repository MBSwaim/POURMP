import Link from 'next/link'
import type { ComponentType, CSSProperties, ReactNode } from 'react'

// Page-local to /admin — not promoted to a shared ui/ primitive until a
// second real use case appears. Reconstructed to reproduce the approved
// "Home Dashboard Card Authority" reference: tall architectural panels with
// a large, dominant icon, not the previous short dashboard-tile treatment
// with a small icon badge. Gold remains the dominant brand accent
// throughout; `accent` only adds a restrained secondary undertone (deep
// copper/maroon, richer forest green, or muted steel) so the four
// destinations feel related but not cloned. No bright/generic colors —
// every tone is dark, desaturated, and reads as industrial rather than a
// rainbow SaaS palette.
type IconComponent = ComponentType<{ className?: string; style?: CSSProperties }>

type DestinationCardProps = {
  icon: IconComponent
  title: ReactNode
  secondaryTitle?: string
  tagline: ReactNode
  href?: string
  comingSoon?: boolean
  flagship?: boolean
  accent?: 'copper' | 'green' | 'steel'
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b355]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]'

// Richer than the first pass's `#5B7A5E`/`#A85C3F` — approved as "a touch
// richer/more radiant than the North Star image" while staying dark and
// desaturated (color emerging from black, not a bright card on top of it).
// `steel` is new — Reports & Insights' quiet, muted-gray identity.
const ACCENT_COLOR = {
  copper: '#A85C3F',
  green: '#3f7a54',
  steel: '#8a97a3',
} as const

const ACCENT_SHADE = {
  copper: '#241410',
  green: '#0c1811',
  steel: '#111316',
} as const

// Daily Operations' icon reads warm/light against its green-black surface
// rather than green-on-green — a deliberate contrast choice from Reference 3,
// not a stand-in for the missing accent color.
const WARM_ICON_COLOR = '#F0E6CD'

export function DestinationCard({
  icon: Icon,
  title,
  secondaryTitle,
  tagline,
  href,
  comingSoon,
  flagship,
  accent,
}: DestinationCardProps) {
  const accentColor = accent ? ACCENT_COLOR[accent] : null
  const accentShade = accent ? ACCENT_SHADE[accent] : null

  // Active cards (Launch Pad, Event Workspace) render a large, free-standing
  // icon with no circular badge — the icon itself is the visual anchor.
  // Coming Soon cards (Daily Operations, Reports) keep a restrained circular
  // frame around a smaller icon, per Reference 3.
  const iconColor = flagship
    ? '#e0b355'
    : comingSoon
      ? accent === 'green'
        ? WARM_ICON_COLOR
        : (accentColor ?? 'rgba(255,255,255,0.35)')
      : '#C8973A'

  const iconArea = flagship ? (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-4 rounded-full opacity-10 blur-xl"
        style={{ background: 'radial-gradient(circle, #e0b355 0%, transparent 70%)' }}
      />
      <Icon className="relative h-20 w-20 sm:h-24 sm:w-24" style={{ color: iconColor }} />
    </div>
  ) : comingSoon ? (
    // Tightened from an earlier pass — the icon now fills more of the ring,
    // closer to Reference 3's fit, without adding any new ornament.
    <div
      className="relative flex items-center justify-center h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem] rounded-full border"
      style={{ borderColor: accentColor ? `${accentColor}40` : 'rgba(255,255,255,0.12)' }}
    >
      <Icon className="h-9 w-9 sm:h-10 sm:w-10" style={{ color: iconColor }} />
    </div>
  ) : (
    <div className="relative">
      {accent === 'copper' && (
        <div
          aria-hidden="true"
          className="absolute -inset-3 rounded-full opacity-10 blur-lg"
          style={{ background: 'radial-gradient(circle, #A85C3F 0%, transparent 70%)' }}
        />
      )}
      <Icon className="relative h-14 w-14 sm:h-16 sm:w-16" style={{ color: iconColor }} />
    </div>
  )

  const inner = (
    <>
      {iconArea}

      <h3 className="mt-6 sm:mt-7 text-base sm:text-lg font-bold uppercase tracking-wide text-white leading-tight">
        {title}
      </h3>

      {secondaryTitle && (
        <p className="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: '#e0b355' }}>
          {secondaryTitle}
        </p>
      )}

      <p className="mt-3 sm:mt-4 text-[11px] sm:text-xs text-white/50 leading-snug">{tagline}</p>

      <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5">
        {comingSoon ? (
          <span
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: accentColor ? `${accentColor}99` : 'rgba(255,255,255,0.3)' }}
          >
            Coming Soon
          </span>
        ) : (
          <span
            className={`inline-block text-base sm:text-lg transition-transform group-hover:translate-x-0.5 ${
              flagship ? 'text-[#e0b355]' : 'text-[#C8973A]'
            }`}
          >
            →
          </span>
        )}
      </div>
    </>
  )

  // Mobile keeps a deliberately tall, architectural proportion but not the
  // full desktop/tablet min-height — at a single narrow column that height
  // was mostly empty space below short content. 768px+ is unchanged.
  const sharedClass =
    'relative flex flex-col items-center text-center mx-auto w-full min-h-[280px] sm:min-h-[400px] rounded-xl border px-4 pt-8 pb-14 sm:px-6 sm:pt-10 sm:pb-16'

  if (comingSoon || !href) {
    return (
      <div
        className={`${sharedClass} cursor-default`}
        style={{
          borderColor: accentColor ? `${accentColor}26` : 'rgba(255,255,255,0.1)',
          backgroundImage: accentColor && accentShade
            ? `linear-gradient(160deg, ${accentColor}18 0%, ${accentShade} 100%)`
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
      className={`group ${sharedClass} transition-all hover:-translate-y-0.5 ${FOCUS_RING} ${
        flagship
          ? 'border-[#C8973A]/25 bg-white/[0.04] hover:border-[#e0b355]/50 hover:bg-white/[0.06]'
          : accent === 'copper'
            ? 'border-[#A85C3F]/20 bg-white/[0.03] hover:border-[#A85C3F]/60 hover:bg-white/[0.05]'
            : 'border-white/10 bg-white/[0.03] hover:border-[#C8973A]/40 hover:bg-white/[0.05]'
      }`}
    >
      {inner}
    </Link>
  )
}
