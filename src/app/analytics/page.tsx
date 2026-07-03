export const dynamic = 'force-dynamic'

import { getYearMonthly, getYearTotals, getAvailableYears } from '@/lib/db'
import { formatCurrency } from '@/lib/calculations'
import Link from 'next/link'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function pct(prev: number, curr: number): number | null {
  if (prev === 0) return null
  return ((curr - prev) / prev) * 100
}

function PctBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-500 text-xs">—</span>
  const pos = value >= 0
  return (
    <span className={`text-xs font-semibold ${pos ? 'text-green-400' : 'text-red-400'}`}>
      {pos ? '+' : ''}{value.toFixed(1)}%
    </span>
  )
}

export default function AnalyticsPage({ searchParams }: { searchParams: { year?: string } }) {
  const now = new Date()
  const availableYears = getAvailableYears()
  const currentYear = now.getFullYear()
  const defaultYear = availableYears.includes(currentYear) ? currentYear : (availableYears[0] ?? currentYear)
  const year = Number(searchParams.year ?? defaultYear)
  const prevYear = year - 1

  const totals     = getYearTotals(year)
  const prevTotals = getYearTotals(prevYear)
  const monthly    = getYearMonthly(year)
  const prevMonthly = getYearMonthly(prevYear)

  // Navigation: find adjacent years in the data set
  const idx = availableYears.indexOf(year)
  const olderYear = availableYears[idx + 1] ?? null   // further in past
  const newerYear = availableYears[idx - 1] ?? null   // closer to present

  const hasPrev = prevMonthly.length > 0
  const maxCollected = Math.max(...monthly.map(r => r.collected), ...prevMonthly.map(r => r.collected), 1)

  const evtPct  = hasPrev ? pct(prevTotals.event_count, totals.event_count) : null
  const invPct  = hasPrev ? pct(prevTotals.invoiced,    totals.invoiced)    : null
  const collPct = hasPrev ? pct(prevTotals.collected,   totals.collected)   : null

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* Header + Year Picker */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{year} Analytics</h1>
          {hasPrev && <p className="text-sm text-gray-500 mt-0.5">Compared to {prevYear}</p>}
        </div>
        <div className="flex items-center gap-2">
          {olderYear && (
            <Link
              href={`/analytics?year=${olderYear}`}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              ← {olderYear}
            </Link>
          )}
          <span className="px-4 py-1.5 rounded-lg border border-[#C8973A]/50 bg-[#C8973A]/10 text-[#C8973A] text-sm font-bold min-w-16 text-center">
            {year}
          </span>
          {newerYear && (
            <Link
              href={`/analytics?year=${newerYear}`}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {newerYear} →
            </Link>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Events"    value={String(totals.event_count)}        prev={hasPrev ? String(prevTotals.event_count)        : null} prevYear={prevYear} pctVal={evtPct}  />
        <StatCard label="Total Invoiced"  value={formatCurrency(totals.invoiced)}   prev={hasPrev ? formatCurrency(prevTotals.invoiced)   : null} prevYear={prevYear} pctVal={invPct}  />
        <StatCard label="Total Collected" value={formatCurrency(totals.collected)}  prev={hasPrev ? formatCurrency(prevTotals.collected)  : null} prevYear={prevYear} pctVal={collPct} />
      </div>

      {/* Bar Chart */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-4">Collected by Month</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-end gap-1.5 h-44">
            {MONTHS.map((name, i) => {
              const m = i + 1
              const val     = monthly.find(r => r.month === m)?.collected ?? 0
              const prevVal = prevMonthly.find(r => r.month === m)?.collected ?? 0
              const h     = Math.round((val / maxCollected) * 100)
              const hPrev = Math.round((prevVal / maxCollected) * 100)
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end gap-0.5 h-36">
                    {hasPrev && (
                      <div className="flex-1 bg-gray-300 rounded-t" style={{ height: `${hPrev}%` }}
                        title={`${prevYear} ${name}: ${formatCurrency(prevVal)}`} />
                    )}
                    <div className="flex-1 bg-[#C8973A]/80 rounded-t" style={{ height: `${h}%` }}
                      title={`${year} ${name}: ${formatCurrency(val)}`} />
                  </div>
                  <span className="text-[10px] text-gray-500">{name}</span>
                </div>
              )
            })}
          </div>
          {hasPrev && (
            <div className="flex items-center gap-4 mt-3 justify-end">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-300 inline-block"/><span className="text-xs text-gray-500">{prevYear}</span></span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#C8973A]/80 inline-block"/><span className="text-xs text-gray-500">{year}</span></span>
            </div>
          )}
        </div>
      </section>

      {/* Monthly Breakdown Table */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-4">Monthly Breakdown</h2>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Month</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Events</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Invoiced</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Collected</th>
                {hasPrev && (
                  <>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">{prevYear}</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">vs {prevYear}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((name, i) => {
                const m = i + 1
                const row     = monthly.find(r => r.month === m)
                const prevRow = prevMonthly.find(r => r.month === m)
                const mPct = hasPrev ? pct(prevRow?.collected ?? 0, row?.collected ?? 0) : null
                const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === m
                return (
                  <tr key={m} className={`border-b border-gray-200 ${i % 2 !== 0 ? 'bg-gray-50' : ''} ${isCurrent ? 'bg-[#C8973A]/5' : ''}`}>
                    <td className={`px-4 py-2.5 font-medium ${isCurrent ? 'text-[#C8973A]' : ''}`}>
                      {name}
                      {isCurrent && <span className="ml-2 text-[10px] text-[#C8973A]/60 uppercase tracking-widest">Now</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{row ? row.event_count : <span className="text-gray-600">—</span>}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{row ? formatCurrency(row.invoiced) : <span className="text-gray-600">—</span>}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{row ? formatCurrency(row.collected) : <span className="text-gray-600">—</span>}</td>
                    {hasPrev && (
                      <>
                        <td className="px-4 py-2.5 text-right text-gray-500">{prevRow ? formatCurrency(prevRow.collected) : <span className="text-gray-600">—</span>}</td>
                        <td className="px-4 py-2.5 text-right">{row && prevRow ? <PctBadge value={mPct} /> : <span className="text-gray-600">—</span>}</td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-white border-t border-gray-300">
              <tr>
                <td className="px-4 py-3 font-bold text-[#C8973A]">Total</td>
                <td className="px-4 py-3 text-right font-bold">{totals.event_count}</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(totals.invoiced)}</td>
                <td className="px-4 py-3 text-right font-bold text-[#C8973A]">{formatCurrency(totals.collected)}</td>
                {hasPrev && (
                  <>
                    <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(prevTotals.collected)}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={collPct} /></td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, prev, prevYear, pctVal }: {
  label: string; value: string; prev: string | null; prevYear: number; pctVal: number | null
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 space-y-3">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-[#C8973A]">{value}</p>
      {prev !== null && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-500">{prevYear}: {prev}</span>
          <PctBadge value={pctVal} />
        </div>
      )}
    </div>
  )
}
