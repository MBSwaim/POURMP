import { format } from 'date-fns'
import Link from 'next/link'
import { getEventFull } from '@/lib/db'
import { getDb } from '@/lib/db-internal'
import { calcAllItems, getApplicableSauces, parseMenuItemOverrides, type MenuItem as CalcMenuItem } from '@/lib/calculations'
import { to12Hour, shiftTime } from '@/lib/timeUtils'

export const dynamic = 'force-dynamic'

async function getEventsForDate(dateStr: string) {
  const db = getDb()
  const rows = db.prepare(
    `SELECT id FROM events WHERE event_date = ? AND status != 'Closed' ORDER BY event_time ASC`
  ).all(dateStr) as { id: number }[]

  const events = []
  for (const row of rows) {
    const full = getEventFull(row.id)
    if (full) events.push(full)
  }
  return events
}

export default async function TodayPage({ searchParams }: { searchParams: { date?: string } }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  // Use ?date= param if provided and valid (YYYY-MM-DD), otherwise use actual today
  const rawDate = searchParams.date
  const dateStr = (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) ? rawDate : today
  const isToday = dateStr === today

  const events = await getEventsForDate(dateStr)
  const todayFormatted = format(new Date(dateStr + 'T12:00:00'), 'EEEE, MMMM d, yyyy')

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-xl font-bold text-[#C8973A] tracking-widest uppercase">
            {isToday ? 'Today' : 'Events'} — {todayFormatted}
          </h1>
          <p className="text-xs text-gray-500 mt-1 tracking-wide">
            On-shift reference · {events.length} event{events.length !== 1 ? 's' : ''} {isToday ? 'today' : 'on this date'}
          </p>
        </div>

        {events.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-lg font-semibold text-gray-900 tracking-wide">No events scheduled for today</p>
            <p className="text-sm text-gray-500 mt-1">{todayFormatted}</p>
          </div>
        ) : (
          events.map(({ event, client, details, pkg, menuItems }) => {
            const clientName = client
              ? [client.first_name, client.last_name].filter(Boolean).join(' ')
              : '—'

            // Time strip
            const productionClose = event.production_close_time || (event.event_time ? shiftTime(event.event_time, -120) : null)
            const setupBegins = event.setup_time || (event.event_time ? shiftTime(event.event_time, -90) : null)
            const foodReadyBy = event.event_time ? shiftTime(event.event_time, -15) : null
            const eventStart = event.event_time
            const eventEnd = event.teardown_time

            // Calculations
            const guestCount = details?.guest_count ?? 0
            const bufferPct = details?.buffer_pct ?? 0
            const calcItems = menuItems && menuItems.length > 0
              ? calcAllItems(menuItems as CalcMenuItem[], guestCount, bufferPct, parseMenuItemOverrides(details?.menu_item_overrides_json))
              : []

            // Sauces
            const applicableSauces = menuItems ? getApplicableSauces(menuItems) : []
            const selectedSauceIds = details?.selected_sauces
              ? details.selected_sauces.split(',').map((s: string) => s.trim()).filter(Boolean)
              : []
            const saucesToShow = applicableSauces.filter(s =>
              !s.selectable || selectedSauceIds.includes(s.name)
            )

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
              <div key={event.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">

                {/* Card header */}
                <div className="p-5 border-b border-gray-200 bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 tracking-wide">
                        {event.event_name || '(Unnamed Event)'}
                      </h2>
                      <p className="text-sm text-[#C8973A] mt-0.5">{clientName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{todayFormatted}</p>
                    </div>
                    {event.space && (
                      <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-3 py-1 self-start">
                        {event.space}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time strip */}
                <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 overflow-x-auto">
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
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5 border-b border-gray-200">

                  {/* Left: Buffet */}
                  <div>
                    <h3 className="text-xs font-bold text-[#C8973A] tracking-widest uppercase mb-3">Buffet</h3>
                    {pkg ? (
                      <p className="text-sm font-semibold text-gray-900 mb-1">{pkg.name}</p>
                    ) : (
                      <p className="text-sm text-gray-500 italic mb-1">No package selected</p>
                    )}
                    <p className="text-xs text-gray-500 mb-3">
                      {guestCount} guests
                      {bufferPct > 0 ? ` + ${Math.round(bufferPct * 100)}% buffer` : ''}
                    </p>

                    {calcItems.length > 0 ? (
                      <ul className="space-y-1.5">
                        {calcItems.map((item) => (
                          <li key={item.item_name} className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="text-gray-700">{item.item_name}</span>
                            <span className="text-gray-900 font-mono font-semibold shrink-0">{item.display}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No menu items</p>
                    )}

                    {saucesToShow.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Sauces</p>
                        <div className="flex flex-wrap gap-1.5">
                          {saucesToShow.map(s => (
                            <span key={s.name} className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5">
                              {s.name}
                            </span>
                          ))}
                        </div>
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
                          <p className="text-xs text-gray-700 leading-relaxed">{tabDetails}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dietary Alerts */}
                {dietaryRestrictions && (
                  <div className="px-5 py-3 border-b border-gray-200 bg-red-50">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">
                      ⚠ Dietary Restrictions
                    </p>
                    <p className="text-sm text-red-700">{dietaryRestrictions}</p>
                  </div>
                )}

                {/* Staff Notes */}
                {(foodNotes || setupNotes || staffingNotes) && (
                  <div className="px-5 py-3 border-b border-gray-200 space-y-3">
                    <p className="text-xs font-bold text-[#C8973A] uppercase tracking-widest">Staff Notes</p>
                    {foodNotes && <NoteBlock label="Food" note={foodNotes} />}
                    {setupNotes && <NoteBlock label="Setup" note={setupNotes} />}
                    {staffingNotes && <NoteBlock label="Staffing" note={staffingNotes} />}
                  </div>
                )}

                {/* Quick links */}
                <div className="px-5 py-4 flex flex-wrap gap-4 bg-gray-50">
                  <Link
                    href={`/prep/checklist?event=${event.id}`}
                    className="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
                  >
                    ✓ Setup Checklist →
                  </Link>
                  <Link
                    href={`/events/${event.id}`}
                    className="text-xs font-semibold text-[#C8973A] hover:text-[#e0a94a] transition-colors"
                  >
                    View Event →
                  </Link>
                  <Link
                    href={`/prep/kitchen-sheet?event=${event.id}`}
                    className="text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    Kitchen Sheet →
                  </Link>
                  <Link
                    href={`/prep/beo?event=${event.id}`}
                    className="text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors"
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
      ? 'text-green-600 font-bold'
      : 'text-gray-500'

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
      <span className="text-xs text-gray-900 text-right">{value}</span>
    </div>
  )
}

function NoteBlock({ label, note }: { label: string; note: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs text-gray-700 leading-relaxed">{note}</p>
    </div>
  )
}
