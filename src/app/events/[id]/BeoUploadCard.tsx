'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { BeoHighlights } from '@/lib/beoParse'
import { to12Hour } from '@/lib/timeUtils'

interface BeoUploadMeta {
  id: number
  event_id: number
  original_filename: string
  file_size: number
  uploaded_at: string
  highlights: BeoHighlights
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function HighlightRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex justify-between gap-3 text-sm py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  )
}

/** Event-page BEO panel — displays scraped highlights + download. Upload lives on the Dashboard. */
export function BeoUploadCard({
  eventId,
  locked,
  onApplied,
}: {
  eventId: number
  locked?: boolean
  onApplied?: () => void
}) {
  const [upload, setUpload] = useState<BeoUploadMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/beo`)
      const data = await res.json()
      setUpload(data.upload ?? null)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  async function replaceFile(file: File) {
    if (locked) return
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Please choose a PDF Banquet Event Order')
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('apply', '1')
      const res = await fetch(`/api/events/${eventId}/beo`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setUpload(data.upload)
      toast.success('BEO updated on this event')
      onApplied?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function applyHighlights() {
    setBusy(true)
    try {
      const res = await fetch(`/api/events/${eventId}/beo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Apply failed')
      toast.success('Empty event fields seeded from BEO')
      onApplied?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Apply failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeUpload() {
    if (!confirm('Remove the uploaded BEO PDF from this event?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/events/${eventId}/beo`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Delete failed')
      }
      setUpload(null)
      toast.success('BEO removed')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const h = upload?.highlights

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 col-span-2">
      <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-1">Toast BEO</h3>
      <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
        Highlights scraped from the Toast Banquet Event Order. Drop new BEOs on the Dashboard — they attach to the matching event automatically.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !upload ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/50 px-4 py-5 text-center space-y-2">
          <p className="text-sm text-gray-600">No BEO attached to this event yet.</p>
          <p className="text-xs text-gray-500">Import from the Dashboard, or attach a PDF here.</p>
          {!locked && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) replaceFile(file)
                }}
              />
              <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
                Attach BEO PDF
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{upload.original_filename}</p>
              <p className="text-xs text-gray-500">
                {formatBytes(upload.file_size)} · uploaded {new Date(upload.uploaded_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a
                href={`/api/events/${eventId}/beo/download`}
                download
                className="inline-flex h-7 items-center rounded-lg bg-[#C8973A] hover:bg-[#C8973A]/80 text-white px-2.5 text-[0.8rem] font-medium"
              >
                Download PDF
              </a>
              {!locked && (
                <>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) replaceFile(file)
                    }}
                  />
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
                    Replace
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={applyHighlights}>
                    Apply to empty fields
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={removeUpload} className="text-red-500 hover:text-red-600">
                    Remove
                  </Button>
                </>
              )}
            </div>
          </div>

          {h && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Event Highlights</p>
                <HighlightRow label="Event" value={h.eventName} />
                <HighlightRow label="Date" value={h.eventDate} />
                <HighlightRow label="Starts" value={h.startTime ? to12Hour(h.startTime) : null} />
                <HighlightRow label="Production Closes" value={h.productionCloseTime ? to12Hour(h.productionCloseTime) : null} />
                <HighlightRow label="Setup" value={h.setupTime ? to12Hour(h.setupTime) : null} />
                <HighlightRow label="Food Served" value={h.foodServedTime ? to12Hour(h.foodServedTime) : null} />
                <HighlightRow label="Guests" value={h.guestCount} />
                <HighlightRow label="Space" value={h.space} />
                <HighlightRow label="Order #" value={h.orderNumber} />
                <HighlightRow label="Toast" value={h.toastStatus} />
                <HighlightRow label="Dietary" value={h.dietaryRestrictions} />
                <HighlightRow label="Food Options" value={h.foodOptions} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Contact & Staff</p>
                <HighlightRow label="Name" value={h.contactName} />
                <HighlightRow label="Email" value={h.contactEmail} />
                <HighlightRow label="Phone" value={h.contactPhone} />
                <HighlightRow label="Event Lead" value={h.eventLead} />
                <HighlightRow label="Beertenders" value={h.assignedBeertenders} />
                <HighlightRow label="Drink Tickets" value={h.drinkTickets} />
                <HighlightRow label="Bar Tab" value={h.barTabType} />
                {h.menuItems?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Buffet</p>
                    <ul className="text-sm text-gray-800 space-y-0.5">
                      {h.menuItems.slice(0, 12).map((item) => (
                        <li key={item} className="before:content-['•'] before:mr-1.5 before:text-gray-400">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {h.orderLines?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Order lines</p>
                    <ul className="text-sm text-gray-800 space-y-0.5">
                      {h.orderLines.slice(0, 8).map((item) => (
                        <li key={item} className="before:content-['•'] before:mr-1.5 before:text-gray-400">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
