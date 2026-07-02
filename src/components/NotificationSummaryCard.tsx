'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { NotificationRow, type NotificationFeedItem } from './NotificationRow'

const POLL_MS = 45_000

export function NotificationSummaryCard() {
  const [pending, setPending] = useState<NotificationFeedItem[]>([])
  const [loaded, setLoaded] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setPending(data.pending ?? [])
    } catch { /* keep last known state on a transient failure */ }
    finally { setLoaded(true) }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [])

  async function complete(id: number) {
    setPending((prev) => prev.filter((p) => p.id !== id))
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    toast.success('Alert marked complete')
  }

  async function markReserved(entityId: number) {
    setPending((prev) => prev.filter((p) => !(p.entity_type === 'reservation' && p.entity_id === entityId)))
    await fetch(`/api/reservations/${entityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tables_assigned_at: new Date().toISOString() }),
    })
    toast.success('Tables marked reserved')
  }

  if (!loaded || pending.length === 0) {
    return (
      <div className="rounded-xl bg-[#1F3348] border border-white/10 px-4 py-3.5 flex items-center justify-between">
        <p className="text-sm text-gray-400">{loaded ? 'No pending alerts' : 'Loading alerts…'}</p>
        <Link href="/notifications" className="text-xs text-[#C8973A] hover:underline shrink-0">
          Notification Center →
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[#1F3348] border border-[#C8973A]/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C8973A]">
          {pending.length} Pending Alert{pending.length === 1 ? '' : 's'}
        </p>
        <Link href="/notifications" className="text-xs text-gray-400 hover:text-white transition-colors">
          View All →
        </Link>
      </div>
      <div className="divide-y divide-white/5">
        {pending.slice(0, 3).map((item) => (
          <NotificationRow key={item.id} item={item} onComplete={complete} onMarkReserved={markReserved} />
        ))}
      </div>
    </div>
  )
}
