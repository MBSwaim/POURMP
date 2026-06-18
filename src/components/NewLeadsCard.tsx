'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import type { Lead } from '@/lib/db'

export function NewLeadsCard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const router = useRouter()

  async function dismiss(id: number) {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Reviewed' }),
      })
      router.refresh()
    } catch {
      toast.error('Failed to update lead')
    }
  }

  async function convertToEvent(lead: Lead) {
    router.push(
      `/events/new?first_name=${encodeURIComponent(lead.first_name)}&last_name=${encodeURIComponent(lead.last_name)}&email=${encodeURIComponent(lead.email)}&phone=${encodeURIComponent(lead.phone)}&event_date=${encodeURIComponent(lead.event_date)}&guest_count=${lead.guest_count}&lead_id=${lead.id}`
    )
  }

  return (
    <div className="rounded-xl bg-[#1F3348] border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-400">New Leads</p>
        {leads.length > 0 && (
          <span className="text-xs font-semibold bg-[#C8973A] text-white rounded-full px-2 py-0.5">
            {leads.length}
          </span>
        )}
        <Link href="/leads" className="ml-auto text-xs text-gray-500 hover:text-[#C8973A] transition-colors">
          View all →
        </Link>
      </div>

      {/* Body */}
      {leads.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500 text-center italic">No new leads</p>
      ) : (
        <div>
          {leads.map((lead, i) => (
            <div
              key={lead.id}
              className={`px-4 py-3 ${i < leads.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-white">
                      {lead.first_name} {lead.last_name}
                    </p>
                    {lead.event_date && (
                      <span className="text-xs text-gray-400">{lead.event_date}</span>
                    )}
                    {lead.guest_count > 0 && (
                      <span className="text-xs text-gray-400">{lead.guest_count} guests</span>
                    )}
                    {lead.event_type && (
                      <span className="text-xs text-gray-400 truncate">{lead.event_type}</span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-0.5 text-xs text-gray-500">
                    {lead.email && <span>{lead.email}</span>}
                    {lead.phone && <span>{lead.phone}</span>}
                  </div>
                  {lead.message && (
                    <p className="mt-1 text-xs text-gray-500 italic line-clamp-1">{lead.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => convertToEvent(lead)}
                    className="text-xs px-2.5 py-1 rounded-md bg-[#C8973A] text-white font-medium hover:bg-[#b07d2e] transition-colors"
                  >
                    Create Event
                  </button>
                  <button
                    onClick={() => dismiss(lead.id)}
                    className="text-xs px-2.5 py-1 rounded-md border border-white/15 text-gray-400 hover:bg-white/5 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
