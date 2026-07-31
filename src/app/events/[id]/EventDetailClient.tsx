'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/StatusBadge'
import { CateringCalculator } from '@/components/CateringCalculator'
import { EVENT_STATUSES, COMMUNICATION_ACTIVITY_TYPES, type CommunicationActivityType } from '@/lib/constants'

const BAR_TAB_DESCRIPTIONS: Record<string, string> = {
  'Pre-Paid Drink Ticket(s)': 'Includes all beer selections on tap, wine, rosé, sparkling brut, beer- and wine-based cocktails, coffee, and non-alcoholic beverage options.',
  'By Consumption': 'All event beverages are to be rung to the event tab and charged according to actual consumption.',
  'Individual Tabs': 'Guests will open individual tabs directly at the bar for drink selections only.',
}
import { calcFloorPlan, countChafingDishes, calcSupplies, formatCateringText, formatEquipmentText, parseMenuItemOverrides, formatCurrency, resolveCateringPackages, calcMergedCateringItems, cateringPackageTitle, vesselLabelFor, pluralizeVessel, saucesForItem, getTotalGuestCount } from '@/lib/calculations'
import { to12Hour, computeEventTimes, shiftTime } from '@/lib/timeUtils'
import { formatPhoneNumber } from '@/lib/phone'
import { TOAST_STAGES } from '@/lib/toastStatus'
import { calcReadiness, readinessColor } from '@/lib/readiness'
import { calcBarImpact } from '@/lib/barImpact'
import { calcTaskComplexity, COMPLEXITY_COLORS, type TaskContext } from '@/lib/tasks'
import { TasksTab } from './TasksTab'
import { PrepOutputsClient } from './prep/PrepOutputsClient'
import type { PrepOutputsData } from '@/lib/prepOutputsData'
import type { Event, Client, EventDetails, AddOn, EventNote, EventCommunication, Package, MenuItem, EventPackageWithItems, EventTask, EventCommunityGiving } from '@/lib/db'

interface FullData {
  event: Event
  client: Client | null | undefined
  details: EventDetails | null | undefined
  addOns: AddOn[]
  notes: EventNote[]
  communications: EventCommunication[]
  pkg: Package | null
  menuItems: MenuItem[]
  packages: EventPackageWithItems[]
  communityGiving: EventCommunityGiving | null
}

interface Props {
  data: FullData
  packages: Package[]
  initialTasks: EventTask[]
  prepData: PrepOutputsData | null
}

export function EventDetailClient({ data: initialData, packages, initialTasks, prepData }: Props) {
  const [data, setData] = useState(initialData)
  const [newNote, setNewNote] = useState('')
  const [newAddOn, setNewAddOn] = useState({ item_name: '', qty: '', unit: '', price_each: '', notes: '' })
  const [tab, setTab] = useState<'overview'|'timeline'|'catering'|'floorplan'|'tasks'|'prep'|'notes'>('overview')
  const [editingClosed, setEditingClosed] = useState(false)
  const [eventPackages, setEventPackages] = useState<EventPackageWithItems[]>(initialData.packages ?? [])

  // Communication Timeline — commPending is the activity type currently showing its
  // optional-note composer (only the "promptsForNote" types use this); everything
  // else logs immediately on click. commBackdateOpen/commDate/commTime let staff
  // log an entry for a date/time other than now (e.g. backfilling an older inquiry).
  const [commPending, setCommPending] = useState<CommunicationActivityType | null>(null)
  const [commNote, setCommNote] = useState('')
  const [commSaving, setCommSaving] = useState(false)
  const [commBackdateOpen, setCommBackdateOpen] = useState(false)
  const [commDate, setCommDate] = useState('')
  const [commTime, setCommTime] = useState('')

  const { event, client, details, addOns, notes, communications, communityGiving } = data

  const [floorPlanNotes, setFloorPlanNotes] = useState(details?.floor_plan_notes ?? '')
  const [floorNotesSaving, setFloorNotesSaving] = useState(false)

  useEffect(() => {
    setFloorPlanNotes(data.details?.floor_plan_notes ?? '')
  }, [data])

  const isClosed = event.status === 'Closed'
  const locked = isClosed && !editingClosed

  // Canonical total guest count across this event's catering packages — event_packages
  // is the source of truth (see docs/EVENT_DETAILS_DATA_AUDIT.md §C); details?.guest_count
  // is only used as the legacy fallback when no packages have a guest count set.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalGuestCount = getTotalGuestCount(eventPackages as any, details?.guest_count ?? 0)

  const readiness = calcReadiness({
    guest_count: totalGuestCount,
    hasPackage: eventPackages.some(ep => !!ep.package_id),
    bar_tab_type: details?.bar_tab_type,
    setup_notes: details?.setup_notes,
    floor_plan_notes: details?.floor_plan_notes,
    dietary_restrictions: details?.dietary_restrictions,
    staffing_notes: details?.staffing_notes,
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
    guest_count: totalGuestCount,
    bar_tab_type: details?.bar_tab_type ?? '',
    drink_tickets: details?.drink_tickets ?? 0,
  }).level
  const taskContext: TaskContext = {
    guestCount: totalGuestCount,
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

  async function addPackage(): Promise<number> {
    const res = await fetch('/api/event-packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, package_id: '', guest_count: 0, buffer_pct: 0 }),
    })
    const { id } = await res.json()
    setEventPackages(prev => [...prev, { id, event_id: event.id, package_id: '', guest_count: 0, buffer_pct: 0, sort_order: prev.length, pkg: null, menuItems: [] }])
    return id
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

  // Manual per-item overrides and sauce selections are keyed by item_name and shared
  // across the whole event, not scoped to one package — swapping a package's own
  // package_id for a different one silently orphans whatever was entered for the old
  // package's items. Warn before that happens; returns false if the user cancels.
  function packageChangeIsSafe(currentPackageId: string): boolean {
    if (!currentPackageId) return true
    const hasOverrides = !!(details?.menu_item_overrides_json && details.menu_item_overrides_json !== '{}')
    const hasSauces = !!(details?.selected_sauces && details.selected_sauces.trim() !== '')
    if (!hasOverrides && !hasSauces) return true
    return window.confirm(
      'This event has manually entered item overrides and/or sauce selections tied to the current package. ' +
      'Changing the package will make those customizations no longer apply. Continue?'
    )
  }

  // Overview's Package field and the Catering tab's first package row are the same
  // underlying event_packages record — this is the one function that writes to it, so
  // the two tabs can never fall out of sync the way Overview's old details.package_id
  // field and the Catering tab used to.
  async function setPrimaryPackage(newPackageId: string, resetSelect: () => void) {
    const primary = eventPackages[0]
    if (primary) {
      if (newPackageId !== primary.package_id && !packageChangeIsSafe(primary.package_id)) {
        resetSelect()
        return
      }
      await updatePackage(primary.id, { package_id: newPackageId })
    } else {
      const newId = await addPackage()
      await updatePackage(newId, { package_id: newPackageId, guest_count: details?.guest_count ?? 0, buffer_pct: details?.buffer_pct ?? 0 })
    }
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

  function enterEditMode() {
    setEditingClosed(true)
  }

  function doneEditing() {
    setEditingClosed(false)
    toast.success('Done editing')
  }

  async function saveField(section: 'event' | 'client' | 'details' | 'community_giving', key: string, value: unknown) {
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

  function toggleCommBackdate() {
    if (!commBackdateOpen) {
      const now = new Date()
      setCommDate(now.toISOString().slice(0, 10))
      setCommTime(now.toTimeString().slice(0, 5))
    }
    setCommBackdateOpen((o) => !o)
  }

  async function logCommunication(activityType: CommunicationActivityType, note?: string) {
    setCommSaving(true)
    try {
      const occurred_at = commBackdateOpen && commDate
        ? new Date(`${commDate}T${commTime || '00:00'}`).toISOString()
        : undefined
      await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id, activity_type: activityType, occurred_at, notes: note ?? '' }),
      })
      toast.success(`Logged: ${activityType}`)
      setCommPending(null)
      setCommNote('')
      await reload()
    } catch {
      toast.error('Failed to log activity')
    } finally {
      setCommSaving(false)
    }
  }

  function handleActivityClick(def: (typeof COMMUNICATION_ACTIVITY_TYPES)[number]) {
    if (def.promptsForNote) {
      setCommPending(def.type)
      setCommNote('')
    } else {
      logCommunication(def.type)
    }
  }

  async function deleteCommunication(id: number) {
    await fetch(`/api/communications/${id}`, { method: 'DELETE' })
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

  async function removeCommunityGiving() {
    if (!confirm('Remove this Community Giving record?')) return
    await fetch(`/api/events/${event.id}/community-giving`, { method: 'DELETE' })
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
          {isClosed && (
            <Button
              variant="outline"
              size="sm"
              onClick={locked ? enterEditMode : doneEditing}
              className="border-[#C8973A] text-[#C8973A] hover:bg-[#C8973A]/10"
            >
              {locked ? 'Edit Event' : 'Done Editing'}
            </Button>
          )}
        </div>
      </div>

      {isClosed && editingClosed && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 flex items-start gap-2">
          <span className="mt-0.5">⚠</span>
          <span>
            Editing a <strong>Closed</strong> event. Click <strong>Done Editing</strong> when finished to lock it again.
          </span>
        </div>
      )}

      <div>
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-200 mb-5">
          {(['overview','timeline','catering','floorplan','tasks','prep','notes'] as const).map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg -mb-px border-b-2 ${
                tab === id
                  ? 'text-[#C8973A] border-[#C8973A] bg-white'
                  : 'text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {{ overview: 'Overview', timeline: 'Timeline', catering: 'Catering', floorplan: 'Floor Plan', tasks: 'Tasks', prep: 'Prep Docs', notes: 'Notes' }[id]}
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
            </InfoCard>

            <InfoCard title="Client">
              <EditableRow locked={locked} label="First Name" value={client?.first_name ?? ''} onSave={(v) => saveField('client', 'first_name', v)} />
              <EditableRow locked={locked} label="Last Name" value={client?.last_name ?? ''} onSave={(v) => saveField('client', 'last_name', v)} />
              <EditableRow locked={locked} label="Email" value={client?.email ?? ''} type="email" onSave={(v) => saveField('client', 'email', v)} />
              <EditableRow locked={locked} label="Phone" type="tel" value={client?.phone ?? ''} format={formatPhoneNumber} onSave={(v) => saveField('client', 'phone', v)} />
              <EditableRow locked={locked} label="Company" value={client?.company ?? ''} onSave={(v) => saveField('client', 'company', v)} />
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

            <InfoCard title="Planning Readiness">
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
                    <span className="text-sm text-gray-900 text-right">{eventPackages[0]?.pkg?.name ?? '—'}</span>
                  ) : (
                    <select
                      key={eventPackages[0]?.package_id ?? ''}
                      defaultValue={eventPackages[0]?.package_id ?? ''}
                      onBlur={(e) => setPrimaryPackage(e.target.value, () => { e.target.value = eventPackages[0]?.package_id ?? '' })}
                      className="bg-transparent border-b border-gray-300 text-right text-sm text-gray-900 focus:outline-none"
                    >
                      <option value="">— none —</option>
                      {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
                {eventPackages.length > 1 && (
                  <p className="text-xs text-gray-500 italic">+{eventPackages.length - 1} more package{eventPackages.length > 2 ? 's' : ''} — see Catering tab</p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Guests</span>
                  <span className="text-gray-900 text-right">{totalGuestCount || '—'}</span>
                </div>
                <p className="text-xs text-gray-500 italic">Summed across all packages — edit on the Catering tab.</p>
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
                  <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!details?.final_menu_locked}
                      onChange={(e) => saveField('details', 'final_menu_locked', e.target.checked ? 1 : 0)}
                      className="rounded accent-[#C8973A] w-4 h-4"
                    />
                    Final Menu Locked
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
              {details?.bar_tab_type !== 'Individual Tabs' && (
                <EditableRow locked={locked} label="Drink Tickets" value={String(details?.drink_tickets ?? '')} type="number" onSave={(v) => saveField('details', 'drink_tickets', Number(v))} />
              )}
              <ExpandableText locked={locked} label="Tab Details" value={details?.tab_details ?? ''} onSave={(v) => saveField('details', 'tab_details', v)} />
            </InfoCard>

            <InfoCard title="Community Giving">
              <p className="text-[10px] text-gray-500 mb-2 leading-relaxed">
                Optional — a record here means community giving occurred for this event. Separate from pricing, discounts, comps, or Toast payment status.
              </p>
              <EditableRow locked={locked} label="Recipient Organization" value={communityGiving?.recipient_org ?? ''} onSave={(v) => saveField('community_giving', 'recipient_org', v)} />
              <EditableRow
                locked={locked}
                label="Estimated Value"
                type="number"
                value={String(communityGiving?.estimated_value ?? '')}
                display={communityGiving?.estimated_value != null ? formatCurrency(communityGiving.estimated_value) : ''}
                onSave={(v) => saveField('community_giving', 'estimated_value', v === '' ? null : Number(v))}
              />
              <EditableRow
                locked={locked}
                label="Giving Date"
                type="date"
                value={communityGiving?.giving_date ?? ''}
                onSave={(v) => saveField('community_giving', 'giving_date', v || null)}
              />
              <EditableRow locked={locked} label="Approved By" value={communityGiving?.approved_by ?? ''} onSave={(v) => saveField('community_giving', 'approved_by', v)} />
              <ExpandableText locked={locked} label="Description" value={communityGiving?.description ?? ''} onSave={(v) => saveField('community_giving', 'description', v)} />
              <ExpandableText locked={locked} label="Internal Notes (not for reporting)" value={communityGiving?.internal_notes ?? ''} onSave={(v) => saveField('community_giving', 'internal_notes', v)} />
              {communityGiving && (
                <div className="pt-2 mt-1 flex justify-end">
                  <button onClick={removeCommunityGiving} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                    Remove Community Giving Record
                  </button>
                </div>
              )}
            </InfoCard>

          </div>

          {/* Event Food Summary — quick-scan read of the same catering data the
              Catering tab edits. Computed via the shared resolveCateringPackages /
              calcMergedCateringItems helpers so it can never show something the
              Builder disagrees with. */}
          {(() => {
            const guestCount = totalGuestCount
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const foodPackages = resolveCateringPackages(eventPackages as any, data.pkg ? { pkg: data.pkg, menuItems: data.menuItems, guest_count: guestCount, buffer_pct: details?.buffer_pct ?? 0 } as any : null)
            const packageTitle = cateringPackageTitle(foodPackages)
            const itemOverrides = parseMenuItemOverrides(details?.menu_item_overrides_json)
            const items = calcMergedCateringItems(foodPackages, itemOverrides).filter(i => typeof i.total_qty === 'number' && i.total_qty > 0)
            const serveStyle: Record<string, 'all' | 'staggered'> = (() => {
              try { return JSON.parse(details?.serve_style_json || '{}') } catch { return {} }
            })()

            return (
              <InfoCard title="Event Food Summary" fullWidth>
                <div className="space-y-3 text-sm">
                  <FoodSummarySection heading="Dietary Restrictions">
                    <FoodSummaryBullet>{details?.dietary_restrictions || 'None noted'}</FoodSummaryBullet>
                  </FoodSummarySection>

                  <FoodSummarySection heading="Selected Package">
                    <FoodSummaryBullet>{packageTitle || 'None selected'}</FoodSummaryBullet>
                  </FoodSummarySection>

                  {items.length > 0 && (
                    <FoodSummarySection heading="Menu Items">
                      <div className="space-y-2">
                        {items.map(item => {
                          const qty = item.total_qty as number
                          const vessel = vesselLabelFor(item)
                          const style = serveStyle[item.item_name] ?? (qty > 1 ? 'staggered' : 'all')
                          const sauces = saucesForItem(item.item_name, details?.selected_sauces)
                          return (
                            <div key={item.item_name}>
                              <FoodSummaryBullet>{item.item_name}</FoodSummaryBullet>
                              <div className="pl-4 mt-0.5 space-y-0.5">
                                <FoodSummarySubBullet>{qty} {pluralizeVessel(vessel, qty)}</FoodSummarySubBullet>
                                {item.piece_count !== undefined && <FoodSummarySubBullet>{item.piece_count} pieces</FoodSummarySubBullet>}
                                {item.half_pan_qty ? <FoodSummarySubBullet>+ {item.half_pan_qty} Half Chafer</FoodSummarySubBullet> : null}
                                {style === 'staggered' && qty > 1 && <FoodSummarySubBullet>Serve 1 {vessel.toLowerCase()} at a time</FoodSummarySubBullet>}
                                {sauces.map(s => <FoodSummarySubBullet key={s}>{s}</FoodSummarySubBullet>)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </FoodSummarySection>
                  )}

                  <FoodSummarySection heading="Operational Notes">
                    {details?.food_notes && <FoodSummaryBullet>Notes: {details.food_notes}</FoodSummaryBullet>}
                    <FoodSummaryBullet>{CATERING_DISCLAIMER}</FoodSummaryBullet>
                  </FoodSummarySection>
                </div>
              </InfoCard>
            )
          })()}

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

        {/* Timeline Tab */}
        {tab === 'timeline' && (
          <InfoCard title="Communication Timeline">
            <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
              The permanent operational history of this event — what&apos;s happened, from first inquiry through completion.
            </p>

            <button
              type="button"
              onClick={toggleCommBackdate}
              className="text-xs text-gray-500 hover:text-gray-900 underline mb-1.5"
            >
              {commBackdateOpen ? 'Logging for a specific date/time' : 'Log for a different date/time'}
            </button>
            {commBackdateOpen && (
              <div className="flex gap-2 items-center mb-3">
                <Input type="date" value={commDate} onChange={(e) => setCommDate(e.target.value)} className="h-8 text-sm w-auto" />
                <Input type="time" value={commTime} onChange={(e) => setCommTime(e.target.value)} className="h-8 text-sm w-auto" />
                <button type="button" onClick={() => setCommBackdateOpen(false)} className="text-xs text-gray-500 hover:text-gray-900">
                  Use now instead
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {COMMUNICATION_ACTIVITY_TYPES.map((def) => (
                <button
                  key={def.type}
                  type="button"
                  disabled={commSaving}
                  onClick={() => handleActivityClick(def)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-[#C8973A]/50 hover:bg-[#C8973A]/5 transition-colors disabled:opacity-50"
                >
                  <span>{def.emoji}</span>
                  <span>{def.type}</span>
                </button>
              ))}
            </div>

            {commPending && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2 mb-4">
                <p className="text-xs font-medium text-gray-700">{commPending} — add a note? (optional)</p>
                <Textarea
                  value={commNote}
                  onChange={(e) => setCommNote(e.target.value)}
                  rows={2}
                  placeholder="Optional note..."
                  className="text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setCommPending(null); setCommNote('') }}>Cancel</Button>
                  <Button size="sm" disabled={commSaving} onClick={() => logCommunication(commPending, commNote)}>Log</Button>
                </div>
              </div>
            )}

            {communications.length === 0 ? (
              <p className="text-gray-500 text-sm">No activity logged yet.</p>
            ) : (
              <div className="space-y-2">
                {communications.map((c) => {
                  const def = COMMUNICATION_ACTIVITY_TYPES.find((d) => d.type === c.activity_type)
                  const dt = new Date(c.occurred_at)
                  return (
                    <div key={c.id} className="flex items-start gap-3 text-sm border-b border-gray-200 pb-2 last:border-0">
                      <span className="text-lg shrink-0">{def?.emoji ?? '•'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-gray-900">{c.activity_type}</p>
                          <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums">
                            {dt.toLocaleDateString()} · {dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        {c.notes && <p className="text-gray-600 mt-0.5">{c.notes}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteCommunication(c.id)}
                        className="text-gray-400 hover:text-red-400 shrink-0"
                        title="Delete entry"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </InfoCard>
        )}

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
                          key={ep.package_id}
                          defaultValue={ep.package_id}
                          onBlur={e => {
                            const newValue = e.target.value
                            if (newValue !== ep.package_id && !packageChangeIsSafe(ep.package_id)) {
                              e.target.value = ep.package_id
                              return
                            }
                            updatePackage(ep.id, { package_id: newValue })
                          }}
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
              const guestCount = totalGuestCount
              const bufferPct = details?.buffer_pct ?? 0
              if (guestCount === 0) return null

              const serveStyle: Record<string, 'all' | 'staggered'> = (() => {
                try { return JSON.parse(details?.serve_style_json || '{}') } catch { return {} }
              })()
              const itemOverrides = parseMenuItemOverrides(details?.menu_item_overrides_json)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const packages = resolveCateringPackages(eventPackages as any, data.pkg ? { pkg: data.pkg, menuItems: data.menuItems, guest_count: guestCount, buffer_pct: bufferPct } as any : null)
              const merged = calcMergedCateringItems(packages, itemOverrides)
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
              const guestCount = totalGuestCount
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const packages = resolveCateringPackages(eventPackages as any, data.pkg ? { pkg: data.pkg, menuItems: data.menuItems, guest_count: guestCount, buffer_pct: details?.buffer_pct ?? 0 } as any : null)
              const combinedTitle = cateringPackageTitle(packages)
              if (!combinedTitle) return null

              const itemOverrides = parseMenuItemOverrides(details?.menu_item_overrides_json)
              const mergedItems = calcMergedCateringItems(packages, itemOverrides)
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
          const rec = calcFloorPlan(totalGuestCount)
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

        {/* Prep Docs Tab — same canonical pipeline as the standalone /events/[id]/prep
            and /prep-docs routes (getPrepOutputsData), so this can never disagree with
            what those entry points show. Lands on Run of Show first since that's the
            single doc that orients the whole event, not any one department. */}
        {tab === 'prep' && (
          prepData ? (
            <PrepOutputsClient
              ev={prepData.ev}
              initialTicketLog={prepData.ticketLog}
              initialDebrief={prepData.debrief}
              clientHistory={prepData.clientHistory}
              tasks={prepData.tasks}
              risks={prepData.risks}
              initialTab="ros"
            />
          ) : (
            <p className="text-gray-500 text-sm">Prep docs aren&apos;t available for this event.</p>
          )
        )}

        {/* Notes Tab */}
        {tab === 'notes' && (
          <InfoCard title="Internal Notes">
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

// Small, scan-friendly building blocks for the Event Food Summary — bold heading +
// plain bullets, deliberately no cards/badges/pills nested inside the outer InfoCard.
function FoodSummarySection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">{heading}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function FoodSummaryBullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-gray-800">
      <span className="text-gray-400 shrink-0">•</span>
      <span>{children}</span>
    </div>
  )
}

function FoodSummarySubBullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-gray-600 text-xs">
      <span className="text-gray-300 shrink-0">◦</span>
      <span>{children}</span>
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
