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
import { EVENT_STATUSES } from '@/lib/constants'
import type { Package, Client } from '@/lib/db'

interface Props {
  packages: Package[]
  clients: Client[]
}

export function NewEventForm({ packages, clients }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [useExistingClient, setUseExistingClient] = useState(false)

  const [form, setForm] = useState({
    event_name: '',
    event_date: '',
    event_time: '',
    setup_time: '',
    teardown_time: '',
    status: 'New',
    space: '',
    // client
    client_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    referral_source: '',
    // details
    guest_count: '',
    package_id: '',
    buffer_pct: '0',
    food_notes: '',
    dietary_restrictions: '',
    bar_tab_limit: '',
    drink_tickets: '',
    tab_details: '',
    staffing_notes: '',
    contract_signed: false,
  })

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const selectedPkg = packages.find((p) => p.id === form.package_id)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
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
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { id } = await res.json()
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
          <Field label="Event Name" required>
            <Input value={form.event_name} onChange={(e) => set('event_name', e.target.value)} required />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full bg-[#0f1e2d] border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
            >
              {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Event Date" required>
            <Input type="date" value={form.event_date} onChange={(e) => set('event_date', e.target.value)} required />
          </Field>
          <Field label="Event Time">
            <Input type="time" value={form.event_time} onChange={(e) => set('event_time', e.target.value)} />
          </Field>
          <Field label="Setup Time">
            <Input type="time" value={form.setup_time} onChange={(e) => set('setup_time', e.target.value)} />
          </Field>
          <Field label="Teardown Time">
            <Input type="time" value={form.teardown_time} onChange={(e) => set('teardown_time', e.target.value)} />
          </Field>
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
              className="w-full bg-[#0f1e2d] border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
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
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Company">
              <Input value={form.company} onChange={(e) => set('company', e.target.value)} />
            </Field>
            <Field label="Referral Source">
              <Input value={form.referral_source} onChange={(e) => set('referral_source', e.target.value)} placeholder="e.g. Google, Referral, Instagram" />
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
              className="w-full bg-[#0f1e2d] border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
            >
              <option value="">— select package —</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — ${p.price_per_guest}/guest</option>
              ))}
            </select>
          </Field>
          <Field label="Guest Count">
            <Input
              type="number" min="0"
              value={form.guest_count}
              onChange={(e) => set('guest_count', e.target.value)}
            />
          </Field>
          <Field label="Buffer %">
            <Input
              type="number" min="0" max="100"
              value={form.buffer_pct}
              onChange={(e) => set('buffer_pct', e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Food Notes" className="col-span-2">
            <Textarea value={form.food_notes} onChange={(e) => set('food_notes', e.target.value)} rows={2} />
          </Field>
          <Field label="Dietary Restrictions" className="col-span-2">
            <Textarea value={form.dietary_restrictions} onChange={(e) => set('dietary_restrictions', e.target.value)} rows={2} />
          </Field>
        </div>
        {form.package_id && Number(form.guest_count) > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
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
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bar Tab Limit ($)">
            <Input type="number" min="0" step="0.01" value={form.bar_tab_limit} onChange={(e) => set('bar_tab_limit', e.target.value)} />
          </Field>
          <Field label="Drink Tickets (#)">
            <Input type="number" min="0" value={form.drink_tickets} onChange={(e) => set('drink_tickets', e.target.value)} />
          </Field>
          <Field label="Tab Details" className="col-span-2">
            <Textarea value={form.tab_details} onChange={(e) => set('tab_details', e.target.value)} rows={2} />
          </Field>
        </div>
      </Section>

      {/* Section 5 — Operations */}
      <Section title="Operations">
        <div className="space-y-4">
          <Field label="Staffing Notes">
            <Textarea value={form.staffing_notes} onChange={(e) => set('staffing_notes', e.target.value)} rows={2} />
          </Field>
          <div className="flex items-center gap-2">
            <Checkbox
              id="contract"
              checked={form.contract_signed as boolean}
              onCheckedChange={(v) => set('contract_signed', Boolean(v))}
            />
            <Label htmlFor="contract" className="cursor-pointer">Contract Signed</Label>
          </div>
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
    <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-5 space-y-4">
      <h2 className="text-base font-semibold text-[#C8973A]">{title}</h2>
      {children}
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
