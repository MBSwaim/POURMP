import { format } from 'date-fns'
import Link from 'next/link'
import { getEventFull } from '@/lib/db'
import { getDb } from '@/lib/db-internal'
import { calcAllItems, type MenuItem as CalcMenuItem } from '@/lib/calculations'
import { to12Hour, shiftTime } from '@/lib/timeUtils'

export const dynamic = 'force-dynamic'

async function getTodayEvents() {
  const db = getDb()
  const today = format(new Date(), 'yyyy-MM-dd')
  const rows = db.prepare(
    `SELECT id FROM events WHERE event_date = ? AND status = 'Confirmed' ORDER BY event_time ASC`
  ).all(today) as { id: number }[]

  const events = []
  for (const row of rows) {
    const full = getEventFull(row.id)
    if (full) events.push(full)
  }
  return { events, today }
}

export default async function TodayPage() {
  const { events, today } = await getTodayEvents()
  const todayFormatted = format(new Date(today + 'T12:00:00'), 'EEEE, MMMM d, yyyy')

  return (
    <div className="min-h-screen bg-[#0f1e2d] text-white">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-xl font-bold text-[#C8973A] tracking-widest uppercase">
            Today — {todayFormatted}
          </h1>
          <p className="text-xs text-gray-400 mt-1 tracking-wide">
            On-shift reference · {events.length} event{events.length !== 1 ? 's' : ''} today
          </p>
        </div>

        {events.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-10 text-center">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-lg font-semibold text-white tracking-wide">No events scheduled for today</p>
            <p className="text-sm text-gray-400 mt-1">{todayFormatted}</p>
          </div>
        ) : (
          events.map(({ event, client, details, pkg, menuItems, packages }) => {
            const clientName = client
              ? [client.first_name, client.last_name].filter(Boolean).join(' ')
              : '—'

            // Time strip
            const productionClose = event.production_close_time || (event.event_time ? shiftTime(event.event_time, -120) : null)
            const setupBegins = event.setup_time || (event.event_time ? shiftTime(event.event_time, -90) : null)
            const foodReadyBy = event.event_time ? shiftTime(event.event_time, -15) : null
            const eventStart = event.event_time
            const eventEnd = event.teardown_time

            // Use multi-package data if available, else fall back to single pkg
            const guestCount = details?.guest_count ?? 0
            const bufferPct = details?.buffer_pct ?? 0
            const allPackages = packages && packages.length > 0
              ? packages
              : (pkg ? [{ pkg, menuItems: menuItems as CalcMenuItem[], guest_count: guestCount, buffer_pct: bufferPct }] : [])

            // Bar
            const barTabType = details?.bar_tab_type || '—'
            const drinkTickets = details?.drink_tickets
            const tabDetails = details?.tab_details?.trim()
            const barTabLimit = details?.bar_tab_limit

            // Alerts & notes
            const dietaryRestrictions = details?.dietary_restrictions?.trim()
            const foodNotes = details?.food_notes?.trim()
            const setupNotes = details?.setup_notes?.trim()
            const staffingNotes = details?.staffing_notes?.trim()

            return (
              <div key={event.id} className="rounded-xl border border-white/10 bg-[#1F3348]/50 overflow-hidden">

                {/* Card header */}
                <div className="p-5 border-b border-white/10 bg-[#1F3348]/80">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-wide">
                        {event.event_name || '(Unnamed Event)'}
                      </h2>
                      <p className="text-sm text-[#C8973A] mt-0.5">{clientName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{todayFormatted}</p>
                    </div>
                    {event.space && (
                      <span className="text-xs bg-white/10 text-gray-300 rounded-full px-3 py-1 self-start">
                        {event.space}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time strip */}
                <div className="px-5 py-3 border-b border-white/10 bg-black/20 overflow-x-auto">
                  <div className="flex items-center gap-1 min-w-max text-xs">
                    <TimeChip label="Production Closes" time={productionClose} />
                    <Divider />
                    <TimeChip label="Setup Begins" time={setupBegins} />
                    <Divider />
                    <TimeChip label="Food Ready By" time={foodReadyBy} highlight="amber" />
                    <Divider />
                    <TimeChip label="Event Start" time={eventStart} highlight="green" />
                    <Divider />
                    <TimeChip label="Event End" time={eventEnd} />
                  </div>
                </div>

                {/* Two-column grid */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5 border-b border-white/10">

                  {/* Left: Buffet */}
                  <div>
                    <h3 className="text-xs font-bold text-[#C8973A] tracking-widest uppercase mb-3">Buffet</h3>
                    {allPackages.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No package selected</p>
                    ) : (
                      <div className="space-y-4">
                        {allPackages.map((ep, idx) => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const calcItems = ep.pkg && ep.menuItems.length > 0
                            ? calcAllItems(ep.menuItems as CalcMenuItem[], ep.guest_count, ep.buffer_pct)
                            : []
                          return (
                            <div key={idx}>
                              {allPackages.length > 1 && (
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Package {idx + 1}</p>
                              )}
                              {ep.pkg ? (
                                <p className="text-sm font-semibold text-white mb-1">{ep.pkg.name}</p>
                              ) : (
                                <p className="text-sm text-gray-500 italic mb-1">No package selected</p>
                              )}
                              <p className="text-xs text-gray-400 mb-2">
                                {ep.guest_count} guests
                                {ep.buffer_pct > 0 ? ` + ${Math.round(ep.buffer_pct * 100)}% buffer` : ''}
                              </p>
                              {calcItems.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {calcItems.map((item) => (
                                    <li key={item.item_name} className="flex items-baseline justify-between gap-2 text-xs">
                                      <span className="text-gray-300">{item.item_name}</span>
                                      <span className="text-white font-mono font-semibold shrink-0">{item.display}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-gray-500 italic">No menu items</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right: Bar Setup */}
                  <div>
                    <h3 className="text-xs font-bold text-[#C8973A] tracking-widest uppercase mb-3">Bar Setup</h3>
                    <div className="space-y-2.5">
                      <InfoRow label="Bar Tab Type" value={barTabType} />
                      {drinkTickets != null && drinkTickets > 0 && (
                        <InfoRow label="Drink Tickets" value={String(drinkTickets)} />
                      )}
                      {barTabLimit != null && barTabLimit > 0 && (
                        <InfoRow label="Tab Limit" value={`$${barTabLimit.toFixed(0)}`} />
                      )}
                      {tabDetails && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Tab Details</p>
                          <p className="text-xs text-gray-300 leading-relaxed">{tabDetails}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dietary Alerts */}
                {dietaryRestrictions && (
                  <div className="px-5 py-3 border-b border-white/10 bg-red-900/30">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">
                      ⚠ Dietary Restrictions
                    </p>
                    <p className="text-sm text-red-200">{dietaryRestrictions}</p>
                  </div>
                )}

                {/* Staff Notes */}
                {(foodNotes || setupNotes || staffingNotes) && (
                  <div className="px-5 py-3 border-b border-white/10 space-y-3">
                    <p className="text-xs font-bold text-[#C8973A] uppercase tracking-widest">Staff Notes</p>
                    {foodNotes && <NoteBlock label="Food" note={foodNotes} />}
                    {setupNotes && <NoteBlock label="Setup" note={setupNotes} />}
                    {staffingNotes && <NoteBlock label="Staffing" note={staffingNotes} />}
                  </div>
                )}

                {/* Quick links */}
                <div className="px-5 py-4 flex flex-wrap gap-4 bg-black/10">
                  <Link
                    href={`/events/${event.id}`}
                    className="text-xs font-semibold text-[#C8973A] hover:text-[#e0a94a] transition-colors"
                  >
                    View Event →
                  </Link>
                  <Link
                    href={`/prep/kitchen-sheet?event=${event.id}`}
                    className="text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                  >
                    Kitchen Sheet →
                  </Link>
                  <Link
                    href={`/prep/beo?event=${event.id}`}
                    className="text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                  >
                    BEO →
                  </Link>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimeChip({
  label,
  time,
  highlight,
}: {
  label: string
  time: string | null | undefined
  highlight?: 'amber' | 'green'
}) {
  const colorClass =
    highlight === 'amber'
      ? 'text-[#C8973A] font-bold'
      : highlight === 'green'
      ? 'text-green-400 font-bold'
      : 'text-gray-400'

  return (
    <div className="flex flex-col items-center px-2 py-1">
      <span className={`text-sm font-mono ${colorClass}`}>{to12Hour(time)}</span>
      <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">
        {label}
      </span>
    </div>
  )
}

function Divider() {
  return <span className="text-gray-700 select-none px-0.5">·</span>
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-xs text-white text-right">{value}</span>
    </div>
  )
}

function NoteBlock({ label, note }: { label: string; note: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs text-gray-300 leading-relaxed">{note}</p>
    </div>
  )
}
