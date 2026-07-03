'use client'
import { STATUS_COLORS, PAYMENT_STATUS_COLORS } from '@/lib/constants'

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'bg-gray-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-gray-900 ${color}`}>
      {status}
    </span>
  )
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const color = PAYMENT_STATUS_COLORS[status] ?? 'bg-gray-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-gray-900 ${color}`}>
      {status}
    </span>
  )
}
