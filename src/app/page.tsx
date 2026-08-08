import Link from 'next/link'
import { DEMO_IDENTITY } from '@/lib/demoIdentity'

export const dynamic = 'force-dynamic'

// POURMP application front door. Answers, in the first few seconds: what app is
// this, who am I, what access do I have, where do I want to go, and is there
// anything I should know before I begin. Deliberately not an operational
// dashboard — see /dashboard for the Manager/Coordinator view this route used to
// serve (moved, unchanged). Identity is isolated prototype data (see
// src/lib/demoIdentity.ts) — there is no real authentication yet.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e] rounded'

export default function FrontDoorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0c0e] px-6 py-20">
      <div className="w-full max-w-sm text-center">

        {/* Wordmark — a dedicated POURMP mark/logo can be inserted into this block
            later without restructuring the page around it. */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold tracking-[0.08em] uppercase text-white leading-none">
            POURMP
          </h1>
          <p className="mt-3 text-xs font-semibold tracking-[0.3em] uppercase text-[#C8973A]">
            FOH Operating System
          </p>
        </div>

        <div className="h-px w-12 bg-white/15 mx-auto mb-10" />

        {/* Identity — isolated prototype data, not a real session */}
        <div className="mb-10">
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
    </div>
  )
}
