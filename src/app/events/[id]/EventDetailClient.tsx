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
import { calcFloorPlan, calcAllItems, mergeCalculatedItems, countChafingDishes, calcSupplies, formatCateringText, formatEquipmentText, parseMenuItemOverrides, formatCurrency } from '@/lib/calculations'
import { to12Hour, computeEventTimes, shiftTime } from '@/lib/timeUtils'
import { formatPhoneNumber } from '@/lib/phone'
import { TOAST_STAGES } from '@/lib/toastStatus'
import { calcReadiness, readinessColor } from '@/lib/readiness'
import { calcBarImpact } from '@/lib/barImpact'
import { calcTaskComplexity, COMPLEXITY_COLORS, type TaskContext } from '@/lib/tasks'
import { TasksTab } from './TasksTab'
import Link from 'next/link'
import type { Event, Client, EventDetails, Payment, AddOn, EventNote, Package, MenuItem, EventPackageWithItems, EventTask } from '@/lib/db'

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
  initialTasks: EventTask[]
}

export function EventDetailClient({ data: initialData, packages, initialTasks }: Props) {
  const [data, setData] = useState(initialData)
  const [newNote, setNewNote] = useState('')
  const [newAddOn, setNewAddOn] = useState({ item_name: '', qty: '', unit: '', price_each: '', notes: '' })
  const [tab, setTab] = useState<'overview'|'catering'|'floorplan'|'tasks'|'notes'>('overview')
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

  const readiness = calcReadiness({
    guest_count: details?.guest_count ?? 0,
    hasPackage: eventPackages.some(ep => !!ep.package_id),
    bar_tab_type: details?.bar_tab_type,
    setup_notes: details?.setup_notes,
    floor_plan_notes: details?.floor_plan_notes,
    dietary_restrictions: details?.dietary_restrictions,
    staffing_notes: details?.staffing_notes,
    contract_signed: details?.contract_signed,
  })
  const readinessColors = readinessColor(readiness.score)

  const hasPackage = eventPackages.some(ep => !!ep.package_id)
  const packageCount = eventPackages.filter(ep => !!ep.package_id).length
  const barImpactLevel = calcBarImpact({
    id: event.id,
    event_name: event.event_name,
    event_date: event.event_date,
    event_time: event.event_time,
    setup_time: '',
    decorate_time: '',
    teardown_time: event.teardown_time,
    production_close_time: '',
    event_duration_mins: event.event_duration_mins,
    space: event.space,
    status: event.status,
    first_name: client?.first_name ?? '',
    last_name: client?.last_name ?? '',
    email: '',
    company: client?.company ?? '',
    guest_count: details?.guest_count ?? 0,
    bar_tab_type: details?.bar_tab_type ?? '',
    drink_tickets: details?.drink_tickets ?? 0,
  }).level
  const taskContext: TaskContext = {
    guestCount: details?.guest_count ?? 0,
    hasPackage,
    packageCount,
    barTabType: details?.bar_tab_type,
    drinkTickets: details?.drink_tickets,
    bigScreenTv: details?.big_screen_tv,
    kidsAttending: details?.kids_attending,
    dessertExpected: details?.dessert_expected,
    dietaryRestrictions: details?.dietary_restrictions,
    barImpactLevel,
  }
  const taskComplexity = calcTaskComplexity(taskContext, initialTasks.filter(t => t.category === 'Dynamic').length)
  const taskComplexityColors = COMPLEXITY_COLORS[taskComplexity.level]

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

  async function updateAddOnPrice(id: number, price_each: number) {
    await fetch('/api/add-ons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, price_each }),
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
          <p className="text-gray-500 text-sm mt-0.5">
            {client?.first_name} {client?.last_name}
            {client?.company ? ` · ${client.company}` : ''}
            {' · '}{event.event_date}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <select
            value={event.status}
            onChange={(e) => saveStatus(e.target.value)}
            className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
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
          <Button size="sm" variant="outline" onClick={saveAsTentative} className="border-gray-300 text-gray-900 hover:bg-gray-100">
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
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 flex items-start gap-2">
          <span className="mt-0.5">⚠</span>
          <span>
            This event has been set to <strong>Tentative</strong> while you make changes.
            Click <strong>Save & Confirm</strong> to restore Confirmed status, or <strong>Save</strong> to keep it as Tentative.
          </span>
        </div>
      )}

      <div>
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-200 mb-5">
          {(['overview','catering','floorplan','tasks','notes'] as const).map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg -mb-px border-b-2 ${
                tab === id
                  ? 'text-[#C8973A] border-[#C8973A] bg-white'
                  : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {{ overview: 'Overview', catering: 'Catering', floorplan: 'Floor Plan', tasks: 'Tasks', notes: 'Notes' }[id]}
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
                <div className="flex justify-between items-center text-sm py-1 border-b border-gray-200">
                  <span className="text-gray-500 shrink-0 mr-2">Food Ready By</span>
                  <span className="text-right font-medium text-[#C8973A]">
                    {to12Hour(shiftTime(event.event_time, -15))}
                  </span>
                </div>
              )}
              <EditableRow locked={locked} label="Space" value={event.space} onSave={(v) => saveField('event', 'space', v)} />
              {(deposit || finalPayment) && (
                <div className="border-t border-gray-200 pt-2 mt-1 space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-widest">Payments</p>
                  {deposit && (
                    <div className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-gray-500">Deposit</span>
                      <PaymentStatusBadge status={deposit.status} />
                    </div>
                  )}
                  {finalPayment && (
                    <div className="flex justify-between items-center text-sm py-0.5">
                      <span className="text-gray-500">Final</span>
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
              <EditableRow locked={locked} label="Phone" type="tel" value={client?.phone ?? ''} format={formatPhoneNumber} onSave={(v) => saveField('client', 'phone', v)} />
              <EditableRow locked={locked} label="Company" value={client?.company ?? ''} onSave={(v) => saveField('client', 'company', v)} />
              <EditableRow locked={locked} label="Referral" value={client?.referral_source ?? ''} onSave={(v) => saveField('client', 'referral_source', v)} />
            </InfoCard>

            <InfoCard title="Toast Status">
              <p className="text-[10px] text-gray-500 mb-2 leading-relaxed">
                Manual mirror of where this event stands in Toast Catering &amp; Events. Toast remains the system of record for proposals, invoices, and payments.
              </p>
              {TOAST_STAGES.map(stage => (
                <ToastStatusRow
                  key={stage.key}
                  label={stage.label}
                  date={details?.[stage.key] ?? null}
                  onToggle={(checked) => saveField('details', stage.key, checked ? new Date().toISOString().slice(0, 10) : null)}
                />
              ))}
            </InfoCard>

            <InfoCard title="Event Readiness">
              <div className={`rounded-lg border px-3 py-2.5 mb-3 flex items-center justify-between ${readinessColors.bg} ${readinessColors.border}`}>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Operational Readiness</span>
                <span className={`text-xl font-bold ${readinessColors.text}`}>{readiness.score}%</span>
              </div>
              {readiness.missingLabels.length === 0 ? (
                <p className="text-sm text-green-600">All operational checks complete.</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Still Needed</p>
                  {readiness.missingLabels.map(label => (
                    <div key={label} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-red-400">•</span>{label}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-500 mt-2 italic">Based on operational prep, not payment status.</p>
            </InfoCard>

            <InfoCard title="Tasks">
              <div className={`rounded-lg border px-3 py-2.5 mb-3 flex items-center justify-between ${taskComplexityColors.bg} ${taskComplexityColors.border}`}>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Complexity</span>
                <span className={`text-lg font-bold ${taskComplexityColors.text}`}>{taskComplexity.level}</span>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                {initialTasks.filter(t => t.completed).length}/{initialTasks.length} tasks complete
              </p>
              <Button size="sm" variant="outline" onClick={() => setTab('tasks')} className="w-full">
                View Tasks
              </Button>
            </InfoCard>

            <InfoCard title="Package & Food">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Package</span>
                  {locked ? (
                    <span className="text-sm text-gray-900 text-right">{packages.find(p => p.id === details?.package_id)?.name ?? '—'}</span>
                  ) : (
                    <select
                      key={details?.package_id ?? ''}
                      defaultValue={details?.package_id ?? ''}
                      onBlur={(e) => saveField('details', 'package_id', e.target.value)}
                      className="bg-transparent border-b border-gray-300 text-right text-sm text-gray-900 focus:outline-none"
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
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!details?.dessert_expected}
                      onChange={(e) => saveField('details', 'dessert_expected', e.target.checked ? 1 : 0)}
                      className="rounded accent-[#C8973A] w-4 h-4"
                    />
                    Dessert Expected
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!details?.kids_attending}
                      onChange={(e) => saveField('details', 'kids_attending', e.target.checked ? 1 : 0)}
                      className="rounded accent-[#C8973A] w-4 h-4"
                    />
                    Kids Attending
                  </label>
                </div>
              </div>
            </InfoCard>

            <InfoCard title="Bar & Beverage">
              <div className="flex justify-between text-sm py-1 border-b border-gray-200">
                <span className="text-gray-500 shrink-0 mr-2">Bar Tab Type</span>
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
                    className="bg-transparent border-b border-gray-300 text-right text-sm text-gray-900 focus:outline-none max-w-[200px]"
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
                <thead><tr className="text-gray-500 border-b border-gray-200">
                  <th className="text-left py-1">Item</th>
                  <th className="text-right py-1">Qty</th>
                  <th className="text-right py-1">Unit</th>
                  <th className="text-right py-1">Price/Unit</th>
                  <th className="text-right py-1">Total</th>
                  <th className="py-1"></th>
                </tr></thead>
                <tbody>
                  {addOns.map((a) => (
                    <tr key={a.id} className="border-b border-gray-200">
                      <td className="py-1.5">{a.item_name}</td>
                      <td className="text-right">{a.qty}</td>
                      <td className="text-right text-gray-500">{a.unit}</td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-0.5 justify-end">
                          <span className="text-gray-500">$</span>
                          <input
                            key={`${a.id}-${a.price_each}`}
                            type="number"
                            step="0.01"
                            min={0}
                            defaultValue={a.price_each || ''}
                            placeholder="0.00"
                            onBlur={(e) => {
                              const val = Number(e.target.value)
                              if (!Number.isFinite(val) || val < 0) return
                              updateAddOnPrice(a.id, val)
                            }}
                            className="w-16 bg-gray-50 border border-gray-300 rounded px-1 py-0.5 text-right text-gray-900 focus:outline-none focus:border-[#C8973A]"
                          />
                        </div>
                      </td>
                      <td className="text-right text-gray-700">{a.price_each ? formatCurrency(a.qty * a.price_each) : '—'}</td>
                      <td className="text-right pl-2">
                        <button onClick={() => deleteAddOn(a.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                  {addOns.some(a => a.price_each > 0) && (
                    <tr>
                      <td colSpan={4} className="text-right py-1.5 text-gray-500 font-medium">Add-ons Total</td>
                      <td className="text-right py-1.5 text-[#C8973A] font-semibold">
                        {formatCurrency(addOns.reduce((s, a) => s + a.qty * a.price_each, 0))}
                      </td>
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="Item name" value={newAddOn.item_name} onChange={(e) => setNewAddOn((n) => ({ ...n, item_name: e.target.value }))} className="flex-1 min-w-28" />
              <Input placeholder="Qty" type="number" value={newAddOn.qty} onChange={(e) => setNewAddOn((n) => ({ ...n, qty: e.target.value }))} className="w-16" />
              <Input placeholder="Unit" value={newAddOn.unit} onChange={(e) => setNewAddOn((n) => ({ ...n, unit: e.target.value }))} className="w-20" />
              <Input placeholder="Price/unit" type="number" step="0.01" value={newAddOn.price_each} onChange={(e) => setNewAddOn((n) => ({ ...n, price_each: e.target.value }))} className="w-24" />
              <Button size="sm" variant="outline" onClick={addAddOn}>Add</Button>
            </div>
          </InfoCard>
        </div>}

        {/* Catering Tab */}
        <div className={tab === 'catering' ? 'space-y-4' : 'hidden'}>

            {/* Catering Packages */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
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
                  <div key={ep.id} className={idx > 0 ? 'border-t border-gray-200 pt-6' : ''}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Package {idx + 1}</p>
                      <button onClick={() => removePackage(ep.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                        Remove
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4 mb-4 text-sm">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Package</label>
                        <select
                          defaultValue={ep.package_id}
                          onBlur={e => updatePackage(ep.id, { package_id: e.target.value })}
                          className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:border-[#C8973A]"
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
                          className="w-20 bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:border-[#C8973A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Buffer %</label>
                        <input
                          type="number"
                          defaultValue={ep.buffer_pct ? Math.round(ep.buffer_pct * 100) : ''}
                          onBlur={e => updatePackage(ep.id, { buffer_pct: (Number(e.target.value) || 0) / 100 })}
                          placeholder="0"
                          className="w-16 bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:border-[#C8973A]"
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
                        menuItemOverrides={details?.menu_item_overrides_json ?? '{}'}
                        onOverridesChange={(json) => { saveField('details', 'menu_item_overrides_json', json) }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add-ons */}
            {addOns.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Add-ons & Extras</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="text-left py-1.5">Item</th>
                      <th className="text-right py-1.5">Qty</th>
                      <th className="text-right py-1.5">Unit</th>
                      <th className="text-right py-1.5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addOns.map((a) => (
                      <tr key={a.id} className="border-b border-gray-200">
                        <td className="py-1.5">{a.item_name}</td>
                        <td className="text-right">{a.qty}</td>
                        <td className="text-right text-gray-500">{a.unit}</td>
                        <td className="text-right text-gray-500">{a.price_each ? formatCurrency(a.qty * a.price_each) : '—'}</td>
                      </tr>
                    ))}
                    {addOns.some(a => a.price_each > 0) && (
                      <tr>
                        <td colSpan={3} className="text-right py-1.5 text-gray-500 font-medium">Add-ons Total</td>
                        <td className="text-right py-1.5 text-[#C8973A] font-semibold">
                          {formatCurrency(addOns.reduce((s, a) => s + a.qty * a.price_each, 0))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bar & Beverage */}
            {details?.bar_tab_type && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Bar & Beverage</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-32 shrink-0">Bar Setup</span>
                    <span className="text-gray-900 font-medium">BAR TAB | {details.bar_tab_type}</span>
                  </div>
                  {details.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && details.drink_tickets ? (
                    <div className="flex gap-2">
                      <span className="text-gray-500 w-32 shrink-0">Drink Tickets</span>
                      <span className="text-gray-900 font-medium">{details.drink_tickets}</span>
                    </div>
                  ) : null}
                  {details.tab_details && (
                    <p className="text-gray-500 text-xs mt-2 leading-relaxed">{details.tab_details}</p>
                  )}
                </div>
              </div>
            )}

            {/* Food Notes & Restrictions */}
            {(details?.dietary_restrictions || details?.food_notes) && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Food Notes & Restrictions</h3>
                <div className="space-y-2 text-sm">
                  {details.dietary_restrictions && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-red-600 mb-0.5">Dietary Restrictions</p>
                      <p className="text-gray-900 leading-relaxed">{details.dietary_restrictions}</p>
                    </div>
                  )}
                  {details.food_notes && (
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-0.5">Food Notes</p>
                      <p className="text-gray-900 leading-relaxed">{details.food_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Staff Notes */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
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
                <NoteField
                  label="FOH Notes"
                  value={details?.foh_notes ?? ''}
                  onSave={(v) => saveField('details', 'foh_notes', v)}
                />
                <NoteField
                  label="Bar Notes"
                  value={details?.bar_notes ?? ''}
                  onSave={(v) => saveField('details', 'bar_notes', v)}
                />
              </div>
            </div>

            {/* Alert Timing */}
            <AlertTimingCard
              value={details?.alert_offsets_json ?? '{}'}
              onSave={(v) => saveField('details', 'alert_offsets_json', v)}
            />

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
              const itemOverrides = parseMenuItemOverrides(details?.menu_item_overrides_json)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const merged = mergeCalculatedItems(allPkgs.flatMap(ep => ep.pkg ? calcAllItems(ep.menuItems as any, ep.guest_count, ep.buffer_pct, itemOverrides) : []))
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
                <div className="rounded-xl border border-gray-200 bg-white p-4">
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
              const itemOverrides = parseMenuItemOverrides(details?.menu_item_overrides_json)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const mergedItems = mergeCalculatedItems(activePkgs.flatMap(ep => calcAllItems(ep.menuItems as any, ep.guest_count, ep.buffer_pct, itemOverrides)))
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
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Recommended Layout</h3>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <p className="text-gray-900 font-semibold text-base">{rec.layoutType}</p>
                    {rec.warningLevel && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        rec.warningLevel === 'danger'  ? 'bg-red-50 text-red-700' :
                        rec.warningLevel === 'caution' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {rec.warningLevel === 'danger' ? 'OVER CAPACITY' : rec.warningLevel === 'caution' ? 'CAUTION' : 'NOTE'}
                      </span>
                    )}
                  </div>

                  {!rec.isOverCapacity && rec.tablesNeeded !== null && (
                    <div className="grid grid-cols-4 gap-3">
                      <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                        <p className="text-2xl font-bold text-gray-900">{rec.tablesNeeded}</p>
                        <p className="text-xs text-gray-500 mt-0.5">6-ft Tables</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                        <p className="text-2xl font-bold text-gray-900">{rec.highTopCount ?? 0}</p>
                        <p className="text-xs text-gray-500 mt-0.5">High-Tops</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                        <p className="text-2xl font-bold text-gray-900">{rec.receptionHighTops ?? 0}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Reception High-Tops</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                        <p className="text-2xl font-bold text-gray-900">{rec.seatedCapacity ?? '—'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Seated Cap.</p>
                      </div>
                    </div>
                  )}

                  {rec.warning && (
                    <div className={`rounded-lg px-3 py-2 text-sm ${
                      rec.warningLevel === 'danger'  ? 'bg-red-50 border border-red-200 text-red-700' :
                      rec.warningLevel === 'caution' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
                      'bg-blue-50 border border-blue-200 text-blue-700'
                    }`}>
                      {rec.warning}
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">Staff Setup Notes</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{rec.staffNotes}</p>
                  </div>
                </div>
              </div>

              {/* Standard Setup Checklist */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Standard Setup Checklist</h3>
                <ul className="space-y-2 text-sm text-gray-700">
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
                    Place current <strong className="text-gray-900">beer list</strong> and <strong className="text-gray-900">wine list</strong> on each table for guests to review before ordering at the bar
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8973A] mt-0.5 shrink-0">•</span>
                    Dim lights for guests during the event
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8973A] mt-0.5 shrink-0">•</span>
                    Music on <strong className="text-gray-900">Source 2</strong>, turned up to at least <strong className="text-gray-900">90</strong>
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
              <div className="rounded-xl border border-gray-200 bg-white p-4">
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

        {/* Tasks Tab */}
        {tab === 'tasks' && (
          <TasksTab eventId={event.id} initialTasks={initialTasks} taskContext={taskContext} />
        )}

        {/* Notes Tab */}
        {tab === 'notes' && (
          <InfoCard title="Activity Log">
            {notes.length === 0 ? (
              <p className="text-gray-500 text-sm">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="text-sm border-b border-gray-200 pb-2">
                    <p className="text-gray-700">{n.note}</p>
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
    <div className={`rounded-xl border border-gray-200 bg-white p-4 ${fullWidth ? 'col-span-2' : ''}`}>
      <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">{title}</h3>
      {children}
    </div>
  )
}

function ToastStatusRow({ label, date, onToggle }: { label: string; date: string | null; onToggle: (checked: boolean) => void }) {
  return (
    <div className="flex justify-between items-center text-sm py-1.5 border-b border-gray-200 last:border-0">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!!date}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded accent-[#C8973A] w-4 h-4"
        />
        <span className={date ? 'text-gray-900' : 'text-gray-500'}>{label}</span>
      </label>
      <span className="text-xs text-gray-500 tabular-nums">
        {date ? new Date(date + 'T00:00:00').toLocaleDateString() : '—'}
      </span>
    </div>
  )
}

function EditableRow({ label, value, type = 'text', display, locked, format, onSave }: {
  label: string
  value: string
  type?: string
  display?: string
  locked?: boolean
  format?: (v: string) => string
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
    <div className="flex justify-between items-center text-sm py-1 border-b border-gray-200 last:border-0">
      <span className="text-gray-500 shrink-0 mr-2">{label}</span>
      {!locked && editing ? (
        <Input
          type={type}
          value={val}
          onChange={(e) => setVal(format ? format(e.target.value) : e.target.value)}
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
    <div className="pt-2 border-t border-gray-200 mt-1">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      {!locked && editing ? (
        <Textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          autoFocus
          rows={4}
          className="w-full text-sm bg-white border border-[#C8973A]/50 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-[#C8973A] resize-none"
        />
      ) : (
        <button
          disabled={locked}
          onClick={() => { setVal(value); setEditing(true) }}
          className={`w-full text-left text-sm text-gray-700 leading-relaxed whitespace-pre-wrap ${locked ? '' : 'hover:text-[#C8973A] transition-colors cursor-text'}`}
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
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A]">{label}</h3>
        <button
          onClick={copy}
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
            copied
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 font-mono leading-relaxed">
        <pre className="whitespace-pre-wrap">
          {lines.map((line, i) => (
            <span key={i}>
              {isHeaderLine(line) ? <strong className="text-gray-900">{line}</strong> : line}
              {i < lines.length - 1 ? '\n' : ''}
            </span>
          ))}
          {showDisclaimer && (
            <>{'\n\n'}<strong className="text-gray-900">{CATERING_DISCLAIMER}</strong></>
          )}
        </pre>
      </div>
    </div>
  )
}

function SupplyStat({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
      {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
    </div>
  )
}

function NoteField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(value)
  function commit() { if (val !== value) onSave(val) }
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">{label}</label>
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

const DEFAULT_ALERT_OFFSETS: Record<string, number> = { setup: 240, kitchen: 120, final: 30 }

function AlertTimingCard({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  function parse(json: string): Record<string, number> {
    try { return { ...DEFAULT_ALERT_OFFSETS, ...JSON.parse(json || '{}') } } catch { return DEFAULT_ALERT_OFFSETS }
  }
  const [offsets, setOffsets] = useState(parse(value))
  useEffect(() => setOffsets(parse(value)), [value])

  function commit(key: string, mins: number) {
    const next = { ...offsets, [key]: mins }
    setOffsets(next)
    onSave(JSON.stringify(next))
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-1">Alert Timing</h3>
      <p className="text-xs text-gray-500 mb-3">Minutes before event start that each notification fires.</p>
      <div className="grid grid-cols-3 gap-3">
        <AlertTimingField label="Setup Checklist" value={offsets.setup} onCommit={(m) => commit('setup', m)} />
        <AlertTimingField label="Kitchen Prep" value={offsets.kitchen} onCommit={(m) => commit('kitchen', m)} />
        <AlertTimingField label="Final Readiness" value={offsets.final} onCommit={(m) => commit('final', m)} />
      </div>
    </div>
  )
}

function AlertTimingField({ label, value, onCommit }: { label: string; value: number; onCommit: (mins: number) => void }) {
  const [val, setVal] = useState(String(value))
  const id = `alert-offset-${label.toLowerCase().replace(/\s+/g, '-')}`
  useEffect(() => setVal(String(value)), [value])
  function commit() {
    const n = Number(val)
    if (!Number.isNaN(n) && n !== value) onCommit(n)
  }
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[10px] uppercase tracking-widest text-gray-500">{label}</label>
      <div className="flex items-center gap-1.5">
        <Input id={id} type="number" min="0" value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} className="h-8 text-sm w-20" />
        <span className="text-xs text-gray-500">min before</span>
      </div>
    </div>
  )
}
