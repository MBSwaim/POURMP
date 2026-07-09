import { getEvents } from '@/lib/db'
import { getPrepOutputsData } from '@/lib/prepOutputsData'
import { PrepDocsPicker } from './PrepDocsPicker'
import { PrepOutputsClient } from '../events/[id]/prep/PrepOutputsClient'

export const dynamic = 'force-dynamic'

export default function PrepDocsPage({ searchParams }: { searchParams: { event?: string } }) {
  const today = new Date().toISOString().slice(0, 10)
  const events = getEvents()
    .filter(e => e.status !== 'Closed' && e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  const eventId = searchParams.event ? Number(searchParams.event) : null
  const data = eventId ? getPrepOutputsData(eventId) : null

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="no-print">
        <h1 className="text-lg font-bold text-gray-900 mb-2">Prep Docs</h1>
        <PrepDocsPicker events={events} selectedId={searchParams.event ?? ''} />
      </div>

      {!data ? (
        <p className="text-sm text-gray-500 no-print">Select an event above to build Toast Notes, Kitchen Sheet, FOH, Bar &amp; Run of Show.</p>
      ) : (
        <PrepOutputsClient
          ev={data.ev}
          initialTicketLog={data.ticketLog}
          initialDebrief={data.debrief}
          clientHistory={data.clientHistory}
          tasks={data.tasks}
          risks={data.risks}
        />
      )}
    </div>
  )
}
