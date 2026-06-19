'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { calcAllItems, effectiveGuests } from '@/lib/calculations'
import { to12Hour } from '@/lib/timeUtils'
import type { Event, Client, EventDetails, AddOn, Package, MenuItem, EventWithClient, EventPackageWithItems } from '@/lib/db'

interface FullData {
  event: Event
  client: Client | null | undefined
  details: EventDetails | null | undefined
  addOns: AddOn[]
  pkg: Package | null
  menuItems: MenuItem[]
  packages?: EventPackageWithItems[]
}

export function KitchenSheetClient({ events }: { events: EventWithClient[] }) {
  const [selectedId, setSelectedId] = useState('')
  const [sheetData, setSheetData] = useState<FullData | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadEvent(id: string) {
    setSelectedId(id)
    if (!id) { setSheetData(null); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${id}`)
      setSheetData(await res.json())
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
            {sheetData && (
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

      {/* Prep sheet */}
      {sheetData && !loading && <PrepSheet data={sheetData} />}
    </div>
  )
}

function PrepSheet({ data }: { data: FullData }) {
  const { event, client, details, addOns, pkg, menuItems } = data

  const guestCount = details?.guest_count ?? 0
  const bufferPct = details?.buffer_pct ?? 0
  const effGuests = effectiveGuests(guestCount, bufferPct)
  const allPackages = data.packages && data.packages.length > 0
    ? data.packages
    : (pkg ? [{ pkg, menuItems, guest_count: guestCount, buffer_pct: bufferPct, id: 0, event_id: 0, package_id: pkg.id, sort_order: 0 }] : [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prepItems = allPackages.flatMap(ep => ep.pkg ? calcAllItems(ep.menuItems as any, ep.guest_count, ep.buffer_pct) : [])
  const ticketQty = details?.bar_tab_type === 'Pre-Paid Drink Ticket(s)' ? (details?.drink_tickets ?? 0) : 0

  const generatedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="
      rounded-xl border border-white/10 bg-[#1F3348]/50 p-6 space-y-5
      print:rounded-none print:border-0 print:bg-white print:p-0 print:space-y-4 print:text-black
    ">

      {/* Sheet header */}
      <div className="border-b border-white/20 pb-4 print:border-gray-300 print:pb-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-[#C8973A] print:text-gray-500 mb-1">
              Manhattan Project Beer Co. · Kitchen Prep Sheet
            </p>
            <h2 className="text-xl font-bold text-white print:text-black">{event.event_name}</h2>
            {client && (
              <p className="text-sm text-gray-400 print:text-gray-600 mt-0.5">
                {client.first_name} {client.last_name}
                {client.company ? ` · ${client.company}` : ''}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-gray-500 print:text-gray-400">
            <p>Generated {generatedAt}</p>
          </div>
        </div>
      </div>

      {/* Event overview grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <MetaRow label="Date" value={event.event_date} />
        <MetaRow label="Space" value={event.space || '—'} />
        <MetaRow
          label="Event Time"
          value={[to12Hour(event.event_time), to12Hour(event.teardown_time)].filter(Boolean).join(' – ')}
        />
        <MetaRow label="Package" value={allPackages.length > 0 ? allPackages.map(ep => ep.pkg?.name ?? ep.package_id).join(', ') : '—'} />
        {event.setup_time && <MetaRow label="Setup Begins" value={to12Hour(event.setup_time)} />}
        {event.decorate_time && <MetaRow label="Customer Access" value={to12Hour(event.decorate_time)} />}
        <MetaRow
          label="Guests"
          value={
            guestCount > 0
              ? bufferPct > 0
                ? `${guestCount} (effective ${effGuests} w/ ${(bufferPct * 100).toFixed(0)}% buffer)`
                : String(guestCount)
              : '—'
          }
        />
        {details?.bar_tab_type && (
          <MetaRow label="Bar Tab" value={details.bar_tab_type} />
        )}
      </div>

      {/* Prep quantities */}
      <div>
        <SectionHeader>Prep Quantities</SectionHeader>
        {prepItems.length === 0 ? (
          <p className="text-sm text-gray-500 italic print:text-gray-400">
            No package set — quantities unavailable.
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-white/20 print:border-gray-400">
                <th className="text-left py-2 font-semibold text-gray-300 print:text-gray-600 pr-4">Item</th>
                <th className="text-right py-2 font-semibold text-gray-300 print:text-gray-600 w-20">Qty</th>
                <th className="text-right py-2 font-semibold text-gray-300 print:text-gray-600 w-28 pl-4">Unit</th>
              </tr>
            </thead>
            <tbody>
              {prepItems.map((item, i) => (
                <tr key={i} className="border-b border-white/10 print:border-gray-200">
                  <td className="py-2 text-white print:text-black pr-4">{item.item_name}</td>
                  <td className="py-2 text-right tabular-nums font-bold text-lg text-white print:text-black w-20">
                    {typeof item.total_qty === 'string' ? '—' : item.total_qty}
                  </td>
                  <td className="py-2 text-right text-gray-400 print:text-gray-600 w-28 pl-4">
                    {typeof item.total_qty === 'string' ? item.total_qty : (item.unit_name ?? '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Beverage */}
      {(details?.bar_tab_type || ticketQty > 0) && (
        <div>
          <SectionHeader>Bar & Beverage</SectionHeader>
          <div className="space-y-1 text-sm">
            {details?.bar_tab_type && (
              <MetaRow label="Bar Setup" value={`BAR TAB | ${details.bar_tab_type}`} />
            )}
            {ticketQty > 0 && (
              <MetaRow label="Drink Tickets" value={String(ticketQty)} />
            )}
            {details?.bar_tab_limit ? (
              <MetaRow label="Tab Limit" value={`$${details.bar_tab_limit}`} />
            ) : null}
          </div>
        </div>
      )}

      {/* Add-ons */}
      {addOns.length > 0 && (
        <div>
          <SectionHeader>Add-ons & Extras</SectionHeader>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-white/20 print:border-gray-400">
                <th className="text-left py-1.5 font-semibold text-gray-300 print:text-gray-600">Item</th>
                <th className="text-right py-1.5 font-semibold text-gray-300 print:text-gray-600 w-20">Qty</th>
                <th className="text-right py-1.5 font-semibold text-gray-300 print:text-gray-600 w-24">Unit</th>
              </tr>
            </thead>
            <tbody>
              {addOns.map(a => (
                <tr key={a.id} className="border-b border-white/10 print:border-gray-200">
                  <td className="py-1.5 text-white print:text-black">{a.item_name}</td>
                  <td className="py-1.5 text-right tabular-nums font-bold text-lg text-white print:text-black">{a.qty}</td>
                  <td className="py-1.5 text-right text-gray-400 print:text-gray-600">{a.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {(details?.dietary_restrictions || details?.food_notes || details?.setup_notes || details?.staffing_notes) && (
        <div>
          <SectionHeader>Notes & Restrictions</SectionHeader>
          <div className="space-y-2 text-sm">
            {details.dietary_restrictions && (
              <NoteRow label="Dietary Restrictions" value={details.dietary_restrictions} alert />
            )}
            {details.food_notes && (
              <NoteRow label="Food Notes" value={details.food_notes} />
            )}
            {details.setup_notes && (
              <NoteRow label="Setup Notes" value={details.setup_notes} />
            )}
            {details.staffing_notes && (
              <NoteRow label="Staffing Notes" value={details.staffing_notes} />
            )}
          </div>
        </div>
      )}

      {/* Client contact (for day-of reference) */}
      {client && (client.phone || client.email) && (
        <div className="border-t border-white/10 pt-4 print:border-gray-200">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">Client Contact</p>
          <div className="flex gap-6 text-sm text-gray-300 print:text-gray-700">
            {client.phone && <span>{client.phone}</span>}
            {client.email && <span>{client.email}</span>}
          </div>
        </div>
      )}

    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] print:text-gray-500 mb-2 pb-1 border-b border-white/10 print:border-gray-300">
      {children}
    </h3>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm py-0.5">
      <span className="text-gray-400 print:text-gray-500 shrink-0 w-36">{label}</span>
      <span className="text-white print:text-black font-medium">{value}</span>
    </div>
  )
}

function NoteRow({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 print:rounded-none print:px-0 print:bg-transparent ${alert ? 'bg-red-900/20 border border-red-500/30 print:border-0' : 'bg-white/5 print:bg-transparent'}`}>
      <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${alert ? 'text-red-400 print:text-red-700' : 'text-gray-400 print:text-gray-500'}`}>
        {label}
      </p>
      <p className="text-white print:text-black leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}
