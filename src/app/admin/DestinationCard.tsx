import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

// Page-local to /admin — not promoted to a shared ui/ primitive until a
// second real use case appears. Two states: an active destination (routes
// somewhere real) or an inert "Coming Soon" card (no href, no fake route).
type DestinationCardProps = {
  icon: LucideIcon
  title: React.ReactNode
  tagline: string
  href?: string
  comingSoon?: boolean
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]'

export function DestinationCard({ icon: Icon, title, tagline, href, comingSoon }: DestinationCardProps) {
  const inner = (
    <>
      <Icon className="h-5 w-5 sm:h-7 sm:w-7 text-[#C8973A]" strokeWidth={1.75} />
      <h3 className="mt-3 sm:mt-4 text-xs sm:text-sm font-bold uppercase tracking-wide text-white leading-snug">
        {title}
      </h3>
      <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-white/50 leading-snug">{tagline}</p>
      {comingSoon ? (
        <span className="mt-3 sm:mt-4 inline-block w-fit text-[9px] font-bold uppercase tracking-widest text-white/30 border border-white/15 rounded-full px-2 py-0.5">
          Coming Soon
        </span>
      ) : (
        <p className="mt-3 sm:mt-4 text-[11px] font-bold uppercase tracking-wide text-[#C8973A] group-hover:text-[#e0b355] transition-colors">
          Open →
        </p>
      )}
    </>
  )

  if (comingSoon || !href) {
    return (
      <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] px-3 py-4 sm:px-5 sm:py-5 opacity-70 cursor-default">
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 sm:px-5 sm:py-5 transition-all hover:-translate-y-0.5 hover:border-[#C8973A]/40 hover:bg-white/[0.05] ${FOCUS_RING}`}
    >
      {inner}
    </Link>
  )
}
