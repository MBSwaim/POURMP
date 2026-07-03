import { getEventFull, getPackages, syncEventTasks } from '@/lib/db'
import { notFound } from 'next/navigation'
import { EventDetailClient } from './EventDetailClient'

export const dynamic = 'force-dynamic'

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const raw = getEventFull(Number(params.id))
  if (!raw) notFound()
  const packages = getPackages()
  const data = { ...raw, client: raw.client ?? null, details: raw.details ?? null }
  const initialTasks = syncEventTasks(Number(params.id))
  return <EventDetailClient data={data} packages={packages} initialTasks={initialTasks} />
}
