import { getArchivedEvents, getAvailableYears } from '@/lib/db'
import { StatusBadge } from '@/components/StatusBadge'
import { formatCurrency } from '@/lib/calculations'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function ArchivePage({ searchParams }: { searchParams: { year?: string } }) {
  const availableYears = getAvailableYears()
  const currentYear = new Date().getFullYear()
  const year = searchParams.year ? Number(searchParams.year) : undefined
  const selectedYear = year ?? undefined

  const events = getArchivedEvents(selectedYear)

  const displayYear = year ? String(year) : 'All Years'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Archive</h1>
          <p className="text-gray-400 text-sm mt-0.5">Closed events from prior months</p>
        </div>

        {/* Year picker */}
        <div className="flex items-center gap-2">
          <Link
            href="/archive"
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              !year ? 'bg-[#C8973A]/20 border-[#C8973A] text-[#C8973A]' : 'border-white/20 text-gray-400 hover:text-white'
            }`}
          >
            All
          </Link>
          {availableYears.filter(y => y < currentYear).map((y) => (
            <Link
              key={y}
              href={`/archive?year=${y}`}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                year === y ? 'bg-[#C8973A]/20 border-[#C8973A] text-[#C8973A]' : 'border-white/20 text-gray-400 hover:text-white'
              }`}
            >
              {y}
            </Link>
          ))}
          {/* Include current year if there are prior-month closed events */}
          <Link
            href={`/archive?year=${currentYear}`}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              year === currentYear ? 'bg-[#C8973A]/20 border-[#C8973A] text-[#C8973A]' : 'border-white/20 text-gray-400 hover:text-white'
            }`}
          >
            {currentYear}
          </Link>
        </div>
      </div>

      <div className="text-sm text-gray-400">
        {events.length} event{events.length !== 1 ? 's' : ''} — {displayYear}
      </div>

      {events.length === 0 ? (
        <p className="text-gray-500 italic text-sm">No archived events found.</p>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Event</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Value</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr
                  key={ev.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link href={`/events/${ev.id}`} className="font-medium hover:text-[#C8973A] transition-colors">
                      {ev.event_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {ev.first_name} {ev.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{ev.event_date}</td>
                  <td className="px-4 py-3 text-right text-[#C8973A]">
                    {ev.guest_count > 0 && ev.price_per_guest > 0
                      ? formatCurrency(ev.guest_count * ev.price_per_guest)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={ev.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
