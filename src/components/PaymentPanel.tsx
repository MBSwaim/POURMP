'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaymentStatusBadge } from './StatusBadge'
import { formatCurrency } from '@/lib/calculations'
import { DRINK_TICKET_PRICE } from '@/lib/constants'
import type { Payment, EventDetails, AddOn, Package } from '@/lib/db'
import { toast } from 'sonner'

interface Props {
  eventId: number
  payments: Payment[]
  details: EventDetails | null | undefined
  addOns: AddOn[]
  pkg: Package | null
  onUpdate: () => void
}

export function PaymentPanel({ eventId, payments, details, addOns, pkg, onUpdate }: Props) {
  const [loading, setLoading] = useState<number | null>(null)
  const [depositSaving, setDepositSaving] = useState(false)

  const deposit = payments.find(p => p.payment_type === 'deposit') ?? null
  const finalPayment = payments.find(p => p.payment_type === 'final') ?? null
  const otherPayments = payments.filter(p => p.payment_type !== 'deposit' && p.payment_type !== 'final')

  const [depositForm, setDepositForm] = useState({
    amount_due: deposit ? String(deposit.amount_due) : '',
    due_date: deposit?.due_date ?? '',
    paid_date: deposit?.paid_date ?? '',
    status: deposit?.status ?? 'pending',
  })

  useEffect(() => {
    const dep = payments.find(p => p.payment_type === 'deposit') ?? null
    setDepositForm({
      amount_due: dep ? String(dep.amount_due) : '',
      due_date: dep?.due_date ?? '',
      paid_date: dep?.paid_date ?? '',
      status: dep?.status ?? 'pending',
    })
  }, [payments])

  async function saveDeposit(form: typeof depositForm) {
    if (!form.amount_due || !form.due_date) {
      toast.error('Amount and due date are required')
      return
    }
    setDepositSaving(true)
    try {
      const amount = Number(form.amount_due)
      const payload = {
        amount_due: amount,
        amount_paid: form.status === 'paid' ? amount : (deposit?.amount_paid ?? 0),
        due_date: form.due_date,
        paid_date: form.paid_date || '',
        status: form.status,
      }
      if (deposit) {
        await fetch('/api/payments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: deposit.id, ...payload }),
        })
      } else {
        await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: eventId, payment_type: 'deposit', notes: '', ...payload }),
        })
      }
      toast.success('Deposit saved')
      onUpdate()
    } catch {
      toast.error('Failed to save deposit')
    } finally {
      setDepositSaving(false)
    }
  }

  async function markDepositPaid() {
    if (!depositForm.amount_due) {
      toast.error('Enter a deposit amount first')
      return
    }
    await saveDeposit({
      ...depositForm,
      paid_date: new Date().toISOString().slice(0, 10),
      status: 'paid',
    })
  }

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

  // Charges calculation — mirrors Overview financial summary
  const hasPackage = pkg && details?.guest_count
  const foodSub = hasPackage ? details.guest_count * pkg.price_per_guest : 0
  const ticketQty = details?.bar_tab_type === 'Pre-Paid Drink Ticket(s)' ? (details?.drink_tickets ?? 0) : 0
  const ticketSub = ticketQty * DRINK_TICKET_PRICE
  const addOnsSub = addOns.reduce((s, a) => s + a.qty * a.price_each, 0)
  const taxableBase = foodSub + addOnsSub
  const taxPct = details?.tax_pct ?? 0.0825
  const taxAmt = taxableBase * taxPct
  const gratuityBase = foodSub + ticketSub + addOnsSub
  const gratuityAmt = gratuityBase * (details?.gratuity_pct ?? 0)
  const serviceFee = details?.service_fee ?? 0
  const grandTotal = gratuityBase + taxAmt + gratuityAmt + serviceFee
  const totalCollected = payments.reduce((s, p) => s + (p.amount_paid ?? 0), 0)
  const balanceRemaining = grandTotal - totalCollected

  return (
    <div className="space-y-5">

      {/* Charges Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Charges Summary</h3>
        {!hasPackage ? (
          <p className="text-sm text-gray-500">No package or guest count set — add those in the Overview tab to see a summary.</p>
        ) : (
          <div className="space-y-1">
            <SummaryRow label="Food Subtotal" value={formatCurrency(foodSub)} />
            {addOnsSub > 0 && <SummaryRow label="Add-ons" value={formatCurrency(addOnsSub)} />}
            {ticketSub > 0 && (
              <SummaryRow
                label={`Drink Tickets (${ticketQty} × $${DRINK_TICKET_PRICE})`}
                value={formatCurrency(ticketSub)}
              />
            )}
            <SummaryRow label={`Tax (${(taxPct * 100).toFixed(2)}%)`} value={formatCurrency(taxAmt)} />
            {serviceFee > 0 && <SummaryRow label="Service Fee" value={formatCurrency(serviceFee)} />}
            {gratuityAmt > 0 && (
              <SummaryRow
                label={`Gratuity (${((details?.gratuity_pct ?? 0) * 100).toFixed(0)}%)`}
                value={formatCurrency(gratuityAmt)}
              />
            )}
            <div className="border-t border-gray-200 mt-2 pt-2 space-y-1">
              <SummaryRow label="Grand Total" value={formatCurrency(grandTotal)} bold />
              <SummaryRow label="Total Collected" value={formatCurrency(totalCollected)} highlight="green" />
              <SummaryRow
                label="Balance Remaining"
                value={formatCurrency(balanceRemaining)}
                highlight={balanceRemaining > 0 ? 'amber' : 'green'}
                bold
              />
            </div>
          </div>
        )}
      </div>

      {/* Deposit */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Deposit</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Amount ($)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={depositForm.amount_due}
                onChange={e => setDepositForm(f => ({ ...f, amount_due: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Status</label>
              <select
                value={depositForm.status}
                onChange={e => setDepositForm(f => ({ ...f, status: e.target.value }))}
                className="w-full h-8 bg-white border border-gray-300 rounded-md px-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C8973A]"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Due Date</label>
              <Input
                type="date"
                value={depositForm.due_date}
                onChange={e => setDepositForm(f => ({ ...f, due_date: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Paid Date</label>
              <Input
                type="date"
                value={depositForm.paid_date}
                onChange={e => setDepositForm(f => ({ ...f, paid_date: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => saveDeposit(depositForm)}
              disabled={depositSaving}
              className="bg-[#C8973A] hover:bg-[#C8973A]/80 text-white"
            >
              {depositSaving ? 'Saving…' : 'Save Deposit'}
            </Button>
            {depositForm.status !== 'paid' && (
              <Button
                size="sm"
                variant="outline"
                onClick={markDepositPaid}
                disabled={depositSaving}
                className="border-green-500/50 text-green-400 hover:bg-green-500/10"
              >
                Mark Paid
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Payment Records */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-[#C8973A] mb-3">Payment Records</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">
            No payments on file. Confirm the event to auto-generate deposit and final payment, or add a deposit above.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-3 pb-1 border-b border-gray-200 text-xs font-medium tracking-widest uppercase text-gray-500">
              <span>Type</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Due</span>
              <span className="text-right">Paid</span>
              <span className="text-right">Status</span>
            </div>
            {deposit && <PaymentRow payment={deposit} onMarkPaid={markPaid} loading={loading} />}
            {finalPayment && <PaymentRow payment={finalPayment} onMarkPaid={markPaid} loading={loading} />}
            {otherPayments.map(p => (
              <PaymentRow key={p.id} payment={p} onMarkPaid={markPaid} loading={loading} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

function PaymentRow({ payment: p, onMarkPaid, loading }: {
  payment: Payment
  onMarkPaid: (p: Payment) => void
  loading: number | null
}) {
  const isPaid = p.status === 'paid'
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center">
        <span className="text-sm font-medium capitalize text-gray-900">{p.payment_type}</span>
        <span className="text-sm text-gray-900 text-right tabular-nums">{formatCurrency(p.amount_due)}</span>
        <span className="text-sm text-gray-500 text-right whitespace-nowrap">{p.due_date || '—'}</span>
        <span className={`text-sm text-right whitespace-nowrap ${isPaid ? 'text-green-400' : 'text-gray-500'}`}>
          {p.paid_date || '—'}
        </span>
        <div className="flex items-center gap-2 justify-end">
          <PaymentStatusBadge status={p.status} />
          {!isPaid && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs border-green-500/50 text-green-400 hover:bg-green-500/10"
              onClick={() => onMarkPaid(p)}
              disabled={loading === p.id}
            >
              {loading === p.id ? '…' : 'Mark Paid'}
            </Button>
          )}
        </div>
      </div>
      {p.notes ? (
        <p className="text-xs text-gray-500 mt-1 pl-0.5">{p.notes}</p>
      ) : null}
    </div>
  )
}

function SummaryRow({ label, value, bold, highlight }: {
  label: string
  value: string
  bold?: boolean
  highlight?: 'green' | 'amber'
}) {
  const valueColor =
    highlight === 'green' ? 'text-green-400' :
    highlight === 'amber' ? 'text-[#C8973A]' :
    'text-gray-900'

  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
      <span className="text-gray-500">{label}</span>
      <span className={`tabular-nums ${valueColor}`}>{value}</span>
    </div>
  )
}
