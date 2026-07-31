'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { CateringCalculator } from '@/components/CateringCalculator'
import Link from 'next/link'
import { EVENT_STATUSES, BUSINESS_HOURS } from '@/lib/constants'
import { to12Hour, computeEventTimes } from '@/lib/timeUtils'
import { formatPhoneNumber } from '@/lib/phone'
import type { Package, Client } from '@/lib/db'

interface Prefill {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  event_date?: string
  guest_count?: string
  lead_id?: string
}

interface Props {
  packages: Package[]
  clients: Client[]
  prefill?: Prefill
}

export function NewEventForm({ packages, clients, prefill }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [useExistingClient, setUseExistingClient] = useState(false)

  const [form, setForm] = useState({
    event_name: '',
    event_date: prefill?.event_date ?? '',
    event_time: '',
    setup_time: '',
    teardown_time: '',
    production_close_time: '',
    decorate_time: '',
    event_duration_mins: '180',
    status: 'Confirmed',
    space: '',
    // client
    client_id: '',
    first_name: prefill?.first_name ?? '',
    last_name: prefill?.last_name ?? '',
    email: prefill?.email ?? '',
    phone: prefill?.phone ?? '',
    company: '',
    // details
    guest_count: prefill?.guest_count ?? '',
    package_id: '',
    buffer_pct: '0',
    food_notes: '',
    dietary_restrictions: '',
    bar_tab_limit: '',
    drink_tickets: '',
    tab_details: '',
    bar_tab_type: '',
    staffing_notes: '',
    date_flexible: false,
    setup_notes: '',
  })

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const hours = form.event_date
    ? BUSINESS_HOURS[new Date(form.event_date + 'T12:00:00').getDay()]
    : null

  // Auto-computed times from event start + duration
  const autoTimes = form.event_time
    ? computeEventTimes(form.event_time, Number(form.event_duration_mins))
    : null

  // Sync auto times into form whenever event_time or duration changes
  function handleTimeOrDuration(key: string, value: string) {
    const time = key === 'event_time' ? value : form.event_time
    const dur  = key === 'event_duration_mins' ? Number(value) : Number(form.event_duration_mins)
    if (time) {
      const t = computeEventTimes(time, dur)
      setForm(f => ({ ...f, [key]: value, setup_time: t.setupTime, teardown_time: t.eventEnd, production_close_time: t.productionClose, decorate_time: t.decorateTime }))
    } else {
      set(key, value)
    }
  }

  const selectedPkg = packages.find((p) => p.id === form.package_id)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (hours && form.event_time) {
      if (form.event_time < hours.minStart) {
        toast.error(`Events can't start before ${hours.minStart} on this day (opens at ${hours.open}, 1-hour buffer required)`)
        return
      }
      if (form.event_time > hours.close) {
        toast.error(`Events must end by ${hours.close} on this day`)
        return
      }
    }
    setSaving(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          client_id: useExistingClient ? Number(form.client_id) : undefined,
          guest_count: Number(form.guest_count),
          buffer_pct: Number(form.buffer_pct) / 100,
          bar_tab_limit: Number(form.bar_tab_limit),
          drink_tickets: Number(form.drink_tickets),
          event_duration_mins: Number(form.event_duration_mins),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { id } = await res.json()
      if (prefill?.lead_id) {
        await fetch(`/api/leads/${prefill.lead_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Converted' }),
        })
      }
      toast.success('Event created!')
      router.push(`/events/${id}`)
    } catch {
      toast.error('Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {/* Section 1 — Event Info */}
      <Section title="Event Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Event Name / Occasion" required>
            <Input value={form.event_name} onChange={(e) => set('event_name', e.target.value)} required placeholder="e.g. Birthday Party, Corporate Lunch" />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
            >
              {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Event Date" required>
            <Input
              type="date"
              value={form.event_date}
              min={(() => { const d = new Date(); d.setDate(d.getDate() + 21); return d.toISOString().split('T')[0] })()}
              onChange={(e) => set('event_date', e.target.value)}
              required
            />
            {form.event_date && (() => {
              const today = new Date(); today.setHours(0,0,0,0)
              const picked = new Date(form.event_date + 'T00:00:00')
              const diff = Math.floor((picked.getTime() - today.getTime()) / 86400000)
              return diff < 21 ? (
                <p className="text-red-400 text-xs mt-1">
                  Events must be booked at least 21 days in advance. Please select a date on or after{' '}
                  {(() => { const d = new Date(); d.setDate(d.getDate() + 21); return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) })()}.
                </p>
              ) : null
            })()}
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id="date_flexible"
                checked={form.date_flexible as boolean}
                onCheckedChange={(v) => set('date_flexible', Boolean(v))}
              />
              <Label htmlFor="date_flexible" className="text-xs text-gray-500 cursor-pointer">My date is flexible</Label>
            </div>
          </Field>
          <Field label={hours ? `Event Start Time (${to12Hour(hours.minStart)} – ${to12Hour(hours.close)})` : 'Event Start Time'} required>
            <Input
              type="time"
              value={form.event_time}
              min={hours?.minStart}
              max={hours?.close}
              onChange={(e) => handleTimeOrDuration('event_time', e.target.value)}
            />
            {hours && form.event_time && form.event_time < hours.minStart && (
              <p className="text-xs text-red-400 mt-1">Must start after {to12Hour(hours.minStart)} (opens {to12Hour(hours.open)}, 1-hr buffer)</p>
            )}
          </Field>

          <Field label="Event Duration">
            <div className="flex gap-2">
              {[['180', '3 Hours'], ['240', '4 Hours']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleTimeOrDuration('event_duration_mins', val)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.event_duration_mins === val
                      ? 'bg-[#C8973A]/20 border-[#C8973A]/60 text-[#C8973A]'
                      : 'bg-gray-50 border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {/* Auto-computed times — shown when event_time is set */}
          {form.event_time && autoTimes && (
            <div className="col-span-2 grid grid-cols-3 gap-3">
              <AutoTimeCard label="Production Space Closes" time={autoTimes.productionClose} note="2 hrs before start" />
              <AutoTimeCard label="Setup Begins" time={autoTimes.setupTime} note="1.5 hrs before start" />
              <AutoTimeCard label="Decorating / Customer Access" time={autoTimes.decorateTime} note="1 hr before start" />
              <AutoTimeCard label="Event Ends" time={autoTimes.eventEnd} note={`${Number(form.event_duration_mins) / 60} hrs after start`} />
            </div>
          )}

          <Field label="Space / Room" className="col-span-2">
            <Input value={form.space} onChange={(e) => set('space', e.target.value)} placeholder="e.g. Taproom, Patio, Full Venue" />
          </Field>
        </div>
      </Section>

      {/* Section 2 — Client */}
      <Section title="Client">
        <div className="flex items-center gap-2 mb-4">
          <Checkbox
            id="existing"
            checked={useExistingClient}
            onCheckedChange={(v) => setUseExistingClient(Boolean(v))}
          />
          <Label htmlFor="existing" className="cursor-pointer">Use existing client</Label>
        </div>
        {useExistingClient ? (
          <Field label="Select Client">
            <select
              value={form.client_id}
              onChange={(e) => set('client_id', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
            >
              <option value="">— select —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.company ? ` (${c.company})` : ''}</option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required={!useExistingClient} />
            </Field>
            <Field label="Last Name" required>
              <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required={!useExistingClient} />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required={!useExistingClient} />
            </Field>
            <Field label="Phone" required>
              <Input type="tel" value={form.phone} onChange={(e) => set('phone', formatPhoneNumber(e.target.value))} required={!useExistingClient} />
            </Field>
            <Field label="Company">
              <Input value={form.company} onChange={(e) => set('company', e.target.value)} />
            </Field>
          </div>
        )}
      </Section>

      {/* Section 3 — Package & Food */}
      <Section title="Package & Food">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Package">
            <select
              value={form.package_id}
              onChange={(e) => set('package_id', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
            >
              <option value="">— select package —</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — ${p.price_per_guest}/guest</option>
              ))}
            </select>
          </Field>
          <Field label="Guest Count" required>
            <Input
              type="number" min="1"
              value={form.guest_count}
              onChange={(e) => set('guest_count', e.target.value)}
              required
            />
          </Field>
          {Number(form.guest_count) > 0 && Number(form.guest_count) < 20 && (
            <div className="col-span-2 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="text-lg leading-none mt-0.5">💡</span>
              <span>
                For parties under 20 guests, a{' '}
                <Link href="/reservations" className="underline underline-offset-2 hover:text-amber-900 font-medium">
                  table reservation
                </Link>
                {' '}may be a better fit than a private event booking.
              </span>
            </div>
          )}
          <Field label="Buffer %">
            <Input
              type="number" min="0" max="100"
              value={form.buffer_pct}
              onChange={(e) => set('buffer_pct', e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Food Notes (Special Requests, Dietary Restrictions)" className="col-span-2">
            <Textarea
              value={form.food_notes}
              onChange={(e) => set('food_notes', e.target.value)}
              rows={3}
              placeholder="Allergies, dietary restrictions, special requests…"
            />
          </Field>
        </div>
        {form.package_id && Number(form.guest_count) > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm font-medium mb-3 text-[#C8973A]">Live Quantity Preview</p>
            <CateringCalculator
              packageId={form.package_id}
              guestCount={Number(form.guest_count)}
              bufferPct={Number(form.buffer_pct) / 100}
              pricePerGuest={selectedPkg?.price_per_guest ?? 0}
            />
          </div>
        )}
      </Section>

      {/* Section 4 — Bar */}
      <Section title="Bar & Beverage">
        <div className="space-y-4">
          <Field label="Bar Tab Type">
            <select
              value={form.bar_tab_type}
              onChange={(e) => set('bar_tab_type', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
            >
              <option value="">— no bar tab —</option>
              <option value="Pre-Paid Drink Ticket(s)">BAR TAB | Pre-Paid Drink Ticket(s)</option>
              <option value="By Consumption">BAR TAB | By Consumption</option>
              <option value="Individual Tabs">BAR TAB | Individual Tabs</option>
            </select>
          </Field>

          {form.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && (
            <BarTabInfo>
              Includes all beer selections on tap, wine, rosé, sparkling brut, beer- and wine-based cocktails, coffee, and non-alcoholic beverage options.            </BarTabInfo>
          )}
          {form.bar_tab_type === 'By Consumption' && (
            <BarTabInfo>
              All event beverages are to be rung to the event tab and charged according to actual consumption.
            </BarTabInfo>
          )}
          {form.bar_tab_type === 'Individual Tabs' && (
            <BarTabInfo>
              Guests will open individual tabs directly at the bar for drink selections only.
            </BarTabInfo>
          )}

          {form.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Number of Drink Tickets">
                <Input type="number" min="0" value={form.drink_tickets} onChange={(e) => set('drink_tickets', e.target.value)} />
              </Field>
            </div>
          )}

          {form.bar_tab_type && (
            <Field label="Additional Bar Notes">
              <Textarea value={form.tab_details} onChange={(e) => set('tab_details', e.target.value)} rows={2} placeholder="Any additional notes for bar staff…" />
            </Field>
          )}
        </div>
      </Section>

      {/* Section 5 — Operations */}
      <Section title="Operations">
        <div className="space-y-4">
          <Field label="Setup Details (Decorations, etc.)">
            <Textarea
              value={form.setup_notes}
              onChange={(e) => set('setup_notes', e.target.value)}
              rows={2}
              placeholder="Decorations, room setup, A/V needs, special arrangements…"
            />
          </Field>
          <Field label="Staffing Notes">
            <Textarea value={form.staffing_notes} onChange={(e) => set('staffing_notes', e.target.value)} rows={2} placeholder="Staff count, servers, coordinator notes… (guests order at the main bar — no dedicated event bartenders)" />
          </Field>
        </div>
      </Section>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="bg-[#C8973A] hover:bg-[#b07d2e] text-white">
          {saving ? 'Saving...' : 'Create Event'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h2 className="text-xs font-bold tracking-widest uppercase text-[#C8973A]">{title}</h2>
      {children}
    </div>
  )
}

function AutoTimeCard({ label, time, note }: { label: string; time: string; note: string }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-base font-semibold text-[#C8973A]">{to12Hour(time)}</p>
      <p className="text-[10px] text-gray-600 mt-0.5">{note}</p>
    </div>
  )
}

function BarTabInfo({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#C8973A]/30 bg-[#C8973A]/5 px-4 py-3 text-gray-700 leading-relaxed font-crimson text-base italic">
      {children}
    </div>
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
