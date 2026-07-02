export const dynamic = 'force-dynamic'

import { getStaffMembers } from '@/lib/db'
import { StaffClient } from './StaffClient'

export default function StaffPage() {
  const staff = getStaffMembers(false)
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Staff Directory</h1>
        <p className="text-sm text-gray-400 mt-0.5">Used to assign reservation leads and route future SMS/Email alerts.</p>
      </div>
      <StaffClient initialStaff={staff} />
    </div>
  )
}
