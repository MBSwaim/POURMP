// Custom Launch Pad insignia glyphs — replace the temporary stock Lucide
// icons with Manhattan Project-specific marks, approved from the "Launch
// Pad Insignia Family" reference. Pure inline SVG, no new dependency, no
// external/raster assets. Each glyph accepts the same tiny prop surface
// LaunchPadCard's Insignia wrapper already calls (className/strokeWidth/
// style), so it drops in wherever a Lucide icon used to be, colors via the
// same `style={{ color }}` + `currentColor` mechanism, and can be swapped
// or refined later without touching the card layout. All four share a
// 24x24 viewBox, stroke-only construction, and matching stroke weight/
// density so they read as one coordinated family.
import type { ComponentType, CSSProperties } from 'react'

export type GlyphComponent = ComponentType<{
  className?: string
  strokeWidth?: number
  style?: CSSProperties
}>

type GlyphProps = {
  className?: string
  strokeWidth?: number
  style?: CSSProperties
}

// Taproom Academy — a simplified tap handle + spout. Industrial and
// geometric rather than a literal plumbing faucet or cartoon beer tap.
export function TapHandleGlyph({ className, strokeWidth = 1.5, style }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="4" r="1.6" />
      <line x1="12" y1="5.6" x2="12" y2="13" />
      <path d="M12 9 H17 V12" />
      <line x1="12" y1="13" x2="12" y2="17" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}

// Project Pint — a symmetrical geometric hop cone: a pointed outer form
// with layered scale arcs, not a botanical illustration.
export function HopConeGlyph({ className, strokeWidth = 1.5, style }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2 C8.2 6 7 9 7 12 C7 15 8.2 18 12 22 C15.8 18 17 15 17 12 C17 9 15.8 6 12 2 Z" />
      <path d="M8.5 7.2 Q12 8.6 15.5 7.2" />
      <path d="M8 10.5 Q12 12 16 10.5" />
      <path d="M8 14 Q12 15.5 16 14" />
      <path d="M8.5 17.3 Q12 18.5 15.5 17.3" />
    </svg>
  )
}

// Fission Coffee Lab — a clean oval bean with its characteristic center
// seam, not coffee-shop branding.
export function CoffeeBeanGlyph({ className, strokeWidth = 1.5, style }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="12" cy="12" rx="6" ry="9" />
      <path d="M12.5 4.2 C9.5 7.2 15 10 12 12 C9 14 15 16.8 11.5 19.8" />
    </svg>
  )
}

// The Proving Grounds — concentric rings, a center point, and calibration
// ticks: a testing/precision-instrument mark, not a trophy or certificate
// glyph. The filled center dot is the one small exception to stroke-only
// construction, kept because it materially improves legibility at 20px.
export function ProvingGroundsGlyph({ className, strokeWidth = 1.5, style }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <line x1="12" y1="1" x2="12" y2="3.5" />
      <line x1="12" y1="20.5" x2="12" y2="23" />
      <line x1="1" y1="12" x2="3.5" y2="12" />
      <line x1="20.5" y1="12" x2="23" y2="12" />
    </svg>
  )
}
