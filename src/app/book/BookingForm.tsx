'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { BUSINESS_HOURS } from '@/lib/constants'
import { to12Hour, computeEventTimes } from '@/lib/timeUtils'
import { formatPhoneNumber } from '@/lib/phone'
import type { Package } from '@/lib/db'

interface Props {
  packages: Package[]
}

const BAR_TAB_DESCRIPTIONS: Record<string, string> = {
  'Pre-Paid Drink Ticket(s)': 'Includes all beer selections on tap, wine, rosé, sparkling brut, beer- and wine-based cocktails, coffee, and non-alcoholic beverage options.',
  'By Consumption': 'All event beverages are to be rung to the event tab and charged according to actual consumption.',
  'Individual Tabs': 'Guests will open individual tabs directly at the bar for drink selections only.',
}

export function BookingForm({ packages }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    event_name: '',
    event_date: '',
    event_time: '',
    setup_time: '',
    teardown_time: '',
    production_close_time: '',
    decorate_time: '',
    event_duration_mins: '180',
    space: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    referral_source: '',
    guest_count: '',
    package_id: '',
    food_notes: '',
    dietary_restrictions: '',
    drink_tickets: '',
    bar_tab_type: '',
    date_flexible: false,
  })

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const hours = form.event_date
    ? BUSINESS_HOURS[new Date(form.event_date + 'T12:00:00').getDay()]
    : null

  const autoTimes = form.event_time
    ? computeEventTimes(form.event_time, Number(form.event_duration_mins))
    : null

  function handleTime(value: string) {
    if (value) {
      const t = computeEventTimes(value, Number(form.event_duration_mins))
      setForm(f => ({ ...f, event_time: value, setup_time: t.setupTime, teardown_time: t.eventEnd, production_close_time: t.productionClose, decorate_time: t.decorateTime }))
    } else {
      set('event_time', value)
    }
  }

  const minDate = (() => { const d = new Date(); d.setDate(d.getDate() + 21); return d.toISOString().split('T')[0] })()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (hours && form.event_time && form.event_time < hours.minStart) {
      alert(`Events can't start before ${to12Hour(hours.minStart)} on this day.`)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          event_date: form.event_date,
          event_type: form.event_name,
          guest_count: Number(form.guest_count),
          message: [
            form.bar_tab_type ? `Bar Tab: ${form.bar_tab_type}` : '',
            form.drink_tickets ? `Drink Tickets: ${form.drink_tickets}` : '',
            form.food_notes ? `Food Notes: ${form.food_notes}` : '',
            form.company ? `Company: ${form.company}` : '',
            form.referral_source ? `Referral: ${form.referral_source}` : '',
            form.event_time ? `Start Time: ${to12Hour(form.event_time)}` : '',
            form.date_flexible ? 'Date is flexible' : '',
          ].filter(Boolean).join(' | '),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Something went wrong. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-10 text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-bold text-[#1F3348]">Request Received!</h2>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Thank you for your interest in hosting a private event at Manhattan Project Beer Co.
          Our events team will reach out within 48 hours to confirm availability and next steps.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-6">

      {/* Event Information */}
      <Card title="Event Information">
        <Field label="Event Name / Occasion" required>
          <input
            className={inputCls}
            value={form.event_name}
            onChange={(e) => set('event_name', e.target.value)}
            placeholder="e.g. Birthday Party, Corporate Lunch, Graduation"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Preferred Date" required>
            <input
              type="date"
              className={inputCls}
              value={form.event_date}
              min={minDate}
              onChange={(e) => set('event_date', e.target.value)}
              required
            />
            {form.event_date && (() => {
              const today = new Date(); today.setHours(0,0,0,0)
              const diff = Math.floor((new Date(form.event_date + 'T00:00:00').getTime() - today.getTime()) / 86400000)
              return diff < 21 ? (
                <p className="text-red-500 text-xs mt-1">
                  Requests must be submitted at least 21 days before the event.
                </p>
              ) : null
            })()}
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.date_flexible as boolean}
                onChange={(e) => set('date_flexible', e.target.checked)}
                className="rounded border-gray-300 text-[#C8973A] focus:ring-[#C8973A]"
              />
              <span className="text-xs text-gray-500">My date is flexible</span>
            </label>
          </Field>

          <Field label={hours ? `Preferred Start Time (${to12Hour(hours.minStart)} – ${to12Hour(hours.close)})` : 'Preferred Start Time'} required>
            <input
              type="time"
              className={inputCls}
              value={form.event_time}
              min={hours?.minStart}
              max={hours?.close}
              onChange={(e) => handleTime(e.target.value)}
              required
            />
            {hours && form.event_time && form.event_time < hours.minStart && (
              <p className="text-red-500 text-xs mt-1">Must start after {to12Hour(hours.minStart)}</p>
            )}
          </Field>
        </div>

        {/* Auto-computed times */}
        {form.event_time && autoTimes && (
          <div className="rounded-lg bg-[#f3ede3] border border-[#C8973A]/30 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <TimeChip label="Decorating Access" time={autoTimes.decorateTime} />
            <TimeChip label="Event Starts" time={form.event_time} />
            <TimeChip label="Event Ends" time={autoTimes.eventEnd} />
          </div>
        )}
      </Card>

      {/* Contact Information */}
      <Card title="Your Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required>
            <input className={inputCls} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
          </Field>
          <Field label="Last Name" required>
            <input className={inputCls} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
          </Field>
          <Field label="Email Address" required>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </Field>
          <Field label="Phone Number" required>
            <input type="tel" className={inputCls} value={form.phone} onChange={(e) => set('phone', formatPhoneNumber(e.target.value))} required />
          </Field>
          <Field label="Company / Organization">
            <input className={inputCls} value={form.company} onChange={(e) => set('company', e.target.value)} />
          </Field>
          <Field label="How did you hear about us?">
            <input className={inputCls} value={form.referral_source} onChange={(e) => set('referral_source', e.target.value)} placeholder="Google, referral, Instagram…" />
          </Field>
        </div>
      </Card>

      {/* Catering */}
      <Card title="Catering">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Estimated Guest Count" required>
            <input type="number" min="1" className={inputCls} value={form.guest_count} onChange={(e) => set('guest_count', e.target.value)} required />
          </Field>
          <Field label="Catering Package">
            <select className={inputCls} value={form.package_id} onChange={(e) => set('package_id', e.target.value)}>
              <option value="">— not sure yet —</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — ${p.price_per_guest}/guest</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Food Notes / Allergies / Dietary Restrictions">
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={form.food_notes}
            onChange={(e) => set('food_notes', e.target.value)}
            placeholder="Please list any allergies, dietary restrictions, or special food requests…"
          />
        </Field>
      </Card>

      {/* Bar */}
      <Card title="Bar & Beverage">
        <Field label="Bar Tab Preference">
          <select
            className={inputCls}
            value={form.bar_tab_type}
            onChange={(e) => set('bar_tab_type', e.target.value)}
          >
            <option value="">— not sure yet —</option>
            <option value="Pre-Paid Drink Ticket(s)">BAR TAB | Pre-Paid Drink Ticket(s)</option>
            <option value="By Consumption">BAR TAB | By Consumption</option>
            <option value="Individual Tabs">BAR TAB | Individual Tabs</option>
          </select>
        </Field>

        {form.bar_tab_type && (
          <p className="text-sm text-gray-500 italic">{BAR_TAB_DESCRIPTIONS[form.bar_tab_type]}</p>
        )}

        {form.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && (
          <Field label="Estimated Number of Drink Tickets">
            <input type="number" min="0" className={inputCls} value={form.drink_tickets} onChange={(e) => set('drink_tickets', e.target.value)} />
          </Field>
        )}
      </Card>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-xl bg-[#C8973A] hover:bg-[#b07d2e] text-white font-semibold text-sm transition-colors disabled:opacity-60"
      >
        {saving ? 'Submitting…' : 'Submit Event Request'}
      </button>

      <p className="text-center text-xs text-gray-400">
        Submitting this form does not guarantee a reservation. Our team will confirm availability and follow up with next steps.
      </p>
    </form>
  )
}

const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8973A]/50 focus:border-[#C8973A]'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 space-y-4">
      <h2 className="text-xs font-bold tracking-widest uppercase text-[#C8973A]">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function TimeChip({ label, time }: { label: string; time: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-widest text-[#C8973A]/70 font-semibold mb-0.5">{label}</p>
      <p className="text-sm font-bold text-[#1F3348]">{to12Hour(time)}</p>
    </div>
  )
}
