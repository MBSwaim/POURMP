export const dynamic = 'force-dynamic'

import { getCalendarEvents, getBlockedDates } from '@/lib/db'
import { CalendarView } from './CalendarView'

export default function CalendarPage({ searchParams }: { searchParams: { year?: string; month?: string } }) {
  const now = new Date()
  const year = Number(searchParams.year ?? now.getFullYear())
  const month = Number(searchParams.month ?? now.getMonth() + 1)
  const events = getCalendarEvents(year, month) as Array<{ id: number; event_name: string; event_date: string; status: string; first_name: string; last_name: string }>
  const blockedDates = getBlockedDates(year, month)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>
      <CalendarView events={events} year={year} month={month} blockedDates={blockedDates} />
    </div>
  )
}
