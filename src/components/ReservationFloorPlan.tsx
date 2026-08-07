'use client'
import type { CSSProperties } from 'react'
import type { FloorPlanArea, FloorPlanTable, ReservationFloorPlanLayout } from '@/lib/floorPlans/types'

// Visual table-picker for reservation administration: "which exact table(s) am I
// reserving?" Deliberately not occupancy tracking, server sections, table-turn
// management, or a live floor-management screen — it only ever reflects the
// caller's own selection state, nothing derived from real-time floor activity.
//
// Controlled component: selection state and reservability both live with the
// caller (see the demo page for the local-state example) — this component never
// owns selection state itself and never decides reservability on its own.

export interface ReservationFloorPlanProps {
  layout: ReservationFloorPlanLayout
  reservableTableNumbers: readonly number[]
  selectedTableNumbers: readonly number[]
  onToggleTable: (tableNumber: number) => void
}

// Presentational sizing only — not part of the floor-plan data model. Each area gets
// a fixed intrinsic pixel canvas so table size and touch targets never shrink; on
// narrow viewports the panel scrolls horizontally instead (see AreaPanel).
const AREA_CANVAS_SIZE: Record<string, { width: number; height: number }> = {
  dining: { width: 640, height: 360 },
  bar: { width: 640, height: 110 },
  patio: { width: 640, height: 220 },
  canning_line: { width: 640, height: 160 },
}
const DEFAULT_CANVAS_SIZE = { width: 640, height: 220 }

const CIRCLE_DIAMETER_PX = 48 // meets the 44px minimum touch target with a little room
const DEFAULT_RECT_WIDTH_PCT = 7
const DEFAULT_RECT_HEIGHT_PCT = 14

export function ReservationFloorPlan({ layout, reservableTableNumbers, selectedTableNumbers, onToggleTable }: ReservationFloorPlanProps) {
  const reservableSet = new Set(reservableTableNumbers)
  const selectedSet = new Set(selectedTableNumbers)

  const diningArea = layout.areas.find(a => a.id === 'dining')
  const otherAreas = layout.areas.filter(a => a.id !== 'dining')

  return (
    <div className="space-y-4">
      {diningArea && (
        <AreaPanel
          area={diningArea}
          canvasSize={AREA_CANVAS_SIZE[diningArea.id] ?? DEFAULT_CANVAS_SIZE}
          reservableSet={reservableSet}
          selectedSet={selectedSet}
          onToggleTable={onToggleTable}
          prominent
        />
      )}

      {otherAreas.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">
            For spatial reference only — not reservable
          </p>
          {otherAreas.map(area => (
            <AreaPanel
              key={area.id}
              area={area}
              canvasSize={AREA_CANVAS_SIZE[area.id] ?? DEFAULT_CANVAS_SIZE}
              reservableSet={reservableSet}
              selectedSet={selectedSet}
              onToggleTable={onToggleTable}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AreaPanel({ area, canvasSize, reservableSet, selectedSet, onToggleTable, prominent }: {
  area: FloorPlanArea
  canvasSize: { width: number; height: number }
  reservableSet: Set<number>
  selectedSet: Set<number>
  onToggleTable: (tableNumber: number) => void
  prominent?: boolean
}) {
  return (
    <div className={prominent
      ? 'rounded-xl border border-gray-200 bg-white p-5'
      : 'rounded-xl border border-gray-200 bg-gray-50 p-3'
    }>
      <p className={prominent
        ? 'text-xs font-bold tracking-widest uppercase text-gray-900 mb-3'
        : 'text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-2'
      }>
        {area.label}
      </p>

      {/* Fixed intrinsic canvas width — scrolls on narrow viewports rather than
          shrinking tables/labels/touch-targets below a readable, tappable size. */}
      <div className="overflow-x-auto">
        <div
          className="relative bg-gray-50 rounded-lg border border-gray-200"
          style={{ width: canvasSize.width, height: canvasSize.height, minWidth: canvasSize.width }}
        >
          {area.tables?.map(table => (
            <TableNode
              key={table.number}
              table={table}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
              isReservable={reservableSet.has(table.number)}
              isSelected={selectedSet.has(table.number)}
              onToggleTable={onToggleTable}
            />
          ))}

          {area.landmarkZones?.map(zone => (
            <div
              key={zone.id}
              style={{
                position: 'absolute',
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
              }}
              className="flex items-center justify-center text-center px-2 rounded-lg border-2 border-dashed border-gray-300"
            >
              <div
                aria-hidden
                className="absolute inset-0 rounded-lg opacity-60"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 8px, #e5e7eb 8px, #e5e7eb 16px)',
                }}
              />
              <span className="relative text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                {zone.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TableNode({ table, canvasWidth, canvasHeight, isReservable, isSelected, onToggleTable }: {
  table: FloorPlanTable
  canvasWidth: number
  canvasHeight: number
  isReservable: boolean
  isSelected: boolean
  onToggleTable: (tableNumber: number) => void
}) {
  const isCircle = table.shape === 'circle'
  const widthPx = isCircle
    ? CIRCLE_DIAMETER_PX
    : Math.max(44, ((table.width ?? DEFAULT_RECT_WIDTH_PCT) / 100) * canvasWidth)
  const heightPx = isCircle
    ? CIRCLE_DIAMETER_PX
    : Math.max(44, ((table.height ?? DEFAULT_RECT_HEIGHT_PCT) / 100) * canvasHeight)

  const positionStyle: CSSProperties = {
    position: 'absolute',
    left: `${table.x}%`,
    top: `${table.y}%`,
    width: widthPx,
    height: heightPx,
    transform: 'translate(-50%, -50%)',
    borderRadius: isCircle ? '9999px' : '10px',
  }

  if (!isReservable) {
    return (
      <div
        style={positionStyle}
        className="flex items-center justify-center border-2 border-dashed border-gray-300 opacity-70"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            borderRadius: 'inherit',
            backgroundImage: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 6px, #e5e7eb 6px, #e5e7eb 12px)',
          }}
        />
        <span aria-hidden className="relative text-[10px] font-semibold text-gray-400">{table.number}</span>
        <span aria-hidden className="absolute -top-1.5 -right-1.5 text-[10px] leading-none">🔒</span>
        <span className="sr-only">{`Table ${table.number} — not reservable`}</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      style={positionStyle}
      onClick={() => onToggleTable(table.number)}
      aria-pressed={isSelected}
      aria-label={`Table ${table.number} — ${isSelected ? 'selected' : 'available'}`}
      className={`flex items-center justify-center text-xs font-bold transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8973A] focus-visible:ring-offset-2
        ${isSelected
          ? 'border-2 border-[#C8973A] bg-[#C8973A] text-white'
          : 'border-2 border-gray-300 bg-white text-gray-900 hover:border-[#C8973A] hover:text-[#C8973A]'
        }`}
    >
      {table.number}
      {isSelected && (
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-white text-[#C8973A] text-[10px] font-bold ring-1 ring-[#C8973A]"
        >
          ✓
        </span>
      )}
    </button>
  )
}
