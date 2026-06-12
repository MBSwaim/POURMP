'use client'
import { useState } from 'react'
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink,
} from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { calcAllItems, formatCurrency } from '@/lib/calculations'
import { DEPOSIT_PCT, FINAL_PCT } from '@/lib/constants'
import { format } from 'date-fns'
import type { Event, Client, EventDetails, Payment, AddOn, MenuItem, Package } from '@/lib/db'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1F3348' },
  header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#C8973A', paddingBottom: 10 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1F3348', letterSpacing: 1 },
  subtitle: { fontSize: 11, color: '#C8973A', marginTop: 2 },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1F3348', marginTop: 16, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingBottom: 3 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 140, color: '#666', fontSize: 9 },
  value: { flex: 1 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#C8973A', paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'right' },
  col3: { flex: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#C8973A' },
  bold: { fontFamily: 'Helvetica-Bold' },
  small: { fontSize: 8, color: '#666' },
  policy: { fontSize: 8, color: '#555', marginTop: 6, lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 6, fontSize: 8, color: '#999', flexDirection: 'row', justifyContent: 'space-between' },
})

interface ProposalData {
  event: Event
  client: Client | null
  details: EventDetails | null
  payments: Payment[]
  addOns: AddOn[]
  menuItems: MenuItem[]
  pkg: Package | null
  generalInfo: string
  cancellationPolicy: string
  contact: string
}

function ProposalDocument({ data }: { data: ProposalData }) {
  const { event, client, details, payments, addOns, menuItems, pkg } = data
  const guestCount = details?.guest_count ?? 0
  const bufferPct = details?.buffer_pct ?? 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calculated = pkg ? calcAllItems(menuItems as any, guestCount, bufferPct) : []
  const foodSubtotal = guestCount * (pkg?.price_per_guest ?? 0)
  const addOnsTotal = addOns.reduce((s, a) => s + a.qty * a.price_each, 0)
  const total = foodSubtotal + addOnsTotal
  const deposit = payments.find((p) => p.payment_type === 'deposit')
  const final = payments.find((p) => p.payment_type === 'final')

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>MANHATTAN PROJECT BEER CO.</Text>
          <Text style={styles.subtitle}>Private Event Proposal</Text>
        </View>

        {/* Event Info */}
        <Text style={styles.sectionTitle}>EVENT DETAILS</Text>
        <View style={styles.row}><Text style={styles.label}>Event Name</Text><Text style={styles.value}>{event.event_name}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Client</Text><Text style={styles.value}>{client?.first_name} {client?.last_name}{client?.company ? ` · ${client.company}` : ''}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Date</Text><Text style={styles.value}>{event.event_date}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Time</Text><Text style={styles.value}>{event.event_time}{event.setup_time ? ` (Setup: ${event.setup_time})` : ''}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Location / Space</Text><Text style={styles.value}>{event.space || '—'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Guest Count</Text><Text style={styles.value}>{guestCount}</Text></View>

        {/* Package */}
        {pkg && (
          <>
            <Text style={styles.sectionTitle}>CATERING PACKAGE</Text>
            <View style={styles.row}><Text style={styles.label}>Package</Text><Text style={[styles.value, styles.bold]}>{pkg.name}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Price Per Guest</Text><Text style={styles.value}>{formatCurrency(pkg.price_per_guest)}</Text></View>

            <View style={{ marginTop: 8 }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.col1, styles.bold]}>Item</Text>
                <Text style={[styles.col2, styles.bold]}>Qty</Text>
                <Text style={[styles.col3, styles.bold]}>Unit</Text>
              </View>
              {calculated.map((item, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.col1}>{item.item_name}</Text>
                  <Text style={styles.col2}>{typeof item.total_qty === 'string' ? item.total_qty : String(item.total_qty)}</Text>
                  <Text style={styles.col3}>{item.unit_name}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Bar */}
        {(details?.drink_tickets || details?.bar_tab_limit || details?.tab_details) && (
          <>
            <Text style={styles.sectionTitle}>BAR & BEVERAGE</Text>
            {details.drink_tickets ? <View style={styles.row}><Text style={styles.label}>Drink Tickets</Text><Text style={styles.value}>{details.drink_tickets}</Text></View> : null}
            {details.bar_tab_limit ? <View style={styles.row}><Text style={styles.label}>Bar Tab Limit</Text><Text style={styles.value}>{formatCurrency(details.bar_tab_limit)}</Text></View> : null}
            {details.tab_details ? <View style={styles.row}><Text style={styles.label}>Details</Text><Text style={styles.value}>{details.tab_details}</Text></View> : null}
          </>
        )}

        {/* Pricing */}
        <Text style={styles.sectionTitle}>PRICING SUMMARY</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.col1, styles.bold]}>Description</Text>
          <Text style={[styles.col3, styles.bold]}>Amount</Text>
        </View>
        {pkg && (
          <View style={styles.tableRow}>
            <Text style={styles.col1}>{pkg.name} ({guestCount} guests × {formatCurrency(pkg.price_per_guest)})</Text>
            <Text style={styles.col3}>{formatCurrency(foodSubtotal)}</Text>
          </View>
        )}
        {addOns.map((a) => (
          <View key={a.id} style={styles.tableRow}>
            <Text style={styles.col1}>{a.item_name} ({a.qty} {a.unit})</Text>
            <Text style={styles.col3}>{formatCurrency(a.qty * a.price_each)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={[styles.col1, styles.bold]}>Total</Text>
          <Text style={[styles.col3, styles.bold]}>{formatCurrency(total)}</Text>
        </View>
        {deposit && (
          <View style={styles.tableRow}>
            <Text style={styles.col1}>Deposit (20%) — Due {deposit.due_date}</Text>
            <Text style={styles.col3}>{formatCurrency(deposit.amount_due)}</Text>
          </View>
        )}
        {final && (
          <View style={styles.tableRow}>
            <Text style={styles.col1}>Balance (80%) — Due {final.due_date}</Text>
            <Text style={styles.col3}>{formatCurrency(final.amount_due)}</Text>
          </View>
        )}
        {!deposit && !final && total > 0 && (
          <>
            <View style={styles.tableRow}>
              <Text style={styles.col1}>Deposit (20%) — Due 7 days prior</Text>
              <Text style={styles.col3}>{formatCurrency(total * DEPOSIT_PCT)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.col1}>Balance (80%) — Due day of event</Text>
              <Text style={styles.col3}>{formatCurrency(total * FINAL_PCT)}</Text>
            </View>
          </>
        )}

        {/* Policies */}
        <Text style={styles.sectionTitle}>GENERAL INFORMATION</Text>
        <Text style={styles.policy}>{data.generalInfo}</Text>

        <Text style={styles.sectionTitle}>CANCELLATION POLICY</Text>
        <Text style={styles.policy}>{data.cancellationPolicy}</Text>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{data.contact}</Text>
          <Text>Generated {format(new Date(), 'MMM d, yyyy')}</Text>
        </View>
      </Page>
    </Document>
  )
}

export function ProposalDownloadButton({ eventId }: { eventId: number }) {
  const [data, setData] = useState<ProposalData | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    if (data) return
    setLoading(true)
    try {
      const res = await fetch(`/api/proposals/${eventId}`)
      setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  if (!data) {
    return (
      <Button
        variant="outline"
        className="border-[#C8973A] text-[#C8973A] hover:bg-[#C8973A]/10"
        onClick={load}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Generate Proposal PDF'}
      </Button>
    )
  }

  const fileName = `MPBC_Proposal_${data.client?.last_name ?? 'Client'}_${data.event.event_date}.pdf`

  return (
    <PDFDownloadLink document={<ProposalDocument data={data} />} fileName={fileName}>
      {({ loading: pdfLoading }) => (
        <Button
          variant="outline"
          className="border-[#C8973A] text-[#C8973A] hover:bg-[#C8973A]/10"
        >
          {pdfLoading ? 'Building PDF...' : 'Download Proposal PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  )
}

