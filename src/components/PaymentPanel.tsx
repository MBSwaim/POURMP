'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { PaymentStatusBadge } from './StatusBadge'
import { formatCurrency } from '@/lib/calculations'
import type { Payment } from '@/lib/db'
import { toast } from 'sonner'

interface Props {
  payments: Payment[]
  onUpdate: () => void
}

export function PaymentPanel({ payments, onUpdate }: Props) {
  const [loading, setLoading] = useState<number | null>(null)

  async function markPaid(payment: Payment) {
    setLoading(payment.id)
    try {
      await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payment.id,
          amount_paid: payment.amount_due,
          paid_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'paid',
        }),
      })
      toast.success('Payment marked as paid')
      onUpdate()
    } catch {
      toast.error('Failed to update payment')
    } finally {
      setLoading(null)
    }
  }

  if (payments.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No payments generated yet. Confirm the event to auto-generate deposit and final payment.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {payments.map((p) => (
        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium capitalize">{p.payment_type}</span>
              <PaymentStatusBadge status={p.status} />
            </div>
            <div className="text-sm text-gray-400 mt-0.5">
              Due: {p.due_date} · {formatCurrency(p.amount_due)}
              {p.paid_date && ` · Paid ${p.paid_date}`}
            </div>
          </div>
          {p.status !== 'paid' && (
            <Button
              size="sm"
              variant="outline"
              className="border-green-500 text-green-400 hover:bg-green-500/10"
              onClick={() => markPaid(p)}
              disabled={loading === p.id}
            >
              Mark Paid
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
