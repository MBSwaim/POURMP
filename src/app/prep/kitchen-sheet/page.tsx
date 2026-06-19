import { getEvents } from '@/lib/db'
import { KitchenSheetClient } from './KitchenSheetClient'

export const dynamic = 'force-dynamic'

export default function KitchenSheetPage({ searchParams }: { searchParams: { event?: string } }) {
  const today = new Date().toISOString().slice(0, 10)
  const events = getEvents()
    .filter(e => e.status === 'Confirmed' && e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  return (
    <div className="p-6 max-w-4xl mx-auto print:p-0 print:max-w-none">
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold">Kitchen Sheet</h1>
        <p className="text-gray-400 text-sm mt-1">
          Print-ready prep quantities for confirmed upcoming events.
        </p>
      </div>
      <KitchenSheetClient events={events} initialEventId={searchParams.event ?? ''} />
    </div>
  )
}
