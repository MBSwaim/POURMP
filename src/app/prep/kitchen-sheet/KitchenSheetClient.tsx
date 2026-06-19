'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { calcAllItems, effectiveGuests, getApplicableSauces, getServingware, countChafingDishes } from '@/lib/calculations'
import type { ApplicableSauce } from '@/lib/calculations'
import { to12Hour, shiftTime } from '@/lib/timeUtils'
import type { Event, Client, EventDetails, AddOn, Package, MenuItem, EventWithClient } from '@/lib/db'
import { Logo } from '@/components/Logo'

interface FullData {
  event: Event
  client: Client | null | undefined
  details: EventDetails | null | undefined
  addOns: AddOn[]
  pkg: Package | null
  menuItems: MenuItem[]
  packages?: EventPackageWithItems[]
}

export function KitchenSheetClient({ events, initialEventId = '' }: { events: EventWithClient[], initialEventId?: string }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(initialEventId)
  const [sheetData, setSheetData] = useState<FullData | null>(null)
  const [loading, setLoading] = useState(false)

  // Auto-load if arriving with a pre-selected event
  useState(() => {
    if (initialEventId) loadEvent(initialEventId)
  })

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
        {initialEventId && (
          <button
            onClick={() => router.push(`/events/${initialEventId}`)}
            className="flex items-center gap-1.5 text-sm text-[#C8973A] hover:text-[#C8973A]/80 transition-colors"
          >
            ← Back to Event
          </button>
        )}
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
      {sheetData && !loading && <PrepSheet key={selectedId} data={sheetData} />}
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

  const serveStyle: Record<string, 'all' | 'staggered'> = (() => {
    try { return JSON.parse(details?.serve_style_json || '{}') } catch { return {} }
  })()

  const applicableSauces = getApplicableSauces(menuItems)
  const autoSauces = applicableSauces.filter((s: ApplicableSauce) => !s.selectable)
  const selectableSauces = applicableSauces.filter((s: ApplicableSauce) => s.selectable)
  // Use saved selection from DB; fall back to all selected if never saved
  const savedSet = details?.selected_sauces
    ? new Set(details.selected_sauces.split(',').map((s: string) => s.trim()).filter(Boolean))
    : new Set(selectableSauces.map((s: ApplicableSauce) => s.name))
  const displayedSauces: ApplicableSauce[] = [
    ...autoSauces,
    ...selectableSauces.filter((s: ApplicableSauce) => savedSet.has(s.name)),
  ]

  const generatedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="
      rounded-xl border border-white/10 bg-[#1F3348]/50 p-6 space-y-5
      print:rounded-none print:border-0 print:bg-white print:p-0 print:space-y-2 print:text-black
    ">

      {/* Sheet header */}
      <div className="border-b border-white/20 pb-4 print:border-gray-300 print:pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <Logo className="w-12 h-12 print:w-9 print:h-9 shrink-0 mt-0.5" color="black" />
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
          </div>
          <div className="text-right text-xs text-gray-500 print:text-gray-400">
            <p>Generated {generatedAt}</p>
          </div>
        </div>
      </div>

      {/* Event overview grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <MetaRow label="Date" value={new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
        <MetaRow label="Space" value={event.space || '—'} />
        <MetaRow
          label="Event Time"
          value={[to12Hour(event.event_time), to12Hour(event.teardown_time)].filter(Boolean).join(' – ')}
        />
        <MetaRow label="Package" value={allPackages.length > 0 ? allPackages.map(ep => ep.pkg?.name ?? ep.package_id).join(', ') : '—'} />
        {event.setup_time && <MetaRow label="Setup Begins" value={to12Hour(event.setup_time)} />}
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
        {event.event_time && (
          <MetaRow
            label="Food Ready By"
            value={to12Hour(shiftTime(event.event_time, -15))}
            alert
          />
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
                <th className="text-left py-2 print:py-1 font-semibold text-gray-300 print:text-gray-600 pr-4">Item</th>
                <th className="text-center py-2 print:py-1 font-semibold text-gray-300 print:text-gray-600">Notes</th>
                <th className="text-right py-2 print:py-1 font-semibold text-gray-300 print:text-gray-600 w-20">Qty</th>
                <th className="text-right py-2 print:py-1 font-semibold text-gray-300 print:text-gray-600 w-28 pl-4">Unit</th>
              </tr>
            </thead>
            <tbody>
              {prepItems.map((item, i) => (
                <tr key={i} className="border-b border-white/10 print:border-gray-200">
                  <td className="py-2 print:py-1 text-white print:text-black pr-4">{item.item_name}</td>
                  <td className="py-2 print:py-1 text-center">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {item.piece_count !== undefined && (
                        <span className="text-xs text-gray-400 print:text-gray-500 font-normal">
                          {item.piece_count} pcs
                        </span>
                      )}
                      {typeof item.total_qty === 'number' && item.total_qty > 1 && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded print:border print:border-gray-400 print:bg-transparent ${
                          (serveStyle[item.item_name] ?? 'all') === 'staggered'
                            ? 'bg-blue-900/40 text-blue-300 print:text-blue-800'
                            : 'bg-white/10 text-gray-300 print:text-gray-600'
                        }`}>
                          {(serveStyle[item.item_name] ?? 'all') === 'staggered' ? '1 @ a time' : 'All at once'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 print:py-1 text-right tabular-nums font-bold text-lg print:text-base text-white print:text-black w-20">
                    {typeof item.total_qty === 'string' ? '—' : item.total_qty}
                  </td>
                  <td className="py-2 print:py-1 text-right text-gray-400 print:text-gray-600 w-28 pl-4">
                    {typeof item.total_qty === 'string' ? item.total_qty : (item.unit_name ?? '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sauces */}
      {displayedSauces.length > 0 && (
        <div>
          <SectionHeader>Sauces</SectionHeader>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-white/20 print:border-gray-400">
                <th className="text-left py-2 print:py-1 font-semibold text-gray-300 print:text-gray-600 pr-4">Sauce</th>
                <th className="text-right py-2 print:py-1 font-semibold text-gray-300 print:text-gray-600 w-32">Vessel</th>
                <th className="text-right py-2 print:py-1 font-semibold text-gray-300 print:text-gray-600 w-44 pl-4">Note</th>
              </tr>
            </thead>
            <tbody>
              {displayedSauces.map((sauce: ApplicableSauce) => (
                <tr key={sauce.name} className="border-b border-white/10 print:border-gray-200">
                  <td className="py-2 print:py-1 text-white print:text-black pr-4">{sauce.name}</td>
                  <td className="py-2 print:py-1 text-right text-gray-400 print:text-gray-600 w-32">Medium Bowl</td>
                  <td className="py-2 print:py-1 text-right text-gray-500 print:text-gray-500 w-44 pl-4 italic">Refill as necessary</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Equipment Required */}
      {prepItems.length > 0 && (
        <div>
          <SectionHeader>Equipment Required</SectionHeader>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-white/20 print:border-gray-400">
                <th className="text-left py-2 print:py-1 font-semibold text-gray-300 print:text-gray-600 pr-4">Food Item</th>
                <th className="text-left py-2 print:py-1 font-semibold text-gray-300 print:text-gray-600 w-36">Utensil</th>
                <th className="text-left py-2 print:py-1 font-semibold text-gray-300 print:text-gray-600 w-40">Servingware</th>
                <th className="text-left py-2 print:py-1 font-semibold text-gray-300 print:text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody>
              {prepItems.map((item, i) => {
                const sw = getServingware(item.item_name)
                if (!sw) return null
                return (
                  <tr key={i} className="border-b border-white/10 print:border-gray-200">
                    <td className="py-2 print:py-1 text-white print:text-black pr-4">{item.item_name}</td>
                    <td className="py-2 print:py-1 text-gray-300 print:text-gray-700 w-36">{sw.utensil}</td>
                    <td className="py-2 print:py-1 text-gray-300 print:text-gray-700 w-40">{sw.vessel}</td>
                    <td className="py-2 print:py-1 text-gray-500 print:text-gray-400 italic text-xs">{sw.altNote ?? ''}</td>
                  </tr>
                )
              })}
              {displayedSauces.map((sauce: ApplicableSauce) => (
                <tr key={`sw-sauce-${sauce.name}`} className="border-b border-white/10 print:border-gray-200">
                  <td className="py-2 print:py-1 text-gray-400 print:text-gray-600 pr-4 italic">{sauce.name}</td>
                  <td className="py-2 print:py-1 text-gray-300 print:text-gray-700 w-36">Small Ladle</td>
                  <td className="py-2 print:py-1 text-gray-300 print:text-gray-700 w-40">1 per bowl</td>
                  <td className="py-2 print:py-1 text-gray-500 print:text-gray-400 italic text-xs"></td>
                </tr>
              ))}
              {(() => {
                const c = countChafingDishes(prepItems, serveStyle)
                if (c.total === 0) return null
                return (
                  <tr className="border-t-2 border-[#C8973A]/40 print:border-gray-400 bg-[#C8973A]/5 print:bg-transparent">
                    <td colSpan={4} className="py-3 print:py-1.5 px-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-[#C8973A] print:text-black tabular-nums">{c.total}</span>
                        <span className="text-sm font-semibold text-white print:text-black">Chafing {c.total === 1 ? 'Dish' : 'Dishes'} Needed</span>
                        <span className="text-xs text-gray-400 print:text-gray-600 ml-2">
                          {[
                            c.fullSize > 0 ? `${c.fullSize} × full-size (200 pan)` : '',
                            c.halfSize > 0 ? `${c.halfSize} × half-size (1/2 pan)` : '',
                          ].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* Beverage — drink tickets only, bar setup not relevant to kitchen */}
      {ticketQty > 0 && (
        <div>
          <SectionHeader>Beverage</SectionHeader>
          <div className="space-y-1 text-sm">
            <MetaRow label="Drink Tickets" value={String(ticketQty)} />
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
      {(details?.dietary_restrictions || details?.food_notes || details?.setup_notes || details?.staffing_notes || details?.kitchen_notes) && (
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
            {details.kitchen_notes && (
              <NoteRow label="Kitchen Notes" value={details.kitchen_notes} />
            )}
          </div>
        </div>
      )}

      {/* Client contact (for day-of reference) */}
      {client && (client.first_name || client.phone || client.email) && (
        <div className="border-t border-white/10 pt-4 print:pt-2 print:border-gray-200">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">Client Contact</p>
          <div className="flex gap-6 text-sm text-gray-300 print:text-gray-700">
            {(client.first_name || client.last_name) && (
              <span className="font-semibold text-white print:text-black">
                {[client.first_name, client.last_name].filter(Boolean).join(' ')}
              </span>
            )}
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
    <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] print:text-gray-500 mb-2 print:mb-1 pb-1 print:pb-0.5 border-b border-white/10 print:border-gray-300">
      {children}
    </h3>
  )
}

function MetaRow({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex gap-2 text-sm py-0.5">
      <span className={`shrink-0 w-36 ${alert ? 'text-[#C8973A] print:text-gray-500 font-semibold' : 'text-gray-400 print:text-gray-500'}`}>{label}</span>
      <span className={`font-medium ${alert ? 'text-[#C8973A] print:text-black font-bold' : 'text-white print:text-black'}`}>{value}</span>
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
