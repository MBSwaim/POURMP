import { subMinutes, addDays, format } from 'date-fns'
import {
  getActiveReservationsForAlerts, getActiveEventsForAlerts, getNotifications,
  createNotificationIfNew, getStaffMembers, getChecklist, getEventDetails,
  getReservation, getEventRiskAssessment, getOperationalDashboard, getOverdueFinalBalanceEvents,
  type Reservation, type Notification,
} from './db'
import { deliverNotification } from './notifyDelivery'

// Condition-based alerts reuse the same 14-day window as the Dashboard's "High Bar
// Impact Events" KPI and the Risk Scanner's own windows — not re-derived here.
const CONDITION_ALERT_WINDOW_DAYS = 14

const DEFAULT_RESERVATION_OFFSET_MINS = 120
const DEFAULT_EVENT_OFFSETS: Record<string, number> = { setup: 240, kitchen: 120, final: 30 }

const ALERT_KEY_MAP: Record<string, string> = {
  setup: 'setup_checklist',
  kitchen: 'kitchen_prep',
  final: 'final_readiness',
}

// Pre-event checklist items only (kept in sync with ChecklistClient.tsx's CHECKLIST_ITEMS; excludes 'Teardown' phase since it happens after the event).
const PRE_EVENT_CHECKLIST_KEYS = ['tablecloths', 'menus', 'ropes', 'lights_music', 'garage_door', 'tv', 'buffet_hot', 'buffet_equip']

/** Computes and persists any newly-due alerts. Idempotent — safe to call on every poll. */
export function generateAlerts(): void {
  const now = new Date()

  for (const r of getActiveReservationsForAlerts()) {
    const offset = r.alert_offset_mins ?? DEFAULT_RESERVATION_OFFSET_MINS
    const triggerAt = subMinutes(new Date(`${r.reservation_date}T${r.reservation_time}`), offset)
    if (now >= triggerAt) {
      const created = createNotificationIfNew('reservation', r.id, 'reservation_reminder', triggerAt.toISOString())
      if (created) deliverNotification(buildReservationPayload(r))
    }
  }

  for (const e of getActiveEventsForAlerts()) {
    if (!e.event_date || !e.event_time) continue
    let overrides: Record<string, number> = {}
    try { overrides = JSON.parse(e.alert_offsets_json || '{}') } catch { /* malformed json, ignore */ }
    const offsets = { ...DEFAULT_EVENT_OFFSETS, ...overrides }
    for (const [key, mins] of Object.entries(offsets)) {
      const triggerAt = subMinutes(new Date(`${e.event_date}T${e.event_time}`), mins)
      if (now >= triggerAt) {
        const alertKey = ALERT_KEY_MAP[key] ?? key
        const created = createNotificationIfNew('event', e.id, alertKey, triggerAt.toISOString())
        if (created) deliverNotification(buildEventPayload(e.id, alertKey))
      }
    }
  }

  // Condition-based alerts (not time-offset) — reuse the Risk Scanner and Operational
  // Dashboard's existing computations rather than re-deriving any threshold a third time.
  const nowIso = now.toISOString()
  const windowEnd = format(addDays(now, CONDITION_ALERT_WINDOW_DAYS), 'yyyy-MM-dd')

  for (const ev of getEventRiskAssessment().events) {
    if (ev.risks.some(r => r.category === 'Deposit Risk')) {
      const created = createNotificationIfNew('event', ev.id, 'deposit_overdue', nowIso)
      if (created) deliverNotification(buildEventPayload(ev.id, 'deposit_overdue'))
    }
    if (ev.risks.some(r => r.category === 'Menu Deadline Risk')) {
      const created = createNotificationIfNew('event', ev.id, 'menu_due', nowIso)
      if (created) deliverNotification(buildEventPayload(ev.id, 'menu_due'))
    }
    // Some risk categories (Guest Count, Main Bar Load, Policy Conflict) have no date
    // gating of their own — window this alert to match the Dashboard's "High Risk
    // Events" KPI so it doesn't fire for events months out.
    if ((ev.highestLevel === 'High' || ev.highestLevel === 'Critical') && ev.event_date <= windowEnd) {
      const created = createNotificationIfNew('event', ev.id, 'high_risk', nowIso)
      if (created) deliverNotification(buildEventPayload(ev.id, 'high_risk'))
    }
  }

  for (const ev of getOverdueFinalBalanceEvents()) {
    const created = createNotificationIfNew('event', ev.id, 'final_balance_overdue', nowIso)
    if (created) deliverNotification(buildEventPayload(ev.id, 'final_balance_overdue'))
  }

  const ops = getOperationalDashboard()
  for (const ev of ops.highBarImpact.filter(e => e.event_date <= windowEnd)) {
    const created = createNotificationIfNew('event', ev.id, 'high_bar_impact', nowIso)
    if (created) deliverNotification(buildEventPayload(ev.id, 'high_bar_impact'))
  }
  for (const ev of ops.needsAttention) {
    const created = createNotificationIfNew('event', ev.id, 'incomplete_tasks', nowIso)
    if (created) deliverNotification(buildEventPayload(ev.id, 'incomplete_tasks'))
  }
}

export interface NotificationFeedItem extends Notification {
  title: string
  subtitle: string
  bullets: string[]
  actionHref?: string
}

/** Assembles live display content for every notification row, joined with current entity data. */
export function getNotificationFeed(): { pending: NotificationFeedItem[]; completed: NotificationFeedItem[] } {
  const all = getNotifications()
  const items = all.map(describeNotification).filter((n): n is NotificationFeedItem => n !== null)
  const pending = items.filter(i => i.status === 'pending').sort((a, b) => a.trigger_at.localeCompare(b.trigger_at))
  const cutoff = subMinutes(new Date(), 7 * 24 * 60).toISOString()
  const completed = items
    .filter(i => i.status === 'completed' && (i.completed_at ?? '') >= cutoff)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
  return { pending, completed }
}

function describeNotification(n: Notification): NotificationFeedItem | null {
  if (n.entity_type === 'reservation') {
    const r = getReservation(n.entity_id)
    if (!r) return null
    return {
      ...n,
      title: `Table Reservation — ${r.client_name}`,
      subtitle: `${r.reservation_date} at ${r.reservation_time}`,
      bullets: [
        `Party size: ${r.party_size || '—'}`,
        `Table(s): ${formatTableNumbers(r.table_numbers) || 'not yet assigned'}`,
        r.notes ? `Notes: ${r.notes}` : 'No special notes',
      ],
      actionHref: '/reservations',
    }
  }

  const details = getEventDetails(n.entity_id)
  const eventLabel = `Private Event #${n.entity_id}`
  if (n.alert_key === 'setup_checklist') {
    const checklist = getChecklist(n.entity_id)
    const done = PRE_EVENT_CHECKLIST_KEYS.filter(k => checklist[k]).length
    return {
      ...n,
      title: eventLabel,
      subtitle: '4 Hours Out — Setup Checklist',
      bullets: [`Setup checklist: ${done}/${PRE_EVENT_CHECKLIST_KEYS.length} done`],
      actionHref: `/prep/checklist?eventId=${n.entity_id}`,
    }
  }
  if (n.alert_key === 'kitchen_prep') {
    const unverified = !details?.toast_deposit_received_date || !details?.toast_final_payment_date
    return {
      ...n,
      title: eventLabel,
      subtitle: '2 Hours Out — Kitchen Prep + Payment + BEO',
      bullets: [
        details?.kitchen_notes ? `Kitchen notes: ${details.kitchen_notes}` : 'No kitchen notes on file',
        unverified ? '⚠ Payment not yet marked received in Toast' : '✓ Payment marked received in Toast',
        details?.beo_notes ? `BEO notes: ${details.beo_notes}` : 'No BEO notes on file',
      ],
      actionHref: `/prep/beo?eventId=${n.entity_id}`,
    }
  }
  if (n.alert_key === 'final_readiness') {
    return {
      ...n,
      title: eventLabel,
      subtitle: '30 Minutes Out — FOH + Bar + Final Check',
      bullets: [
        details?.foh_notes ? `FOH notes: ${details.foh_notes}` : 'No FOH notes on file',
        details?.bar_notes ? `Bar notes: ${details.bar_notes}` : 'No bar notes on file',
      ],
      actionHref: `/events/${n.entity_id}`,
    }
  }
  if (n.alert_key === 'deposit_overdue') {
    return {
      ...n,
      title: eventLabel,
      subtitle: 'Deposit Overdue',
      bullets: ['Event is within 7 days and no deposit has been marked received in Toast.', 'Follow up with the client and confirm/mark it received in Toast.'],
      actionHref: `/events/${n.entity_id}`,
    }
  }
  if (n.alert_key === 'final_balance_overdue') {
    return {
      ...n,
      title: eventLabel,
      subtitle: 'Final Balance Overdue',
      bullets: ['Event has passed and final payment has not been marked received in Toast.', 'Confirm with Toast and mark it received.'],
      actionHref: `/events/${n.entity_id}`,
    }
  }
  if (n.alert_key === 'menu_due') {
    return {
      ...n,
      title: eventLabel,
      subtitle: 'Menu Selection Due',
      bullets: ['No catering package selected yet, and the event is within 14 days.'],
      actionHref: `/events/${n.entity_id}`,
    }
  }
  if (n.alert_key === 'high_risk') {
    return {
      ...n,
      title: eventLabel,
      subtitle: 'High Risk Flagged',
      bullets: ['This event has one or more High/Critical risk flags — check the Risk Scanner Summary in its Leads Pack.'],
      actionHref: `/events/${n.entity_id}`,
    }
  }
  if (n.alert_key === 'high_bar_impact') {
    return {
      ...n,
      title: eventLabel,
      subtitle: 'High Main Bar Impact',
      bullets: ['This event is expected to have a High or Critical impact on the main bar — give the bar team a heads-up.'],
      actionHref: `/events/${n.entity_id}`,
    }
  }
  if (n.alert_key === 'incomplete_tasks') {
    return {
      ...n,
      title: eventLabel,
      subtitle: 'Incomplete Tasks — Event Imminent',
      bullets: ['This event starts soon and task execution is behind — check Setup/Breakdown/Dynamic tasks.'],
      actionHref: `/events/${n.entity_id}`,
    }
  }
  return null
}

function formatTableNumbers(csv: string): string {
  return csv ? csv.split(',').map((s) => s.trim()).filter(Boolean).join(', ') : ''
}

function buildReservationPayload(r: Reservation) {
  const staff = r.assigned_staff_id ? getStaffMembers(false).find(s => s.id === r.assigned_staff_id) : null
  const tables = r.table_numbers ? `table(s) ${formatTableNumbers(r.table_numbers)}` : 'tables not yet assigned'
  return {
    message: `Reservation reminder: ${r.client_name}, party of ${r.party_size}, ${tables} — ${r.reservation_date} ${r.reservation_time}`,
    recipientPhone: staff?.phone || '',
    recipientEmail: staff?.email || '',
  }
}

function buildEventPayload(eventId: number, alertKey: string) {
  return {
    message: `Private event #${eventId} alert due: ${alertKey}`,
    recipientPhone: '',
    recipientEmail: '',
  }
}
