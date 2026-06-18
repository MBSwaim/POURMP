import { getDashboardStats, getKanbanEvents, getNewLeads } from '@/lib/db'
import { KanbanBoard } from '@/components/KanbanBoard'
import { UpcomingEventsCard } from '@/components/UpcomingEventsCard'
import { NewLeadsCard } from '@/components/NewLeadsCard'
import { formatCurrency } from '@/lib/calculations'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function Dashboard() {
  const { eventsThisMonth, revenueProjected, depositsOutstanding, eventsThisWeek, upcomingEvents } = getDashboardStats()
  const kanban = getKanbanEvents()
  const newLeads = getNewLeads()

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-wide">Dashboard</h1>
        <Link
          href="/events/new"
          className="px-3 py-1.5 rounded-lg bg-[#C8973A] text-white text-xs font-medium hover:bg-[#b07d2e] transition-colors"
        >
          + New Event
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Events This Month" value={String(eventsThisMonth)} />
        <StatCard label="Revenue Projected" value={formatCurrency(revenueProjected)} />
        <StatCard label="Deposits Outstanding" value={formatCurrency(depositsOutstanding)} accent />
        <StatCard label="Events Next 14 Days" value={String(eventsThisWeek)} />
      </div>

      {/* New Leads + Upcoming side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <NewLeadsCard initialLeads={newLeads} />
        <UpcomingEventsCard events={upcomingEvents} />
      </div>

      {/* Kanban */}
      <section>
        <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-2">Pipeline</p>
        <KanbanBoard initialEvents={kanban} />
      </section>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-[#1F3348] border border-white/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 leading-none mb-1">{label}</p>
      <p className={`text-lg font-bold leading-none ${accent ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}
