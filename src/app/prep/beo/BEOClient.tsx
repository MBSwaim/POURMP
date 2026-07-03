'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { calcAllItems, mergeCalculatedItems, effectiveGuests, formatCurrency, calcFloorPlan, SAUCE_RULES, getServingware, countChafingDishes, calcSupplies, parseMenuItemOverrides } from '@/lib/calculations'
import { Logo } from '@/components/Logo'
import { to12Hour, shiftTime } from '@/lib/timeUtils'
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

export function BEOClient({ events, initialEventId = '' }: { events: EventWithClient[], initialEventId?: string }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(initialEventId)
  const [beoData, setBeoData] = useState<FullData | null>(null)
  const [loading, setLoading] = useState(false)

  useState(() => {
    if (initialEventId) loadEvent(initialEventId)
  })

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
        {initialEventId && (
          <button
            onClick={() => router.push(`/events/${initialEventId}`)}
            className="flex items-center gap-1.5 text-sm text-[#C8973A] hover:text-[#C8973A]/80 transition-colors"
          >
            ← Back to Event
          </button>
        )}
        {events.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 text-sm">
            No confirmed upcoming events found.
          </div>
        ) : (
          <div className="flex gap-3 items-center flex-wrap">
            <select
              value={selectedId}
              onChange={e => loadEvent(e.target.value)}
              className="flex-1 min-w-64 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
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
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
      </div>

      {beoData && !loading && <BEODocument data={beoData} />}
    </div>
  )
}

function BEODocument({ data }: { data: FullData }) {
  const { event, client, details, addOns, pkg, menuItems } = data

  const guestCount = details?.guest_count ?? 0
  const bufferPct  = details?.buffer_pct ?? 0
  const effGuests  = effectiveGuests(guestCount, bufferPct)
  const allPackages = data.packages && data.packages.length > 0
    ? data.packages
    : (pkg ? [{ pkg, menuItems, guest_count: guestCount, buffer_pct: bufferPct, id: 0, event_id: 0, package_id: pkg.id, sort_order: 0 }] : [])
  const itemOverrides = parseMenuItemOverrides(details?.menu_item_overrides_json)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cateringItems = mergeCalculatedItems(allPackages.flatMap(ep => ep.pkg ? calcAllItems(ep.menuItems as any, ep.guest_count, ep.buffer_pct, itemOverrides) : []))

  const serveStyle: Record<string, 'all' | 'staggered'> = (() => {
    try { return JSON.parse(details?.serve_style_json || '{}') } catch { return {} }
  })()

  const savedSauceSet = details?.selected_sauces
    ? new Set(details.selected_sauces.split(',').map((s: string) => s.trim()).filter(Boolean))
    : null

  function saucesForItem(itemName: string): string[] {
    return SAUCE_RULES
      .filter(r => itemName.toLowerCase().includes(r.trigger.toLowerCase()))
      .flatMap(r => r.sauces.filter(s => !r.selectable || !savedSauceSet || savedSauceSet.has(s)))
  }

  const timeline = [
    { label: 'Production Closes',        time: event.production_close_time },
    { label: 'Setup Begins',             time: event.setup_time },
    { label: 'Customer Access',          time: event.decorate_time },
    { label: 'Food Ready — Buffet Opens',time: event.event_time ? shiftTime(event.event_time, -15) : null, note: 'All food must be set and hot' },
    { label: 'Event Start',              time: event.event_time, highlight: true },
    { label: 'Event End',                time: event.teardown_time },
  ].filter(t => t.time)

  const dayOfWeek    = new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
  const formattedDate = new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const beoRef       = `BEO-${String(event.id).padStart(4, '0')}`
  const generatedAt  = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  const tvOn         = !!(details?.big_screen_tv)

  return (
    <div className="
      rounded-xl border border-gray-200 bg-white p-6 space-y-4
      print:rounded-none print:border-0 print:bg-white print:p-0 print:space-y-3 print:text-black
    ">

      {/* Document header */}
      <div className="border-b-2 border-[#C8973A] print:border-gray-800 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Logo className="w-12 h-12 print:w-9 print:h-9 shrink-0 mt-0.5" color="black" />
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-[#C8973A] print:text-gray-500">
                Manhattan Project Beer Co.
              </p>
              <h2 className="text-xl font-bold text-gray-900 print:text-black mt-0.5">BANQUET EVENT ORDER</h2>
              <p className="text-base font-semibold text-gray-700 print:text-gray-700 mt-0.5">{event.event_name}</p>
            </div>
          </div>
          <div className="text-right text-sm space-y-0.5">
            <p className="font-bold text-[#C8973A] print:text-gray-800 tracking-wider">{beoRef}</p>
            <p className="text-gray-500 print:text-gray-500 font-semibold">{event.status}</p>
            <p className="text-xs text-gray-500 print:text-gray-500">Generated {generatedAt}</p>
          </div>
        </div>
      </div>

      {/* Top grid: event info + client side by side */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <SectionHeader>Event Details</SectionHeader>
          <div className="space-y-0.5">
            <Row label="Date"    value={`${dayOfWeek}, ${formattedDate}`} />
            <Row label="Space"   value={event.space || '—'} />
            <Row label="Package" value={pkg?.name ?? '—'} />
            <Row label="Guests"  value={
              guestCount > 0
                ? bufferPct > 0
                  ? `${guestCount} (effective ${effGuests} w/ ${(bufferPct * 100).toFixed(0)}% buffer)`
                  : String(guestCount)
                : '—'
            } />
          </div>
        </div>

        <div>
          <SectionHeader>Client</SectionHeader>
          {client ? (
            <div className="space-y-0.5">
              <Row label="Name"    value={`${client.first_name} ${client.last_name}`} />
              {client.company && <Row label="Company" value={client.company} />}
              {client.phone   && <Row label="Phone"   value={client.phone} />}
              {client.email   && <Row label="Email"   value={client.email} />}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No client on file.</p>
          )}
        </div>
      </div>

      {/* Run of Show */}
      {timeline.length > 0 && (
        <div>
          <SectionHeader>Run of Show</SectionHeader>
          <div className="grid grid-cols-1">
            {timeline.map(({ label, time, highlight, note }) => (
              <div
                key={label}
                className={`flex items-center gap-4 px-2 py-1 rounded
                  ${highlight ? 'bg-[#C8973A]/15 print:bg-transparent print:font-bold' : 'print:bg-transparent'}
                  border-b border-gray-200 print:border-gray-200 last:border-0`}
              >
                <span className={`font-mono tabular-nums text-sm w-18 shrink-0
                  ${highlight ? 'text-[#C8973A] print:text-black font-bold' : 'text-gray-700 print:text-black'}`}>
                  {to12Hour(time)}
                </span>
                <span className={`text-sm ${highlight ? 'text-gray-900 print:text-black font-semibold' : 'text-gray-500 print:text-gray-600'}`}>
                  {label}
                  {note && <span className="ml-2 text-xs text-gray-500 print:text-gray-500 italic">{note}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Catering */}
      <div>
        <SectionHeader>Catering{pkg ? ` — ${pkg.name}` : ''}</SectionHeader>
        {cateringItems.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No package set.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300 print:border-gray-300">
                <th className="text-left py-1 text-gray-500 print:text-gray-600 font-semibold">Item</th>
                <th className="text-right py-1 text-gray-500 print:text-gray-600 font-semibold w-16">Qty</th>
                <th className="text-right py-1 text-gray-500 print:text-gray-600 font-semibold w-28 pl-3">Unit</th>
              </tr>
            </thead>
            <tbody>
              {cateringItems.map((item, i) => (
                <React.Fragment key={i}>
                  <tr className="border-b border-gray-200 print:border-gray-100">
                    <td className="py-1 text-gray-900 print:text-black">
                      {item.item_name}
                      {typeof item.total_qty === 'number' && item.total_qty > 1 && (
                        <span className="ml-2 text-xs text-gray-500 print:text-gray-500 italic font-normal">
                          ({(serveStyle[item.item_name] ?? 'all') === 'staggered' ? '1 @ a time' : 'all at once'})
                        </span>
                      )}
                    </td>
                    <td className="py-1 text-right tabular-nums text-gray-900 print:text-black font-medium">
                      {typeof item.total_qty === 'string' ? '—' : item.total_qty}
                    </td>
                    <td className="py-1 text-right text-gray-500 print:text-gray-600 pl-3">
                      {typeof item.total_qty === 'string' ? item.total_qty : (item.unit_name ?? '')}
                    </td>
                  </tr>
                  {saucesForItem(item.item_name).map(sauce => (
                    <tr key={`${i}-${sauce}`} className="border-b border-gray-200 print:border-gray-100">
                      <td className="py-0.5 pl-5 text-gray-500 print:text-gray-500 italic text-xs">↳ {sauce}</td>
                      <td />
                      <td className="py-0.5 text-right text-gray-500 print:text-gray-500 italic text-xs pl-3">Sauce</td>
                    </tr>
                  ))}
                  {item.half_pan_qty ? (
                    <tr key={`${i}-halfpan`} className="border-b border-gray-200 print:border-gray-100">
                      <td className="py-0.5 pl-5 text-gray-500 print:text-gray-500 italic text-xs">↳ remainder</td>
                      <td className="py-0.5 text-right tabular-nums text-gray-500 print:text-gray-500 text-xs">{item.half_pan_qty}</td>
                      <td className="py-0.5 text-right text-gray-500 print:text-gray-500 italic text-xs pl-3">1/2 Chafer</td>
                    </tr>
                  ) : null}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Equipment Required */}
      {cateringItems.length > 0 && (
        <div>
          <SectionHeader>Equipment Required</SectionHeader>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300 print:border-gray-300">
                <th className="text-left py-1 text-gray-500 print:text-gray-600 font-semibold pr-4">Food Item</th>
                <th className="text-left py-1 text-gray-500 print:text-gray-600 font-semibold w-36">Utensil</th>
                <th className="text-left py-1 text-gray-500 print:text-gray-600 font-semibold w-40">Servingware</th>
                <th className="text-left py-1 text-gray-500 print:text-gray-600 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {cateringItems.map((item, i) => {
                const sw = getServingware(item.item_name)
                if (!sw) return null
                return (
                  <tr key={i} className="border-b border-gray-200 print:border-gray-100">
                    <td className="py-1 text-gray-900 print:text-black pr-4">{item.item_name}</td>
                    <td className="py-1 text-gray-700 print:text-gray-700 w-36">{sw.utensil}</td>
                    <td className="py-1 text-gray-700 print:text-gray-700 w-40">{sw.vessel}</td>
                    <td className="py-1 text-gray-500 print:text-gray-500 italic text-xs">{sw.altNote ?? ''}</td>
                  </tr>
                )
              })}
              {(() => {
                const seen = new Set<string>()
                const saucesToShow: string[] = []
                for (const item of cateringItems) {
                  for (const sauce of saucesForItem(item.item_name)) {
                    if (!seen.has(sauce)) {
                      seen.add(sauce)
                      if (!savedSauceSet || savedSauceSet.has(sauce)) saucesToShow.push(sauce)
                    }
                  }
                }
                return saucesToShow.map(sauce => (
                  <tr key={`sw-sauce-${sauce}`} className="border-b border-gray-200 print:border-gray-100">
                    <td className="py-1 text-gray-500 print:text-gray-600 pr-4 italic">{sauce}</td>
                    <td className="py-1 text-gray-700 print:text-gray-700 w-36">Small Ladle</td>
                    <td className="py-1 text-gray-700 print:text-gray-700 w-40">1 per bowl</td>
                    <td />
                  </tr>
                ))
              })()}
              {(() => {
                const c = countChafingDishes(cateringItems, serveStyle)
                if (c.total === 0) return null
                return (
                  <tr className="border-t-2 border-[#C8973A]/40 print:border-gray-400 bg-[#C8973A]/5 print:bg-transparent">
                    <td colSpan={4} className="py-2 px-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-[#C8973A] print:text-black tabular-nums">{c.total}</span>
                        <span className="text-sm font-semibold text-gray-900 print:text-black">Chafing {c.total === 1 ? 'Dish' : 'Dishes'} Needed</span>
                        <span className="text-xs text-gray-500 print:text-gray-600 ml-1">
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

      {/* Supplies */}
      {guestCount > 0 && (() => {
        const floorPlan = calcFloorPlan(guestCount)
        const chafing = countChafingDishes(cateringItems, serveStyle)

        let durationHours = 3
        if (event.event_time && event.teardown_time) {
          const [sh, sm] = event.event_time.split(':').map(Number)
          const [eh, em] = event.teardown_time.split(':').map(Number)
          let start = sh * 60 + sm
          let end = eh * 60 + em
          if (end < start) end += 24 * 60
          durationHours = (end - start) / 60
        }

        const s = calcSupplies({
          guestCount,
          bufferPct,
          chafing,
          floorPlan,
          durationHours,
        })

        const rows: Array<[string, string]> = [
          ['Plates', String(s.plates)],
          ['Rolled Silverware', String(s.rolledSilverware)],
          ...(s.sternos > 0 ? [['Sternos', String(s.sternos)] as [string, string]] : []),
          ...(s.tablecloths > 0 ? [['Tablecloths', String(s.tablecloths)] as [string, string]] : []),
          ...(s.highTopCovers > 0 ? [['High-Top Covers', String(s.highTopCovers)] as [string, string]] : []),
        ]

        return (
          <div>
            <SectionHeader>Supplies Needed</SectionHeader>
            <div className="grid grid-cols-4 gap-x-6 gap-y-0.5">
              {rows.map(([label, val]) => (
                <Row key={label} label={label} value={val} />
              ))}
            </div>
          </div>
        )
      })()}

      {/* Bar & Beverage + Add-ons — side by side when both present */}
      {(details?.bar_tab_type || addOns.length > 0) && (
        <div className={`grid gap-5 ${details?.bar_tab_type && addOns.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>

          {details?.bar_tab_type && (
            <div>
              <SectionHeader>Bar & Beverage</SectionHeader>
              <div className="space-y-0.5">
                <Row label="Bar Setup" value={`BAR TAB | ${details.bar_tab_type}`} />
                {details.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && details.drink_tickets
                  ? <Row label="Drink Tickets" value={`${details.drink_tickets} tickets`} /> : null}
                {details.bar_tab_limit ? <Row label="Tab Limit" value={formatCurrency(details.bar_tab_limit)} /> : null}
                {details.tab_details && (
                  <p className="text-sm text-gray-700 print:text-gray-700 leading-relaxed whitespace-pre-wrap mt-1 text-xs">
                    {details.tab_details}
                  </p>
                )}
              </div>
            </div>
          )}

          {addOns.length > 0 && (
            <div>
              <SectionHeader>Add-ons & Extras</SectionHeader>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 print:border-gray-300">
                    <th className="text-left py-1 text-gray-500 print:text-gray-600 font-semibold">Item</th>
                    <th className="text-right py-1 text-gray-500 print:text-gray-600 font-semibold w-12">Qty</th>
                    <th className="text-right py-1 text-gray-500 print:text-gray-600 font-semibold w-20 pl-2">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {addOns.map(a => (
                    <tr key={a.id} className="border-b border-gray-200 print:border-gray-100">
                      <td className="py-1 text-gray-900 print:text-black">{a.item_name}</td>
                      <td className="py-1 text-right tabular-nums text-gray-900 print:text-black font-medium">{a.qty}</td>
                      <td className="py-1 text-right text-gray-500 print:text-gray-600 pl-2">{a.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Floor Plan & Setup */}
      {(() => {
        const rec = calcFloorPlan(guestCount)
        const hasNotes = !!(details?.floor_plan_notes)
        return (
          <div>
            <SectionHeader>Floor Plan &amp; Setup</SectionHeader>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-0.5">
                  <Row label="Layout" value={rec.layoutType} alert={rec.isOverCapacity} />
                  {!rec.isOverCapacity && rec.tablesNeeded !== null && (
                    <Row
                      label="Tables"
                      value={`${rec.tablesNeeded} × 6-ft${(rec.highTopCount ?? 0) > 0 ? ` + ${rec.highTopCount} high-top${rec.highTopCount !== 1 ? 's' : ''}` : ''}${rec.seatedCapacity ? ` (seats ${rec.seatedCapacity})` : ''}`}
                    />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 print:text-gray-500 uppercase tracking-wide font-semibold mb-1">Setup Checklist</p>
                  <ul className="text-xs space-y-0.5 text-gray-700 print:text-gray-700">
                    <li>☐ Black tablecloths on all tables</li>
                    <li>☐ Beer list &amp; wine list on each table</li>
                    <li>☐ Black velvet ropes at marked positions</li>
                    <li>☐ Lights dimmed · Music on Source 2, vol ≥ 90</li>
                    <li>☐ Garage door: open only if 65°–75°</li>
                    <li className={tvOn ? 'font-semibold text-gray-900 print:text-black' : 'text-gray-500 print:text-gray-500'}>
                      ☐ Big Screen TV: {tvOn ? 'YES — set up and test' : 'N/A'}
                    </li>
                    <li>☐ Post-event: linens in washing machine immediately</li>
                  </ul>
                </div>
              </div>
              {rec.warning && (
                <div className={`rounded-lg px-3 py-1.5 text-sm print:rounded-none print:px-0 print:border-l-4 print:pl-3
                  ${rec.warningLevel === 'danger'  ? 'bg-red-50 border border-red-200 text-red-700 print:border-red-600 print:text-red-700' :
                    rec.warningLevel === 'caution' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700 print:border-yellow-600 print:text-yellow-800' :
                    'bg-blue-50 border border-blue-200 text-blue-700 print:border-blue-600 print:text-blue-800'}`}>
                  {rec.warning}
                </div>
              )}
              {hasNotes && <NoteBlock label="Floor Plan Notes" value={details!.floor_plan_notes} />}
            </div>
          </div>
        )
      })()}

      {/* Special Instructions */}
      {(details?.dietary_restrictions || details?.food_notes || details?.setup_notes || details?.staffing_notes || details?.beo_notes) && (
        <div>
          <SectionHeader>Special Instructions</SectionHeader>
          <div className="space-y-2">
            {details.dietary_restrictions && <NoteBlock label="⚠ Dietary Restrictions" value={details.dietary_restrictions} alert />}
            {details.food_notes    && <NoteBlock label="Food Notes"      value={details.food_notes} />}
            {details.setup_notes   && <NoteBlock label="Setup Notes"     value={details.setup_notes} />}
            {details.staffing_notes && <NoteBlock label="Staffing Notes" value={details.staffing_notes} />}
            {details.beo_notes     && <NoteBlock label="BEO Notes"       value={details.beo_notes} />}
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] print:text-gray-500 mb-1.5 pb-0.5 border-b border-gray-200 print:border-gray-300">
      {children}
    </h3>
  )
}

function Row({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex gap-2 text-sm py-0.5">
      <span className="text-gray-500 print:text-gray-500 shrink-0 w-24">{label}</span>
      <span className={`font-medium ${alert ? 'text-red-400 print:text-red-700' : 'text-gray-900 print:text-black'}`}>
        {value}
      </span>
    </div>
  )
}

function NoteBlock({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 print:rounded-none print:px-0 print:bg-transparent
      ${alert ? 'bg-red-50 border border-red-200 print:border-l-4 print:border-red-600 print:pl-3' : 'bg-gray-50'}`}>
      <p className={`text-xs font-bold uppercase tracking-wide mb-0.5
        ${alert ? 'text-red-400 print:text-red-700' : 'text-gray-500 print:text-gray-500'}`}>
        {label}
      </p>
      <p className="text-sm text-gray-900 print:text-black leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}
