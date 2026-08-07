// Generic, location-agnostic floor-plan primitives for the Reservation Floor Plan
// (fixed, individually-numbered, reservable tables). Deliberately minimal — a future
// Event Floor Plan (movable, capacity-only tables for private events) is a separate
// interaction model and must not be forced into this same table shape. The only
// thing the two are expected to share is a plain rectangular landmark shape for
// drawing fixed spatial reference features.

export type FloorPlanTableShape = 'circle' | 'rect'

/** A single fixed, numbered table drawn on a floor plan. x/y (and width/height, for
 *  rect tables) are percentages (0-100) of its own area's canvas, not a page-wide or
 *  whole-venue coordinate space — each area is its own self-contained diagram. */
export interface FloorPlanTable {
  number: number
  shape: FloorPlanTableShape
  x: number
  y: number
  width?: number
  height?: number
}

/** A fixed spatial reference with no individual table identity — e.g. the Canning
 *  Line/Event Space represented as one zone rather than enumerated tables. */
export interface FloorPlanLandmarkZone {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

/** One named area of a location's floor plan (Bar, Dining, Patio, ...). An area has
 *  individually numbered tables, one or more landmark zones, or both. */
export interface FloorPlanArea {
  id: string
  label: string
  tables?: FloorPlanTable[]
  landmarkZones?: FloorPlanLandmarkZone[]
}

/** A location's full reservation-facing floor plan — every area, for spatial
 *  orientation, not just the reservable ones. Reservability is never stored on the
 *  table itself; it's derived from the authoritative reservable-table list (see
 *  isReservableTable) so there is exactly one source of truth for "can this table be
 *  reserved," not one flag here and another in that list that could drift apart. */
export interface ReservationFloorPlanLayout {
  id: string
  label: string
  areas: FloorPlanArea[]
}

/** Whether a numbered table is reservable, derived from the authoritative reservable-
 *  table list (e.g. TAPROOM_TABLES) rather than a hand-set flag on the floor-plan
 *  table entry itself. */
export function isReservableTable(tableNumber: number, reservableTables: readonly { number: number }[]): boolean {
  return reservableTables.some(t => t.number === tableNumber)
}
