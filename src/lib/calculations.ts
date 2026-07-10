import type { CalcMethod } from './constants'

export interface MenuItem {
  item_name: string
  calc_method: CalcMethod
  qty_per_guest: number | null
  yield_per_unit: number | null
  unit_name: string | null
  sort_order: number
  purchase_unit?: string | null
}

export interface CalculatedItem extends MenuItem {
  total_qty: number | string
  display: string
  piece_count?: number  // populated for pieces_per_guest items
  is_override?: boolean // true when piece_count came from a manual override, not the guest-count formula
  half_pan_qty?: number // extra 1/2 Chafer needed on top of total_qty full 200 Pans, for a partial remainder
}

// Manual per-item piece-count overrides, keyed by item_name. Lets staff rebalance
// a split (e.g. more pork arepas, fewer black bean) for a specific event without
// changing the package's default per-guest rate.
export type MenuItemOverrides = Record<string, number>

export function parseMenuItemOverrides(json: string | null | undefined): MenuItemOverrides {
  if (!json) return {}
  try { return JSON.parse(json) } catch { return {} }
}

export function effectiveGuests(guestCount: number, bufferPct = 0): number {
  return Math.ceil(guestCount * (1 + bufferPct))
}

export function calcItemQty(item: MenuItem, guests: number, overridePieces?: number): number | string {
  if (item.calc_method === 'manual') return 'Enter Manually'

  if (guests <= 0) return 0

  if (item.calc_method === 'guests_per_unit') {
    const yield_ = item.yield_per_unit ?? 1
    return Math.ceil(guests / yield_)
  }

  if (item.calc_method === 'pieces_per_guest') {
    const qty = item.qty_per_guest ?? 1
    const totalPieces = overridePieces ?? Math.ceil(guests * qty)
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

export function calcAllItems(items: MenuItem[], guestCount: number, bufferPct = 0, overrides: MenuItemOverrides = {}): CalculatedItem[] {
  const guests = effectiveGuests(guestCount, bufferPct)
  return items
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => {
      const override = overrides[item.item_name]
      let qty = calcItemQty(item, guests, override)
      let unitName = item.unit_name ?? ''

      // Capture piece count before unit conversion for pieces_per_guest items
      let piece_count: number | undefined
      let half_pan_qty: number | undefined
      if (item.calc_method === 'pieces_per_guest' && item.yield_per_unit && item.yield_per_unit > 0) {
        piece_count = override ?? Math.ceil(guests * (item.qty_per_guest ?? 1))

        // Don't provision a full 200 Pan for less than a full pan's worth — use a
        // 1/2 Chafer for the partial amount, whether that's the whole quantity
        // (e.g. 15 pcs on a 20-yield pan) or just the leftover after full pans
        // (e.g. 25 pcs = 1 full pan + 1 half pan for the remaining 5).
        if (unitName === '200 Pan') {
          const fullPans = Math.floor(piece_count / item.yield_per_unit)
          const remainder = piece_count % item.yield_per_unit
          if (fullPans === 0 && remainder > 0) {
            qty = 1
            unitName = '1/2 Chafer'
          } else {
            qty = fullPans
            if (remainder > 0) half_pan_qty = 1
          }
        }
      }

      // 2 × 1/2 Chafer = 1 × 200 Pan
      if (typeof qty === 'number' && unitName === '1/2 Chafer' && qty >= 2) {
        qty = Math.ceil(qty / 2)
        unitName = '200 Pan'
      }

      const display = typeof qty === 'string'
        ? qty
        : `${qty} ${unitName}${half_pan_qty ? ` + ${half_pan_qty} 1/2 Chafer` : ''}`
      return { ...item, total_qty: qty, unit_name: unitName, display, piece_count, is_override: override !== undefined, half_pan_qty }
    })
}

export function mergeCalculatedItems(items: CalculatedItem[]): CalculatedItem[] {
  const map = new Map<string, CalculatedItem>()
  for (const item of items) {
    const existing = map.get(item.item_name)
    if (!existing) {
      map.set(item.item_name, { ...item })
    } else {
      // Both numeric — sum them
      if (typeof existing.total_qty === 'number' && typeof item.total_qty === 'number') {
        existing.total_qty += item.total_qty
        existing.half_pan_qty = (existing.half_pan_qty ?? 0) + (item.half_pan_qty ?? 0)

        // Two half-pan remainders combine into a full pan
        if (existing.half_pan_qty >= 2 && existing.unit_name === '200 Pan') {
          existing.total_qty += Math.floor(existing.half_pan_qty / 2)
          existing.half_pan_qty = existing.half_pan_qty % 2
        }
        if (existing.half_pan_qty === 0) existing.half_pan_qty = undefined

        existing.display = `${existing.total_qty} ${existing.unit_name ?? ''}${existing.half_pan_qty ? ` + ${existing.half_pan_qty} 1/2 Chafer` : ''}`.trim()
      }
      // If either is a string quantity ("as needed" etc.) keep existing as-is
    }
  }
  return Array.from(map.values())
}

// An event can carry multiple catering packages (e.g. a kids' menu alongside the
// adult buffet), each with its own guest count and buffer %. This is the one place
// that resolves "what packages does this event have, and what did each one order"
// so every catering output — Builder, plain-text summary, equipment list, Toast
// Notes, Kitchen Sheet, BEO, etc. — sums the exact same packages the same way
// instead of quietly falling back to a single legacy package + the event's
// top-level guest count.
export interface CateringPackageInput {
  pkg: { name: string } | null
  menuItems: MenuItem[]
  guest_count: number
  buffer_pct: number
}

export function resolveCateringPackages<T extends CateringPackageInput>(
  packages: T[] | undefined,
  fallback: { pkg: T['pkg']; menuItems: MenuItem[]; guest_count: number; buffer_pct: number } | null
): CateringPackageInput[] {
  if (packages && packages.length > 0) return packages
  if (fallback && fallback.pkg) return [fallback]
  return []
}

export function calcMergedCateringItems(
  packages: CateringPackageInput[],
  overrides: MenuItemOverrides = {}
): CalculatedItem[] {
  const active = packages.filter(p => p.pkg && p.guest_count > 0)
  return mergeCalculatedItems(
    active.flatMap(p => calcAllItems(p.menuItems, p.guest_count, p.buffer_pct, overrides))
  )
}

export function cateringPackageTitle(packages: CateringPackageInput[]): string {
  return packages
    .filter(p => p.pkg && p.guest_count > 0)
    .map(p => p.pkg!.name)
    .join(' | ')
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
  { trigger: 'Veggies',                  utensil: 'Tongs',         vessel: '1 per platter' },
  { trigger: 'Crudités',                 utensil: 'Tongs',         vessel: '1 per platter' },
]

// Single source of truth for the "serving vessel" wording, derived only from the
// unit_name that calcAllItems already computed (the same value the Catering Builder's
// Unit column shows). Never keyed off item_name — a per-item label here is what let the
// Catering Summary claim a full "Large Chafer" for an item the Builder had computed as
// a "1/2 Chafer". Kitchen shorthand aliases for the two chafer sizes; everything else
// (Platter, Large Bowl, Round Chafer, ...) passes through unchanged.
export function vesselLabelFor(item: CalculatedItem): string {
  if (item.unit_name === '200 Pan') return 'Large Chafer'
  if (item.unit_name === '1/2 Chafer') return 'Half Chafer'
  return item.unit_name ?? ''
}

export function formatCateringText(
  sections: Array<{ name: string; items: CalculatedItem[] }>,
  selectedSauces?: string
): string {
  const sauceSet = selectedSauces
    ? new Set(selectedSauces.split(',').map(s => s.trim()).filter(Boolean))
    : null

  function saucesFor(itemName: string): string[] {
    return SAUCE_RULES
      .filter(r => itemName.toLowerCase().includes(r.trigger.toLowerCase()))
      .flatMap(r => r.sauces.filter(s => !r.selectable || !sauceSet || sauceSet.has(s)))
  }

  return sections.map(({ name, items }) => {
    const lines = [name.toUpperCase()]
    for (const item of items) {
      if (typeof item.total_qty !== 'number' || item.total_qty === 0) continue
      const vessel = vesselLabelFor(item)
      const pcs = item.piece_count ? ` (${item.piece_count} pcs)` : ''
      const vesselPart = vessel ? `${vessel} of ` : ''
      const stagger = item.total_qty > 1 ? '  — Serve 1 @ a time' : ''
      lines.push(`(${item.total_qty}) ${vesselPart}${item.item_name}${pcs}${stagger}`)
      for (const sauce of saucesFor(item.item_name)) {
        lines.push(`    - ${sauce}`)
      }
      if (item.half_pan_qty) {
        lines.push(`(${item.half_pan_qty}) Half Chafer of ${item.item_name}`)
      }
    }
    return lines.join('\n')
  }).join('\n\n')
}

function pluralUtensil(utensil: string, count: number): string {
  if (count === 1) return utensil
  if (utensil === 'Tongs') return 'Tongs'
  return `${utensil}s`
}

export function formatEquipmentText(
  items: CalculatedItem[],
  serveStyle: Record<string, 'all' | 'staggered'> = {}
): string {
  const chafing = countChafingDishes(items, serveStyle)
  const utensilCounts = new Map<string, number>()

  for (const item of items) {
    if (typeof item.total_qty !== 'number') continue
    const dishCount = item.total_qty + (item.half_pan_qty ?? 0)
    if (dishCount === 0) continue
    const sw = SERVINGWARE_RULES.find(r =>
      item.item_name.toLowerCase().includes(r.trigger.toLowerCase())
    )
    if (!sw) continue
    utensilCounts.set(sw.utensil, (utensilCounts.get(sw.utensil) ?? 0) + dishCount)
  }

  const lines: string[] = []
  if (chafing.fullSize > 0) lines.push(`(${chafing.fullSize}) Full-Size Chafing ${chafing.fullSize === 1 ? 'Dish' : 'Dishes'}`)
  if (chafing.halfSize > 0) lines.push(`(${chafing.halfSize}) Half-Size Chafing ${chafing.halfSize === 1 ? 'Dish' : 'Dishes'}`)
  for (const utensil of Array.from(utensilCounts.keys())) {
    const count = utensilCounts.get(utensil)!
    lines.push(`(${count}) ${pluralUtensil(utensil, count)}`)
  }
  return lines.join('   ')
}

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
    // Items with no explicit style default to staggered when qty > 1 (only 1 on the floor at a time)
    const style = serveStyle[item.item_name] ?? (item.total_qty > 1 ? 'staggered' : 'all')
    const qty = style === 'staggered' ? 1 : item.total_qty
    if (item.unit_name === '200 Pan') fullSize += qty
    else if (item.unit_name === '1/2 Chafer') halfSize += qty
    // Partial remainder always needs its own half-size dish, regardless of serve style
    if (item.half_pan_qty) halfSize += item.half_pan_qty
  }
  return { fullSize, halfSize, total: fullSize + halfSize }
}

export interface SupplyList {
  plates: number
  rolledSilverware: number
  sternos: number
  tablecloths: number
  highTopCovers: number
}

export function calcSupplies(params: {
  guestCount: number
  bufferPct: number
  chafing: ChafingDishCount
  floorPlan: FloorPlanRec
  durationHours: number
}): SupplyList {
  const { guestCount, bufferPct, chafing, floorPlan, durationHours } = params
  const guests = effectiveGuests(guestCount, bufferPct)

  const plates = guests
  const rolledSilverware = guests

  // 2 sternos per chafing dish; 4 if event exceeds 4 hours
  const sternosPerDish = durationHours > 4 ? 4 : 2
  const sternos = chafing.total * sternosPerDish

  const tablecloths = floorPlan.tablesNeeded ?? 0
  const highTopCovers = (floorPlan.highTopCount ?? 0) + (floorPlan.receptionHighTops ?? 0)

  return { plates, rolledSilverware, sternos, tablecloths, highTopCovers }
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
