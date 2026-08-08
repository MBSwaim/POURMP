import Link from 'next/link'
import { format } from 'date-fns'
import { Rocket, CalendarCheck, ListChecks, BarChart3 } from 'lucide-react'
import { getTaproomDashboard } from '@/lib/db'
import { generateAlerts, getNotificationFeed } from '@/lib/alerts'
import { DEMO_ADMIN } from './adminDemoData'
import { DestinationCard } from './DestinationCard'

export const dynamic = 'force-dynamic'

// Admin — the signed-in POURMP coordinator/admin Home. A dark, branded hero
// of four destination-level entry points sits above the existing operational
// surface (Today at a Glance + secondary utilities), which is unchanged in
// data/behavior — every number below is still read from the same
// getTaproomDashboard()/alerts functions /taproom and /home already use, never
// re-derived. Identity is the isolated Admin prototype identity in
// adminDemoData.ts — intentionally distinct from /home's employee identity,
// not a real session. Icon language here (lucide-react) is a deliberate,
// scoped exception to the emoji-only nav convention, same as
// PourmpFramework.tsx on the front door — not extended to SideNav.
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
    <div>
      {/* Signed-in destination hero — dark/branded, visually related to the
          front door. Everything below this hero stays a light, readable
          operational surface (hybrid page, not a full black page). */}
      <div className="bg-[#0b0c0e] px-4 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-3">{dateLabel}</p>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#C8973A] mb-2">
            Welcome Back, {DEMO_ADMIN.name}
          </p>
          <h1 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-white leading-tight">
            Ready To Make
            <br />
            <span className="text-[#C8973A]">It Happen?</span>
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-white/50 max-w-md leading-relaxed">
            Access your tools, training and resources.
            <br />
            Live the MP standard.
          </p>

          <div className="mt-6 sm:mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <DestinationCard
              icon={Rocket}
              title={<>Launch Pad<br />Training Academy</>}
              tagline="Learn. Grow. Launch."
              href="/academy"
            />
            <DestinationCard
              icon={CalendarCheck}
              title={<>Event<br />Workspace</>}
              tagline="Plan. Execute. Wow."
              href="/events"
            />
            <DestinationCard
              icon={ListChecks}
              title={<>Daily<br />Operations</>}
              tagline="Execute with Excellence."
              comingSoon
            />
            <DestinationCard
              icon={BarChart3}
              title={<>Reports &amp;<br />Insights</>}
              tagline="Data that Drives Us."
              comingSoon
            />
          </div>
        </div>
      </div>

      {/* Operational working surface — unchanged data/behavior, light for readability */}
      <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto">

        {/* Today at a Glance */}
        <section className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-900 mb-3">Today at a Glance</p>
          <div className="grid grid-cols-3 gap-3">
            <GlanceStat label="Reservations Today" value={taproom.stats.reservationsToday} />
            <GlanceStat label="Private Events Tonight" value={taproom.stats.privateEventCount} />
            <GlanceStat label="Pending Bar Alerts" value={pendingBarAlerts} />
          </div>
        </section>

        {/* Secondary utility layer — existing tools, preserved, de-emphasized
            relative to the four POURMP destinations above */}
        <section className="space-y-2">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500">More Tools</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          </div>
        </section>
      </div>
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
