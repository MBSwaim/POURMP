import { ReservationFloorPlanDemoClient } from './ReservationFloorPlanDemoClient'

export const dynamic = 'force-dynamic'

// Internal component-demonstration surface for ReservationFloorPlan.
// Reachable only by direct URL — intentionally not in the sidebar or any product
// navigation. Static West Dallas layout + local-only selection state; nothing here
// is wired to the real /reservations workflow, an API, or the database.

export default function ReservationFloorPlanDemoPage() {
  return (
    <div className="px-4 py-5 space-y-6 max-w-4xl mx-auto">
      <div>
        <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mb-1">Component Library · Reservation Floor Plan</p>
        <h1 className="text-xl font-bold tracking-widest uppercase leading-none text-gray-900">Reservation Floor Plan</h1>
        <p className="mt-1.5 text-sm text-gray-500 leading-relaxed max-w-2xl">
          Visual table picker for reservation administration — which exact table(s) am I reserving? Dining is the
          only reservable area; Bar, Patio, and Canning Line / Event Space are shown for spatial reference only.
          Not occupancy tracking, server sections, or a live floor-management screen.
        </p>
      </div>

      <ReservationFloorPlanDemoClient />
    </div>
  )
}
