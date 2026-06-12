import { getEventFull, getPackages } from '@/lib/db'
import { notFound } from 'next/navigation'
import { EventDetailClient } from './EventDetailClient'

export const dynamic = 'force-dynamic'

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const raw = getEventFull(Number(params.id))
  if (!raw) notFound()
  const packages = getPackages()
  const data = { ...raw, client: raw.client ?? null, details: raw.details ?? null }
  return <EventDetailClient data={data} packages={packages} />
}
