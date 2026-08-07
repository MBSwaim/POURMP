import { TAPROOM_TABLES } from '../constants'
import { isReservableTable, type ReservationFloorPlanLayout } from './types'

// West Dallas reservation-administration floor plan.
//
// Scope: this is spatial reference data for RESERVATION ADMINISTRATION only — it is
// not a whole-venue operational floor-management model. Bar, Patio, and the Canning
// Line/Event Space are included purely for spatial orientation (so an admin familiar
// with the physical space can tell where the reservable Dining tables sit relative to
// everything else); only Dining tables are ever reservable, and that is decided
// exclusively by TAPROOM_TABLES (see isWestDallasTableReservable below) — never by a
// flag duplicated in this file.
//
// Positions are approximate percentages within each area's own canvas, taken from the
// West Dallas floor-plan reference to preserve the recognizable relative arrangement
// of tables (which wall they're against, which are paired, left-to-right ordering) —
// not exact architectural coordinates, and each area is its own self-contained
// diagram, not a single merged whole-building map (the source reference does not
// establish how the four areas sit relative to one another).
//
// The Canning Line/Event Space is a single non-interactive landmark zone here, not
// numbered tables — that area's tables are movable and event-specific, which is a
// fundamentally different (future, separate) capability: the Event Floor Plan.
export const WEST_DALLAS_RESERVATION_LAYOUT: ReservationFloorPlanLayout = {
  id: 'west-dallas',
  label: 'West Dallas',
  areas: [
    {
      id: 'bar',
      label: 'Bar',
      tables: [
        { number: 101, shape: 'circle', x: 6, y: 50 },
        { number: 102, shape: 'circle', x: 14, y: 50 },
        { number: 103, shape: 'circle', x: 22, y: 50 },
        { number: 104, shape: 'circle', x: 30, y: 50 },
        { number: 105, shape: 'circle', x: 38, y: 50 },
        { number: 106, shape: 'circle', x: 46, y: 50 },
        { number: 107, shape: 'circle', x: 54, y: 50 },
        { number: 108, shape: 'circle', x: 62, y: 50 },
        { number: 109, shape: 'circle', x: 70, y: 50 },
        { number: 110, shape: 'circle', x: 78, y: 50 },
        { number: 111, shape: 'circle', x: 86, y: 50 },
        { number: 112, shape: 'circle', x: 94, y: 50 },
      ],
    },
    {
      id: 'dining',
      label: 'Dining',
      tables: [
        // Left wall, top-to-bottom per the floor-plan reference.
        { number: 204, shape: 'circle', x: 15, y: 16 },
        { number: 203, shape: 'circle', x: 15, y: 39 },
        { number: 202, shape: 'circle', x: 15, y: 62 },
        { number: 201, shape: 'circle', x: 15, y: 85 },
        // Floating center tables.
        { number: 205, shape: 'circle', x: 40, y: 16 },
        { number: 206, shape: 'circle', x: 62, y: 16 },
        // Rectangular pairs — each column is one TABLE_COMBOS entry (301+302, 303+304).
        { number: 301, shape: 'rect', x: 80, y: 18, width: 8, height: 20 },
        { number: 304, shape: 'rect', x: 90, y: 18, width: 8, height: 20 },
        { number: 302, shape: 'rect', x: 80, y: 55, width: 8, height: 30 },
        { number: 303, shape: 'rect', x: 90, y: 55, width: 8, height: 30 },
      ],
    },
    {
      id: 'patio',
      label: 'Patio',
      tables: [
        { number: 401, shape: 'rect', x: 6, y: 15 },
        { number: 402, shape: 'rect', x: 6, y: 46 },
        { number: 403, shape: 'rect', x: 6, y: 78 },
        { number: 404, shape: 'rect', x: 38, y: 15 },
        { number: 405, shape: 'rect', x: 38, y: 46 },
        { number: 406, shape: 'rect', x: 38, y: 78 },
        { number: 504, shape: 'rect', x: 64, y: 27 },
        { number: 505, shape: 'rect', x: 77, y: 27 },
        { number: 506, shape: 'rect', x: 90, y: 27 },
        { number: 501, shape: 'rect', x: 64, y: 68 },
        { number: 502, shape: 'rect', x: 77, y: 68 },
        { number: 503, shape: 'rect', x: 90, y: 68 },
      ],
    },
    {
      id: 'canning_line',
      label: 'Canning Line / Event Space',
      landmarkZones: [
        { id: 'canning-line-zone', label: 'Canning Line / Event Space', x: 10, y: 15, width: 80, height: 70 },
      ],
    },
  ],
}

/** West Dallas's reservable/non-reservable decision, derived from TAPROOM_TABLES —
 *  the single authoritative reservable-table list — never duplicated as a flag here. */
export function isWestDallasTableReservable(tableNumber: number): boolean {
  return isReservableTable(tableNumber, TAPROOM_TABLES)
}
