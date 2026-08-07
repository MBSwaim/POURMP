import { format, parseISO } from 'date-fns'
import { getTaproomDashboard } from '@/lib/db'
import { generateAlerts, getNotificationFeed } from '@/lib/alerts'
import { TaproomClient } from './TaproomClient'

export const dynamic = 'force-dynamic'

export default function TaproomPage() {
  const data = getTaproomDashboard()

  // Reuse the same alert engine/feed as the Notification Center — filtered down to
  // only what's relevant to today's floor: today's reservations and today's events.
  generateAlerts()
  const { pending } = getNotificationFeed()
  const todayReservationIds = new Set(data.reservations.map(r => r.id))
  const todayEventIds = new Set(data.events.map(e => e.id))
  const alerts = pending.filter(a =>
    (a.entity_type === 'reservation' && todayReservationIds.has(a.entity_id)) ||
    (a.entity_type === 'event' && todayEventIds.has(a.entity_id))
  )

  const dateLabel = format(parseISO(data.date), 'EEEE, MMMM d')

  return (
    <div className="px-4 py-5 max-w-5xl mx-auto">
      <TaproomClient data={data} initialAlerts={alerts} dateLabel={dateLabel} />
    </div>
  )
}
