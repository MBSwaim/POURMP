import { getArchivedEvents, getAvailableYears } from '@/lib/db'
import Link from 'next/link'
import { ArchiveTable } from './ArchiveTable'

export const dynamic = 'force-dynamic'

export default function ArchivePage({ searchParams }: { searchParams: { year?: string } }) {
  const availableYears = getAvailableYears()
  const currentYear = new Date().getFullYear()
  const year = searchParams.year ? Number(searchParams.year) : undefined

  const events = getArchivedEvents(year)
  const displayYear = year ? String(year) : 'All Years'

  return (
    <div className="px-4 py-5 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mb-1">{displayYear}</p>
          <h1 className="text-xl font-bold tracking-widest uppercase leading-none">Archive</h1>
        </div>

        {/* Year picker */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href="/archive"
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              !year ? 'bg-[#C8973A]/15 border-[#C8973A]/50 text-[#C8973A]' : 'border-white/15 text-gray-400 hover:text-white hover:border-white/30'
            }`}
          >
            All
          </Link>
          {availableYears.filter(y => y < currentYear).map((y) => (
            <Link
              key={y}
              href={`/archive?year=${y}`}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                year === y ? 'bg-[#C8973A]/15 border-[#C8973A]/50 text-[#C8973A]' : 'border-white/15 text-gray-400 hover:text-white hover:border-white/30'
              }`}
            >
              {y}
            </Link>
          ))}
          <Link
            href={`/archive?year=${currentYear}`}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              year === currentYear ? 'bg-[#C8973A]/15 border-[#C8973A]/50 text-[#C8973A]' : 'border-white/15 text-gray-400 hover:text-white hover:border-white/30'
            }`}
          >
            {currentYear}
          </Link>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        {events.length} event{events.length !== 1 ? 's' : ''}
      </p>

      {events.length === 0 ? (
        <div className="rounded-xl border border-white/10 py-16 text-center">
          <p className="text-gray-500 text-sm">No archived events found.</p>
        </div>
      ) : (
        <ArchiveTable events={events} />
      )}
    </div>
  )
}
