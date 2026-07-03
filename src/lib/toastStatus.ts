// Toast Status Tracker — a manual mirror of where an event stands in Toast
// Catering & Events. Toast remains the system of record for proposals, invoices,
// and payments; this just tracks completion so staff don't have to check Toast
// to answer "have we sent the invoice yet?"

export interface ToastStatusFields {
  toast_proposal_sent_date: string | null
  toast_confirmed_date: string | null
  toast_invoice_sent_date: string | null
  toast_deposit_received_date: string | null
  toast_final_payment_date: string | null
}

export const TOAST_STAGES: Array<{ key: keyof ToastStatusFields; label: string }> = [
  { key: 'toast_proposal_sent_date',    label: 'Proposal Sent' },
  { key: 'toast_confirmed_date',        label: 'Confirmed' },
  { key: 'toast_invoice_sent_date',     label: 'Invoice Sent' },
  { key: 'toast_deposit_received_date', label: 'Deposit Received' },
  { key: 'toast_final_payment_date',    label: 'Final Payment Complete' },
]

export function toastStageCompletion(fields: ToastStatusFields): { done: number; total: number } {
  const done = TOAST_STAGES.filter(s => !!fields[s.key]).length
  return { done, total: TOAST_STAGES.length }
}
