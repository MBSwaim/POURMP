'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/StatusBadge'
import { formatCurrency } from '@/lib/calculations'
import type { EventWithClient } from '@/lib/db'

type SortKey = 'event_name' | 'client' | 'event_date' | 'value' | 'status'
type SortDir = 'asc' | 'desc'

interface Props {
  events: EventWithClient[]
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) {
    return <span className="ml-1 text-gray-600 text-[10px]">↕</span>
  }
  return <span className="ml-1 text-[#C8973A] text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

export function ArchiveTable({ events }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('event_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(col: SortKey) {
    if (col === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(col)
      setSortDir(col === 'event_date' ? 'desc' : 'asc')
    }
  }

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''

      if (sortKey === 'event_name') {
        av = a.event_name?.toLowerCase() ?? ''
        bv = b.event_name?.toLowerCase() ?? ''
      } else if (sortKey === 'client') {
        av = `${a.first_name} ${a.last_name}`.toLowerCase()
        bv = `${b.first_name} ${b.last_name}`.toLowerCase()
      } else if (sortKey === 'event_date') {
        av = a.event_date ?? ''
        bv = b.event_date ?? ''
      } else if (sortKey === 'value') {
        av = (a.guest_count ?? 0) * (a.price_per_guest ?? 0)
        bv = (b.guest_count ?? 0) * (b.price_per_guest ?? 0)
      } else if (sortKey === 'status') {
        av = a.status?.toLowerCase() ?? ''
        bv = b.status?.toLowerCase() ?? ''
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [events, sortKey, sortDir])

  function thClass(col: SortKey) {
    return `text-left px-4 py-3 cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap ${
      sortKey === col ? 'text-[#C8973A]' : 'text-gray-400'
    }`
  }

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest bg-[#1a2e42]/60">
              <th className={thClass('event_name')} onClick={() => handleSort('event_name')}>
                Event <SortIcon col="event_name" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thClass('client')} onClick={() => handleSort('client')}>
                Client <SortIcon col="client" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thClass('event_date')} onClick={() => handleSort('event_date')}>
                Date <SortIcon col="event_date" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                className={`text-right px-4 py-3 cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap ${sortKey === 'value' ? 'text-[#C8973A]' : 'text-gray-400'}`}
                onClick={() => handleSort('value')}
              >
                Value <SortIcon col="value" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                className={`text-center px-4 py-3 cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap ${sortKey === 'status' ? 'text-[#C8973A]' : 'text-gray-400'}`}
                onClick={() => handleSort('status')}
              >
                Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ev) => (
              <tr
                key={ev.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <td className="px-4 py-3">
                  <Link href={`/events/${ev.id}`} className="font-medium hover:text-[#C8973A] transition-colors">
                    {ev.event_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {ev.first_name} {ev.last_name}
                </td>
                <td className="px-4 py-3 text-gray-400 tabular-nums">{ev.event_date}</td>
                <td className="px-4 py-3 text-right text-[#C8973A] tabular-nums">
                  {ev.guest_count > 0 && ev.price_per_guest > 0
                    ? formatCurrency(ev.guest_count * ev.price_per_guest)
                    : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={ev.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
