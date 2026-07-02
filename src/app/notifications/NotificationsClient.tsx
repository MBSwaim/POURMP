'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { NotificationRow, type NotificationFeedItem } from '@/components/NotificationRow'

const POLL_MS = 45_000

export function NotificationsClient() {
  const [pending, setPending] = useState<NotificationFeedItem[]>([])
  const [completed, setCompleted] = useState<NotificationFeedItem[]>([])
  const [showCompleted, setShowCompleted] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setPending(data.pending ?? [])
      setCompleted(data.completed ?? [])
    } catch { /* keep last known state on a transient failure */ }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [])

  async function complete(id: number) {
    const item = pending.find((p) => p.id === id)
    setPending((prev) => prev.filter((p) => p.id !== id))
    if (item) setCompleted((prev) => [{ ...item, status: 'completed', completed_at: new Date().toISOString() }, ...prev])
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
    load()
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[#1F3348] border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500">Pending ({pending.length})</p>
        </div>
        {pending.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">No pending alerts</div>
        ) : (
          <div className="divide-y divide-white/5">
            {pending.map((item) => (
              <NotificationRow key={item.id} item={item} onComplete={complete} onMarkReserved={markReserved} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-[#1F3348]/50 border border-white/10 overflow-hidden">
        <button
          onClick={() => setShowCompleted((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500">
            Completed — Last 7 Days ({completed.length})
          </p>
          <span className={`text-[10px] transition-transform ${showCompleted ? 'rotate-90' : ''}`}>▶</span>
        </button>
        {showCompleted && (
          completed.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500 border-t border-white/8">Nothing completed yet</div>
          ) : (
            <div className="divide-y divide-white/5 border-t border-white/8">
              {completed.map((item) => (
                <NotificationRow key={item.id} item={item} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
