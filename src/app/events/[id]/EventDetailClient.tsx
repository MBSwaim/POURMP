'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge, PaymentStatusBadge } from '@/components/StatusBadge'
import { CateringCalculator } from '@/components/CateringCalculator'
import dynamic from 'next/dynamic'
import { EVENT_STATUSES } from '@/lib/constants'

const BAR_TAB_DESCRIPTIONS: Record<string, string> = {
  'Pre-Paid Drink Ticket(s)': 'Includes all beer selections on tap, wine, rosé, sparkling brut, beer- and wine-based cocktails, coffee, and non-alcoholic beverage options.',
  'By Consumption': 'All event beverages are to be rung to the event tab and charged according to actual consumption.',
  'Individual Tabs': 'Guests will open individual tabs directly at the bar for drink selections only.',
}
import { calcFloorPlan, calcAllItems, mergeCalculatedItems, countChafingDishes, calcSupplies, formatCateringText, formatEquipmentText } from '@/lib/calculations'
import { to12Hour, computeEventTimes, shiftTime } from '@/lib/timeUtils'
import Link from 'next/link'
import type { Event, Client, EventDetails, Payment, AddOn, EventNote, Package, MenuItem, EventPackageWithItems } from '@/lib/db'

const ProposalDownloadButton = dynamic(
  () => import('@/components/ProposalPDF').then((m) => m.ProposalDownloadButton),
  { ssr: false, loading: () => <Button variant="outline" disabled>Loading PDF...</Button> }
)

interface FullData {
  event: Event
  client: Client | null | undefined
  details: EventDetails | null | undefined
  payments: Payment[]
  addOns: AddOn[]
  notes: EventNote[]
  pkg: Package | null
  menuItems: MenuItem[]
  packages: EventPackageWithItems[]
}

interface Props {
  data: FullData
  packages: Package[]
}

export function EventDetailClient({ data: initialData, packages }: Props) {
  const [data, setData] = useState(initialData)
  const [newNote, setNewNote] = useState('')
  const [newAddOn, setNewAddOn] = useState({ item_name: '', qty: '', unit: '', price_each: '', notes: '' })
  const [tab, setTab] = useState<'overview'|'catering'|'floorplan'|'notes'>('overview')
  const [editingConfirmed, setEditingConfirmed] = useState(false)
  const [eventPackages, setEventPackages] = useState<EventPackageWithItems[]>(initialData.packages ?? [])

  const { event, client, details, payments, addOns, notes } = data

  const deposit = payments.find(p => p.payment_type === 'deposit') ?? null
  const finalPayment = payments.find(p => p.payment_type === 'final') ?? null

  const [floorPlanNotes, setFloorPlanNotes] = useState(details?.floor_plan_notes ?? '')
  const [floorNotesSaving, setFloorNotesSaving] = useState(false)

  useEffect(() => {
    setFloorPlanNotes(data.details?.floor_plan_notes ?? '')
  }, [data])

  const isConfirmed = event.status === 'Confirmed'
  const locked = isConfirmed && !editingConfirmed

  async function reload() {
    const res = await fetch(`/api/events/${event.id}`)
    const d = await res.json()
    setData(d)
    if (d.packages) setEventPackages(d.packages)
  }

  async function addPackage() {
    const res = await fetch('/api/event-packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, package_id: '', guest_count: 0, buffer_pct: 0 }),
    })
    const { id } = await res.json()
    setEventPackages(prev => [...prev, { id, event_id: event.id, package_id: '', guest_count: 0, buffer_pct: 0, sort_order: prev.length, pkg: null, menuItems: [] }])
  }

  async function removePackage(id: number) {
    await fetch('/api/event-packages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setEventPackages(prev => prev.filter(ep => ep.id !== id))
  }

  async function updatePackage(id: number, patchData: { package_id?: string; guest_count?: number; buffer_pct?: number }) {
    await fetch('/api/event-packages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patchData }),
    })
    const fresh = await fetch(`/api/events/${event.id}`).then(r => r.json())
    if (fresh.packages) setEventPackages(fresh.packages)
  }

  async function saveStatus(status: string) {
    try {
      await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { status } }),
      })
      toast.success(`Status → ${status}`)
      await reload()
    } catch { toast.error('Failed') }
  }

  async function enterEditMode() {
    try {
      await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { status: 'Tentative' } }),
      })
      await reload()
      setEditingConfirmed(true)
    } catch { toast.error('Failed to enter edit mode') }
  }

  async function saveAndConfirm() {
    try {
      await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { status: 'Confirmed' } }),
      })
      toast.success('Event confirmed')
      await reload()
      setEditingConfirmed(false)
    } catch { toast.error('Failed') }
  }

  async function saveAsTentative() {
    try {
      await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { status: 'Tentative' } }),
      })
      toast.success('Saved as Tentative')
      await reload()
      setEditingConfirmed(false)
    } catch { toast.error('Failed') }
  }

  async function saveField(section: 'event' | 'client' | 'details', key: string, value: unknown) {
    try {
      let body: Record<string, unknown> = { [section]: { [key]: value } }

      // When start time changes, auto-compute and bundle derived times
      if (section === 'event' && key === 'event_time' && typeof value === 'string') {
        const durationMins = event.event_duration_mins ?? 180
        const { productionClose, setupTime, decorateTime, eventEnd } = computeEventTimes(value, durationMins)
        body = {
          event: {
            event_time: value,
            production_close_time: productionClose,
            setup_time: setupTime,
            decorate_time: decorateTime,
            teardown_time: eventEnd,
          },
        }
      }

      await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      await reload()
    } catch { toast.error('Failed to save') }
  }

  async function addNote() {
    if (!newNote.trim()) return
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, note: newNote }),
    })
    setNewNote('')
    await reload()
  }

  async function addAddOn() {
    if (!newAddOn.item_name) return
    await fetch('/api/add-ons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: event.id,
        item_name: newAddOn.item_name,
        qty: Number(newAddOn.qty) || 1,
        unit: newAddOn.unit,
        price_each: Number(newAddOn.price_each) || 0,
        notes: newAddOn.notes,
      }),
    })
    setNewAddOn({ item_name: '', qty: '', unit: '', price_each: '', notes: '' })
    await reload()
  }

  async function deleteAddOn(id: number) {
    await fetch('/api/add-ons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await reload()
  }

  async function saveFloorPlanNotes() {
    setFloorNotesSaving(true)
    try {
      await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: { floor_plan_notes: floorPlanNotes } }),
      })
      toast.success('Floor plan notes saved')
      await reload()
    } catch {
      toast.error('Failed to save')
    } finally {
      setFloorNotesSaving(false)
    }
  }

  const selectedPkg = packages.find((p) => p.id === details?.package_id) ?? data.pkg

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{event.event_name}</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {client?.first_name} {client?.last_name}
            {client?.company ? ` · ${client.company}` : ''}
            {' · '}{event.event_date}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <select
            value={event.status}
            onChange={(e) => saveStatus(e.target.value)}
            className="bg-[#1F3348] border border-white/20 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
          >
            {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <StatusBadge status={event.status} />
          {isConfirmed && !editingConfirmed && (
            <Button
              variant="outline"
              size="sm"
              onClick={enterEditMode}
              className="border-[#C8973A] text-[#C8973A] hover:bg-[#C8973A]/10"
            >
              Edit Event
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={saveAsTentative} className="border-white/30 text-white hover:bg-white/10">
            Save
          </Button>
          <Button size="sm" onClick={saveAndConfirm} className="bg-[#C8973A] hover:bg-[#C8973A]/80 text-white">
            Save & Confirm
          </Button>
          <Link
            href={`/events/${event.id}/prep`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-[#C8973A]/15 border border-[#C8973A]/40 text-[#C8973A] hover:bg-[#C8973A]/25 transition-colors font-medium"
          >
            📋 Generate Outputs
          </Link>
          <ProposalDownloadButton eventId={event.id} />
        </div>
      </div>

      {editingConfirmed && (
        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300 flex items-start gap-2">
          <span className="mt-0.5">⚠</span>
          <span>
            This event has been set to <strong>Tentative</strong> while you make changes.
            Click <strong>Save & Confirm</strong> to restore Confirmed status, or <strong>Save</strong> to keep it as Tentative.
          </span>
        </div>
      )}

      <div>
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-white/10 mb-5">
          {(['overview','catering','floorplan','notes'] as const).map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg -mb-px border-b-2 ${
                tab === id
                  ? 'text-[#C8973A] border-[#C8973A] bg-[#1F3348]/60'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              {{ overview: 'Overview', catering: 'Catering', floorplan: 'Floor Plan', notes: 'Notes' }[id]}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard title="Event Details">
              <EditableRow locked={locked} label="Event Name" value={event.event_name} onSave={(v) => saveField('event', 'event_name', v)} />
              <EditableRow locked={locked} label="Date" value={event.event_date} type="date" onSave={(v) => saveField('event', 'event_date', v)} />
              <EditableRow locked={locked} label="Start Time" value={event.event_time} type="time" display={to12Hour(event.event_time)} onSave={(v) => saveField('event', 'event_time', v)} />
              <EditableRow locked={locked} label="Production Closes" value={event.production_close_time} type="time" display={to12Hour(event.production_close_time)} onSave={(v) => saveField('event', 'production_close_time', v)} />
              <EditableRow locked={locked} label="Setup Begins" value={event.setup_time} type="time" display={to12Hour(event.setup_time)} onSave={(v) => saveField('event', 'setup_time', v)} />
              <EditableRow locked={locked} label="Decorating / Customer Access" value={event.decorate_time} type="time" display={to12Hour(event.decorate_time)} onSave={(v) => saveField('event', 'decorate_time', v)} />
              <EditableRow locked={locked} label="Event Ends" value={event.teardown_time} type="time" display={to12Hour(event.teardown_time)} onSave={(v) => saveField('event', 'teardown_time', v)} />
              {event.event_time && (
                <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
                  <span className="text-gray-400 shrink-0 mr-2">Food Ready By</span>
                  <span className="text-right font-medium text-[#C8973A]">
                    {to12Hour(shiftTime(event.event_time, -15))}
                  </span>
                </div>
              )}
              <EditableRow locked={locked} label="Space" value={event.space} onSave={(v) => saveField('event', 'space', v)} />
              {(deposit || finalPayment) && (
                <div className="border-t border-white/5 pt-2 mt-1 space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-widest">Payments</p>
                  {deposit && (
                    <div className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-gray-400">Deposit</span>
                      <PaymentStatusBadge status={deposit.status} />
                    </div>
                  )}
                  {finalPayment && (
                    <div className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-gray-400">Final</span>
                      <PaymentStatusBadge status={finalPayment.status} />
                    </div>
                  )}
                </div>
              )}
            </InfoCard>

            <InfoCard title="Client">
              <EditableRow locked={locked} label="First Name" value={client?.first_name ?? ''} onSave={(v) => saveField('client', 'first_name', v)} />
              <EditableRow locked={locked} label="Last Name" value={client?.last_name ?? ''} onSave={(v) => saveField('client', 'last_name', v)} />
              <EditableRow locked={locked} label="Email" value={client?.email ?? ''} type="email" onSave={(v) => saveField('client', 'email', v)} />
              <EditableRow locked={locked} label="Phone" value={client?.phone ?? ''} onSave={(v) => saveField('client', 'phone', v)} />
              <EditableRow locked={locked} label="Company" value={client?.company ?? ''} onSave={(v) => saveField('client', 'company', v)} />
              <EditableRow locked={locked} label="Referral" value={client?.referral_source ?? ''} onSave={(v) => saveField('client', 'referral_source', v)} />
            </InfoCard>

            <InfoCard title="Package & Food">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Package</span>
                  {locked ? (
                    <span className="text-sm text-white text-right">{packages.find(p => p.id === details?.package_id)?.name ?? '—'}</span>
                  ) : (
                    <select
                      key={details?.package_id ?? ''}
                      defaultValue={details?.package_id ?? ''}
                      onBlur={(e) => saveField('details', 'package_id', e.target.value)}
                      className="bg-transparent border-b border-white/20 text-right text-sm text-white focus:outline-none"
                    >
                      <option value="">— none —</option>
                      {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
                <EditableRow locked={locked} label="Guests" value={String(details?.guest_count ?? '')} type="number" onSave={(v) => saveField('details', 'guest_count', Number(v))} />
                <EditableRow locked={locked} label="Extra Headcount %" value={String((details?.buffer_pct ?? 0) * 100)} type="number" onSave={(v) => saveField('details', 'buffer_pct', Number(v) / 100)} />
                <EditableRow locked={locked} label="Food Notes / Allergies" value={details?.food_notes ?? ''} onSave={(v) => saveField('details', 'food_notes', v)} />
                <EditableRow locked={locked} label="Dietary Restrictions" value={details?.dietary_restrictions ?? ''} onSave={(v) => saveField('details', 'dietary_restrictions', v)} />
              </div>
            </InfoCard>

            <InfoCard title="Bar & Beverage">
              <div className="flex justify-between text-sm py-1 border-b border-white/5">
                <span className="text-gray-400 shrink-0 mr-2">Bar Tab Type</span>
                {locked ? (
                  <span className="text-right">{details?.bar_tab_type || <span className="text-gray-500 italic">—</span>}</span>
                ) : (
                  <select
                    key={details?.bar_tab_type ?? ''}
                    defaultValue={details?.bar_tab_type ?? ''}
                    onBlur={async (e) => {
                      const type = e.target.value
                      await saveField('details', 'bar_tab_type', type)
                      if (type && BAR_TAB_DESCRIPTIONS[type]) {
                        await saveField('details', 'tab_details', BAR_TAB_DESCRIPTIONS[type])
                      }
                    }}
                    className="bg-transparent border-b border-white/20 text-right text-sm text-white focus:outline-none max-w-[200px]"
                  >
                    <option value="">— none —</option>
                    <option value="Pre-Paid Drink Ticket(s)">BAR TAB | Pre-Paid Drink Ticket(s)</option>
                    <option value="By Consumption">BAR TAB | By Consumption</option>
                    <option value="Individual Tabs">BAR TAB | Individual Tabs</option>
                  </select>
                )}
              </div>
              <EditableRow locked={locked} label="Drink Tickets" value={String(details?.drink_tickets ?? '')} type="number" onSave={(v) => saveField('details', 'drink_tickets', Number(v))} />
              <ExpandableText locked={locked} label="Tab Details" value={details?.tab_details ?? ''} onSave={(v) => saveField('details', 'tab_details', v)} />
            </InfoCard>

          </div>

          {/* Add-ons */}
          <InfoCard title="Add-ons" fullWidth>
            {addOns.length > 0 && (
              <table className="w-full text-sm mb-3">
                <thead><tr className="text-gray-400 border-b border-white/10">
                  <th className="text-left py-1">Item</th>
                  <th className="text-right py-1">Qty</th>
                  <th className="text-right py-1">Unit</th>
                  <th className="py-1"></th>
                </tr></thead>
                <tbody>
                  {addOns.map((a) => (
                    <tr key={a.id} className="border-b border-white/5">
                      <td className="py-1.5">{a.item_name}</td>
                      <td className="text-right">{a.qty}</td>
                      <td className="text-right text-gray-400">{a.unit}</td>
                      <td className="text-right pl-2">
                        <button onClick={() => deleteAddOn(a.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="Item name" value={newAddOn.item_name} onChange={(e) => setNewAddOn((n) => ({ ...n, item_name: e.target.value }))} className="flex-1 min-w-28" />
              <Input placeholder="Qty" type="number" value={newAddOn.qty} onChange={(e) => setNewAddOn((n) => ({ ...n, qty: e.target.value }))} className="w-16" />
              <Input placeholder="Unit" value={newAddOn.unit} onChange={(e) => setNewAddOn((n) => ({ ...n, unit: e.target.value }))} className="w-20" />
              <Button size="sm" variant="outline" onClick={addAddOn}>Add</Button>
            </div>
          </InfoCard>
        </div>}

        {/* Catering Tab */}
        <div className={tab === 'catering' ? 'space-y-4' : 'hidden'}>

            {/* Catering Packages */}
            <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A]">Catering Packages</h3>
                <button
                  onClick={addPackage}
                  className="text-xs px-2.5 py-1 rounded-md bg-[#C8973A]/20 text-[#C8973A] hover:bg-[#C8973A]/30 transition-colors font-medium"
                >
                  + Add Package
                </button>
              </div>
              {eventPackages.length === 0 && (
                <p className="text-sm text-gray-500 italic">No packages added. Click &quot;+ Add Package&quot; to begin.</p>
              )}
              <div className="space-y-6">
                {eventPackages.map((ep, idx) => (
                  <div key={ep.id} className={idx > 0 ? 'border-t border-white/10 pt-6' : ''}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Package {idx + 1}</p>
                      <button onClick={() => removePackage(ep.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                        Remove
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4 mb-4 text-sm">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Package</label>
                        <select
                          defaultValue={ep.package_id}
                          onBlur={e => updatePackage(ep.id, { package_id: e.target.value })}
                          className="bg-[#0f1e2d] border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[#C8973A]"
                        >
                          <option value="">— none —</option>
                          {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Guests</label>
                        <input
                          type="number"
                          defaultValue={ep.guest_count || ''}
                          onBlur={e => updatePackage(ep.id, { guest_count: Number(e.target.value) || 0 })}
                          placeholder="0"
                          className="w-20 bg-[#0f1e2d] border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[#C8973A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Buffer %</label>
                        <input
                          type="number"
                          defaultValue={ep.buffer_pct ? Math.round(ep.buffer_pct * 100) : ''}
                          onBlur={e => updatePackage(ep.id, { buffer_pct: (Number(e.target.value) || 0) / 100 })}
                          placeholder="0"
                          className="w-16 bg-[#0f1e2d] border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[#C8973A]"
                        />
                      </div>
                    </div>
                    {ep.pkg && ep.guest_count > 0 && (
                      <CateringCalculator
                        packageId={ep.package_id}
                        guestCount={ep.guest_count}
                        bufferPct={ep.buffer_pct}
                        pricePerGuest={ep.pkg.price_per_guest ?? 0}
                        savedSauces={details?.selected_sauces ?? ''}
                        onSauceChange={(csv) => { saveField('details', 'selected_sauces', csv); toast.success('Sauce selection saved') }}
                        serveStyleJson={details?.serve_style_json ?? '{}'}
                        onServeStyleChange={(json) => { saveField('details', 'serve_style_json', json) }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add-ons */}
            {addOns.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Add-ons & Extras</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400">
                      <th className="text-left py-1.5">Item</th>
                      <th className="text-right py-1.5">Qty</th>
                      <th className="text-right py-1.5">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addOns.map((a) => (
                      <tr key={a.id} className="border-b border-white/5">
                        <td className="py-1.5">{a.item_name}</td>
                        <td className="text-right">{a.qty}</td>
                        <td className="text-right text-gray-400">{a.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bar & Beverage */}
            {details?.bar_tab_type && (
              <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Bar & Beverage</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-32 shrink-0">Bar Setup</span>
                    <span className="text-white font-medium">BAR TAB | {details.bar_tab_type}</span>
                  </div>
                  {details.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && details.drink_tickets ? (
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-32 shrink-0">Drink Tickets</span>
                      <span className="text-white font-medium">{details.drink_tickets}</span>
                    </div>
                  ) : null}
                  {details.tab_details && (
                    <p className="text-gray-400 text-xs mt-2 leading-relaxed">{details.tab_details}</p>
                  )}
                </div>
              </div>
            )}

            {/* Food Notes & Restrictions */}
            {(details?.dietary_restrictions || details?.food_notes) && (
              <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Food Notes & Restrictions</h3>
                <div className="space-y-2 text-sm">
                  {details.dietary_restrictions && (
                    <div className="rounded-lg bg-red-900/20 border border-red-500/30 px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-red-400 mb-0.5">Dietary Restrictions</p>
                      <p className="text-white leading-relaxed">{details.dietary_restrictions}</p>
                    </div>
                  )}
                  {details.food_notes && (
                    <div className="rounded-lg bg-white/5 px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-0.5">Food Notes</p>
                      <p className="text-white leading-relaxed">{details.food_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Staff Notes */}
            <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
              <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Staff Notes</h3>
              <div className="space-y-4">
                <NoteField
                  label="BEO Notes"
                  value={details?.beo_notes ?? ''}
                  onSave={(v) => saveField('details', 'beo_notes', v)}
                />
                <NoteField
                  label="Kitchen Notes"
                  value={details?.kitchen_notes ?? ''}
                  onSave={(v) => saveField('details', 'kitchen_notes', v)}
                />
              </div>
            </div>

            {/* Supplies Summary */}
            {(() => {
              const guestCount = details?.guest_count ?? 0
              const bufferPct = details?.buffer_pct ?? 0
              if (guestCount === 0) return null

              const allPkgs = eventPackages.length > 0
                ? eventPackages
                : (data.pkg ? [{ pkg: data.pkg, menuItems: data.menuItems, guest_count: guestCount, buffer_pct: bufferPct, id: 0, event_id: event.id, package_id: data.pkg.id, sort_order: 0 }] : [])
              const serveStyle: Record<string, 'all' | 'staggered'> = (() => {
                try { return JSON.parse(details?.serve_style_json || '{}') } catch { return {} }
              })()
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const merged = mergeCalculatedItems(allPkgs.flatMap(ep => ep.pkg ? calcAllItems(ep.menuItems as any, ep.guest_count, ep.buffer_pct) : []))
              const chafing = countChafingDishes(merged, serveStyle)
              const floorPlan = calcFloorPlan(guestCount)

              let durationHours = 3
              if (event.event_time && event.teardown_time) {
                const [sh, sm] = event.event_time.split(':').map(Number)
                const [eh, em] = event.teardown_time.split(':').map(Number)
                let start = sh * 60 + sm
                let end = eh * 60 + em
                if (end < start) end += 24 * 60
                durationHours = (end - start) / 60
              }

              const supplies = calcSupplies({
                guestCount,
                bufferPct,
                chafing,
                floorPlan,
                durationHours,
              })

              return (
                <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Supplies Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <SupplyStat label="Plates" value={supplies.plates} />
                    <SupplyStat label="Rolled Silverware" value={supplies.rolledSilverware} />
                    {supplies.sternos > 0 && <SupplyStat label="Sternos" value={supplies.sternos} note={`${chafing.total} dish${chafing.total !== 1 ? 'es' : ''}`} />}
                    {supplies.tablecloths > 0 && <SupplyStat label="Tablecloths" value={supplies.tablecloths} />}
                    {supplies.highTopCovers > 0 && <SupplyStat label="High-Top Covers" value={supplies.highTopCovers} />}
                  </div>
                </div>
              )
            })()}

            {/* Plain-Text Catering & Equipment Summaries */}
            {(() => {
              const guestCount = details?.guest_count ?? 0
              const allPkgs = eventPackages.length > 0
                ? eventPackages
                : (data.pkg ? [{ pkg: data.pkg, menuItems: data.menuItems, guest_count: guestCount, buffer_pct: details?.buffer_pct ?? 0, id: 0, event_id: event.id, package_id: data.pkg.id, sort_order: 0 }] : [])
              const activePkgs = allPkgs.filter(ep => ep.pkg && ep.guest_count > 0)
              if (activePkgs.length === 0) return null

              const combinedTitle = activePkgs.map(ep => ep.pkg!.name).join(' | ')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const mergedItems = mergeCalculatedItems(activePkgs.flatMap(ep => calcAllItems(ep.menuItems as any, ep.guest_count, ep.buffer_pct)))
              const serveStyle: Record<string, 'all' | 'staggered'> = (() => {
                try { return JSON.parse(details?.serve_style_json || '{}') } catch { return {} }
              })()

              const cateringText = formatCateringText([{ name: combinedTitle, items: mergedItems }], details?.selected_sauces ?? '')
              const equipmentText = formatEquipmentText(mergedItems, serveStyle)

              return (
                <>
                  <CateringTextCard label="Catering Summary — Plain Text" text={cateringText} showDisclaimer />
                  {equipmentText && <CateringTextCard label="Equipment — Plain Text" text={equipmentText} />}
                </>
              )
            })()}

          </div>

        {/* Floor Plan Tab */}
        {tab === 'floorplan' && (() => {
          const rec = calcFloorPlan(details?.guest_count ?? 0)
          const tvOn = !!(details?.big_screen_tv)
          return (
            <div className="space-y-4">

              {/* Recommendation Card */}
              <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Recommended Layout</h3>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <p className="text-white font-semibold text-base">{rec.layoutType}</p>
                    {rec.warningLevel && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        rec.warningLevel === 'danger'  ? 'bg-red-600/20 text-red-400' :
                        rec.warningLevel === 'caution' ? 'bg-yellow-600/20 text-yellow-400' :
                        'bg-blue-600/20 text-blue-400'
                      }`}>
                        {rec.warningLevel === 'danger' ? 'OVER CAPACITY' : rec.warningLevel === 'caution' ? 'CAUTION' : 'NOTE'}
                      </span>
                    )}
                  </div>

                  {!rec.isOverCapacity && rec.tablesNeeded !== null && (
                    <div className="grid grid-cols-4 gap-3">
                      <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
                        <p className="text-2xl font-bold text-white">{rec.tablesNeeded}</p>
                        <p className="text-xs text-gray-400 mt-0.5">6-ft Tables</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
                        <p className="text-2xl font-bold text-white">{rec.highTopCount ?? 0}</p>
                        <p className="text-xs text-gray-400 mt-0.5">High-Tops</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
                        <p className="text-2xl font-bold text-white">{rec.receptionHighTops ?? 0}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Reception High-Tops</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
                        <p className="text-2xl font-bold text-white">{rec.seatedCapacity ?? '—'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Seated Cap.</p>
                      </div>
                    </div>
                  )}

                  {rec.warning && (
                    <div className={`rounded-lg px-3 py-2 text-sm ${
                      rec.warningLevel === 'danger'  ? 'bg-red-900/20 border border-red-500/30 text-red-300' :
                      rec.warningLevel === 'caution' ? 'bg-yellow-900/20 border border-yellow-500/30 text-yellow-300' :
                      'bg-blue-900/20 border border-blue-500/30 text-blue-300'
                    }`}>
                      {rec.warning}
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">Staff Setup Notes</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{rec.staffNotes}</p>
                  </div>
                </div>
              </div>

              {/* Standard Setup Checklist */}
              <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Standard Setup Checklist</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8973A] mt-0.5 shrink-0">•</span>
                    Cover all tables with black tablecloths <span className="text-gray-500">(check BEO — some events exempt)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8973A] mt-0.5 shrink-0">•</span>
                    Garage Door: open only if weather is 65°–75°. One warning if children play with chain or use as entry/exit, then close.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8973A] mt-0.5 shrink-0">•</span>
                    Place black velvet ropes at each marked position for guest safety
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8973A] mt-0.5 shrink-0">•</span>
                    Place current <strong className="text-white">beer list</strong> and <strong className="text-white">wine list</strong> on each table for guests to review before ordering at the bar
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8973A] mt-0.5 shrink-0">•</span>
                    Dim lights for guests during the event
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8973A] mt-0.5 shrink-0">•</span>
                    Music on <strong className="text-white">Source 2</strong>, turned up to at least <strong className="text-white">90</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 font-bold ${tvOn ? 'text-green-400' : 'text-gray-500'}`}>•</span>
                    <span className="flex items-center gap-2 flex-wrap">
                      Big Screen TV
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tvOn}
                          onChange={e => saveField('details', 'big_screen_tv', e.target.checked ? 1 : 0)}
                          className="accent-[#C8973A] w-4 h-4"
                        />
                        <span className={`text-xs font-semibold ${tvOn ? 'text-green-400' : 'text-gray-500'}`}>
                          {tvOn ? 'Included in setup' : 'Not included'}
                        </span>
                      </label>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8973A] mt-0.5 shrink-0">•</span>
                    Post-event: start linens in washing machine immediately
                  </li>
                </ul>
              </div>

              {/* Final Floor Plan Notes */}
              <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Final Floor Plan Notes</h3>
                <p className="text-xs text-gray-500 mb-2">Override the recommendation or document the agreed setup for staff.</p>
                <Textarea
                  value={floorPlanNotes}
                  onChange={e => setFloorPlanNotes(e.target.value)}
                  rows={4}
                  placeholder="e.g. Client requested all tables along south wall, high-tops near bar…"
                  className="text-sm resize-none mb-2"
                />
                <Button
                  size="sm"
                  onClick={saveFloorPlanNotes}
                  disabled={floorNotesSaving}
                  className="bg-[#C8973A] hover:bg-[#C8973A]/80 text-white"
                >
                  {floorNotesSaving ? 'Saving…' : 'Save Notes'}
                </Button>
              </div>

            </div>
          )
        })()}

        {/* Notes Tab */}
        {tab === 'notes' && (
          <InfoCard title="Activity Log">
            {notes.length === 0 ? (
              <p className="text-gray-400 text-sm">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="text-sm border-b border-white/5 pb-2">
                    <p className="text-gray-300">{n.note}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                className="flex-1"
              />
              <Button size="sm" variant="outline" onClick={addNote} className="self-end">Add</Button>
            </div>
          </InfoCard>
        )}
      </div>
    </div>
  )
}

function InfoCard({ title, children, fullWidth }: { title: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-[#1F3348]/50 p-4 ${fullWidth ? 'col-span-2' : ''}`}>
      <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">{title}</h3>
      {children}
    </div>
  )
}

function EditableRow({ label, value, type = 'text', display, locked, onSave }: {
  label: string
  value: string
  type?: string
  display?: string
  locked?: boolean
  onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  function commitWith(v: string) {
    setEditing(false)
    if (v !== value) onSave(v)
  }

  const shown = display ?? value

  return (
    <div className="flex justify-between items-center text-sm py-1 border-b border-white/5 last:border-0">
      <span className="text-gray-400 shrink-0 mr-2">{label}</span>
      {!locked && editing ? (
        <Input
          type={type}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={(e) => commitWith(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commitWith((e.target as HTMLInputElement).value)}
          autoFocus
          className="h-6 text-right text-sm bg-transparent border-0 border-b border-[#C8973A] rounded-none px-0 w-40"
        />
      ) : locked ? (
        <span className="text-right truncate max-w-[180px]">
          {shown || <span className="text-gray-500 italic">—</span>}
        </span>
      ) : (
        <button
          onClick={() => { setVal(value); setEditing(true) }}
          className="text-right hover:text-[#C8973A] transition-colors truncate max-w-[180px]"
        >
          {shown || <span className="text-gray-500 italic">—</span>}
        </button>
      )}
    </div>
  )
}

function ExpandableText({ label, value, locked, onSave }: {
  label: string
  value: string
  locked?: boolean
  onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  function commit() {
    setEditing(false)
    if (val !== value) onSave(val)
  }

  return (
    <div className="pt-2 border-t border-white/5 mt-1">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      {!locked && editing ? (
        <Textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          autoFocus
          rows={4}
          className="w-full text-sm bg-[#0f1e2d] border border-[#C8973A]/50 rounded px-2 py-1 text-white focus:outline-none focus:border-[#C8973A] resize-none"
        />
      ) : (
        <button
          disabled={locked}
          onClick={() => { setVal(value); setEditing(true) }}
          className={`w-full text-left text-sm text-gray-200 leading-relaxed whitespace-pre-wrap ${locked ? '' : 'hover:text-[#C8973A] transition-colors cursor-text'}`}
        >
          {value || <span className="text-gray-500 italic">—</span>}
        </button>
      )}
    </div>
  )
}

const CATERING_DISCLAIMER = 'Please Note: Ordering off our taproom food menu during events is not permitted.'

function isHeaderLine(line: string) {
  const t = line.trim()
  return t.length > 0 && t === t.toUpperCase() && /[A-Z]/.test(t)
}

function buildRichHtml(text: string, showDisclaimer?: boolean): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const lines = text.split('\n')
  const parts = lines.map(line => {
    if (line.trim() === '') return '<p>&nbsp;</p>'
    return isHeaderLine(line)
      ? `<p><strong>${esc(line)}</strong></p>`
      : `<p>${esc(line)}</p>`
  })
  if (showDisclaimer) {
    parts.push('<p>&nbsp;</p>')
    parts.push(`<p><strong>${esc(CATERING_DISCLAIMER)}</strong></p>`)
  }
  return parts.join('')
}

function CateringTextCard({ label, text, showDisclaimer }: { label: string; text: string; showDisclaimer?: boolean }) {
  const [copied, setCopied] = useState(false)
  const plainText = showDisclaimer ? `${text}\n\n${CATERING_DISCLAIMER}` : text

  async function copy() {
    try {
      if (typeof ClipboardItem !== 'undefined') {
        const html = buildRichHtml(text, showDisclaimer)
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(plainText)
      }
    } catch {
      await navigator.clipboard.writeText(plainText)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = text.split('\n')

  return (
    <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A]">{label}</h3>
        <button
          onClick={copy}
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
            copied
              ? 'bg-green-600/30 text-green-400 border border-green-500/40'
              : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
      <div className="w-full bg-[#0f1e2d] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 font-mono leading-relaxed">
        <pre className="whitespace-pre-wrap">
          {lines.map((line, i) => (
            <span key={i}>
              {isHeaderLine(line) ? <strong className="text-white">{line}</strong> : line}
              {i < lines.length - 1 ? '\n' : ''}
            </span>
          ))}
          {showDisclaimer && (
            <>{'\n\n'}<strong className="text-white">{CATERING_DISCLAIMER}</strong></>
          )}
        </pre>
      </div>
    </div>
  )
}

function SupplyStat({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-white leading-none">{value}</p>
      {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
    </div>
  )
}

function NoteField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(value)
  function commit() { if (val !== value) onSave(val) }
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">{label}</label>
      <Textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        rows={3}
        placeholder={`Notes that will appear on the ${label.replace(' Notes', '')}…`}
        className="w-full text-sm resize-none"
      />
    </div>
  )
}
