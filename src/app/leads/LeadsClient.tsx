'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import type { Lead } from '@/lib/db'

const STATUS_FILTERS = ['All', 'New', 'Reviewed', 'Converted'] as const
type Filter = typeof STATUS_FILTERS[number]

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  'New':       { bg: 'bg-[#C8973A]/20', text: 'text-[#C8973A]' },
  'Reviewed':  { bg: 'bg-gray-600/30',  text: 'text-gray-400'  },
  'Converted': { bg: 'bg-green-600/20', text: 'text-green-400' },
}

export function LeadsClient({ leads: initialLeads }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const [filter, setFilter] = useState<Filter>('All')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const router = useRouter()

  const filtered = filter === 'All' ? leads : leads.filter(l => l.status === filter)
  const newCount = leads.filter(l => l.status === 'New').length

  function toggleExpanded(id: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function markReviewed(id: number) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: 'Reviewed' } : l))
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Reviewed' }),
      })
    } catch {
      toast.error('Failed to update lead')
      setLeads(initialLeads)
    }
  }

  async function deleteLead(id: number) {
    if (!window.confirm('Delete this lead? This cannot be undone.')) return
    setLeads(prev => prev.filter(l => l.id !== id))
    try {
      await fetch(`/api/leads/${id}`, { method: 'DELETE' })
      toast.success('Lead deleted')
    } catch {
      toast.error('Failed to delete lead')
      setLeads(initialLeads)
    }
  }

  function createEvent(lead: Lead) {
    const params = new URLSearchParams({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      event_date: lead.event_date ?? '',
      guest_count: String(lead.guest_count ?? ''),
      lead_id: String(lead.id),
    })
    router.push(`/events/new?${params.toString()}`)
  }

  function formatReceived(iso: string) {
    try { return format(new Date(iso), 'MMM d, yyyy') } catch { return iso }
  }

  return (
    <div className="space-y-4">
      {/* Summary + filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-[#1F3348]/60 rounded-lg p-1 border border-white/10">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-colors
                ${filter === f
                  ? 'bg-[#C8973A] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              {f}
              {f === 'New' && newCount > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold
                  ${filter === 'New' ? 'bg-white/20 text-white' : 'bg-[#C8973A]/20 text-[#C8973A]'}`}>
                  {newCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">{filtered.length} {filtered.length === 1 ? 'lead' : 'leads'}</span>
      </div>

      {/* Lead cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#1F3348]/30 py-12 text-center text-gray-500 text-sm">
          No {filter === 'All' ? '' : filter.toLowerCase() + ' '}leads.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lead => {
            const styles = STATUS_STYLES[lead.status] ?? STATUS_STYLES['Reviewed']
            const isExpanded = expanded.has(lead.id)
            const hasLongMessage = (lead.message?.length ?? 0) > 120

            return (
              <div
                key={lead.id}
                className="rounded-xl border border-white/10 bg-[#1F3348]/50 px-4 py-3 space-y-2"
              >
                {/* Row 1: name + status */}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">
                    {lead.first_name} {lead.last_name}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.bg} ${styles.text}`}>
                    {lead.status}
                  </span>
                </div>

                {/* Row 2: contact */}
                {(lead.email || lead.phone) && (
                  <div className="flex gap-4 text-xs text-gray-400">
                    {lead.email && <span>{lead.email}</span>}
                    {lead.phone && <span>{lead.phone}</span>}
                  </div>
                )}

                {/* Row 3: event details */}
                {(lead.event_date || lead.event_type || lead.guest_count > 0) && (
                  <div className="flex gap-3 flex-wrap text-xs text-gray-300">
                    {lead.event_date && (
                      <span className="flex items-center gap-1">
                        <span className="text-gray-500">Date</span> {lead.event_date}
                      </span>
                    )}
                    {lead.guest_count > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="text-gray-500">Guests</span> {lead.guest_count}
                      </span>
                    )}
                    {lead.event_type && (
                      <span className="flex items-center gap-1">
                        <span className="text-gray-500">Type</span> {lead.event_type}
                      </span>
                    )}
                  </div>
                )}

                {/* Row 4: message */}
                {lead.message && (
                  <div className="text-xs text-gray-400 italic leading-relaxed">
                    {isExpanded || !hasLongMessage
                      ? lead.message
                      : lead.message.slice(0, 120) + '…'}
                    {hasLongMessage && (
                      <button
                        onClick={() => toggleExpanded(lead.id)}
                        className="ml-1.5 text-[#C8973A] hover:underline not-italic"
                      >
                        {isExpanded ? 'less' : 'more'}
                      </button>
                    )}
                  </div>
                )}

                {/* Row 5: footer — received + actions */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                  <span className="text-xs text-gray-500">
                    Received {formatReceived(lead.created_at)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => createEvent(lead)}
                      className="h-7 px-2.5 text-xs bg-[#C8973A] hover:bg-[#C8973A]/80 text-white"
                    >
                      Create Event
                    </Button>
                    {lead.status === 'New' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markReviewed(lead.id)}
                        className="h-7 px-2.5 text-xs border-white/20 text-gray-300 hover:bg-white/5"
                      >
                        Mark Reviewed
                      </Button>
                    )}
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors px-1"
                      title="Delete lead"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
