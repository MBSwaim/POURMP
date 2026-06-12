'use client'
import { useEffect, useState } from 'react'
import { calcAllItems, effectiveGuests, formatCurrency } from '@/lib/calculations'
import type { MenuItem } from '@/lib/db'

interface Props {
  packageId: string | null
  guestCount: number
  bufferPct?: number
  pricePerGuest?: number
}

export function CateringCalculator({ packageId, guestCount, bufferPct = 0, pricePerGuest = 0 }: Props) {
  const [items, setItems] = useState<MenuItem[]>([])

  useEffect(() => {
    if (!packageId) { setItems([]); return }
    fetch(`/api/packages/${packageId}`)
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]))
  }, [packageId])

  if (!packageId || !guestCount) {
    return <p className="text-sm text-gray-400">Select a package and enter guest count to see quantities.</p>
  }

  const effGuests = effectiveGuests(guestCount, bufferPct)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calculated = calcAllItems(items as any, guestCount, bufferPct)
  const subtotal = guestCount * pricePerGuest

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-sm text-gray-400">
        <span>Guests: {guestCount}</span>
        {bufferPct > 0 && <span>Effective (w/ {(bufferPct * 100).toFixed(0)}% buffer): {effGuests}</span>}
        {pricePerGuest > 0 && <span className="ml-auto font-semibold text-[#C8973A]">Subtotal: {formatCurrency(subtotal)}</span>}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-gray-400">
            <th className="text-left py-1.5">Item</th>
            <th className="text-right py-1.5">Qty</th>
            <th className="text-right py-1.5">Unit</th>
          </tr>
        </thead>
        <tbody>
          {calculated.map((item, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-1.5">{item.item_name}</td>
              <td className="text-right py-1.5 tabular-nums">
                {typeof item.total_qty === 'string' ? item.total_qty : String(item.total_qty)}
              </td>
              <td className="text-right py-1.5 text-gray-400">{item.unit_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
