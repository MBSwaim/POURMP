'use client'
import Link from 'next/link'

export interface NotificationFeedItem {
  id: number
  entity_type: 'reservation' | 'event'
  entity_id: number
  alert_key: string
  trigger_at: string
  status: 'pending' | 'completed'
  completed_at: string | null
  title: string
  subtitle: string
  bullets: string[]
  actionHref?: string
}

const ALERT_LABELS: Record<string, string> = {
  reservation_reminder: 'Reservation Reminder',
  setup_checklist: '4HR · Setup',
  kitchen_prep: '2HR · Kitchen',
  final_readiness: '30MIN · Final',
}

export function NotificationRow({ item, onComplete, onMarkReserved }: {
  item: NotificationFeedItem
  onComplete?: (id: number) => void
  onMarkReserved?: (entityId: number) => void
}) {
  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border bg-[#C8973A]/15 text-[#C8973A] border-[#C8973A]/30">
              {ALERT_LABELS[item.alert_key] ?? item.alert_key}
            </span>
            {item.actionHref && (
              <Link href={item.actionHref} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
                Open →
              </Link>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-1">{item.title}</p>
          <p className="text-xs text-gray-500">{item.subtitle}</p>
          <ul className="mt-1.5 space-y-0.5">
            {item.bullets.map((b, i) => (
              <li key={i} className="text-xs text-gray-500">{b}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {item.status === 'pending' && onComplete && (
            <button
              onClick={() => onComplete(item.id)}
              className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-[#C8973A] hover:text-white transition-colors whitespace-nowrap"
            >
              Mark Complete
            </button>
          )}
          {item.status === 'pending' && item.entity_type === 'reservation' && onMarkReserved && (
            <button
              onClick={() => onMarkReserved(item.entity_id)}
              className="text-xs px-2.5 py-1 rounded-md bg-[#C8973A]/15 text-[#C8973A] hover:bg-[#C8973A] hover:text-white transition-colors whitespace-nowrap"
            >
              Mark Reserved
            </button>
          )}
          {item.status === 'completed' && (
            <span className="text-[10px] text-gray-500 whitespace-nowrap">✓ Done</span>
          )}
        </div>
      </div>
    </div>
  )
}
