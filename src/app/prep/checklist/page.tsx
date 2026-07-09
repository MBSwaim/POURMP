import { getEvents, getEventFull } from '@/lib/db'
import { getChecklist } from '@/lib/db'
import { ChecklistClient } from './ChecklistClient'

export const dynamic = 'force-dynamic'

export default function ChecklistPage({ searchParams }: { searchParams: { event?: string } }) {
  const today = new Date().toISOString().slice(0, 10)
  const events = getEvents()
    .filter(e => e.status !== 'Closed' && e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  const eventId = searchParams.event ? Number(searchParams.event) : null
  const eventFull = eventId ? getEventFull(eventId) : null
  const initialChecked = eventId ? getChecklist(eventId) : {}

  return (
    <div className="min-h-screen bg-gray-50">
      <ChecklistClient
        events={events}
        initialEventId={searchParams.event ?? ''}
        eventFull={eventFull}
        initialChecked={initialChecked}
      />
    </div>
  )
}
