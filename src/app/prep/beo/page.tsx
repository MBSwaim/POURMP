import { getEvents } from '@/lib/db'
import { BEOClient } from './BEOClient'

export const dynamic = 'force-dynamic'

export default function BEOPage({ searchParams }: { searchParams: { event?: string } }) {
  const today = new Date().toISOString().slice(0, 10)
  const events = getEvents()
    .filter(e => e.status !== 'Closed' && e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  return (
    <div className="p-6 max-w-4xl mx-auto print:p-0 print:max-w-none">
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold">Banquet Event Order</h1>
        <p className="text-gray-500 text-sm mt-1">
          Full run-of-show document for confirmed upcoming events.
        </p>
      </div>
      <BEOClient events={events} initialEventId={searchParams.event ?? ''} />
    </div>
  )
}
