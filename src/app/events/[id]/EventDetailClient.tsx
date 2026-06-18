'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge, PaymentStatusBadge } from '@/components/StatusBadge'
import { CateringCalculator } from '@/components/CateringCalculator'
import { PaymentPanel } from '@/components/PaymentPanel'
import dynamic from 'next/dynamic'
import { EVENT_STATUSES, DRINK_TICKET_PRICE } from '@/lib/constants'

const BAR_TAB_DESCRIPTIONS: Record<string, string> = {
  'Pre-Paid Drink Ticket(s)': 'Includes all beer selections on tap, wine, rosé, sparkling brut, beer- and wine-based cocktails, coffee, and non-alcoholic beverage options.',
  'By Consumption': 'All event beverages are to be rung to the event tab and charged according to actual consumption.',
  'Individual Tabs': 'Guests will open individual tabs directly at the bar for drink selections only.',
}
import { formatCurrency, calcFloorPlan } from '@/lib/calculations'
import { to12Hour, computeEventTimes } from '@/lib/timeUtils'
import type { Event, Client, EventDetails, Payment, AddOn, EventNote, Package, MenuItem } from '@/lib/db'

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
}

interface Props {
  data: FullData
  packages: Package[]
}

export function EventDetailClient({ data: initialData, packages }: Props) {
  const [data, setData] = useState(initialData)
  const [newNote, setNewNote] = useState('')
  const [newAddOn, setNewAddOn] = useState({ item_name: '', qty: '', unit: '', price_each: '', notes: '' })
  const [tab, setTab] = useState<'overview'|'catering'|'floorplan'|'payments'|'notes'>('overview')
  const [editingConfirmed, setEditingConfirmed] = useState(false)

  const { event, client, details, payments, addOns, notes } = data

  const deposit = payments.find(p => p.payment_type === 'deposit') ?? null
  const finalPayment = payments.find(p => p.payment_type === 'final') ?? null

  const [feeForm, setFeeForm] = useState({
    service_fee: details?.service_fee ? String(details.service_fee) : '',
    gratuity_pct: details?.gratuity_pct ? String(Math.round(details.gratuity_pct * 100)) : '',
    tax_pct: String(Math.round((details?.tax_pct ?? 0.0825) * 10000) / 100),
  })
  const [feesSaving, setFeesSaving] = useState(false)
  const [floorPlanNotes, setFloorPlanNotes] = useState(details?.floor_plan_notes ?? '')
  const [floorNotesSaving, setFloorNotesSaving] = useState(false)

  useEffect(() => {
    setFeeForm({
      service_fee: data.details?.service_fee ? String(data.details.service_fee) : '',
      gratuity_pct: data.details?.gratuity_pct ? String(Math.round(data.details.gratuity_pct * 100)) : '',
      tax_pct: String(Math.round((data.details?.tax_pct ?? 0.0825) * 10000) / 100),
    })
    setFloorPlanNotes(data.details?.floor_plan_notes ?? '')
  }, [data])

  const isConfirmed = event.status === 'Confirmed'
  const locked = isConfirmed && !editingConfirmed

  async function reload() {
    const res = await fetch(`/api/events/${event.id}`)
    const d = await res.json()
    setData(d)
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

  async function saveFees() {
    setFeesSaving(true)
    try {
      await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          details: {
            service_fee: Number(feeForm.service_fee) || 0,
            gratuity_pct: Number(feeForm.gratuity_pct) / 100 || 0,
            tax_pct: Number(feeForm.tax_pct) / 100 || 0,
          },
        }),
      })
      toast.success('Fees saved')
      await reload()
    } catch {
      toast.error('Failed to save fees')
    } finally {
      setFeesSaving(false)
    }
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
          {(['overview','catering','floorplan','payments','notes'] as const).map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg -mb-px border-b-2 ${
                tab === id
                  ? 'text-[#C8973A] border-[#C8973A] bg-[#1F3348]/60'
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              {{ overview: 'Overview', catering: 'Catering', floorplan: 'Floor Plan', payments: 'Payments', notes: 'Notes' }[id]}
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
                <EditableRow locked={locked} label="Buffer %" value={String((details?.buffer_pct ?? 0) * 100)} type="number" onSave={(v) => saveField('details', 'buffer_pct', Number(v) / 100)} />
                <div className="pt-2 mt-1 border-t border-white/10 space-y-2">
                  <p className="text-xs font-bold tracking-widest uppercase text-[#C8973A]">Fees & Tax</p>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Tax %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="8.25"
                        value={feeForm.tax_pct}
                        onChange={e => setFeeForm(f => ({ ...f, tax_pct: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Service Fee ($)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={feeForm.service_fee}
                        onChange={e => setFeeForm(f => ({ ...f, service_fee: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Gratuity %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        placeholder="0"
                        value={feeForm.gratuity_pct}
                        onChange={e => setFeeForm(f => ({ ...f, gratuity_pct: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={saveFees}
                    disabled={feesSaving}
                    className="bg-[#C8973A] hover:bg-[#C8973A]/80 text-white"
                  >
                    {feesSaving ? 'Saving…' : 'Save Fees'}
                  </Button>
                </div>
                {selectedPkg && details?.guest_count ? (() => {
                  const foodSub = details.guest_count * selectedPkg.price_per_guest
                  const ticketQty = details?.bar_tab_type === 'Pre-Paid Drink Ticket(s)' ? (details?.drink_tickets ?? 0) : 0
                  const ticketSub = ticketQty * DRINK_TICKET_PRICE
                  const addOnsSub = addOns.reduce((s, a) => s + a.qty * a.price_each, 0)
                  const taxableBase = foodSub + addOnsSub
                  const taxPct = details?.tax_pct ?? 0.0825
                  const taxAmt = taxableBase * taxPct
                  const gratuityBase = foodSub + ticketSub + addOnsSub
                  const gratuityAmt = gratuityBase * (details?.gratuity_pct ?? 0)
                  const serviceFee = details?.service_fee ?? 0
                  const grandTotal = gratuityBase + taxAmt + gratuityAmt + serviceFee
                  return (
                    <div className="pt-1 border-t border-white/10 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Food Subtotal</span>
                        <span className="text-white">{formatCurrency(foodSub)}</span>
                      </div>
                      {addOnsSub > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Add-ons</span>
                          <span className="text-white">{formatCurrency(addOnsSub)}</span>
                        </div>
                      )}
                      {ticketQty > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Drink Tickets ({ticketQty} × ${DRINK_TICKET_PRICE})</span>
                          <span className="text-white">{formatCurrency(ticketSub)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Tax ({(taxPct * 100).toFixed(2)}%)</span>
                        <span className="text-white">{formatCurrency(taxAmt)}</span>
                      </div>
                      {serviceFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Service Fee</span>
                          <span className="text-white">{formatCurrency(serviceFee)}</span>
                        </div>
                      )}
                      {gratuityAmt > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Gratuity ({((details.gratuity_pct ?? 0) * 100).toFixed(0)}%)</span>
                          <span className="text-white">{formatCurrency(gratuityAmt)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-1">
                        <span className="text-gray-400">Grand Total</span>
                        <span className="text-[#C8973A]">{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>
                  )
                })() : null}
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
                  <th className="text-right py-1">Price Ea.</th>
                  <th className="text-right py-1">Total</th>
                  <th className="py-1"></th>
                </tr></thead>
                <tbody>
                  {addOns.map((a) => (
                    <tr key={a.id} className="border-b border-white/5">
                      <td className="py-1.5">{a.item_name}</td>
                      <td className="text-right">{a.qty}</td>
                      <td className="text-right text-gray-400">{a.unit}</td>
                      <td className="text-right">{formatCurrency(a.price_each)}</td>
                      <td className="text-right text-[#C8973A]">{formatCurrency(a.qty * a.price_each)}</td>
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
              <Input placeholder="$/ea" type="number" value={newAddOn.price_each} onChange={(e) => setNewAddOn((n) => ({ ...n, price_each: e.target.value }))} className="w-20" />
              <Button size="sm" variant="outline" onClick={addAddOn}>Add</Button>
            </div>
          </InfoCard>
        </div>}

        {/* Catering Tab */}
        {tab === 'catering' && (
          <InfoCard title="Catering Calculator">
            <CateringCalculator
              packageId={details?.package_id ?? null}
              guestCount={details?.guest_count ?? 0}
              bufferPct={details?.buffer_pct ?? 0}
              pricePerGuest={selectedPkg?.price_per_guest ?? 0}
            />
          </InfoCard>
        )}

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
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
                        <p className="text-2xl font-bold text-white">{rec.tablesNeeded}</p>
                        <p className="text-xs text-gray-400 mt-0.5">6-ft Tables</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
                        <p className="text-2xl font-bold text-white">{rec.highTopCount ?? 0}</p>
                        <p className="text-xs text-gray-400 mt-0.5">High-Tops</p>
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

        {/* Payments Tab */}
        {tab === 'payments' && (
          <PaymentPanel
            eventId={event.id}
            payments={payments}
            details={details}
            addOns={addOns}
            pkg={selectedPkg ?? null}
            onUpdate={reload}
          />
        )}

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
