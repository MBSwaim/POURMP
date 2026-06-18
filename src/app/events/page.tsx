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
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {statusFilter ? `${statusFilter} Events` : `${year} Events`}
          </h1>
          {statusFilter && <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-widest">{year}</p>}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Year picker */}
          <div className="flex items-center gap-1">
            {olderYear && (
              <Link href={`/events?year=${olderYear}${statusFilter ? `&status=${statusFilter}` : ''}`}
                className="px-2.5 py-1.5 rounded-lg border border-white/20 bg-[#1F3348] text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors tracking-widest uppercase">
                ← {olderYear}
              </Link>
            )}
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest uppercase border ${
              isCurrentYear
                ? 'border-[#C8973A]/50 bg-[#C8973A]/10 text-[#C8973A]'
                : 'border-white/20 bg-[#1F3348] text-gray-300'
            }`}>{year}</span>
            {newerYear && (
              <Link href={`/events?year=${newerYear}${statusFilter ? `&status=${statusFilter}` : ''}`}
                className="px-2.5 py-1.5 rounded-lg border border-white/20 bg-[#1F3348] text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors tracking-widest uppercase">
                {newerYear} →
              </Link>
            )}
          </div>
          <Link href="/events/new"
            className="px-4 py-2 rounded-lg bg-[#C8973A] text-white text-xs font-bold tracking-widest uppercase hover:bg-[#b07d2e] transition-colors">
            + New Event
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      {events.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-[#1F3348]/60 border border-white/10 px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Events</p>
            <p className="text-xl font-bold">{events.length}</p>
          </div>
          <div className="rounded-lg bg-[#1F3348]/60 border border-white/10 px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{isCurrentYear ? 'Upcoming' : 'Confirmed'}</p>
            <p className="text-xl font-bold">{isCurrentYear ? upcoming : confirmed}</p>
          </div>
          <div className="rounded-lg bg-[#1F3348]/60 border border-white/10 px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Value</p>
            <p className="text-xl font-bold text-[#C8973A]">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#1F3348]/30 py-20 text-center text-gray-400">
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
