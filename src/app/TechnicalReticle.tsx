// Shared, purely decorative technical reticle — a restrained blueprint-style
// targeting ring with tick marks and corner registration brackets, reading
// as the same Manhattan-Project-era scientific/technical system as
// OrbitalBackdrop's atomic-orbital geometry, but a distinct instrument-panel
// motif. Extracted so /admin (IndustrialBackdrop) and the front door can
// share one source of geometry instead of duplicating the SVG — callers
// size/dim it to their own container via props rather than the component
// branching on where it's used. Always aria-hidden and pointer-events-none.
export function TechnicalReticle({
  opacity = 0.04,
  color = '#8a7f66',
  size = 1300,
  className = '',
}: {
  opacity?: number
  color?: string
  size?: number
  className?: string
}) {
  const ticks = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i * 30 * Math.PI) / 180
    const x1 = 200 + 160 * Math.cos(angle)
    const y1 = 200 + 160 * Math.sin(angle)
    const x2 = 200 + 174 * Math.cos(angle)
    const y2 = 200 + 174 * Math.sin(angle)
    return { x1, y1, x2, y2 }
  })

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: size, height: size, opacity }}
        viewBox="0 0 400 400"
        fill="none"
      >
        <g stroke={color} strokeWidth="1">
          <circle cx="200" cy="200" r="160" />
          <circle cx="200" cy="200" r="120" strokeDasharray="2 7" />
          <line x1="200" y1="14" x2="200" y2="386" />
          <line x1="14" y1="200" x2="386" y2="200" />
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </g>
        <g stroke={color} strokeWidth="1.2">
          <path d="M20,60 L20,20 L60,20" />
          <path d="M340,20 L380,20 L380,60" />
          <path d="M380,340 L380,380 L340,380" />
          <path d="M60,380 L20,380 L20,340" />
        </g>
      </svg>
    </div>
  )
}
