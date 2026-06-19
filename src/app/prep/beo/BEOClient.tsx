'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { calcAllItems, effectiveGuests, formatCurrency, calcFloorPlan } from '@/lib/calculations'
import { to12Hour } from '@/lib/timeUtils'
import { DRINK_TICKET_PRICE } from '@/lib/constants'
import type { Event, Client, EventDetails, Payment, AddOn, Package, MenuItem, EventWithClient, EventPackageWithItems } from '@/lib/db'

interface FullData {
  event: Event
  client: Client | null | undefined
  details: EventDetails | null | undefined
  payments: Payment[]
  addOns: AddOn[]
  pkg: Package | null
  menuItems: MenuItem[]
  packages?: EventPackageWithItems[]
}

export function BEOClient({ events }: { events: EventWithClient[] }) {
  const [selectedId, setSelectedId] = useState('')
  const [beoData, setBeoData] = useState<FullData | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadEvent(id: string) {
    setSelectedId(id)
    if (!id) { setBeoData(null); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${id}`)
      setBeoData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Controls — hidden when printing */}
      <div className="print:hidden space-y-4 mb-6">
        {events.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-8 text-center text-gray-500 text-sm">
            No confirmed upcoming events found.
          </div>
        ) : (
          <div className="flex gap-3 items-center flex-wrap">
            <select
              value={selectedId}
              onChange={e => loadEvent(e.target.value)}
              className="flex-1 min-w-64 bg-[#1F3348] border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
            >
              <option value="">— Select a confirmed event —</option>
              {events.map(e => (
                <option key={e.id} value={String(e.id)}>
                  {e.event_date} · {e.event_name}
                  {e.first_name ? ` (${e.first_name} ${e.last_name}` : ''}
                  {e.guest_count ? `, ${e.guest_count} guests)` : e.first_name ? ')' : ''}
                </option>
              ))}
            </select>
            {beoData && (
              <Button
                onClick={() => window.print()}
                className="bg-[#C8973A] hover:bg-[#C8973A]/80 text-white shrink-0"
              >
                Print / Save PDF
              </Button>
            )}
          </div>
        )}
        {loading && <p className="text-sm text-gray-400">Loading…</p>}
      </div>

      {beoData && !loading && <BEODocument data={beoData} />}
    </div>
  )
}

function BEODocument({ data }: { data: FullData }) {
  const { event, client, details, payments, addOns, pkg, menuItems } = data

  const guestCount = details?.guest_count ?? 0
  const bufferPct  = details?.buffer_pct ?? 0
  const effGuests  = effectiveGuests(guestCount, bufferPct)
  const allPackages = data.packages && data.packages.length > 0
    ? data.packages
    : (pkg ? [{ pkg, menuItems, guest_count: guestCount, buffer_pct: bufferPct, id: 0, event_id: 0, package_id: pkg.id, sort_order: 0 }] : [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cateringItems = allPackages.flatMap(ep => ep.pkg ? calcAllItems(ep.menuItems as any, ep.guest_count, ep.buffer_pct) : [])

  // Financials — same logic as PaymentPanel
  const foodSub      = guestCount * (pkg?.price_per_guest ?? 0)
  const ticketQty    = details?.bar_tab_type === 'Pre-Paid Drink Ticket(s)' ? (details?.drink_tickets ?? 0) : 0
  const ticketSub    = ticketQty * DRINK_TICKET_PRICE
  const addOnsSub    = addOns.reduce((s, a) => s + a.qty * a.price_each, 0)
  const taxableBase  = foodSub + addOnsSub
  const taxPct       = details?.tax_pct ?? 0.0825
  const taxAmt       = taxableBase * taxPct
  const gratuityBase = foodSub + ticketSub + addOnsSub
  const gratuityAmt  = gratuityBase * (details?.gratuity_pct ?? 0)
  const serviceFee   = details?.service_fee ?? 0
  const grandTotal   = gratuityBase + taxAmt + gratuityAmt + serviceFee
  const totalCollected  = payments.reduce((s, p) => s + (p.amount_paid ?? 0), 0)
  const balanceRemaining = grandTotal - totalCollected
  const deposit      = payments.find(p => p.payment_type === 'deposit') ?? null
  const finalPmt     = payments.find(p => p.payment_type === 'final') ?? null

  const timeline = [
    { label: 'Production Closes',  time: event.production_close_time },
    { label: 'Setup Begins',        time: event.setup_time },
    { label: 'Customer Access',     time: event.decorate_time },
    { label: 'Event Start',         time: event.event_time,    highlight: true },
    { label: 'Event End',           time: event.teardown_time  },
  ].filter(t => t.time)

  const dayOfWeek = new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
  const formattedDate = new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const beoRef = `BEO-${String(event.id).padStart(4, '0')}`
  const generatedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="
      rounded-xl border border-white/10 bg-[#1F3348]/50 p-6 space-y-5
      print:rounded-none print:border-0 print:bg-white print:p-0 print:space-y-5 print:text-black
    ">

      {/* Document header */}
      <div className="border-b-2 border-[#C8973A] print:border-gray-800 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-[#C8973A] print:text-gray-500">
              Manhattan Project Beer Co.
            </p>
            <h2 className="text-2xl font-bold text-white print:text-black mt-0.5">
              BANQUET EVENT ORDER
            </h2>
            <p className="text-lg font-semibold text-gray-300 print:text-gray-700 mt-1">
              {event.event_name}
            </p>
          </div>
          <div className="text-right text-sm space-y-1">
            <p className="font-bold text-[#C8973A] print:text-gray-800 tracking-wider">{beoRef}</p>
            <p className="text-gray-400 print:text-gray-500 font-semibold">{event.status}</p>
            <p className="text-xs text-gray-500 print:text-gray-400 mt-1">Generated {generatedAt}</p>
          </div>
        </div>
      </div>

      {/* Top grid: event info + client */}
      <div className="grid grid-cols-2 gap-6">

        {/* Event details */}
        <div>
          <SectionHeader>Event Details</SectionHeader>
          <div className="space-y-1">
            <Row label="Date" value={`${dayOfWeek}, ${formattedDate}`} />
            <Row label="Space" value={event.space || '—'} />
            <Row label="Package" value={allPackages.length > 0 ? allPackages.map(ep => ep.pkg?.name ?? ep.package_id).join(', ') : '—'} />
            <Row
              label="Guests"
              value={
                guestCount > 0
                  ? bufferPct > 0
                    ? `${guestCount} (effective ${effGuests} w/ ${(bufferPct * 100).toFixed(0)}% buffer)`
                    : String(guestCount)
                  : '—'
              }
            />
            {details?.contract_signed ? (
              <Row label="Contract" value="✓ Signed" />
            ) : (
              <Row label="Contract" value="✗ Not signed" alert />
            )}
          </div>
        </div>

        {/* Client info */}
        <div>
          <SectionHeader>Client</SectionHeader>
          {client ? (
            <div className="space-y-1">
              <Row label="Name" value={`${client.first_name} ${client.last_name}`} />
              {client.company && <Row label="Company" value={client.company} />}
              {client.phone  && <Row label="Phone"   value={client.phone} />}
              {client.email  && <Row label="Email"   value={client.email} />}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No client on file.</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      {timeline.length > 0 && (
        <div>
          <SectionHeader>Timeline</SectionHeader>
          <div className="grid grid-cols-1 gap-0">
            {timeline.map(({ label, time, highlight }) => (
              <div
                key={label}
                className={`flex items-center gap-4 px-3 py-2 rounded-lg
                  ${highlight
                    ? 'bg-[#C8973A]/15 print:bg-transparent print:font-bold'
                    : 'hover:bg-white/5 print:bg-transparent'}
                  border-b border-white/5 print:border-gray-200 last:border-0`}
              >
                <span className={`font-mono tabular-nums text-sm w-20 shrink-0
                  ${highlight ? 'text-[#C8973A] print:text-black font-bold' : 'text-gray-300 print:text-black'}`}>
                  {to12Hour(time)}
                </span>
                <span className={`text-sm ${highlight ? 'text-white print:text-black font-semibold' : 'text-gray-400 print:text-gray-600'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Catering */}
      <div>
        <SectionHeader>
          Catering{pkg ? ` — ${pkg.name}` : ''}
          {pkg && guestCount > 0 && (
            <span className="ml-2 text-gray-400 print:text-gray-500 font-normal normal-case tracking-normal">
              ({guestCount} guests × {formatCurrency(pkg.price_per_guest)})
            </span>
          )}
        </SectionHeader>
        {cateringItems.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No package set.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/20 print:border-gray-300">
                <th className="text-left py-1.5 text-gray-400 print:text-gray-600 font-semibold">Item</th>
                <th className="text-right py-1.5 text-gray-400 print:text-gray-600 font-semibold w-16">Qty</th>
                <th className="text-right py-1.5 text-gray-400 print:text-gray-600 font-semibold w-28 pl-3">Unit</th>
              </tr>
            </thead>
            <tbody>
              {cateringItems.map((item, i) => (
                <tr key={i} className="border-b border-white/5 print:border-gray-100">
                  <td className="py-1.5 text-white print:text-black">{item.item_name}</td>
                  <td className="py-1.5 text-right tabular-nums text-white print:text-black font-medium">
                    {typeof item.total_qty === 'string' ? '—' : item.total_qty}
                  </td>
                  <td className="py-1.5 text-right text-gray-400 print:text-gray-600 pl-3">
                    {typeof item.total_qty === 'string' ? item.total_qty : (item.unit_name ?? '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bar & Beverage */}
      {(details?.bar_tab_type || ticketQty > 0) && (
        <div>
          <SectionHeader>Bar & Beverage</SectionHeader>
          <div className="space-y-1">
            {details?.bar_tab_type && <Row label="Bar Setup" value={`BAR TAB | ${details.bar_tab_type}`} />}
            {ticketQty > 0       && <Row label="Drink Tickets" value={`${ticketQty} tickets`} />}
            {details?.bar_tab_limit ? <Row label="Tab Limit" value={formatCurrency(details.bar_tab_limit)} /> : null}
            {details?.tab_details && (
              <div className="mt-2 text-sm text-gray-300 print:text-gray-700 leading-relaxed whitespace-pre-wrap bg-white/5 print:bg-transparent rounded-lg px-3 py-2 print:px-0 print:py-0">
                {details.tab_details}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add-ons */}
      {addOns.length > 0 && (
        <div>
          <SectionHeader>Add-ons & Extras</SectionHeader>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/20 print:border-gray-300">
                <th className="text-left py-1.5 text-gray-400 print:text-gray-600 font-semibold">Item</th>
                <th className="text-right py-1.5 text-gray-400 print:text-gray-600 font-semibold w-16">Qty</th>
                <th className="text-right py-1.5 text-gray-400 print:text-gray-600 font-semibold w-24 pl-3">Unit</th>
                <th className="text-right py-1.5 text-gray-400 print:text-gray-600 font-semibold w-24 pl-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {addOns.map(a => (
                <tr key={a.id} className="border-b border-white/5 print:border-gray-100">
                  <td className="py-1.5 text-white print:text-black">{a.item_name}</td>
                  <td className="py-1.5 text-right tabular-nums text-white print:text-black font-medium">{a.qty}</td>
                  <td className="py-1.5 text-right text-gray-400 print:text-gray-600 pl-3">{a.unit}</td>
                  <td className="py-1.5 text-right tabular-nums text-white print:text-black pl-3">{formatCurrency(a.qty * a.price_each)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Financial Summary */}
      {(pkg || addOns.length > 0) && (
        <div>
          <SectionHeader>Financial Summary</SectionHeader>
          <div className="max-w-xs space-y-1">
            {foodSub > 0   && <FinRow label={`Food (${guestCount} × ${formatCurrency(pkg?.price_per_guest ?? 0)})`} value={formatCurrency(foodSub)} />}
            {addOnsSub > 0 && <FinRow label="Add-ons" value={formatCurrency(addOnsSub)} />}
            {ticketSub > 0 && <FinRow label={`Drink Tickets (${ticketQty} × $${DRINK_TICKET_PRICE})`} value={formatCurrency(ticketSub)} />}
            <FinRow label={`Tax (${(taxPct * 100).toFixed(2)}%)`} value={formatCurrency(taxAmt)} />
            {serviceFee > 0  && <FinRow label="Service Fee" value={formatCurrency(serviceFee)} />}
            {gratuityAmt > 0 && <FinRow label={`Gratuity (${((details?.gratuity_pct ?? 0) * 100).toFixed(0)}%)`} value={formatCurrency(gratuityAmt)} />}
            <div className="border-t border-white/20 print:border-gray-400 pt-1 mt-1 space-y-1">
              <FinRow label="Grand Total" value={formatCurrency(grandTotal)} bold />
              {deposit && (
                <FinRow
                  label={`Deposit (${deposit.status})`}
                  value={formatCurrency(deposit.amount_due)}
                  muted
                />
              )}
              {finalPmt && (
                <FinRow
                  label={`Final Payment (${finalPmt.status})`}
                  value={formatCurrency(finalPmt.amount_due)}
                  muted
                />
              )}
              <FinRow
                label="Balance Remaining"
                value={formatCurrency(balanceRemaining)}
                bold
                highlight={balanceRemaining > 0 ? 'amber' : 'green'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floor Plan & Setup */}
      {(() => {
        const rec = calcFloorPlan(guestCount)
        const tvOn = !!(details?.big_screen_tv)
        const hasNotes = !!(details?.floor_plan_notes)
        return (
          <div>
            <SectionHeader>Floor Plan &amp; Setup</SectionHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-4 flex-wrap">
                <Row label="Layout" value={rec.layoutType} alert={rec.isOverCapacity} />
              </div>
              {!rec.isOverCapacity && rec.tablesNeeded !== null && (
                <div className="flex gap-6 text-sm pl-0">
                  <span className="text-gray-400 print:text-gray-500 w-28 shrink-0">Tables / High-Tops</span>
                  <span className="text-white print:text-black font-medium">
                    {rec.tablesNeeded} × 6-ft table{rec.tablesNeeded !== 1 ? 's' : ''}
                    {(rec.highTopCount ?? 0) > 0 ? ` + ${rec.highTopCount} high-top${rec.highTopCount !== 1 ? 's' : ''}` : ''}
                    {rec.seatedCapacity ? ` (seats ${rec.seatedCapacity})` : ''}
                  </span>
                </div>
              )}
              {rec.warning && (
                <div className={`rounded-lg px-3 py-1.5 text-sm print:rounded-none print:px-0 print:border-l-4 print:pl-3
                  ${rec.warningLevel === 'danger'  ? 'bg-red-900/20 border border-red-500/30 text-red-300 print:border-red-600 print:text-red-700' :
                    rec.warningLevel === 'caution' ? 'bg-yellow-900/20 border border-yellow-500/30 text-yellow-300 print:border-yellow-600 print:text-yellow-800' :
                    'bg-blue-900/20 border border-blue-500/30 text-blue-300 print:border-blue-600 print:text-blue-800'}`}>
                  {rec.warning}
                </div>
              )}
              <div className="pt-1">
                <p className="text-xs text-gray-500 print:text-gray-400 uppercase tracking-wide font-semibold mb-1">Setup Checklist</p>
                <ul className="text-sm space-y-0.5 text-gray-300 print:text-gray-700">
                  <li>• Cover all tables with black tablecloths (check BEO for exemptions)</li>
                  <li>• Garage Door: open only if weather 65°–75°; one warning for chain misuse, then close</li>
                  <li>• Place black velvet ropes at all marked positions</li>
                  <li>• Dim lights; music on Source 2 at minimum volume 90</li>
                  <li className={tvOn ? 'font-semibold text-white print:text-black' : 'text-gray-500 print:text-gray-400'}>
                    • Big Screen TV: {tvOn ? 'YES — include in setup' : 'No'}
                  </li>
                  <li>• Post-event: start linens in washing machine immediately</li>
                </ul>
              </div>
              {hasNotes && (
                <NoteBlock label="Floor Plan Notes" value={details!.floor_plan_notes} />
              )}
            </div>
          </div>
        )
      })()}

      {/* Special Instructions */}
      {(details?.dietary_restrictions || details?.food_notes || details?.setup_notes || details?.staffing_notes) && (
        <div>
          <SectionHeader>Special Instructions</SectionHeader>
          <div className="space-y-2">
            {details.dietary_restrictions && (
              <NoteBlock label="⚠ Dietary Restrictions" value={details.dietary_restrictions} alert />
            )}
            {details.food_notes && (
              <NoteBlock label="Food Notes" value={details.food_notes} />
            )}
            {details.setup_notes && (
              <NoteBlock label="Setup Notes" value={details.setup_notes} />
            )}
            {details.staffing_notes && (
              <NoteBlock label="Staffing Notes" value={details.staffing_notes} />
            )}
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] print:text-gray-500 mb-2 pb-1 border-b border-white/10 print:border-gray-300">
      {children}
    </h3>
  )
}

function Row({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex gap-2 text-sm py-0.5">
      <span className="text-gray-400 print:text-gray-500 shrink-0 w-28">{label}</span>
      <span className={`font-medium ${alert ? 'text-red-400 print:text-red-700' : 'text-white print:text-black'}`}>
        {value}
      </span>
    </div>
  )
}

function FinRow({ label, value, bold, muted, highlight }: {
  label: string
  value: string
  bold?: boolean
  muted?: boolean
  highlight?: 'amber' | 'green'
}) {
  const valueColor =
    highlight === 'amber' ? 'text-[#C8973A] print:text-black' :
    highlight === 'green' ? 'text-green-400 print:text-green-700' :
    muted ? 'text-gray-400 print:text-gray-600' :
    'text-white print:text-black'

  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
      <span className={muted ? 'text-gray-400 print:text-gray-500' : 'text-gray-300 print:text-gray-700'}>
        {label}
      </span>
      <span className={`tabular-nums ${valueColor}`}>{value}</span>
    </div>
  )
}

function NoteBlock({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 print:rounded-none print:px-0 print:bg-transparent
      ${alert ? 'bg-red-900/20 border border-red-500/30 print:border-l-4 print:border-red-600 print:pl-3' : 'bg-white/5'}`}>
      <p className={`text-xs font-bold uppercase tracking-wide mb-0.5
        ${alert ? 'text-red-400 print:text-red-700' : 'text-gray-400 print:text-gray-500'}`}>
        {label}
      </p>
      <p className="text-sm text-white print:text-black leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}
