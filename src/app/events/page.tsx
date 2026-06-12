import { getEvents } from '@/lib/db'
import { StatusBadge, PaymentStatusBadge } from '@/components/StatusBadge'
import { formatCurrency } from '@/lib/calculations'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function EventsPage() {
  const events = getEvents()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <Link
          href="/events/new"
          className="px-4 py-2 rounded-lg bg-[#C8973A] text-white text-sm font-medium hover:bg-[#b07d2e] transition-colors"
        >
          + New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No events yet.</p>
          <p className="text-sm mt-1">Create your first event to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1F3348] border-b border-white/10">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Event</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Client</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Guests</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Package</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Value</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev, i) => {
                const payStatus = ev.deposit_status === 'overdue' || ev.final_status === 'overdue'
                  ? 'overdue'
                  : ev.deposit_status === 'paid' && ev.final_status === 'paid'
                  ? 'paid'
                  : ev.deposit_status ?? 'none'
                return (
                  <tr
                    key={ev.id}
                    className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/events/${ev.id}`} className="hover:text-[#C8973A] transition-colors font-medium">
                        {ev.event_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{ev.first_name} {ev.last_name}</td>
                    <td className="px-4 py-3 text-gray-300">{ev.event_date}</td>
                    <td className="px-4 py-3 text-gray-300">{ev.guest_count ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{ev.package_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {ev.guest_count && ev.price_per_guest
                        ? formatCurrency(ev.guest_count * ev.price_per_guest)
                        : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                    <td className="px-4 py-3">
                      {payStatus !== 'none' ? <PaymentStatusBadge status={payStatus} /> : <span className="text-gray-500">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
