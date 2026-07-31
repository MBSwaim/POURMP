'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { BeoHighlights } from '@/lib/beoParse'
import { to12Hour } from '@/lib/timeUtils'

interface MatchCandidate {
  eventId: number
  eventName: string
  eventDate: string
  status: string
  clientName: string
  orderNumber: string | null
  reason: string
  score: number
}

type ImportResult =
  | {
      status: 'attached' | 'created'
      event: { id: number; event_name: string; event_date: string; status: string }
      highlights: BeoHighlights
      applied?: boolean
      matchReason?: string
    }
  | {
      status: 'needs_choice'
      highlights: BeoHighlights
      candidates: MatchCandidate[]
      filename: string
    }

function HighlightChip({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="text-xs">
      <span className="text-gray-500">{label}: </span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}

export function DashboardBeoDrop() {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [choice, setChoice] = useState<Extract<ImportResult, { status: 'needs_choice' }> | null>(null)
  const [success, setSuccess] = useState<Extract<ImportResult, { status: 'attached' | 'created' }> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function sendFile(file: File, extra?: Record<string, string>) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('apply', '1')
      if (extra) {
        for (const [k, v] of Object.entries(extra)) form.append(k, v)
      }
      const res = await fetch('/api/beo/import', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')

      if (data.status === 'needs_choice') {
        setPendingFile(file)
        setChoice(data)
        setSuccess(null)
        toast.message('BEO scraped — pick the matching event')
        return
      }

      setChoice(null)
      setPendingFile(null)
      setSuccess(data)
      toast.success(
        data.status === 'created'
          ? `Created event “${data.event.event_name}” from BEO`
          : `BEO attached to “${data.event.event_name}”`
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setUploading(false)
      setDragOver(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Please drop a PDF Banquet Event Order')
      return
    }
    setSuccess(null)
    void sendFile(file)
  }

  async function attachTo(eventId: number) {
    if (!pendingFile) return
    await sendFile(pendingFile, { eventId: String(eventId) })
  }

  async function createNew() {
    if (!pendingFile) return
    await sendFile(pendingFile, { create: '1' })
  }

  const h = choice?.highlights ?? success?.highlights

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C8973A]">Toast BEO</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Drop a Banquet Event Order PDF here. POURMP scrapes the highlights, attaches them to the matching event, and shows them on that event&apos;s Overview.
          </p>
        </div>
      </div>

      <div
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false) }}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) handleFile(file)
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg px-4 py-7 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-[#C8973A] bg-[#C8973A]/5'
            : 'border-gray-300 hover:border-[#C8973A]/60 bg-gray-50/50'
        } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        <p className="text-sm text-gray-800 font-medium">
          {uploading ? 'Uploading & matching…' : 'Drag a BEO PDF here, or click to browse'}
        </p>
        <p className="text-xs text-gray-500 mt-1">PDF only · max 15 MB · matches by order #, date, or contact</p>
      </div>

      {h && (
        <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
          <HighlightChip label="Event" value={h.eventName} />
          <HighlightChip label="Date" value={h.eventDate} />
          <HighlightChip label="Starts" value={h.startTime ? to12Hour(h.startTime) : null} />
          <HighlightChip label="Guests" value={h.guestCount} />
          <HighlightChip label="Space" value={h.space} />
          <HighlightChip label="Order #" value={h.orderNumber} />
          <HighlightChip label="Contact" value={h.contactName} />
          <HighlightChip label="Bar" value={h.barTabType} />
          <HighlightChip label="Tickets" value={h.drinkTickets} />
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-green-900">
              {success.status === 'created' ? 'Event created from BEO' : 'BEO attached to event'}
            </p>
            <p className="text-xs text-green-800 truncate">
              {success.event.event_date} · {success.event.event_name} · {success.event.status}
            </p>
          </div>
          <Link
            href={`/events/${success.event.id}`}
            className="inline-flex h-7 items-center rounded-lg bg-[#C8973A] hover:bg-[#C8973A]/80 text-white px-2.5 text-[0.8rem] font-medium shrink-0"
          >
            Open event →
          </Link>
        </div>
      )}

      {choice && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {choice.candidates.length ? 'Match to an event' : 'No matching event found'}
          </p>
          {choice.candidates.length > 0 && (
            <ul className="space-y-1.5">
              {choice.candidates.slice(0, 8).map(c => (
                <li key={c.eventId}>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => attachTo(c.eventId)}
                    className="w-full text-left rounded-lg border border-gray-200 hover:border-[#C8973A] hover:bg-[#C8973A]/5 px-3 py-2 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {c.eventDate} · {c.eventName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {c.clientName || 'No client'} · {c.status}
                      {c.orderNumber ? ` · Order #${c.orderNumber}` : ''}
                      {' · '}
                      {c.reason === 'order_number' ? 'Order # match' : c.reason === 'date_contact' ? 'Date + contact' : 'Date / name'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" disabled={uploading} onClick={createNew}>
              Create new event from BEO
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={uploading}
              onClick={() => { setChoice(null); setPendingFile(null) }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
