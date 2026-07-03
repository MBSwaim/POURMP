import { getDashboardStats, getKanbanEvents } from '@/lib/db'
import { KanbanBoard } from '@/components/KanbanBoard'
import { UpcomingEventsCard } from '@/components/UpcomingEventsCard'
import { NotificationSummaryCard } from '@/components/NotificationSummaryCard'
import Link from 'next/link'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default function Dashboard() {
  const { eventsThisMonth, eventsThisWeek, upcomingEvents } = getDashboardStats()
  const kanban = getKanbanEvents()
  const dateLabel = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="px-4 py-5 space-y-5 max-w-5xl mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mb-1">{dateLabel}</p>
          <h1 className="text-xl font-bold tracking-widest uppercase text-gray-900 leading-none">Dashboard</h1>
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="This Month" value={String(eventsThisMonth)} />
        <StatCard label="Next 14 Days" value={String(eventsThisWeek)} />
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 border-l-2 border-l-[#C8973A] px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 leading-none mb-2">{label}</p>
      <p className="text-2xl font-bold leading-none text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}
