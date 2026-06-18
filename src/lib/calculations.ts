import type { CalcMethod } from './constants'

export interface MenuItem {
  item_name: string
  calc_method: CalcMethod
  qty_per_guest: number | null
  yield_per_unit: number | null
  unit_name: string | null
  sort_order: number
}

export interface CalculatedItem extends MenuItem {
  total_qty: number | string
  display: string
}

export function effectiveGuests(guestCount: number, bufferPct = 0): number {
  return Math.ceil(guestCount * (1 + bufferPct))
}

export function calcItemQty(item: MenuItem, guests: number): number | string {
  if (item.calc_method === 'manual') return 'Enter Manually'

  if (guests <= 0) return 0

  if (item.calc_method === 'guests_per_unit') {
    const yield_ = item.yield_per_unit ?? 1
    return Math.ceil(guests / yield_)
  }

  if (item.calc_method === 'pieces_per_guest') {
    const qty = item.qty_per_guest ?? 1
    const totalPieces = Math.ceil(guests * qty)
    if (item.yield_per_unit && item.yield_per_unit > 0) {
      return Math.ceil(totalPieces / item.yield_per_unit)
    }
    return totalPieces
  }

  if (item.calc_method === 'servings_per_guest') {
    const qty = item.qty_per_guest ?? 1
    const yield_ = item.yield_per_unit ?? 1
    return Math.ceil((guests * qty) / yield_)
  }

  return 0
}

export function calcAllItems(items: MenuItem[], guestCount: number, bufferPct = 0): CalculatedItem[] {
  const guests = effectiveGuests(guestCount, bufferPct)
  return items
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => {
      let qty = calcItemQty(item, guests)
      let unitName = item.unit_name ?? ''

      // 2 × 1/2 Chafer = 1 × 200 Pan
      if (typeof qty === 'number' && unitName === '1/2 Chafer' && qty >= 2) {
        qty = Math.ceil(qty / 2)
        unitName = '200 Pan'
      }

      const display = typeof qty === 'string' ? qty : `${qty} ${unitName}`
      return { ...item, total_qty: qty, unit_name: unitName, display }
    })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function calcFoodSubtotal(guestCount: number, pricePerGuest: number): number {
  return guestCount * pricePerGuest
}

export interface FloorPlanRec {
  layoutType: string
  tablesNeeded: number | null
  highTopCount: number | null
  seatedCapacity: number | null
  highTopsRecommended: boolean
  warning: string | null
  warningLevel: 'info' | 'caution' | 'danger' | null
  staffNotes: string
  isOverCapacity: boolean
}

export function calcFloorPlan(guestCount: number): FloorPlanRec {
  if (!guestCount || guestCount <= 0) {
    return {
      layoutType: '—',
      tablesNeeded: null,
      highTopCount: null,
      seatedCapacity: null,
      highTopsRecommended: false,
      warning: null,
      warningLevel: null,
      staffNotes: 'Set guest count to generate a floor plan recommendation.',
      isOverCapacity: false,
    }
  }

  if (guestCount > 75) {
    return {
      layoutType: 'Not a Fit',
      tablesNeeded: null,
      highTopCount: null,
      seatedCapacity: null,
      highTopsRecommended: false,
      warning: 'OVER CAPACITY — exceeds 75-guest maximum. Do not confirm without owner approval.',
      warningLevel: 'danger',
      staffNotes: 'Do not set up. Escalate to owner immediately.',
      isOverCapacity: true,
    }
  }

  if (guestCount >= 66) {
    return {
      layoutType: 'Cocktail / Limited Seating',
      tablesNeeded: 5,
      highTopCount: 4,
      seatedCapacity: 30,
      highTopsRecommended: true,
      warning: 'High-capacity event — cocktail style only. Limited seating for accessibility.',
      warningLevel: 'caution',
      staffNotes: 'Keep ~5 rectangular tables for accessibility seating only. All 4 high-tops in standard positions as primary surfaces. Maximize standing room along perimeter. Velvet ropes required at all marked positions.',
      isOverCapacity: false,
    }
  }

  if (guestCount >= 51) {
    return {
      layoutType: 'Mixed Seating — Tables + High-Tops + Standing',
      tablesNeeded: 6,
      highTopCount: 4,
      seatedCapacity: 52,
      highTopsRecommended: true,
      warning: 'Near capacity — confirm final guest count at least 72 hours before event.',
      warningLevel: 'caution',
      staffNotes: 'Full standard layout: all 6 rectangular tables + all 4 high-tops. Remaining guests use standing room. Place velvet ropes at all marked positions. Confirm final count 72 hrs prior.',
      isOverCapacity: false,
    }
  }

  if (guestCount >= 37) {
    return {
      layoutType: 'Standard Layout — Tables + High-Tops',
      tablesNeeded: 6,
      highTopCount: 4,
      seatedCapacity: 52,
      highTopsRecommended: true,
      warning: null,
      warningLevel: null,
      staffNotes: 'Full standard layout: all 6 rectangular tables + all 4 high-tops in standard positions. Black tablecloths on all tables. Velvet ropes at marked positions.',
      isOverCapacity: false,
    }
  }

  if (guestCount >= 30) {
    return {
      layoutType: 'Fully Seated — Rectangular Tables Only',
      tablesNeeded: 6,
      highTopCount: 0,
      seatedCapacity: 36,
      highTopsRecommended: false,
      warning: null,
      warningLevel: null,
      staffNotes: 'All 6 rectangular tables with black tablecloths. Remove or push high-tops to perimeter — fully seated configuration.',
      isOverCapacity: false,
    }
  }

  const tables = Math.ceil(guestCount / 6)
  return {
    layoutType: 'Partial / Flexible Setup',
    tablesNeeded: tables,
    highTopCount: 0,
    seatedCapacity: tables * 6,
    highTopsRecommended: false,
    warning: 'Small group — confirm whether event has exclusive use of the production space.',
    warningLevel: 'info',
    staffNotes: `Use ${tables} rectangular table${tables !== 1 ? 's' : ''}. Remove unused tables to open space. Confirm exclusive use with owner before setup.`,
    isOverCapacity: false,
  }
}
