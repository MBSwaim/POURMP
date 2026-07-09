import { notFound } from 'next/navigation'
import { getPrepOutputsData } from '@/lib/prepOutputsData'
import { PrepOutputsClient } from './PrepOutputsClient'

export const dynamic = 'force-dynamic'

export default function PrepPage({ params }: { params: { id: string } }) {
  const data = getPrepOutputsData(Number(params.id))
  if (!data) notFound()

  return (
    <PrepOutputsClient
      ev={data.ev}
      initialTicketLog={data.ticketLog}
      initialDebrief={data.debrief}
      clientHistory={data.clientHistory}
      tasks={data.tasks}
      risks={data.risks}
    />
  )
}
