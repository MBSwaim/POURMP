'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/calculations'
import type { Package } from '@/lib/db'

interface Settings {
  general_info: string
  cancellation_policy: string
  contact: string
}

interface Props {
  initialSettings: Settings
  initialPackages: Package[]
}

export function SettingsClient({ initialSettings, initialPackages }: Props) {
  const [settings, setSettings] = useState(initialSettings)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [packages, setPackages] = useState(initialPackages)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; price_per_guest: string; description: string }>({ name: '', price_per_guest: '', description: '' })
  const [pkgSaving, setPkgSaving] = useState(false)
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', price_per_guest: '', description: '' })

  async function saveSetting(key: keyof Settings) {
    setSavingKey(key)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: settings[key] }),
      })
      toast.success('Saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSavingKey(null)
    }
  }

  function startEdit(pkg: Package) {
    setEditingId(pkg.id)
    setEditForm({ name: pkg.name, price_per_guest: String(pkg.price_per_guest), description: pkg.description ?? '' })
  }

  async function savePackageEdit(id: string) {
    setPkgSaving(true)
    try {
      const payload = { name: editForm.name, price_per_guest: Number(editForm.price_per_guest), description: editForm.description }
      await fetch(`/api/packages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setPackages(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p))
      setEditingId(null)
      toast.success('Package updated')
    } catch {
      toast.error('Failed to update package')
    } finally {
      setPkgSaving(false)
    }
  }

  async function toggleActive(pkg: Package) {
    const newActive = pkg.active ? 0 : 1
    try {
      await fetch(`/api/packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive }),
      })
      setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, active: newActive } : p))
      toast.success(newActive ? 'Package reactivated' : 'Package deactivated')
    } catch {
      toast.error('Failed to update package')
    }
  }

  async function createPackage() {
    if (!newForm.name || !newForm.price_per_guest) {
      toast.error('Name and price are required')
      return
    }
    setPkgSaving(true)
    const id = newForm.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    try {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newForm.name, price_per_guest: Number(newForm.price_per_guest), description: newForm.description }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed')
      }
      setPackages(prev => [...prev, { id, name: newForm.name, price_per_guest: Number(newForm.price_per_guest), description: newForm.description, active: 1 }])
      setNewForm({ name: '', price_per_guest: '', description: '' })
      setAddingNew(false)
      toast.success('Package created')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create package')
    } finally {
      setPkgSaving(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Contact Info */}
      <SettingsCard title="Business Contact" description="Appears in the footer of every proposal PDF.">
        <div className="space-y-2">
          <Input
            value={settings.contact}
            onChange={e => setSettings(s => ({ ...s, contact: e.target.value }))}
            placeholder="Name | email | phone"
            className="text-sm"
          />
          <SaveButton onClick={() => saveSetting('contact')} loading={savingKey === 'contact'} />
        </div>
      </SettingsCard>

      {/* Proposal Policies */}
      <SettingsCard title="Proposal Policies" description="Text included in every proposal PDF. Changes apply to the next generated proposal.">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-widest">General Information</label>
            <Textarea
              value={settings.general_info}
              onChange={e => setSettings(s => ({ ...s, general_info: e.target.value }))}
              rows={4}
              className="text-sm resize-none"
            />
            <SaveButton onClick={() => saveSetting('general_info')} loading={savingKey === 'general_info'} />
          </div>
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-widest">Cancellation Policy</label>
            <Textarea
              value={settings.cancellation_policy}
              onChange={e => setSettings(s => ({ ...s, cancellation_policy: e.target.value }))}
              rows={4}
              className="text-sm resize-none"
            />
            <SaveButton onClick={() => saveSetting('cancellation_policy')} loading={savingKey === 'cancellation_policy'} />
          </div>
        </div>
      </SettingsCard>

      {/* Package Management */}
      <SettingsCard title="Catering Packages" description="Active packages appear in the event package dropdown. Deactivated packages remain on existing events but cannot be selected for new ones.">
        <div className="space-y-2">
          {packages.map(pkg => (
            <div key={pkg.id} className="rounded-lg border border-white/10 overflow-hidden">

              {/* Package row */}
              <div className="flex items-center gap-3 px-3 py-2.5 bg-white/5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{pkg.name}</span>
                    <span className="text-xs text-gray-400 tabular-nums">{formatCurrency(pkg.price_per_guest)}/guest</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                      ${pkg.active ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/30 text-gray-500'}`}>
                      {pkg.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-600 font-mono">{pkg.id}</span>
                  </div>
                  {pkg.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{pkg.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => editingId === pkg.id ? setEditingId(null) : startEdit(pkg)}
                    className="text-xs px-2.5 py-1 rounded-md border border-white/15 text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    {editingId === pkg.id ? 'Cancel' : 'Edit'}
                  </button>
                  <button
                    onClick={() => toggleActive(pkg)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors
                      ${pkg.active
                        ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                        : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}
                  >
                    {pkg.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>

              {/* Inline edit form */}
              {editingId === pkg.id && (
                <div className="px-3 py-3 bg-[#0f1e2d]/50 border-t border-white/10 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Package Name</label>
                      <Input
                        value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Price per Guest ($)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.price_per_guest}
                        onChange={e => setEditForm(f => ({ ...f, price_per_guest: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Description</label>
                    <Textarea
                      value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => savePackageEdit(pkg.id)}
                    disabled={pkgSaving}
                    className="bg-[#C8973A] hover:bg-[#C8973A]/80 text-white"
                  >
                    {pkgSaving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Add new package */}
          {!addingNew ? (
            <button
              onClick={() => setAddingNew(true)}
              className="w-full rounded-lg border border-dashed border-white/20 py-2.5 text-sm text-gray-400 hover:border-[#C8973A]/50 hover:text-[#C8973A] transition-colors"
            >
              + Add Package
            </button>
          ) : (
            <div className="rounded-lg border border-white/10 px-3 py-3 bg-[#0f1e2d]/50 space-y-2">
              <p className="text-xs font-bold tracking-widest uppercase text-[#C8973A]">New Package</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Package Name</label>
                  <Input
                    value={newForm.name}
                    onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Premium Plated"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Price per Guest ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newForm.price_per_guest}
                    onChange={e => setNewForm(f => ({ ...f, price_per_guest: e.target.value }))}
                    placeholder="0.00"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Description (optional)</label>
                <Textarea
                  value={newForm.description}
                  onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="text-sm resize-none"
                  placeholder="Brief description of what's included"
                />
              </div>
              {newForm.name && (
                <p className="text-xs text-gray-600">
                  ID: <span className="font-mono text-gray-500">
                    {newForm.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}
                  </span>
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={createPackage}
                  disabled={pkgSaving}
                  className="bg-[#C8973A] hover:bg-[#C8973A]/80 text-white"
                >
                  {pkgSaving ? 'Creating…' : 'Create Package'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setAddingNew(false); setNewForm({ name: '', price_per_guest: '', description: '' }) }}
                  className="border-white/20 text-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

    </div>
  )
}

function SettingsCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1F3348]/50 p-4">
      <div className="mb-3">
        <h2 className="text-xs font-bold tracking-widest uppercase text-[#C8973A]">{title}</h2>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function SaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      disabled={loading}
      className="bg-[#C8973A] hover:bg-[#C8973A]/80 text-white"
    >
      {loading ? 'Saving…' : 'Save'}
    </Button>
  )
}
