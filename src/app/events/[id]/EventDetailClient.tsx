'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/StatusBadge'
import { CateringCalculator } from '@/components/CateringCalculator'
import { PaymentPanel } from '@/components/PaymentPanel'
import dynamic from 'next/dynamic'
import { EVENT_STATUSES } from '@/lib/constants'
import { formatCurrency } from '@/lib/calculations'
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

  const { event, client, details, payments, addOns, notes } = data

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

  async function saveField(section: 'event' | 'client' | 'details', key: string, value: unknown) {
    try {
      await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [section]: { [key]: value } }),
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
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={event.status}
            onChange={(e) => saveStatus(e.target.value)}
            className="bg-[#1F3348] border border-white/20 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
          >
            {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <StatusBadge status={event.status} />
          <ProposalDownloadButton eventId={event.id} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-[#1F3348]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="catering">Catering</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard title="Event Details">
              <EditableRow label="Event Name" value={event.event_name} onSave={(v) => saveField('event', 'event_name', v)} />
              <EditableRow label="Date" value={event.event_date} type="date" onSave={(v) => saveField('event', 'event_date', v)} />
              <EditableRow label="Time" value={event.event_time} type="time" onSave={(v) => saveField('event', 'event_time', v)} />
              <EditableRow label="Setup" value={event.setup_time} type="time" onSave={(v) => saveField('event', 'setup_time', v)} />
              <EditableRow label="Teardown" value={event.teardown_time} type="time" onSave={(v) => saveField('event', 'teardown_time', v)} />
              <EditableRow label="Space" value={event.space} onSave={(v) => saveField('event', 'space', v)} />
            </InfoCard>

            <InfoCard title="Client">
              <EditableRow label="First Name" value={client?.first_name ?? ''} onSave={(v) => saveField('client', 'first_name', v)} />
              <EditableRow label="Last Name" value={client?.last_name ?? ''} onSave={(v) => saveField('client', 'last_name', v)} />
              <EditableRow label="Email" value={client?.email ?? ''} type="email" onSave={(v) => saveField('client', 'email', v)} />
              <EditableRow label="Phone" value={client?.phone ?? ''} onSave={(v) => saveField('client', 'phone', v)} />
              <EditableRow label="Company" value={client?.company ?? ''} onSave={(v) => saveField('client', 'company', v)} />
              <EditableRow label="Referral" value={client?.referral_source ?? ''} onSave={(v) => saveField('client', 'referral_source', v)} />
            </InfoCard>

            <InfoCard title="Package & Food">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Package</span>
                  <select
                    key={details?.package_id ?? ''}
                    defaultValue={details?.package_id ?? ''}
                    onBlur={(e) => saveField('details', 'package_id', e.target.value)}
                    className="bg-transparent border-b border-white/20 text-right text-sm text-white focus:outline-none"
                  >
                    <option value="">— none —</option>
                    {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <EditableRow label="Guests" value={String(details?.guest_count ?? '')} type="number" onSave={(v) => saveField('details', 'guest_count', Number(v))} />
                <EditableRow label="Buffer %" value={String((details?.buffer_pct ?? 0) * 100)} type="number" onSave={(v) => saveField('details', 'buffer_pct', Number(v) / 100)} />
                {selectedPkg && details?.guest_count ? (
                  <div className="flex justify-between text-sm pt-1 border-t border-white/10">
                    <span className="text-gray-400">Food Subtotal</span>
                    <span className="text-[#C8973A] font-semibold">{formatCurrency(details.guest_count * selectedPkg.price_per_guest)}</span>
                  </div>
                ) : null}
              </div>
            </InfoCard>

            <InfoCard title="Bar & Beverage">
              <EditableRow label="Bar Tab Limit" value={String(details?.bar_tab_limit ?? '')} type="number" onSave={(v) => saveField('details', 'bar_tab_limit', Number(v))} />
              <EditableRow label="Drink Tickets" value={String(details?.drink_tickets ?? '')} type="number" onSave={(v) => saveField('details', 'drink_tickets', Number(v))} />
            </InfoCard>
          </div>

          {/* Add-ons */}
          <InfoCard title="Add-ons">
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
        </TabsContent>

        {/* Catering Tab */}
        <TabsContent value="catering" className="mt-4">
          <InfoCard title="Catering Calculator">
            <CateringCalculator
              packageId={details?.package_id ?? null}
              guestCount={details?.guest_count ?? 0}
              bufferPct={details?.buffer_pct ?? 0}
              pricePerGuest={selectedPkg?.price_per_guest ?? 0}
            />
          </InfoCard>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <InfoCard title="Payments">
            <PaymentPanel payments={payments} onUpdate={reload} />
          </InfoCard>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-4 space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
      <h3 className="text-sm font-semibold text-[#C8973A] mb-3">{title}</h3>
      {children}
    </div>
  )
}

function EditableRow({ label, value, type = 'text', onSave }: {
  label: string
  value: string
  type?: string
  onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  function commit() {
    setEditing(false)
    if (val !== value) onSave(val)
  }

  return (
    <div className="flex justify-between items-center text-sm py-1 border-b border-white/5 last:border-0">
      <span className="text-gray-400 shrink-0 mr-2">{label}</span>
      {editing ? (
        <Input
          type={type}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          autoFocus
          className="h-6 text-right text-sm bg-transparent border-0 border-b border-[#C8973A] rounded-none px-0 w-40"
        />
      ) : (
        <button
          onClick={() => { setVal(value); setEditing(true) }}
          className="text-right hover:text-[#C8973A] transition-colors truncate max-w-[180px]"
        >
          {value || <span className="text-gray-500 italic">—</span>}
        </button>
      )}
    </div>
  )
}
