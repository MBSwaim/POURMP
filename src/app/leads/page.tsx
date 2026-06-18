import { getLeads } from '@/lib/db'
import { LeadsClient } from './LeadsClient'

export const dynamic = 'force-dynamic'

export default function LeadsPage() {
  const leads = getLeads()
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Leads & Inquiries</h1>
        <p className="text-gray-400 text-sm mt-1">Incoming event requests from the booking form and manual entries.</p>
      </div>
      <LeadsClient leads={leads} />
    </div>
  )
}
