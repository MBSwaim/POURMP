import { getPackages, getClients } from '@/lib/db'
import { NewEventForm } from './NewEventForm'

interface Props {
  searchParams: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    event_date?: string
    guest_count?: string
    lead_id?: string
  }
}

export default function NewEventPage({ searchParams }: Props) {
  const packages = getPackages()
  const clients = getClients()
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Event</h1>
      <NewEventForm packages={packages} clients={clients} prefill={searchParams} />
    </div>
  )
}
