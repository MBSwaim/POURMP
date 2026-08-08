import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

// Launch Pad hub card — a tall destination panel, not a dashboard button.
// Local to Launch Pad (not a shared import from /admin's DestinationCard):
// these four destinations need their own accent palette, a two-line
// description, an optional progression microcopy line, and an atomic-ring
// insignia treatment that DestinationCard doesn't have reason to carry.
type LaunchPadCardProps = {
  icon: LucideIcon
  eyebrow: string
  title: ReactNode
  description: ReactNode
  href?: string
  comingSoon?: boolean
  flagship?: boolean
  accent?: 'copper' | 'bronze' | 'steel'
  microcopy?: string
  insignia?: 'orbital' | 'reticle'
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b355]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]'

// Each accent's insignia/eyebrow tone + a deep, near-black undertone shade
// layered under it via gradient. Warm beer-gold/copper for Project Pint (not
// orange), dark roasted coffee/bronze for Fission Coffee Lab, cool steel/
// graphite for The Proving Grounds.
const ACCENT = {
  copper: { color: '#c4914a', shade: '#241a10' },
  bronze: { color: '#8a6a4a', shade: '#170f08' },
  steel: { color: '#8a97a3', shade: '#10141a' },
} as const

// A restrained temporary insignia treatment, not a finalized brand asset —
// it echoes the approved POURMP mark's own orbital-ellipse-around-a-central-
// object motif (see public/logo.svg / OrbitalBackdrop), recolored per
// destination accent, rather than a bare colorful icon standing alone.
// "reticle" swaps the orbital rings for a thin crosshair/target ring for The
// Proving Grounds' more technical, testing-oriented character. Swappable
// for a real branded mark later without touching the card layout.
function Insignia({
  Icon,
  color,
  variant = 'orbital',
}: {
  Icon: LucideIcon
  color: string
  variant?: 'orbital' | 'reticle'
}) {
  return (
    <div className="relative h-14 w-14 sm:h-16 sm:w-16 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="29" stroke={color} strokeWidth="1" opacity="0.55" />
        {variant === 'orbital' ? (
          <>
            <ellipse cx="32" cy="32" rx="13" ry="29" stroke={color} strokeWidth="0.75" opacity="0.35" transform="rotate(30 32 32)" />
            <ellipse cx="32" cy="32" rx="13" ry="29" stroke={color} strokeWidth="0.75" opacity="0.35" transform="rotate(-30 32 32)" />
          </>
        ) : (
          <>
            <circle cx="32" cy="32" r="19" stroke={color} strokeWidth="0.75" opacity="0.35" strokeDasharray="1.5 4" />
            <line x1="32" y1="4" x2="32" y2="14" stroke={color} strokeWidth="0.75" opacity="0.4" />
            <line x1="32" y1="50" x2="32" y2="60" stroke={color} strokeWidth="0.75" opacity="0.4" />
            <line x1="4" y1="32" x2="14" y2="32" stroke={color} strokeWidth="0.75" opacity="0.4" />
            <line x1="50" y1="32" x2="60" y2="32" stroke={color} strokeWidth="0.75" opacity="0.4" />
          </>
        )}
      </svg>
      <Icon className="relative h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} style={{ color }} />
    </div>
  )
}

export function LaunchPadCard({
  icon,
  eyebrow,
  title,
  description,
  href,
  comingSoon,
  flagship,
  accent,
  microcopy,
  insignia = 'orbital',
}: LaunchPadCardProps) {
  const accentInfo = accent ? ACCENT[accent] : null
  const insigniaColor = flagship ? '#e0b355' : (accentInfo?.color ?? '#C8973A')

  const inner = (
    <>
      <p
        className="text-[9px] font-bold tracking-[0.25em] uppercase"
        style={{ color: flagship ? '#e0b355' : accentInfo ? accentInfo.color : 'rgba(255,255,255,0.35)' }}
      >
        {eyebrow}
      </p>

      <div className="mt-5 sm:mt-6">
        <Insignia Icon={icon} color={insigniaColor} variant={insignia} />
      </div>

      <h3 className="mt-5 sm:mt-6 text-sm sm:text-base font-bold uppercase tracking-wide text-white leading-snug">
        {title}
      </h3>

      <p className="mt-3 text-[11px] sm:text-xs text-white/50 leading-relaxed max-w-[170px]">{description}</p>

      {microcopy && (
        <p className="mt-3 text-[8px] font-bold uppercase tracking-widest text-white/30 leading-snug">{microcopy}</p>
      )}

      <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5">
        {comingSoon ? (
          <span
            className="text-[8px] font-bold uppercase tracking-widest"
            style={{ color: accentInfo ? `${accentInfo.color}99` : 'rgba(255,255,255,0.3)' }}
          >
            Coming Soon
          </span>
        ) : (
          <span className="inline-block text-[#e0b355] text-sm transition-transform group-hover:translate-x-0.5">
            →
          </span>
        )}
      </div>
    </>
  )

  const sharedClass =
    'relative flex flex-col items-center text-center mx-auto w-full max-w-[220px] min-h-[300px] sm:min-h-[340px] rounded-xl border px-5 pt-8 pb-12 sm:pt-9 sm:pb-14'

  if (comingSoon || !href) {
    return (
      <div
        className={`${sharedClass} cursor-default`}
        style={{
          borderColor: accentInfo ? `${accentInfo.color}26` : 'rgba(255,255,255,0.1)',
          backgroundImage: accentInfo
            ? `linear-gradient(160deg, ${accentInfo.color}12 0%, ${accentInfo.shade} 100%)`
            : undefined,
          backgroundColor: accentInfo ? undefined : 'rgba(255,255,255,0.02)',
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
          : 'border-white/10 bg-white/[0.03] hover:border-[#C8973A]/40 hover:bg-white/[0.05]'
      }`}
    >
      {inner}
    </Link>
  )
}
