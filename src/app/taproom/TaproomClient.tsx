'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { to12Hour } from '@/lib/timeUtils'
import { IMPACT_COLORS, type ImpactLevel } from '@/lib/barImpact'
import type { NotificationFeedItem } from '@/components/NotificationRow'
import type { TaproomDashboard } from '@/lib/db'

/** "303,304" → "Tables 303 + 304"; "301" → "Table 301"; empty → ''. Formatting only —
 *  no floor/occupancy meaning, just printing the specific tables a reservation holds. */
function formatTables(csv: string): string {
  const nums = (csv || '').split(',').map(s => s.trim()).filter(Boolean)
  if (nums.length === 0) return ''
  return `Table${nums.length > 1 ? 's' : ''} ${nums.join(' + ')}`
}

export function TaproomClient({ data, initialAlerts, dateLabel }: {
  data: TaproomDashboard
  initialAlerts: NotificationFeedItem[]
  dateLabel: string
}) {
  const router = useRouter()
  const [alerts, setAlerts] = useState(initialAlerts)

  async function dismissAlert(id: number) {
    setAlerts(prev => prev.filter(a => a.id !== id))
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    toast.success('Alert marked complete')
    router.refresh()
  }

  // Confirms the physical reservation setup (the specific table(s)) has been prepared
  // ahead of the guest's arrival — reuses the existing tables_assigned_at field, just
  // presented to FOH under its actual operational meaning rather than as table/floor status.
  async function completeReservationSetup(entityId: number) {
    setAlerts(prev => prev.filter(a => !(a.entity_type === 'reservation' && a.entity_id === entityId)))
    await fetch(`/api/reservations/${entityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tables_assigned_at: new Date().toISOString() }),
    })
    toast.success('Setup Complete ✓')
    router.refresh()
  }

  const activeReservations = data.reservations.filter(r => r.status !== 'Cancelled' && r.status !== 'No-Show')

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mb-1">{dateLabel} · Taproom Shift</p>
          <h1 className="text-xl font-bold tracking-widest uppercase text-gray-900 leading-none">Taproom Dashboard</h1>
          <p className="mt-1.5 text-xs text-gray-500 max-w-md leading-relaxed">
            Daily FOH operating brief — what the team needs to know to execute today&apos;s shift.
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
            href="/reservations"
            className="px-3 py-1.5 rounded-lg bg-[#C8973A] text-white text-xs font-semibold hover:bg-[#b07d2e] transition-colors tracking-wide"
          >
            + New Reservation
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 px-4 py-3.5 flex items-center justify-between">
          <p className="text-sm text-gray-500">No pending alerts for today&apos;s shift</p>
          <Link href="/notifications" className="text-xs text-[#C8973A] hover:underline shrink-0">
            Notification Center →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-[#C8973A]/40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C8973A]">
              {alerts.length} Pending Alert{alerts.length === 1 ? '' : 's'}
            </p>
            <Link href="/notifications" className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {alerts.map(item => (
              <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.subtitle}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {item.entity_type === 'reservation' && (
                    <button
                      onClick={() => completeReservationSetup(item.entity_id)}
                      className="text-xs px-2.5 py-1 rounded-md bg-[#C8973A]/15 text-[#C8973A] hover:bg-[#C8973A] hover:text-white transition-colors whitespace-nowrap"
                    >
                      Reservation Setup Complete
                    </button>
                  )}
                  <button
                    onClick={() => dismissAlert(item.id)}
                    className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Reservations Today" value={data.stats.reservationsToday} />
        <StatCard label="Private Events Tonight" value={data.stats.privateEventCount} suffix={data.stats.privateEventGuests > 0 ? `· ${data.stats.privateEventGuests} gst` : undefined} />
        <StatCard label="Pending Bar Alerts" value={alerts.length} />
      </div>

      {/* Two column: events + reservations */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 items-start">

        {/* Left: private events impacting bar */}
        <div className="space-y-3">
          <SectionLabel emoji="🍺" title="Private Events Impacting Main Bar" hint="Scored from guest count, tab type, day & start time" />
          {data.events.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-sm text-gray-500">No private events on the books today.</p>
            </div>
          ) : (
            data.events.map(ev => <EventCard key={ev.id} event={ev} />)
          )}
        </div>

        {/* Right: reservations brief */}
        <div className="space-y-3">
          <SectionLabel emoji="🪑" title="Reservations Today" />
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {activeReservations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">No reservations today.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {activeReservations.map(r => {
                  const tablesLabel = formatTables(r.table_numbers)
                  return (
                    <div key={r.id} className="px-4 py-3">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold tabular-nums">{to12Hour(r.reservation_time)}</span>
                        <span className="text-gray-400"> · </span>
                        <span className="font-semibold">{r.client_name}</span>
                        <span className="text-gray-400"> · </span>
                        <span>{r.party_size || '—'} Guest{r.party_size === 1 ? '' : 's'}</span>
                        {tablesLabel && (
                          <>
                            <span className="text-gray-400"> · </span>
                            <span>{tablesLabel}</span>
                          </>
                        )}
                      </p>
                      {r.notes && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{r.notes}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 border-l-2 border-l-[#C8973A] px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 leading-tight mb-2">{label}</p>
      <p className="text-2xl font-bold leading-none text-gray-900 tabular-nums">
        {value}
        {suffix && <span className="text-sm font-medium text-gray-400"> {suffix}</span>}
      </p>
    </div>
  )
}

function SectionLabel({ emoji, title, hint }: { emoji?: string; title: string; hint?: string }) {
  return (
    <p className="text-xs font-bold tracking-widest uppercase text-gray-900 flex items-baseline gap-2">
      {emoji && <span className="text-sm">{emoji}</span>}
      {title}
      {hint && <span className="text-[10px] font-normal normal-case tracking-normal text-gray-400">{hint}</span>}
    </p>
  )
}

function EventCard({ event }: { event: TaproomDashboard['events'][number] }) {
  const colors = IMPACT_COLORS[event.barImpactLevel as ImpactLevel]
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-200 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900 tracking-wide">{event.event_name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{event.client_name}</p>
        </div>
        {event.space && (
          <span className="text-[10px] bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 shrink-0">{event.space}</span>
        )}
      </div>
      <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center gap-2 text-xs tabular-nums">
        <span className="font-semibold text-gray-900">{to12Hour(event.event_time)}</span>
        <span className="text-gray-400">–</span>
        <span className="text-gray-500">{to12Hour(event.teardown_time)}</span>
      </div>
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide rounded-full px-2.5 py-1 border ${colors?.bg} ${colors?.text} ${colors?.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${colors?.dot}`} />
          {event.barImpactLevel} Bar Impact
        </span>
        <span className="text-xs text-gray-500">
          {event.guest_count} guests
          {event.bar_tab_type && <> · <span className="text-gray-900 font-medium">{event.bar_tab_type}</span></>}
          {event.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && event.drink_tickets > 0 && ` (${event.drink_tickets} tickets)`}
        </span>
      </div>
      {event.congestionNotes.length > 0 && (
        <div className="px-4 pb-3 text-xs text-gray-600 leading-relaxed flex gap-1.5">
          <span className="shrink-0">📌</span>
          <span>{event.congestionNotes[0]}</span>
        </div>
      )}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex gap-4 text-xs font-semibold">
        <Link href={`/events/${event.id}?tab=prep&doc=bar`} className="text-[#C8973A] hover:text-[#e0a94a] transition-colors">
          Bar Notes →
        </Link>
        <Link href={`/events/${event.id}`} className="text-gray-700 hover:text-gray-900 transition-colors">
          View Event →
        </Link>
      </div>
    </div>
  )
}
