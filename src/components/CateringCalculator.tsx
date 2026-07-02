'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { calcAllItems, effectiveGuests, formatCurrency, SAUCE_RULES, getApplicableSauces } from '@/lib/calculations'
import type { MenuItem } from '@/lib/db'

interface Props {
  packageId: string | null
  guestCount: number
  bufferPct?: number
  pricePerGuest?: number
  savedSauces?: string
  onSauceChange?: (csv: string) => void
  serveStyleJson?: string   // JSON map: item_name → 'all' | 'staggered'
  onServeStyleChange?: (json: string) => void
}

export function CateringCalculator({ packageId, guestCount, bufferPct = 0, pricePerGuest = 0, savedSauces, onSauceChange, serveStyleJson, onServeStyleChange }: Props) {
  const [items, setItems] = useState<MenuItem[]>([])
  const selectableSauces = useMemo(() => getApplicableSauces(items).filter(s => s.selectable), [items])

  // Initialize from savedSauces when items load; fall back to all selected
  const [selectedSauces, setSelectedSauces] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (items.length === 0) return
    const allSelectable = getApplicableSauces(items).filter(s => s.selectable).map(s => s.name)
    if (savedSauces !== undefined && savedSauces !== '') {
      setSelectedSauces(new Set(savedSauces.split(',').map(s => s.trim()).filter(Boolean)))
    } else {
      setSelectedSauces(new Set(allSelectable))
    }
  }, [items, savedSauces])

  const serveStyle: Record<string, 'all' | 'staggered'> = React.useMemo(() => {
    try { return JSON.parse(serveStyleJson || '{}') } catch { return {} }
  }, [serveStyleJson])

  function setServeStyle(itemName: string, value: 'all' | 'staggered') {
    const next = { ...serveStyle, [itemName]: value }
    onServeStyleChange?.(JSON.stringify(next))
  }

  function toggleSauce(name: string) {
    setSelectedSauces(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      onSauceChange?.(Array.from(next).join(','))
      return next
    })
  }

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

  function saucesForItem(itemName: string): string[] {
    return SAUCE_RULES
      .filter(r => itemName.toLowerCase().includes(r.trigger.toLowerCase()))
      .flatMap(r => r.sauces.filter(s => !r.selectable || selectedSauces.has(s)))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-sm text-gray-400">
        <span>Guests: {guestCount}</span>
        {bufferPct > 0 && <span>Effective (w/ {(bufferPct * 100).toFixed(0)}% buffer): {effGuests}</span>}
        {pricePerGuest > 0 && <span className="ml-auto font-semibold text-[#C8973A]">Subtotal: {formatCurrency(subtotal)}</span>}
      </div>
      {selectableSauces.length > 0 && (
        <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3 space-y-2">
          <p className="text-xs font-bold tracking-widest uppercase text-[#C8973A]">Sauce Selection</p>
          <div className="flex gap-6">
            {selectableSauces.map(sauce => (
              <label key={sauce.name} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedSauces.has(sauce.name)}
                  onChange={() => toggleSauce(sauce.name)}
                  className="rounded accent-[#C8973A] w-4 h-4"
                />
                <span className="text-sm text-white">{sauce.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-gray-400">
            <th className="text-left py-1.5">Item</th>
            <th className="text-left py-1.5">Serve</th>
            <th className="text-right py-1.5">Qty</th>
            <th className="text-right py-1.5">Unit</th>
          </tr>
        </thead>
        <tbody>
          {calculated.map((item, i) => (
            <React.Fragment key={i}>
              <tr className="border-b border-white/5 hover:bg-white/5">
                <td className="py-1.5">
                  <span>
                    {item.item_name}
                    {item.piece_count !== undefined && (
                      <span className="ml-2 text-xs text-gray-400 font-normal">({item.piece_count} pcs)</span>
                    )}
                  </span>
                </td>
                <td className="py-1.5">
                  {typeof item.total_qty === 'number' && item.total_qty > 1 && (
                    <span className="inline-flex items-center gap-1 text-xs">
                      {(['all', 'staggered'] as const).map(opt => (
                        <button
                          key={opt}
                          onClick={() => setServeStyle(item.item_name, opt)}
                          className={`w-[76px] px-2 py-0.5 rounded text-xs text-center transition-colors ${
                            (serveStyle[item.item_name] ?? 'all') === opt
                              ? 'bg-[#C8973A] text-white'
                              : 'bg-white/10 text-gray-400 hover:bg-white/20'
                          }`}
                        >
                          {opt === 'all' ? 'All at once' : '1 @ a time'}
                        </button>
                      ))}
                    </span>
                  )}
                </td>
                <td className="text-right py-1.5 tabular-nums">
                  {typeof item.total_qty === 'string' ? item.total_qty : String(item.total_qty)}
                </td>
                <td className="text-right py-1.5 text-gray-400">{item.unit_name}</td>
              </tr>
              {saucesForItem(item.item_name).map(sauce => (
                <tr key={`${i}-${sauce}`} className="border-b border-white/5">
                  <td className="py-1 pl-4 text-gray-400 italic">↳ {sauce}</td>
                  <td />
                  <td />
                  <td className="text-right py-1 text-gray-500 italic">Sauce</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
