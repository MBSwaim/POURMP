import { AcademyCard } from './_components/AcademyCard'

export const dynamic = 'force-dynamic'

export default function AcademyPage() {
  return (
    <div className="px-4 py-5 space-y-5 max-w-3xl mx-auto">
      <div>
        <p className="text-[10px] text-[#999] tracking-[0.2em] uppercase mb-1">Learning</p>
        <h1 className="text-xl font-bold tracking-widest uppercase leading-none text-[#1b1b1b]">Academy</h1>
        <p className="mt-1.5 text-sm text-[#777] leading-relaxed">
          Where the team learns, trains, and grows.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AcademyCard
          name="Taproom Academy"
          description="Core Certification — a five-shift journey from new hire to independently running a standard shift."
          href="/academy/taproom"
          status="active"
        />
        <AcademyCard
          name="Beer Academy"
          description="Beer knowledge, styles, and tasting — in development."
          status="future"
        />
        <AcademyCard
          name="Coffee Academy"
          description="Coffee program training — planned for a future phase."
          status="future"
        />
      </div>
    </div>
  )
}
