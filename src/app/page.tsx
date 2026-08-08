import Link from 'next/link'
import { DEMO_IDENTITY } from '@/lib/demoIdentity'
import { PourmpFramework } from './PourmpFramework'

export const dynamic = 'force-dynamic'

// POURMP application front door — the full-bleed arrival experience. No
// SideNav, no shell chrome (see AppShell.tsx's exact-match `/` branch).
// Establishes who we are, what POURMP represents, and who is entering, before
// the operating system begins at /admin. Identity is isolated prototype data
// (see src/lib/demoIdentity.ts) — there is no real authentication yet.
//
// LOGO ASSET: public/brand/pourmp-logo.png — the approved circular POURMP mark.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e] rounded'

export default function FrontDoorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0c0e] px-6 py-16 sm:py-20">
      <div className="w-full max-w-md text-center">

        {/* Approved circular POURMP mark — visual anchor of the arrival moment */}
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/pourmp-logo.png"
            alt="POURMP — Manhattan Project Beer Company"
            className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full"
          />
        </div>

        {/* Wordmark */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-[0.08em] uppercase text-white leading-none">
            POURMP
          </h1>
          <p className="mt-3 text-xs font-semibold tracking-[0.3em] uppercase text-[#C8973A]">
            FOH Operating System
          </p>
        </div>

        <div className="h-px w-12 bg-white/15 mx-auto mb-8" />

        {/* Identity — isolated prototype data, not a real session */}
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/40 mb-2">
            Welcome
          </p>
          <p className="text-base text-white font-medium">{DEMO_IDENTITY.name}</p>
          <p className="text-xs text-white/40 mt-1">
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
