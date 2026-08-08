import Link from 'next/link'
import { DEMO_IDENTITY } from '@/lib/demoIdentity'
import { PourmpFramework } from './PourmpFramework'
import { OrbitalBackdrop } from './OrbitalBackdrop'
import { TechnicalReticle } from './TechnicalReticle'

export const dynamic = 'force-dynamic'

// POURMP application front door — the full-bleed arrival experience. No
// SideNav, no shell chrome (see AppShell.tsx's exact-match `/` branch).
// Establishes who we are, what POURMP represents, and who is entering, before
// the operating system begins at /admin. Identity is isolated prototype data
// (see src/lib/demoIdentity.ts) — there is no real authentication yet, so the
// identity panel below is deliberately a status readout ("Signed In As"),
// never styled to imply a login form.
//
// LOGO ASSET: public/brand/pourmp-logo.png — the approved circular POURMP
// mark. It remains the sole brand mark on this page — no second logo/
// wordmark image is introduced; "Manhattan Project Beer Company" appears
// only as restrained secondary typography beneath the FOH Operating System
// kicker, never as competing brand art.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b355]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e] rounded'

export default function FrontDoorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0d0e10] to-[#0b0c0e] px-6 py-16 sm:py-20">
      {/* Hero column only — backdrop is scoped here (not the whole page) so it
          can never visually reach the Behavior Framework/closing sections
          below, which are separate siblings with their own height. */}
      <div className="relative w-full max-w-md text-center">
        <OrbitalBackdrop />
        {/* Same instrument-panel reticle language as /admin (see
            TechnicalReticle), tuned even quieter here — it should read as
            something noticed in the background, not a second decorative
            layer competing with OrbitalBackdrop or the badge. */}
        <TechnicalReticle opacity={0.035} />
        <div className="relative z-10">

          {/* Approved circular POURMP mark — sole brand mark and visual
              anchor of the arrival moment. */}
          <div className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/pourmp-logo.png"
              alt="POURMP — Manhattan Project Beer Company"
              className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full"
            />
          </div>

          {/* Wordmark + supporting identity */}
          <div className="mb-5">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-[0.08em] uppercase text-white leading-none">
              POURMP
            </h1>
            <p className="mt-3 text-xs font-semibold tracking-[0.3em] uppercase text-[#C8973A]">
              FOH Operating System
            </p>
            <p className="mt-1.5 text-[9px] font-semibold tracking-[0.25em] uppercase text-white/30">
              Manhattan Project Beer Company
            </p>
          </div>

          {/* Brand statement — reinforces identity before the CTA */}
          <p className="mb-6 text-sm text-white/50 italic leading-snug">
            Anybody can pour beer.
            <br />
            <span className="text-[#e0b355] font-semibold not-italic">We pour MP.</span>
          </p>

          {/* Supporting information — a restrained technical eyebrow, not a
              second headline */}
          <p className="mb-6 text-[9px] font-bold tracking-[0.35em] uppercase text-white/35">
            Tools. Training. Execution.
          </p>

          <div className="h-px w-12 bg-white/15 mx-auto mb-8" />

          {/* Identity — isolated prototype data, not a real session. A
              status readout, not a login form: no fields, no submit action,
              just who the shell currently treats as signed in. */}
          <div className="mb-8 mx-auto max-w-[220px] rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3.5">
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-white/30 mb-1.5">
              Signed In As
            </p>
            <p className="text-sm text-white font-medium">{DEMO_IDENTITY.name}</p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {DEMO_IDENTITY.role} · {DEMO_IDENTITY.location}
            </p>
          </div>

          {/* Single entry action — the front door has exactly one job */}
          <Link
            href="/admin"
            className={`inline-flex items-center justify-center w-full min-h-11 rounded-lg bg-[#C8973A] text-white text-xs font-bold uppercase tracking-widest px-5 py-3 hover:bg-[#b07d2e] transition-colors ${FOCUS_RING}`}
          >
            Enter POURMP →
          </Link>
        </div>
      </div>

      {/* POURMP behavior framework — deliberately wider than the identity/CTA
          column above so all six items get room to breathe on desktop; it
          does not need to match that column's narrow width. POURMP is FOH
          behavior language derived from the official MP Core Values, not a
          replacement for them. Each item reveals the official value/promise
          it comes from on hover/focus/tap. See PourmpFramework.tsx. */}
      <div className="w-full max-w-5xl mt-14 sm:mt-16 text-center">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40 mb-6">
          POURMP Behavior Framework
        </p>
        <PourmpFramework />
      </div>

      {/* Brand closing — the philosophical conclusion, not another CTA */}
      <div className="w-full max-w-md mt-14 sm:mt-16 text-center">
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-white/70">
          We Make Beautiful Beer!
        </p>
        <p className="text-[11px] tracking-[0.1em] uppercase text-white/35 mt-1.5">
          Because People Deserve Better.
        </p>
      </div>
    </div>
  )
}
