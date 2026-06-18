'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Reservation } from '@/lib/db'
import { RESERVATION_STATUSES } from '@/lib/constants'

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
}

export function ReservationsClient({ initialReservations }: { initialReservations: Reservation[] }) {
  const [reservations, setReservations] = useState(initialReservations)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterDate, setFilterDate] = useState('')

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, party_size: Number(form.party_size) }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { id } = await res.json()
      const newRes: Reservation = {
        ...form,
        id,
        party_size: Number(form.party_size),
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
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(555) 000-0000" />
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
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1F3348] border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Date & Time</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Guest</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Party</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Contact</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Notes</th>
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
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      className={`text-xs rounded-full px-2 py-1 border font-medium bg-transparent cursor-pointer focus:outline-none ${STATUS_COLORS[r.status] ?? 'text-gray-300 border-gray-500'}`}
                    >
                      {RESERVATION_STATUSES.map((s) => <option key={s} value={s} className="bg-[#0f1e2d] text-white">{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => remove(r.id)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
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
