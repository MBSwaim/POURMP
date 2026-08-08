import { GraduationCap, Beer, Coffee, Award } from 'lucide-react'
import { OrbitalBackdrop } from '../OrbitalBackdrop'
import { TechnicalReticle } from '../TechnicalReticle'
import { LaunchPadCard } from './_components/LaunchPadCard'

export const dynamic = 'force-dynamic'

// Launch Pad — the employee-development hub inside POURMP. Distinct from
// Taproom Academy: Taproom Academy is one destination INSIDE Launch Pad, not
// a synonym for it (see LaunchPadCard below). This page overrides
// academy/layout.tsx's cream background with its own full-bleed dark
// surface — the same pattern the front door and /admin already use — so
// layout.tsx itself stays untouched and Taproom Academy's cream pages
// underneath are unaffected.
export default function LaunchPadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d0e10] to-[#0b0c0e]">
      <div className="relative px-4 py-10 sm:py-14 overflow-hidden">
        <OrbitalBackdrop />
        <TechnicalReticle opacity={0.035} />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#C8973A] mb-3">
            Employee Development
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white leading-tight">
            Launch Pad
          </h1>
          <p className="mt-3 text-sm text-white/50 italic leading-snug">
            Learn it. Live it. <span className="text-[#e0b355] font-semibold not-italic">Own it.</span>
          </p>
        </div>

        {/* Tall destination panels, not dashboard buttons — proportions
            matter more than forcing four columns at every width, so mobile
            stacks single-column and tablet runs 2x2 rather than squashing
            the cards horizontally. */}
        <div className="relative z-10 max-w-4xl mx-auto mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <LaunchPadCard
            icon={GraduationCap}
            eyebrow="Core MP Training"
            title={
              <>
                Taproom
                <br />
                Academy
              </>
            }
            description={
              <>
                Build the foundation.
                <br />
                Live the MP standard.
              </>
            }
            href="/academy/taproom"
            flagship
          />
          <LaunchPadCard
            icon={Beer}
            eyebrow="Beer Knowledge"
            title="Project Pint"
            description={
              <>
                Master our beer.
                <br />
                Share it with passion.
              </>
            }
            comingSoon
            accent="copper"
          />
          <LaunchPadCard
            icon={Coffee}
            eyebrow="Coffee Training"
            title={
              <>
                Fission
                <br />
                Coffee Lab
              </>
            }
            description={
              <>
                Fuel curiosity.
                <br />
                Brew connection.
              </>
            }
            comingSoon
            accent="bronze"
          />
          <LaunchPadCard
            icon={Award}
            eyebrow="Certification Prep"
            title={
              <>
                The Proving
                <br />
                Grounds
              </>
            }
            description={
              <>
                Practice with purpose.
                <br />
                Prove what you know.
              </>
            }
            comingSoon
            accent="steel"
            insignia="reticle"
            microcopy="Learn → Practice → Prove → Certify"
          />
        </div>
      </div>
    </div>
  )
}
