import { getDashboardStats, getKanbanEvents } from '@/lib/db'
import { KanbanBoard } from '@/components/KanbanBoard'
import { StatusBadge } from '@/components/StatusBadge'
import { formatCurrency } from '@/lib/calculations'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function Dashboard() {
  const { eventsThisMonth, revenueProjected, depositsOutstanding, eventsThisWeek, upcomingEvents } = getDashboardStats()
  const kanban = getKanbanEvents()

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/events/new"
          className="px-4 py-2 rounded-lg bg-[#C8973A] text-white text-sm font-medium hover:bg-[#b07d2e] transition-colors"
        >
          + New Event
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Events This Month" value={String(eventsThisMonth)} />
        <StatCard label="Revenue Projected" value={formatCurrency(revenueProjected)} />
        <StatCard label="Deposits Outstanding" value={formatCurrency(depositsOutstanding)} accent />
        <StatCard label="Events Next 14 Days" value={String(eventsThisWeek)} />
      </div>

      {/* Kanban */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Pipeline</h2>
        <KanbanBoard initialEvents={kanban} />
      </section>

      {/* Upcoming */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Upcoming Events (14 days)</h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-gray-400 text-sm">No upcoming events.</p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-[#1F3348] border border-white/10 hover:border-[#C8973A]/40 transition-colors"
              >
                <div>
                  <span className="font-medium">{ev.event_name}</span>
                  <span className="text-gray-400 text-sm ml-3">{ev.first_name} {ev.last_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">{ev.event_date}</span>
                  <StatusBadge status={ev.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-[#1F3348] border border-white/10 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}
