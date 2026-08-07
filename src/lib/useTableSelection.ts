import { useMemo } from 'react'
import { TAPROOM_TABLES } from './constants'

// Shared reservation table-selection logic — extracted unchanged from
// ReservationsClient.tsx so the New Reservation form and the reservation-list
// "Assign Tables" flow read/write the exact same table_numbers CSV the exact same
// way, whether the picker UI in front of it is the floor plan used in either place.
// No new selection semantics: same CSV parsing, same multi-select toggle, same
// sorted serialization, same advisory (non-blocking) capacity warning as before.

const SEATS_BY_TABLE: Map<number, number> = new Map(TAPROOM_TABLES.map((t) => [t.number, t.seats]))

export function useTableSelection(value: string, onChange: (v: string) => void, partySize?: number) {
  const selected = useMemo(
    () => new Set((value || '').split(',').map((s) => s.trim()).filter(Boolean)),
    [value]
  )
  const selectedNumbers = useMemo(
    () => Array.from(selected).map(Number).sort((a, b) => a - b),
    [selected]
  )
  const totalSeats = selectedNumbers.reduce((sum, n) => sum + (SEATS_BY_TABLE.get(n) ?? 0), 0)
  const short = selectedNumbers.length > 0 && !!partySize && totalSeats < partySize

  function toggle(num: number) {
    const key = String(num)
    const next = new Set(selected)
    next.has(key) ? next.delete(key) : next.add(key)
    onChange(Array.from(next).map(Number).sort((a, b) => a - b).join(','))
  }

  const summary = selectedNumbers.length > 0 ? selectedNumbers.join(', ') : 'Assign tables'

  return { selectedNumbers, totalSeats, short, toggle, summary }
}
