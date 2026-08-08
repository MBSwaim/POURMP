// Purely decorative, aria-hidden atmospheric backdrop shared by the front
// door and the /admin signed-in hero — the only two "entry experience"
// surfaces in this visual pass. Reuses the exact orbital-ellipse geometry
// from the approved logo mark (public/logo.svg) rather than a new asset, at
// very low opacity so it reads as texture, not decoration you consciously
// notice. No new dependencies, no new imagery.
export function OrbitalBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-[0.06] blur-3xl"
        style={{ background: 'radial-gradient(circle, #C8973A 0%, transparent 70%)' }}
      />
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] opacity-[0.05]"
        viewBox="0 0 248 242"
        fill="none"
      >
        <g stroke="#C8973A" strokeWidth="1.2">
          <ellipse cx="124" cy="121" rx="42" ry="91" />
          <ellipse cx="124" cy="121" rx="91" ry="38" transform="rotate(-29 124 121)" />
          <ellipse cx="124" cy="121" rx="91" ry="38" transform="rotate(29 124 121)" />
        </g>
      </svg>
    </div>
  )
}
