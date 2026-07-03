export const dynamic = 'force-dynamic'

import { getOperationalDashboard } from '@/lib/db'
import { OperationsClient } from './OperationsClient'

export default function OperationsPage() {
  const data = getOperationalDashboard()
  return (
    <div className="px-4 py-5 max-w-5xl mx-auto">
      <OperationsClient data={data} />
    </div>
  )
}
