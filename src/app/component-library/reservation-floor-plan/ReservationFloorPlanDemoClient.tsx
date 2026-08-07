'use client'
import { useState } from 'react'
import { ReservationFloorPlan } from '@/components/ReservationFloorPlan'
import { WEST_DALLAS_RESERVATION_LAYOUT, isWestDallasTableReservable } from '@/lib/floorPlans/westDallasReservationLayout'
import { TAPROOM_TABLES } from '@/lib/constants'

// Local-only demo state — no persistence, no API calls, no database writes. Presets
// below just jump this same live component into named states for quick review; the
// floor plan stays fully clickable/keyboard-operable at all times.
const RESERVABLE_NUMBERS = TAPROOM_TABLES.map(t => t.number)

const PRESETS: Array<{ label: string; tables: number[] }> = [
  { label: 'No tables selected', tables: [] },
  { label: 'One table selected (301)', tables: [301] },
  { label: 'Multiple tables selected (303 + 304)', tables: [303, 304] },
]

export function ReservationFloorPlanDemoClient() {
  const [selected, setSelected] = useState<number[]>([303, 304])

  function toggleTable(tableNumber: number) {
    if (!isWestDallasTableReservable(tableNumber)) return // defense in depth — non-reservable tables never reach onClick anyway
    setSelected(prev =>
      prev.includes(tableNumber) ? prev.filter(n => n !== tableNumber) : [...prev, tableNumber].sort((a, b) => a - b)
    )
  }

  const readout = selected.length > 0
    ? `Selected Tables: ${[...selected].sort((a, b) => a - b).join(' + ')}`
    : 'Selected Tables: none'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mr-1">Jump to:</span>
        {PRESETS.map(preset => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setSelected(preset.tables)}
            className="text-xs px-2.5 py-1.5 rounded-md bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[#C8973A]/40 bg-[#C8973A]/5 px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">{readout}</p>
      </div>

      <ReservationFloorPlan
        layout={WEST_DALLAS_RESERVATION_LAYOUT}
        reservableTableNumbers={RESERVABLE_NUMBERS}
        selectedTableNumbers={selected}
        onToggleTable={toggleTable}
      />
    </div>
  )
}
