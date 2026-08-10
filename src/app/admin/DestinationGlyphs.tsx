// Custom insignia marks for /admin's two active destination cards — built
// to reproduce the approved "Launch Pad Icon & Card Authority" construction
// (simple central symbol + thin atomic orbital paths + small orbital nodes)
// at the large, dominant scale Reference 3 calls for, rather than an
// enlarged stock Lucide icon. Pure inline SVG, no new dependency. Both
// accept the same tiny prop surface used elsewhere in the app so they drop
// into DestinationCard's icon slot like any other icon component.
import type { CSSProperties } from 'react'

type GlyphProps = {
  className?: string
  style?: CSSProperties
}

// Launch Pad — a geometric rocket at the center of the same orbital-ring
// language established by the front door / OrbitalBackdrop and the Launch
// Pad hub insignias, with small filled "orbital node" dots along the paths
// (the one visual element those smaller insignias omitted at their scale).
export function RocketOrbitGlyph({ className, style }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <g strokeWidth="0.75" opacity="0.55">
        <circle cx="32" cy="32" r="29" />
        <ellipse cx="32" cy="32" rx="14" ry="28" transform="rotate(30 32 32)" />
        <ellipse cx="32" cy="32" rx="14" ry="28" transform="rotate(-30 32 32)" />
      </g>
      <g fill="currentColor" stroke="none">
        <circle cx="49" cy="15" r="1.6" />
        <circle cx="11" cy="49" r="1.6" />
        <circle cx="53" cy="45" r="1.6" />
      </g>
      <g strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 9 C27.5 15 26 21 26 27 L26 43 L38 43 L38 27 C38 21 36.5 15 32 9 Z" />
        <path d="M26 39 L18 47 L26 43 Z" />
        <path d="M38 39 L46 47 L38 43 Z" />
        <circle cx="32" cy="24" r="2.6" />
      </g>
    </svg>
  )
}

// Event Workspace — a large, squared, architectural calendar-grid mark
// (binder tabs, header rule, cell grid, one marked date) rather than
// Lucide's rounded CalendarCheck, which reads visibly softer/smaller than
// the approved reference at this scale.
export function CalendarGlyph({ className, style }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <line x1="22" y1="8" x2="22" y2="19" />
      <line x1="42" y1="8" x2="42" y2="19" />
      <rect x="12" y="14" width="40" height="38" rx="2" />
      <line x1="12" y1="25" x2="52" y2="25" />
      <line x1="25.3" y1="25" x2="25.3" y2="52" />
      <line x1="38.6" y1="25" x2="38.6" y2="52" />
      <line x1="12" y1="38.5" x2="52" y2="38.5" />
      <circle cx="32" cy="45.5" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  )
}
