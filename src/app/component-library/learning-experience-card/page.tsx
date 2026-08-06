import { LearningExperienceCard } from '@/components/library/LearningExperienceCard'

export const dynamic = 'force-dynamic'

// Internal component-demonstration surface for C-002 (Learning Experience
// Card). Reachable only by direct URL — intentionally not in the sidebar or
// any product navigation. Static demo data only; nothing here is wired to a
// real academy, lesson, or backend.

export default function LearningExperienceCardDemoPage() {
  return (
    <div className="px-4 py-5 space-y-6 max-w-2xl mx-auto">
      <div>
        <p className="text-[10px] text-[#999] tracking-[0.2em] uppercase mb-1">Component Library · C-002</p>
        <h1 className="text-xl font-bold tracking-widest uppercase leading-none text-[#1b1b1b]">
          Learning Experience Card
        </h1>
        <p className="mt-1.5 text-sm text-[#777] leading-relaxed">
          All four states, shown with static example data from different illustrative academies to demonstrate
          reuse beyond Taproom Academy. Nothing on this page is wired to real data or navigation.
        </p>
      </div>

      <section className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">Ready</p>
        <LearningExperienceCard
          academy="Taproom Academy"
          experienceId="LE-001"
          title="Welcome to Manhattan Project"
          estimatedTime="10 Minutes"
          learningObjective="Learn why Manhattan Project exists and the role every team member plays in creating exceptional guest experiences."
          state="ready"
          primaryActionHref="#"
        />
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">In Progress</p>
        <LearningExperienceCard
          academy="Beer Academy (Example)"
          experienceId="LE-014"
          title="Reading a Tap List Like a Guide"
          estimatedTime="15 Minutes"
          learningObjective="Build the confidence to answer a guest's first question about what's pouring today."
          state="in_progress"
          primaryActionHref="#"
        />
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">Completed</p>
        <LearningExperienceCard
          academy="Operations Academy (Example)"
          experienceId="LE-007"
          title="Opening the Taproom Safely"
          estimatedTime="12 Minutes"
          learningObjective="Understand the calm, unhurried rhythm of a proper opening shift."
          state="completed"
          primaryActionHref="#"
        />
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#999]">Locked</p>
        <LearningExperienceCard
          academy="Leadership Academy (Example)"
          experienceId="LE-022"
          title="Coaching Without Blame"
          estimatedTime="20 Minutes"
          learningObjective="Learn how to turn a missed standard into a real coaching moment."
          state="locked"
          lockedReason="Unlocks after Core Certification is complete."
        />
      </section>
    </div>
  )
}
