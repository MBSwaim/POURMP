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
  piece_count?: number  // populated for pieces_per_guest items
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

      // Capture piece count before unit conversion for pieces_per_guest items
      let piece_count: number | undefined
      if (item.calc_method === 'pieces_per_guest' && item.yield_per_unit && item.yield_per_unit > 0) {
        piece_count = Math.ceil(guests * (item.qty_per_guest ?? 1))
      }

      // 2 × 1/2 Chafer = 1 × 200 Pan
      if (typeof qty === 'number' && unitName === '1/2 Chafer' && qty >= 2) {
        qty = Math.ceil(qty / 2)
        unitName = '200 Pan'
      }

      const display = typeof qty === 'string' ? qty : `${qty} ${unitName}`
      return { ...item, total_qty: qty, unit_name: unitName, display, piece_count }
    })
}

export interface SauceRule {
  trigger: string
  sauces: string[]
  selectable: boolean
}

export const SAUCE_RULES: SauceRule[] = [
  { trigger: 'French Fries', sauces: ['Ketchup', 'Garlic Aioli'], selectable: false },
  { trigger: 'Thai Fried Chicken', sauces: ['Thai Chili Sauce', 'Nam Jim'], selectable: true },
]

export interface ApplicableSauce {
  name: string
  selectable: boolean
}

export function getApplicableSauces(menuItems: Array<{ item_name: string }>): ApplicableSauce[] {
  const seen = new Set<string>()
  const result: ApplicableSauce[] = []
  for (const item of menuItems) {
    for (const rule of SAUCE_RULES) {
      if (item.item_name.toLowerCase().includes(rule.trigger.toLowerCase())) {
        for (const sauce of rule.sauces) {
          if (!seen.has(sauce)) {
            seen.add(sauce)
            result.push({ name: sauce, selectable: rule.selectable })
          }
        }
      }
    }
  }
  return result
}

export interface ServingwareRule {
  trigger: string
  utensil: string
  vessel: string
  altNote?: string
}

export const SERVINGWARE_RULES: ServingwareRule[] = [
  { trigger: 'Cheese Platter',           utensil: 'Tongs',         vessel: '1 per board' },
  { trigger: 'Hummus',                   utensil: 'Serving Spoon', vessel: '1 per bowl' },
  { trigger: 'French Fries',             utensil: 'Tongs',         vessel: '1 per chafing dish' },
  { trigger: 'Chips',                    utensil: 'Tongs',         vessel: '1 per bowl' },
  { trigger: 'Salsa',                    utensil: 'Small Ladle',   vessel: '1 per bowl' },
  { trigger: 'Queso',                    utensil: 'Small Ladle',   vessel: '1 per bowl' },
  { trigger: 'Pork Arepa',               utensil: 'Tongs',         vessel: '1 per chafing dish', altNote: 'or 2 per 1/2 chafing dish' },
  { trigger: 'Green Tomato Arepa',       utensil: 'Tongs',         vessel: '1 per chafing dish', altNote: 'or 2 per 1/2 chafing dish' },
  { trigger: 'Black Bean Arepa',         utensil: 'Tongs',         vessel: '1 per chafing dish', altNote: 'or 2 per 1/2 chafing dish' },
  { trigger: 'Jasmine Rice',             utensil: 'Serving Spoon', vessel: '1 per chafing dish' },
  { trigger: 'Thai Fried Chicken',       utensil: 'Tongs',         vessel: '1 per chafing dish' },
  { trigger: 'Thai Slaw',                utensil: 'Tongs',         vessel: '1 per bowl' },
  { trigger: 'Asian Chopped Salad',      utensil: 'Tongs',         vessel: '1 per bowl' },
  { trigger: 'Shrimp Kabob',             utensil: 'Tongs',         vessel: '1 per chafing dish', altNote: 'or 2 per 1/2 chafing dish' },
  { trigger: 'Thai Chicken Kabob',       utensil: 'Tongs',         vessel: '1 per chafing dish', altNote: 'or 2 per 1/2 chafing dish' },
  { trigger: 'Pulled Pork Slider',       utensil: 'Tongs',         vessel: '1 per chafing dish' },
  { trigger: 'Mini Burger Slider',       utensil: 'Tongs',         vessel: '1 per chafing dish' },
  { trigger: 'Buffalo Chicken Slider',   utensil: 'Tongs',         vessel: '1 per chafing dish' },
]

export function getServingware(itemName: string): ServingwareRule | null {
  return SERVINGWARE_RULES.find(r =>
    itemName.toLowerCase().includes(r.trigger.toLowerCase())
  ) ?? null
}

// 1 pan = 1 chafing dish, matched by size.
// Full-size 200 pan → full-size chafer. 1/2 pan → half-size chafer. They don't share.
export interface ChafingDishCount {
  fullSize: number   // full-size chafing dishes (for 200 Pan items)
  halfSize: number   // half-size chafing dishes (for 1/2 Chafer items)
  total: number
}

export function countChafingDishes(
  items: CalculatedItem[],
  serveStyle: Record<string, 'all' | 'staggered'> = {}
): ChafingDishCount {
  let fullSize = 0
  let halfSize = 0
  for (const item of items) {
    if (typeof item.total_qty !== 'number') continue
    // Staggered items only ever have 1 pan on the buffet at a time
    const qty = (serveStyle[item.item_name] ?? 'all') === 'staggered' ? 1 : item.total_qty
    if (item.unit_name === '200 Pan') fullSize += qty
    else if (item.unit_name === '1/2 Chafer') halfSize += qty
  }
  return { fullSize, halfSize, total: fullSize + halfSize }
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
  receptionHighTops: number | null
  seatedCapacity: number | null
  highTopsRecommended: boolean
  warning: string | null
  warningLevel: 'info' | 'caution' | 'danger' | null
  staffNotes: string
  isOverCapacity: boolean
}

function receptionCount(guestCount: number): number {
  if (guestCount < 25) return 1
  if (guestCount <= 50) return 2
  return 3
}

export function calcFloorPlan(guestCount: number): FloorPlanRec {
  if (!guestCount || guestCount <= 0) {
    return {
      layoutType: '—',
      tablesNeeded: null,
      highTopCount: null,
      receptionHighTops: null,
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
      receptionHighTops: null,
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
      receptionHighTops: 3,
      seatedCapacity: 30,
      highTopsRecommended: true,
      warning: 'High-capacity event — cocktail style only. Limited seating for accessibility.',
      warningLevel: 'caution',
      staffNotes: 'Keep ~5 rectangular tables for accessibility seating only. All 4 high-tops in standard positions as primary surfaces. Place 3 high-tops in reception area near entrance. Maximize standing room along perimeter. Velvet ropes required at all marked positions.',
      isOverCapacity: false,
    }
  }

  if (guestCount >= 51) {
    return {
      layoutType: 'Mixed Seating — Tables + High-Tops + Standing',
      tablesNeeded: 6,
      highTopCount: 4,
      receptionHighTops: 3,
      seatedCapacity: 52,
      highTopsRecommended: true,
      warning: 'Near capacity — confirm final guest count at least 72 hours before event.',
      warningLevel: 'caution',
      staffNotes: 'Full standard layout: all 6 rectangular tables + all 4 high-tops. Place 3 high-tops in reception area near entrance. Remaining guests use standing room. Place velvet ropes at all marked positions. Confirm final count 72 hrs prior.',
      isOverCapacity: false,
    }
  }

  if (guestCount >= 37) {
    return {
      layoutType: 'Standard Layout — Tables + High-Tops',
      tablesNeeded: 6,
      highTopCount: 4,
      receptionHighTops: 2,
      seatedCapacity: 52,
      highTopsRecommended: true,
      warning: null,
      warningLevel: null,
      staffNotes: 'Full standard layout: all 6 rectangular tables + all 4 high-tops in standard positions. Place 2 high-tops in reception area near entrance. Black tablecloths on all tables. Velvet ropes at marked positions.',
      isOverCapacity: false,
    }
  }

  if (guestCount >= 30) {
    return {
      layoutType: 'Fully Seated — Rectangular Tables Only',
      tablesNeeded: 6,
      highTopCount: 0,
      receptionHighTops: 2,
      seatedCapacity: 36,
      highTopsRecommended: false,
      warning: null,
      warningLevel: null,
      staffNotes: 'All 6 rectangular tables with black tablecloths. Place 2 high-tops in reception area near entrance. Remove remaining high-tops to perimeter.',
      isOverCapacity: false,
    }
  }

  const tables = Math.ceil(guestCount / 6)
  const reception = receptionCount(guestCount)
  return {
    layoutType: 'Partial / Flexible Setup',
    tablesNeeded: tables,
    highTopCount: 0,
    receptionHighTops: reception,
    seatedCapacity: tables * 6,
    highTopsRecommended: false,
    warning: 'Small group — confirm whether event has exclusive use of the production space.',
    warningLevel: 'info',
    staffNotes: `Use ${tables} rectangular table${tables !== 1 ? 's' : ''}. Place ${reception} high-top${reception !== 1 ? 's' : ''} in reception area near entrance. Remove unused tables to open space. Confirm exclusive use with owner before setup.`,
    isOverCapacity: false,
  }
}
