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
