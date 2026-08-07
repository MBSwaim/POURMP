'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Reservation, StaffMember } from '@/lib/db'
import { RESERVATION_STATUSES, TAPROOM_TABLES } from '@/lib/constants'
import { formatPhoneNumber } from '@/lib/phone'
import { ReservationFloorPlan } from '@/components/ReservationFloorPlan'
import { useTableSelection } from '@/lib/useTableSelection'
import { WEST_DALLAS_RESERVATION_LAYOUT } from '@/lib/floorPlans/westDallasReservationLayout'

const RESERVABLE_TABLE_NUMBERS = TAPROOM_TABLES.map((t) => t.number)

const STATUS_COLORS: Record<string, string> = {
  Confirmed: 'bg-green-50 text-green-700 border-green-200',
  Seated: 'bg-blue-50 text-blue-700 border-blue-200',
  Completed: 'bg-slate-50 text-slate-700 border-slate-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
  'No-Show': 'bg-orange-50 text-orange-700 border-orange-200',
}

const EMPTY_FORM = {
  client_name: '',
  phone: '',
  email: '',
  party_size: '',
  reservation_date: '',
  reservation_time: '',
  notes: '',
  status: 'Confirmed',
  table_numbers: '',
  assigned_staff_id: '',
  alert_offset_mins: '',
}

export function ReservationsClient({ initialReservations }: { initialReservations: Reservation[] }) {
  const [reservations, setReservations] = useState(initialReservations)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => {
    fetch('/api/staff').then((r) => r.json()).then(setStaff).catch(() => setStaff([]))
  }, [])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const staffName = (id: number | null) => staff.find((s) => s.id === id)?.name

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          party_size: Number(form.party_size),
          assigned_staff_id: form.assigned_staff_id ? Number(form.assigned_staff_id) : null,
          alert_offset_mins: form.alert_offset_mins ? Number(form.alert_offset_mins) : null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { id } = await res.json()
      const newRes: Reservation = {
        ...form,
        id,
        party_size: Number(form.party_size),
        assigned_staff_id: form.assigned_staff_id ? Number(form.assigned_staff_id) : null,
        alert_offset_mins: form.alert_offset_mins ? Number(form.alert_offset_mins) : null,
        tables_assigned_at: null,
        created_at: new Date().toISOString(),
      }
      setReservations((prev) => [newRes, ...prev].sort((a, b) =>
        (a.reservation_date + a.reservation_time).localeCompare(b.reservation_date + b.reservation_time)
      ))
      setForm(EMPTY_FORM)
      setShowForm(false)
      toast.success('Reservation added!')
    } catch {
      toast.error('Failed to save reservation')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
  }

  async function updateAlertOffset(id: number, value: string) {
    const alert_offset_mins = value === '' ? null : Number(value)
    await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_offset_mins }),
    })
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, alert_offset_mins } : r))
  }

  async function updateTableNumbers(id: number, table_numbers: string) {
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, table_numbers } : r))
    await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_numbers }),
    })
  }

  async function markReserved(id: number) {
    const tables_assigned_at = new Date().toISOString()
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, tables_assigned_at } : r))
    await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tables_assigned_at }),
    })
    toast.success('Tables marked reserved — alerts stopped')
  }

  async function remove(id: number) {
    if (!confirm('Delete this reservation?')) return
    await fetch(`/api/reservations/${id}`, { method: 'DELETE' })
    setReservations((prev) => prev.filter((r) => r.id !== id))
    toast.success('Reservation deleted')
  }

  const filtered = filterDate
    ? reservations.filter((r) => r.reservation_date === filterDate)
    : reservations

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="bg-[#C8973A] hover:bg-[#b07d2e] text-white"
        >
          {showForm ? 'Cancel' : '+ New Reservation'}
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <Label className="text-sm text-gray-500">Filter by date</Label>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-44 bg-white border-gray-300 text-gray-900 text-sm"
          />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-xs text-gray-500 hover:text-gray-900">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* New Reservation Form */}
      {showForm && (
        <div className="rounded-xl border border-[#C8973A]/30 bg-white p-5">
          <h2 className="text-base font-semibold text-[#C8973A] mb-4">New Reservation</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Guest Name" required>
                <Input value={form.client_name} onChange={(e) => set('client_name', e.target.value)} required placeholder="Full name" />
              </Field>
              <Field label="Party Size">
                <Input type="number" min="1" max="19" value={form.party_size} onChange={(e) => set('party_size', e.target.value)} placeholder="1–19" />
              </Field>
              <Field label="Date" required>
                <Input type="date" value={form.reservation_date} onChange={(e) => set('reservation_date', e.target.value)} required />
              </Field>
              <Field label="Time" required>
                <Input type="time" value={form.reservation_time} onChange={(e) => set('reservation_time', e.target.value)} required />
              </Field>
              <Field label="Phone">
                <Input type="tel" value={form.phone} onChange={(e) => set('phone', formatPhoneNumber(e.target.value))} placeholder="(555) 000-0000" />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
                >
                  {RESERVATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Tables" className="col-span-2">
                <TablePicker value={form.table_numbers} onChange={(v) => set('table_numbers', v)} partySize={Number(form.party_size) || 0} />
              </Field>
              <Field label="Assigned Lead">
                <select
                  value={form.assigned_staff_id}
                  onChange={(e) => set('assigned_staff_id', e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Alert (min before)">
                <Input type="number" min="0" value={form.alert_offset_mins} onChange={(e) => set('alert_offset_mins', e.target.value)} placeholder="120 (default)" />
              </Field>
              <Field label="Notes" className="col-span-2">
                <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Special requests, seating preferences…" />
              </Field>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving} className="bg-[#C8973A] hover:bg-[#b07d2e] text-white">
                {saving ? 'Saving…' : 'Save Reservation'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Reservation List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center text-gray-500">
          {filterDate ? 'No reservations on this date.' : 'No upcoming reservations.'}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">Date & Time</th>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">Guest</th>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">Party</th>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">Contact</th>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">Notes</th>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">Tables</th>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">Lead</th>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">Alert</th>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b border-gray-200 ${i % 2 === 0 ? 'bg-gray-50' : ''} hover:bg-gray-50`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{formatDate(r.reservation_date)}</div>
                    <div className="text-gray-500 text-xs">{formatTime(r.reservation_time)}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.client_name}</td>
                  <td className="px-4 py-3 text-gray-700">{r.party_size || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {r.phone && <div>{r.phone}</div>}
                    {r.email && <div>{r.email}</div>}
                    {!r.phone && !r.email && '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{r.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <TableAssignDialog value={r.table_numbers} onChange={(v) => updateTableNumbers(r.id, v)} partySize={r.party_size} guestName={r.client_name} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{staffName(r.assigned_staff_id) ?? 'Unassigned'}</td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min="0"
                      defaultValue={r.alert_offset_mins ?? ''}
                      onBlur={(e) => updateAlertOffset(r.id, e.target.value)}
                      placeholder="120"
                      className="w-16 h-7 text-xs px-1.5"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      className={`text-xs rounded-full px-2 py-1 border font-medium bg-transparent cursor-pointer focus:outline-none ${STATUS_COLORS[r.status] ?? 'text-gray-700 border-gray-500'}`}
                    >
                      {RESERVATION_STATUSES.map((s) => <option key={s} value={s} className="bg-white text-gray-900">{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.tables_assigned_at ? (
                        <span className="text-xs text-green-400 whitespace-nowrap">✓ Reserved</span>
                      ) : (
                        <button
                          onClick={() => markReserved(r.id)}
                          className="text-xs text-[#C8973A] hover:text-gray-900 transition-colors whitespace-nowrap"
                        >
                          Mark Reserved
                        </button>
                      )}
                      <button
                        onClick={() => remove(r.id)}
                        className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Inline reveal — used in the New Reservation form, which isn't inside a scroll-clipped container. Same
 *  useTableSelection contract as before; the picker UI is now ReservationFloorPlan instead of a button grid. */
function TablePicker({ value, onChange, partySize }: { value: string; onChange: (v: string) => void; partySize?: number }) {
  const { selectedNumbers, totalSeats, short, toggle, summary } = useTableSelection(value, onChange, partySize)

  return (
    <details>
      <summary className={`cursor-pointer list-none select-none flex items-center gap-1.5 text-sm ${
        short ? 'text-red-400' : selectedNumbers.length > 0 ? 'text-gray-900' : 'text-gray-500 italic'
      } hover:text-[#C8973A] transition-colors`}>
        {short && <span title={`Only ${totalSeats} seat(s) selected for a party of ${partySize}`}>⚠</span>}
        {summary}
      </summary>
      <div className="mt-2 p-3 rounded-lg bg-white border border-gray-300 shadow-xl">
        {!!partySize && (
          <p className={`text-xs font-medium mb-2 ${short ? 'text-red-400' : 'text-green-600'}`}>
            {totalSeats} seat{totalSeats === 1 ? '' : 's'} selected — party of {partySize}
          </p>
        )}
        <ReservationFloorPlan
          layout={WEST_DALLAS_RESERVATION_LAYOUT}
          reservableTableNumbers={RESERVABLE_TABLE_NUMBERS}
          selectedTableNumbers={selectedNumbers}
          onToggleTable={toggle}
        />
      </div>
    </details>
  )
}

/** Modal wrapper — used in the reservation list, whose row sits inside a horizontally-scrolling table that would
 *  otherwise clip an inline reveal. A dialog renders in a portal, so it's never clipped. Same picker component and
 *  selection hook as TablePicker above — this is presentation chrome only, not a second interaction model. */
function TableAssignDialog({ value, onChange, partySize, guestName }: { value: string; onChange: (v: string) => void; partySize?: number; guestName?: string }) {
  const [open, setOpen] = useState(false)
  const { selectedNumbers, totalSeats, short, toggle, summary } = useTableSelection(value, onChange, partySize)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={`text-xs px-2 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
              short
                ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                : selectedNumbers.length > 0
                  ? 'border-gray-300 text-gray-900 hover:bg-gray-100'
                  : 'border-gray-200 text-gray-500 italic hover:bg-gray-50'
            }`}
          />
        }
      >
        {short && <span>⚠</span>}
        {summary}
      </DialogTrigger>
      <DialogContent className="bg-white text-gray-900 ring-gray-200 sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#C8973A]">Assign Tables{guestName ? ` — ${guestName}` : ''}</DialogTitle>
        </DialogHeader>
        {!!partySize && (
          <p className={`text-xs font-medium ${short ? 'text-red-400' : 'text-green-600'}`}>
            {totalSeats} seat{totalSeats === 1 ? '' : 's'} selected — party of {partySize}
          </p>
        )}
        <ReservationFloorPlan
          layout={WEST_DALLAS_RESERVATION_LAYOUT}
          reservableTableNumbers={RESERVABLE_TABLE_NUMBERS}
          selectedTableNumbers={selectedNumbers}
          onToggleTable={toggle}
        />
        <DialogFooter className="bg-transparent border-gray-200">
          <Button onClick={() => setOpen(false)} className="bg-[#C8973A] hover:bg-[#b07d2e] text-white">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children, required, className }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label className="text-gray-700 text-sm">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      {children}
    </div>
  )
}

function formatDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[Number(m) - 1]} ${Number(day)}, ${y}`
}

function formatTime(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}
