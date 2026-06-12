import { getPackages, getClients } from '@/lib/db'
import { NewEventForm } from './NewEventForm'

export default function NewEventPage() {
  const packages = getPackages()
  const clients = getClients()
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Event</h1>
      <NewEventForm packages={packages} clients={clients} />
    </div>
  )
}
