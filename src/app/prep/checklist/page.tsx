import { getEvents, getEventFull, syncEventTasks } from '@/lib/db'
import { ChecklistClient } from './ChecklistClient'

export const dynamic = 'force-dynamic'

export default function ChecklistPage({ searchParams }: { searchParams: { event?: string } }) {
  const today = new Date().toISOString().slice(0, 10)
  const events = getEvents()
    .filter(e => e.status !== 'Closed' && e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  const eventId = searchParams.event ? Number(searchParams.event) : null
  const eventFull = eventId ? getEventFull(eventId) : null
  // Same canonical loader the Event Workspace's Tasks tab uses, so this checklist
  // can never disagree with what the Workspace shows for the same event.
  const initialTasks = eventId ? syncEventTasks(eventId) : []

  return (
    <div className="min-h-screen bg-gray-50">
      <ChecklistClient
        events={events}
        initialEventId={searchParams.event ?? ''}
        eventFull={eventFull}
        initialTasks={initialTasks}
      />
    </div>
  )
}
