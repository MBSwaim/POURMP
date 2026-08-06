import { JourneyCard } from '@/components/library/JourneyCard'

export const dynamic = 'force-dynamic'

// Internal component-demonstration surface for C-001 (Journey Card).
// Reachable only by direct URL — intentionally not in the sidebar or any
// product navigation. Static demo data only; nothing here is wired to a
// real academy, workspace, or backend.

export default function JourneyCardDemoPage() {
  return (
    <div className="px-4 py-5 space-y-6 max-w-2xl mx-auto">
      <div>
        <p className="text-[10px] text-[#999] tracking-[0.2em] uppercase mb-1">Component Library · C-001</p>
        <h1 className="text-xl font-bold tracking-widest uppercase leading-none text-[#1b1b1b]">Journey Card</h1>
        <p className="mt-1.5 text-sm text-[#777] leading-relaxed">
          All five states, shown with static example data from different illustrative journeys to demonstrate reuse
          beyond Taproom Academy. Nothing on this page is wired to real data or navigation.
        </p>
      </div>

      <section className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">Active</p>
        <JourneyCard
          journeyTitle="Taproom Core Certification"
          state="active"
          currentPosition="Shift 2 of 5"
          currentMilestone="I Know How We Serve"
          todaysFocus="Guest Hospitality"
          coachingMessage="Great hospitality begins with genuine curiosity."
          primaryActionHref="#"
        />
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">Ready</p>
        <JourneyCard
          journeyTitle="Beer Academy (Example)"
          state="ready"
          coachingMessage="Whenever you're ready, this journey is here for you."
          primaryActionHref="#"
        />
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">Completed</p>
        <JourneyCard
          journeyTitle="Opening Certification (Example)"
          state="completed"
          completedMilestone="Opening Certification Earned"
          coachingMessage="Well earned — this is part of how you show up for the team."
          primaryActionHref="#"
        />
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">Locked</p>
        <JourneyCard
          journeyTitle="Closing Certification (Example)"
          state="locked"
          lockedReason="Unlocks after Core Certification is complete."
        />
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">Paused</p>
        <JourneyCard
          journeyTitle="Coffee Academy (Example)"
          state="paused"
          currentStep={1}
          totalSteps={4}
          currentMilestone="Getting Started"
          pausedReason="This journey is paused for now. Pick it back up whenever it's the right time."
        />
      </section>
    </div>
  )
}
