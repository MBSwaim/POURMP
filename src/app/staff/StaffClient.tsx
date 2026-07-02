'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPhoneNumber } from '@/lib/phone'
import type { StaffMember } from '@/lib/db'

const EMPTY_FORM = { name: '', phone: '', email: '' }

export function StaffClient({ initialStaff }: { initialStaff: StaffMember[] }) {
  const [staff, setStaff] = useState(initialStaff)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const { id } = await res.json()
      setStaff((prev) => [...prev, { ...form, id, active: 1, created_at: new Date().toISOString() }])
      setForm(EMPTY_FORM)
      setShowForm(false)
      toast.success('Staff member added')
    } catch {
      toast.error('Failed to add staff member')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(s: StaffMember) {
    const active = s.active ? 0 : 1
    await fetch(`/api/staff/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    setStaff((prev) => prev.map((m) => m.id === s.id ? { ...m, active } : m))
  }

  async function remove(id: number) {
    if (!confirm('Remove this staff member?')) return
    await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    setStaff((prev) => prev.filter((m) => m.id !== id))
    toast.success('Staff member removed')
  }

  return (
    <div className="space-y-5">
      <Button onClick={() => setShowForm((v) => !v)} className="bg-[#C8973A] hover:bg-[#b07d2e] text-white">
        {showForm ? 'Cancel' : '+ Add Staff Member'}
      </Button>

      {showForm && (
        <div className="rounded-xl border border-[#C8973A]/30 bg-[#1F3348]/60 p-5">
          <h2 className="text-base font-semibold text-[#C8973A] mb-4">New Staff Member</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Name<span className="text-red-400 ml-1">*</span></Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Phone</Label>
                <Input type="tel" value={form.phone} onChange={(e) => set('phone', formatPhoneNumber(e.target.value))} placeholder="(555) 000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving} className="bg-[#C8973A] hover:bg-[#b07d2e] text-white">
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {staff.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#1F3348]/30 p-10 text-center text-gray-400">
          No staff members yet.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1F3348] border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Name</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Phone</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Email</th>
                <th className="px-4 py-3 text-left text-gray-300 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {staff.map((s, i) => (
                <tr key={s.id} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-[#1F3348]/20' : ''} hover:bg-white/5`}>
                  <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                  <td className="px-4 py-3 text-gray-400">{s.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{s.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${s.active ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/30 text-gray-500'}`}>
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleActive(s)} className="text-xs text-gray-400 hover:text-white transition-colors">
                        {s.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button onClick={() => remove(s.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
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
