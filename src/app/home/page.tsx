import Link from 'next/link'
import { format } from 'date-fns'
import { getTaproomDashboard } from '@/lib/db'
import { generateAlerts, getNotificationFeed } from '@/lib/alerts'
import { JourneyCard } from '@/components/library/JourneyCard'
import { LearningExperienceCard, type LearningExperienceCardState } from '@/components/library/LearningExperienceCard'
import { TAPROOM_SHIFTS, getCurrentShift } from '@/app/academy/taproom/placeholderData'
import {
  DEMO_EMPLOYEE,
  FALLBACK_TODAYS_FOCUS,
  LESSON_DISPLAY_METADATA,
  DEFAULT_LESSON_DISPLAY_METADATA,
  MANHATTAN_MOMENT,
  GROWTH_RECOGNITION_EXAMPLE,
  CREDENTIALS_DEMO,
  type CredentialStatus,
} from './homeDemoData'

// Presentation only — reuses the same shared severity color convention already
// used across POURMP (bg-50/text-700/border-200) rather than inventing a new
// scale. "Due Soon" is intentionally yellow, not orange/red — this is a planning
// reminder, not an alarm.
const CREDENTIAL_STATUS_STYLE: Record<CredentialStatus, string> = {
  current: 'bg-green-50 text-green-700 border-green-200',
  due_soon: 'bg-yellow-50 text-yellow-700 border-yellow-200',
}
const CREDENTIAL_STATUS_LABEL: Record<CredentialStatus, string> = {
  current: 'Current',
  due_soon: 'Due Soon',
}

// Display-only mapping from the real Academy lesson state to the Learning
// Experience Card's state model. The two are deliberately different models (see
// LearningExperienceCard.tsx's own comment) — this never reads back into or
// changes Academy's real lesson state, it only chooses how to *display* it here.
function toLearningExperienceCardState(lessonState: string): LearningExperienceCardState {
  switch (lessonState) {
    case 'complete': return 'completed'
    case 'in_progress': return 'in_progress'
    // Content is done but awaiting trainer verification — closer to "still in
    // progress" than "completed" or "locked" from the learner's point of view.
    case 'trainer_signoff': return 'in_progress'
    default: return 'ready' // not_started
  }
}

export const dynamic = 'force-dynamic'

// Employee Home — Phase 1 prototype (Friday demo). Previews what an authenticated
// Team Member's daily front door will feel like: today's focus, a light-touch read
// of taproom activity, and where they stand in their learning journey. Deliberately
// thin — every number/status here is read from the same functions the real pages
// already use (getTaproomDashboard, the Academy placeholder data), never
// re-derived. See homeDemoData.ts for the one piece that's genuinely prototype-only:
// the demo identity, standing in for real auth that doesn't exist yet.
export default function HomePage() {
  const dateLabel = format(new Date(), 'EEEE, MMMM d')

  const taproom = getTaproomDashboard()

  // Same alert engine/feed and same today-scoped filter as /taproom itself —
  // reused, not re-implemented (see src/app/taproom/page.tsx).
  generateAlerts()
  const { pending } = getNotificationFeed()
  const todayReservationIds = new Set(taproom.reservations.map(r => r.id))
  const todayEventIds = new Set(taproom.events.map(e => e.id))
  const pendingBarAlerts = pending.filter(a =>
    (a.entity_type === 'reservation' && todayReservationIds.has(a.entity_id)) ||
    (a.entity_type === 'event' && todayEventIds.has(a.entity_id))
  ).length

  const currentShift = getCurrentShift()
  const todaysFocus = currentShift.todaysFocus ?? FALLBACK_TODAYS_FOCUS

  // The first not-yet-complete lesson in the current shift — a read-only
  // derivation over the real Academy data, same pattern as getCurrentShift()
  // itself, just one level deeper. Never mutates or persists anything.
  const currentLesson = currentShift.lessons.find(l => l.state !== 'complete') ?? currentShift.lessons[0]
  const lessonMeta = LESSON_DISPLAY_METADATA[currentLesson.id] ?? DEFAULT_LESSON_DISPLAY_METADATA

  return (
    <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">

      {/* Welcome / Today */}
      <div>
        <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mb-1">{dateLabel}</p>
        <h1 className="text-xl font-bold tracking-widest uppercase text-gray-900 leading-none">
          Welcome back, {DEMO_EMPLOYEE.firstName}
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">{DEMO_EMPLOYEE.shiftContext}</p>
        <p className="mt-2.5 text-xs text-gray-400 italic leading-relaxed max-w-md">
          First five minutes: review today&apos;s focus, check for anything important, and connect with your lead
          before the floor opens.
        </p>
      </div>

      {/* Today's Focus */}
      <section className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#C8973A] mb-1.5">Today&apos;s Focus</p>
        <p className="text-sm text-gray-900 leading-relaxed">{todaysFocus}</p>
      </section>

      {/* Today's Manhattan Moment */}
      <p className="text-sm text-gray-500 italic text-center px-4">
        {MANHATTAN_MOMENT}
      </p>

      {/* Today in the Taproom */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-900 mb-3">Today in the Taproom</p>
          <div className="grid grid-cols-3 gap-3">
            <TaproomStat label="Reservations Today" value={taproom.stats.reservationsToday} />
            <TaproomStat label="Private Events Tonight" value={taproom.stats.privateEventCount} />
            <TaproomStat label="Pending Bar Alerts" value={pendingBarAlerts} />
          </div>
        </div>
        <Link
          href="/taproom"
          className="block px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs font-semibold text-[#C8973A] hover:text-[#e0a94a] transition-colors"
        >
          View Full Daily FOH Operating Brief →
        </Link>
      </section>

      {/* My Journey */}
      <section className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-900">My Journey</p>
        <JourneyCard
          journeyTitle="Taproom Core Certification"
          state="active"
          currentPosition={`Shift ${currentShift.number} of ${TAPROOM_SHIFTS.length}: ${currentShift.title}`}
          currentStep={currentShift.number}
          totalSteps={TAPROOM_SHIFTS.length}
          currentMilestone={currentShift.confidenceStatement}
          todaysFocus={currentShift.todaysFocus}
          coachingMessage={currentShift.coachingMessage}
          primaryActionHref="/academy/taproom"
        />
      </section>

      {/* Continue Learning */}
      <section className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-900">Continue Learning</p>
        <LearningExperienceCard
          academy="Taproom Academy"
          experienceId={currentLesson.id.toUpperCase()}
          title={currentLesson.title}
          estimatedTime={lessonMeta.estimatedTime}
          learningObjective={lessonMeta.learningObjective}
          state={toLearningExperienceCardState(currentLesson.state)}
          primaryActionHref="/academy/taproom"
        />
      </section>

      {/* Growth / Recognition — a single illustrative example; see homeDemoData.ts */}
      <section className="rounded-xl bg-gray-50 px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Growth &amp; Recognition</p>
          <span className="text-[9px] text-gray-400 uppercase tracking-wide">Preview</span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{GROWTH_RECOGNITION_EXAMPLE.note}&rdquo;</p>
        <p className="text-xs text-gray-400 mt-1.5">
          {GROWTH_RECOGNITION_EXAMPLE.source} · {GROWTH_RECOGNITION_EXAMPLE.date}
        </p>
        <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
          A preview of how recognition will appear here — not live data yet.
        </p>
      </section>

      {/* Credentials — prototype data only; see homeDemoData.ts */}
      <section className="rounded-xl bg-gray-50 px-5 py-4">
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-3">Credentials</p>
        <div className="space-y-3">
          {CREDENTIALS_DEMO.map(cred => (
            <div key={cred.name} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-800 font-medium">{cred.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{cred.detail}</p>
              </div>
              <span
                className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${CREDENTIAL_STATUS_STYLE[cred.status]}`}
              >
                {CREDENTIAL_STATUS_LABEL[cred.status]}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
          Preview only — credential tracking, expiration reminders, and renewal uploads are not yet live.
        </p>
      </section>
    </div>
  )
}

function TaproomStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1 leading-snug">{label}</p>
    </div>
  )
}
