'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Reservation, StaffMember } from '@/lib/db'
import { RESERVATION_STATUSES, TAPROOM_TABLES, TABLE_COMBOS } from '@/lib/constants'
import { formatPhoneNumber } from '@/lib/phone'

const TABLE_CAPACITIES = Array.from(new Set(TAPROOM_TABLES.map((t) => t.seats))).sort((a, b) => a - b)

const STATUS_COLORS: Record<string, string> = {
  Confirmed: 'bg-green-500/20 text-green-300 border-green-500/30',
  Seated: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Completed: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  Cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  'No-Show': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
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
          <Label className="text-sm text-gray-400">Filter by date</Label>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-44 bg-[#1F3348] border-white/20 text-white text-sm"
          />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-xs text-gray-400 hover:text-white">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* New Reservation Form */}
      {showForm && (
        <div className="rounded-xl border border-[#C8973A]/30 bg-[#1F3348]/60 p-5">
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
                  className="w-full bg-[#0f1e2d] border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
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
                  className="w-full bg-[#0f1e2d] border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
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
        <div className="rounded-xl border border-white/10 bg-[#1F3348]/30 p-10 text-center text-gray-400">
          {filterDate ? 'No reservations on this date.' : 'No upcoming reservations.'}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead className="bg-[#1F3348] border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Date & Time</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Guest</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Party</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Contact</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Notes</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Tables</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Lead</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Alert</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-[#1F3348]/20' : ''} hover:bg-white/5`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-white">{formatDate(r.reservation_date)}</div>
                    <div className="text-gray-400 text-xs">{formatTime(r.reservation_time)}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{r.client_name}</td>
                  <td className="px-4 py-3 text-gray-300">{r.party_size || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {r.phone && <div>{r.phone}</div>}
                    {r.email && <div>{r.email}</div>}
                    {!r.phone && !r.email && '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate">{r.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <TableAssignDialog value={r.table_numbers} onChange={(v) => updateTableNumbers(r.id, v)} partySize={r.party_size} guestName={r.client_name} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{staffName(r.assigned_staff_id) ?? 'Unassigned'}</td>
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
                      className={`text-xs rounded-full px-2 py-1 border font-medium bg-transparent cursor-pointer focus:outline-none ${STATUS_COLORS[r.status] ?? 'text-gray-300 border-gray-500'}`}
                    >
                      {RESERVATION_STATUSES.map((s) => <option key={s} value={s} className="bg-[#0f1e2d] text-white">{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.tables_assigned_at ? (
                        <span className="text-xs text-green-400 whitespace-nowrap">✓ Reserved</span>
                      ) : (
                        <button
                          onClick={() => markReserved(r.id)}
                          className="text-xs text-[#C8973A] hover:text-white transition-colors whitespace-nowrap"
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

const SEATS_BY_TABLE: Map<number, number> = new Map(TAPROOM_TABLES.map((t) => [t.number, t.seats]))

function useTableSelection(value: string, onChange: (v: string) => void, partySize?: number) {
  const selected = new Set((value || '').split(',').map((s) => s.trim()).filter(Boolean))
  const totalSeats = Array.from(selected).reduce((sum, n) => sum + (SEATS_BY_TABLE.get(Number(n)) ?? 0), 0)
  const short = selected.size > 0 && !!partySize && totalSeats < partySize

  function toggle(num: number) {
    const key = String(num)
    const next = new Set(selected)
    next.has(key) ? next.delete(key) : next.add(key)
    onChange(Array.from(next).map(Number).sort((a, b) => a - b).join(','))
  }

  function toggleCombo(tables: readonly number[]) {
    const keys = tables.map(String)
    const allSelected = keys.every((k) => selected.has(k))
    const next = new Set(selected)
    keys.forEach((k) => allSelected ? next.delete(k) : next.add(k))
    onChange(Array.from(next).map(Number).sort((a, b) => a - b).join(','))
  }

  const summary = selected.size > 0
    ? Array.from(selected).map(Number).sort((a, b) => a - b).join(', ')
    : 'Assign tables'

  return { selected, totalSeats, short, toggle, toggleCombo, summary }
}

function TableGridPicker({ selected, toggle, toggleCombo, totalSeats, short, partySize }: {
  selected: Set<string>
  toggle: (num: number) => void
  toggleCombo: (tables: readonly number[]) => void
  totalSeats: number
  short: boolean
  partySize?: number
}) {
  return (
    <div className="space-y-2">
      {!!partySize && (
        <p className={`text-xs font-medium ${short ? 'text-red-400' : 'text-green-400'}`}>
          {totalSeats} seat{totalSeats === 1 ? '' : 's'} selected — party of {partySize}
        </p>
      )}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Long Tables (Joined)</p>
        <div className="flex flex-wrap gap-1">
          {TABLE_COMBOS.map((combo) => {
            const active = combo.tables.every((n) => selected.has(String(n)))
            return (
              <button
                key={combo.tables.join('+')}
                type="button"
                onClick={() => toggleCombo(combo.tables)}
                className={`text-xs px-2 py-1 rounded-md border font-medium transition-colors ${
                  active
                    ? 'bg-[#C8973A] text-white border-[#C8973A]'
                    : 'bg-white/5 text-gray-300 border-white/15 hover:bg-white/10'
                }`}
              >
                {combo.tables.join('+')} ({combo.seats})
              </button>
            )
          })}
        </div>
      </div>
      {TABLE_CAPACITIES.map((seats) => (
        <div key={seats}>
          <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">{seats}-Top</p>
          <div className="flex flex-wrap gap-1">
            {TAPROOM_TABLES.filter((t) => t.seats === seats).map((t) => (
              <button
                key={t.number}
                type="button"
                onClick={() => toggle(t.number)}
                className={`text-xs px-2 py-1 rounded-md border font-medium transition-colors ${
                  selected.has(String(t.number))
                    ? 'bg-[#C8973A] text-white border-[#C8973A]'
                    : 'bg-white/5 text-gray-300 border-white/15 hover:bg-white/10'
                }`}
              >
                {t.number}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Inline disclosure picker — used in the New Reservation form, which isn't inside a scroll-clipped container. */
function TablePicker({ value, onChange, partySize }: { value: string; onChange: (v: string) => void; partySize?: number }) {
  const { selected, totalSeats, short, toggle, toggleCombo, summary } = useTableSelection(value, onChange, partySize)

  return (
    <details className="relative">
      <summary className={`cursor-pointer list-none select-none flex items-center gap-1.5 text-sm ${
        short ? 'text-red-400' : selected.size > 0 ? 'text-white' : 'text-gray-500 italic'
      } hover:text-[#C8973A] transition-colors`}>
        {short && <span title={`Only ${totalSeats} seat(s) selected for a party of ${partySize}`}>⚠</span>}
        {summary}
      </summary>
      <div className="absolute z-20 mt-1.5 p-2.5 rounded-lg bg-[#0f1e2d] border border-white/20 shadow-xl w-56">
        <TableGridPicker selected={selected} toggle={toggle} toggleCombo={toggleCombo} totalSeats={totalSeats} short={short} partySize={partySize} />
      </div>
    </details>
  )
}

/** Modal picker — used in the reservation list, whose row sits inside a horizontally-scrolling table that would
 *  otherwise clip an absolutely-positioned dropdown. A dialog renders in a portal, so it's never clipped. */
function TableAssignDialog({ value, onChange, partySize, guestName }: { value: string; onChange: (v: string) => void; partySize?: number; guestName?: string }) {
  const [open, setOpen] = useState(false)
  const { selected, totalSeats, short, toggle, toggleCombo, summary } = useTableSelection(value, onChange, partySize)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={`text-xs px-2 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
              short
                ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                : selected.size > 0
                  ? 'border-white/20 text-white hover:bg-white/10'
                  : 'border-white/15 text-gray-500 italic hover:bg-white/5'
            }`}
          />
        }
      >
        {short && <span>⚠</span>}
        {summary}
      </DialogTrigger>
      <DialogContent className="bg-[#1F3348] text-white ring-white/10 sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-[#C8973A]">Assign Tables{guestName ? ` — ${guestName}` : ''}</DialogTitle>
        </DialogHeader>
        <TableGridPicker selected={selected} toggle={toggle} toggleCombo={toggleCombo} totalSeats={totalSeats} short={short} partySize={partySize} />
        <DialogFooter className="bg-transparent border-white/10">
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
      <Label className="text-gray-300 text-sm">
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
