'use client'
import { useRouter } from 'next/navigation'
import type { EventWithClient } from '@/lib/db'

interface Props {
  events: EventWithClient[]
  selectedId: string
}

export function PrepDocsPicker({ events, selectedId }: Props) {
  const router = useRouter()

  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(e.target.value ? `/prep-docs?event=${e.target.value}` : '/prep-docs')}
      className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
    >
      <option value="">— Select an event —</option>
      {events.map(e => (
        <option key={e.id} value={String(e.id)}>
          {e.event_date} · {e.event_name}
          {e.first_name ? ` (${e.first_name} ${e.last_name})` : ''}
        </option>
      ))}
    </select>
  )
}
