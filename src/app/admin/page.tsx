import Link from 'next/link'
import { format } from 'date-fns'
import { getTaproomDashboard } from '@/lib/db'
import { generateAlerts, getNotificationFeed } from '@/lib/alerts'
import { DEMO_ADMIN } from './adminDemoData'

export const dynamic = 'force-dynamic'

// Admin — Friday demo prototype. A cross-feature launch and action surface, not a
// second financial/readiness dashboard (that's / and /operations, both untouched
// here). Every number below is read from the same getTaproomDashboard()/alerts
// functions /taproom and /home already use — never re-derived. The one prototype-
// only piece is the Admin identity in adminDemoData.ts, standing in for real
// company-email auth that doesn't exist yet.
export default function AdminPage() {
  const dateLabel = format(new Date(), 'EEEE, MMMM d')

  const taproom = getTaproomDashboard()

  // Same alert engine/feed and same today-scoped filter as /taproom and /home —
  // reused, not re-implemented.
  generateAlerts()
  const { pending } = getNotificationFeed()
  const todayReservationIds = new Set(taproom.reservations.map(r => r.id))
  const todayEventIds = new Set(taproom.events.map(e => e.id))
  const pendingBarAlerts = pending.filter(a =>
    (a.entity_type === 'reservation' && todayReservationIds.has(a.entity_id)) ||
    (a.entity_type === 'event' && todayEventIds.has(a.entity_id))
  ).length

  return (
    <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto">

      {/* Admin identity + framing */}
      <div>
        <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mb-1">{dateLabel}</p>
        <h1 className="text-xl font-bold tracking-widest uppercase text-gray-900 leading-none">
          Welcome, {DEMO_ADMIN.name}
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">{DEMO_ADMIN.role} · {DEMO_ADMIN.email}</p>
        <p className="mt-2.5 text-sm text-gray-500 max-w-md">
          What do I need to manage or act on today?
        </p>
      </div>

      {/* Today at a Glance */}
      <section className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-900 mb-3">Today at a Glance</p>
        <div className="grid grid-cols-3 gap-3">
          <GlanceStat label="Reservations Today" value={taproom.stats.reservationsToday} />
          <GlanceStat label="Private Events Tonight" value={taproom.stats.privateEventCount} />
          <GlanceStat label="Pending Bar Alerts" value={pendingBarAlerts} />
        </div>
      </section>

      {/* Launch grid */}
      <section className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-900">Manage &amp; Explore</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LaunchCard
            title="Create Table Reservation"
            description="Create or edit table reservations using the West Dallas Reservation Floor Plan."
            href="/reservations"
          />
          <LaunchCard
            title="Today's Taproom Brief"
            description="Review the Daily FOH Operating Brief."
            href="/taproom"
          />
          <LaunchCard
            title="Employee Home"
            description="Preview the Team Member experience."
            href="/home"
          />
          <LaunchCard
            title="Academy / Learning"
            description="Review the employee learning journey."
            href="/academy"
          />
          <LaunchCard
            title="Events"
            description="Access existing Events functionality."
            href="/events"
          />

          {/* Feedback / Product Ideas — intentionally non-interactive. No href, no
              form, no storage. Communicates future product direction only. */}
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-5 py-4 opacity-80">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-600">Feedback / Product Ideas</h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 border border-gray-300 rounded-full px-2 py-0.5 whitespace-nowrap">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Report bugs, suggest improvements, and request new POURMP capabilities.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function GlanceStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1 leading-snug">{label}</p>
    </div>
  )
}

function LaunchCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-[#C8973A]/40 hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)]"
    >
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{description}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#C8973A] mt-3 group-hover:text-[#e0a94a] transition-colors">
        Open →
      </p>
    </Link>
  )
}
