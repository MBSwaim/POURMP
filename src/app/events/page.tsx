export const dynamic = 'force-dynamic'

import { getEvents, getAvailableYears } from '@/lib/db'
import { formatCurrency } from '@/lib/calculations'
import Link from 'next/link'
import { EventsTable } from './EventsTable'

export default function EventsPage({ searchParams }: { searchParams: { year?: string; status?: string } }) {
  const now = new Date()
  const availableYears = getAvailableYears()
  const currentYear = now.getFullYear()
  const defaultYear = availableYears.includes(currentYear) ? currentYear : (availableYears[0] ?? currentYear)
  const year = Number(searchParams.year ?? defaultYear)
  const statusFilter = searchParams.status ?? null

  const allEvents = getEvents(year)
  const events = statusFilter ? allEvents.filter(e => e.status === statusFilter) : allEvents
  const isCurrentYear = year === currentYear

  const idx = availableYears.indexOf(year)
  const olderYear = availableYears[idx + 1] ?? null
  const newerYear = availableYears[idx - 1] ?? null

  const today = now.toISOString().slice(0, 10)
  const upcoming  = allEvents.filter(e => e.event_date >= today).length
  const confirmed = allEvents.filter(e => e.status === 'Confirmed').length
  const totalValue = allEvents.reduce((sum, e) =>
    sum + (e.guest_count && e.price_per_guest ? e.guest_count * e.price_per_guest : 0), 0)

  return (
    <div className="px-4 py-5 space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mb-1">{year}</p>
          <h1 className="text-xl font-bold tracking-widest uppercase leading-none">
            {statusFilter ? `${statusFilter} Events` : 'Events'}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year picker */}
          <div className="flex items-center gap-1">
            {olderYear && (
              <Link href={`/events?year=${olderYear}${statusFilter ? `&status=${statusFilter}` : ''}`}
                className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                ← {olderYear}
              </Link>
            )}
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest border ${
              isCurrentYear
                ? 'border-[#C8973A]/40 bg-[#C8973A]/10 text-[#C8973A]'
                : 'border-gray-300 bg-white text-gray-700'
            }`}>{year}</span>
            {newerYear && (
              <Link href={`/events?year=${newerYear}${statusFilter ? `&status=${statusFilter}` : ''}`}
                className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                {newerYear} →
              </Link>
            )}
          </div>
          <Link href="/events/new"
            className="px-3 py-1.5 rounded-lg bg-[#C8973A] text-white text-xs font-semibold hover:bg-[#b07d2e] transition-colors tracking-wide">
            + New Event
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      {events.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white border border-gray-200 border-l-2 border-l-gray-300 px-4 py-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.18em] mb-1.5">Total</p>
            <p className="text-xl font-bold tabular-nums">{events.length}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 border-l-2 border-l-green-500/50 px-4 py-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.18em] mb-1.5">{isCurrentYear ? 'Upcoming' : 'Confirmed'}</p>
            <p className="text-xl font-bold tabular-nums">{isCurrentYear ? upcoming : confirmed}</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 border-l-2 border-l-[#C8973A] px-4 py-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.18em] mb-1.5">Value</p>
            <p className="text-xl font-bold text-[#C8973A] tabular-nums">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 py-20 text-center text-gray-500">
          <p className="text-lg">No events in {year}.</p>
          {olderYear && (
            <Link href={`/events?year=${olderYear}`} className="text-sm text-[#C8973A] hover:underline mt-2 inline-block">
              View {olderYear} events →
            </Link>
          )}
        </div>
      ) : (
        <EventsTable initialEvents={events} year={year} isCurrentYear={isCurrentYear} statusFilter={statusFilter} />
      )}
    </div>
  )
}
