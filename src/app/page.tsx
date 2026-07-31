import { getDashboardStats, getKanbanEvents } from '@/lib/db'
import { KanbanBoard } from '@/components/KanbanBoard'
import { UpcomingEventsCard } from '@/components/UpcomingEventsCard'
import { NotificationSummaryCard } from '@/components/NotificationSummaryCard'
import { DashboardBeoDrop } from '@/components/DashboardBeoDrop'
import Link from 'next/link'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default function Dashboard() {
  const {
    eventsThisMonth, eventsThisWeek, upcomingEvents,
    highRiskCount, highBarImpactCount,
  } = getDashboardStats()
  const kanban = getKanbanEvents()
  const dateLabel = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="px-4 py-5 space-y-5 max-w-5xl mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-xs sm:max-w-md">
          <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mb-1">{dateLabel}</p>
          <h1 className="text-xl font-bold tracking-widest uppercase text-gray-900 leading-none">Dashboard</h1>
          <p className="mt-1.5 font-crimson italic text-sm text-gray-500 leading-relaxed">
            Exceptional hospitality is never accidental. It is the result of exceptional preparation.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/today"
            className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-200 hover:text-gray-900 transition-colors tracking-wide"
          >
            Today
          </Link>
          <Link
            href="/events/new"
            className="px-3 py-1.5 rounded-lg bg-[#C8973A] text-white text-xs font-semibold hover:bg-[#b07d2e] transition-colors tracking-wide"
          >
            + New Event
          </Link>
        </div>
      </div>

      {/* Notification Center summary */}
      <NotificationSummaryCard />

      {/* Toast BEO import — scrape + attach to the matching event */}
      <DashboardBeoDrop />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="This Month" metrics={[
          { label: 'Total Events', value: String(eventsThisMonth) },
        ]} />
        <StatCard label="Next 14 Days" metrics={[
          { label: 'Event Count', value: String(eventsThisWeek) },
          { label: 'High Risk Events', value: String(highRiskCount) },
          { label: 'High Bar Impact Events', value: String(highBarImpactCount) },
        ]} />
      </div>

      {/* Upcoming Events */}
      <UpcomingEventsCard events={upcomingEvents} />

      {/* Event Status Board */}
      <section className="space-y-2">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500">Pipeline</p>
          <div className="flex-1 border-t border-gray-200" />
        </div>
        <KanbanBoard initialEvents={kanban} />
      </section>

    </div>
  )
}

function StatCard({ label, metrics }: { label: string; metrics: Array<{ label: string; value: string }> }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 border-l-2 border-l-[#C8973A] px-4 py-3.5 space-y-2.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 leading-none">{label}</p>
      {metrics.map(m => (
        <div key={m.label} className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 leading-none">{m.label}</p>
          <p className="text-lg font-bold leading-none text-gray-900 tabular-nums">{m.value}</p>
        </div>
      ))}
    </div>
  )
}
