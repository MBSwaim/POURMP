export const dynamic = 'force-dynamic'

import { getUpcomingReservations } from '@/lib/db'
import { ReservationsClient } from './ReservationsClient'

export default function ReservationsPage() {
  const reservations = getUpcomingReservations(100)
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Table Reservations</h1>
          <p className="text-sm text-gray-400 mt-0.5">For parties under 20 guests</p>
        </div>
      </div>
      <ReservationsClient initialReservations={reservations} />
    </div>
  )
}
