import { getEventFull, getPackages, syncEventTasks } from '@/lib/db'
import { getPrepOutputsData } from '@/lib/prepOutputsData'
import { notFound } from 'next/navigation'
import { EventDetailClient } from './EventDetailClient'

export const dynamic = 'force-dynamic'

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const raw = getEventFull(Number(params.id))
  if (!raw) notFound()
  const packages = getPackages()
  const data = { ...raw, client: raw.client ?? null, details: raw.details ?? null }
  const initialTasks = syncEventTasks(Number(params.id))
  // Same canonical loader the standalone /events/[id]/prep and /prep-docs routes use,
  // so the Workspace's Prep Docs tab can never drift from those entry points.
  const prepData = getPrepOutputsData(Number(params.id))
  return <EventDetailClient data={data} packages={packages} initialTasks={initialTasks} prepData={prepData} />
}
