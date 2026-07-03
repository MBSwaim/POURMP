import { calcFloorPlan } from './calculations'

// Event Risk Scanner — a read-only intelligence layer over existing event data.
// It does not alter Toast status, the Task system, Event Readiness, or Main Bar
// Impact — it only reads their outputs (or the same raw fields they read) and
// applies a separate set of operational-risk rules on top. Kept in its own file,
// mirroring the calcReadiness / calcBarImpact / calcTaskComplexity pattern: pure
// functions in, data array out, no DB access here (db.ts assembles the input).

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical'

export type RiskCategory =
  | 'Deposit Risk'
  | 'Menu Deadline Risk'
  | 'Guest Count Risk'
  | 'Shared Space Risk'
  | 'Main Bar Load Risk'
  | 'Task Completion Risk'
  | 'Floor Plan Risk'
  | 'Policy Conflict Risk'
  | 'Dessert Logistics Risk'
  | 'Child Supervision Risk'

export interface RiskFlag {
  category: RiskCategory
  level: RiskLevel
  message: string
  action: string
}

// Everything the rules need, pre-computed by the caller (db.ts) from raw event data —
// this function does no date math and no DB reads, so it stays trivially testable/auditable.
export interface RiskScanInput {
  isBooked: boolean            // status is Tentative or Confirmed
  guestCount: number
  hasPackage: boolean          // a catering package/menu has been selected
  depositReceived: boolean     // toast_deposit_received_date is set
  barImpactLevel: string       // output of calcBarImpact — read, not recomputed here
  floorPlanNotesPresent: boolean
  dessertExpected: boolean
  kidsAttending: boolean
  otherActiveEventsSameDate: number
  hasTaskData: boolean         // event_tasks rows exist for this event
  setupIncomplete: number
  operationallyReady: boolean
  noteText: string             // concatenation of free-text note fields, for keyword scans
  withinDepositWindow: boolean      // event_date within 7 days
  withinMenuDeadlineWindow: boolean // event_date within 14 days
  within24Hours: boolean            // event within the next 24 hours (or today)
}

// ─── Policy Conflict keyword rules ──────────────────────────────────────────────
// MP has no structured field for "outside vendor requested," "capped bar," etc. —
// these only ever show up as free text in staff notes. This is a best-effort keyword
// scan, not a guarantee; it can miss phrasing it doesn't recognize and should not be
// treated as authoritative the way a real intake field would be.
const POLICY_CONFLICT_RULES: Array<{ label: string; pattern: RegExp; action: string }> = [
  {
    label: 'an outside vendor/caterer',
    pattern: /outside (vendor|caterer|catering|food truck)/i,
    action: 'Confirm with the client that MP is the exclusive caterer — outside vendors are not permitted.',
  },
  {
    label: 'live entertainment',
    pattern: /\b(dj|live band|live music|live entertainment|performer|performance)\b/i,
    action: 'Clarify with the client that outside entertainment/performers are not permitted per MP policy.',
  },
  {
    label: 'a capped bar request',
    pattern: /capp?ed bar|bar cap\b/i,
    action: 'Review the requested bar structure with ownership — MP does not offer a capped bar option.',
  },
  {
    label: 'outside alcohol',
    pattern: /outside alcohol|\bbyob\b|bring(?:ing)? (their|his|her|own) (own )?(alcohol|wine|beer|liquor)/i,
    action: 'Remind the client that outside alcohol is not permitted under any circumstances.',
  },
]

export function scanEventRisks(input: RiskScanInput): RiskFlag[] {
  const flags: RiskFlag[] = []

  // 1. Deposit Risk
  if (input.isBooked && input.withinDepositWindow && !input.depositReceived) {
    flags.push({
      category: 'Deposit Risk',
      level: 'High',
      message: 'Event is within 7 days and no deposit has been marked received in Toast.',
      action: 'Follow up with the client for deposit payment and confirm/mark it received in Toast.',
    })
  }

  // 2. Menu Deadline Risk
  if (input.isBooked && input.withinMenuDeadlineWindow && !input.hasPackage) {
    flags.push({
      category: 'Menu Deadline Risk',
      level: input.withinDepositWindow ? 'High' : 'Moderate',
      message: 'Event is within 14 days and no catering package/menu has been selected.',
      action: 'Confirm the catering package and menu selections with the client before the deadline.',
    })
  }

  // 3. Guest Count Risk — reuses calcFloorPlan's existing 50/75 thresholds rather than
  // re-declaring them, so this can never drift from the floor plan tool's own numbers.
  const floorPlan = calcFloorPlan(input.guestCount)
  if (floorPlan.isOverCapacity) {
    flags.push({
      category: 'Guest Count Risk',
      level: 'Critical',
      message: `Guest count of ${input.guestCount} exceeds the 75-guest total capacity limit.`,
      action: 'Escalate to ownership immediately — do not confirm setup until capacity is resolved.',
    })
  } else if (floorPlan.warningLevel === 'caution') {
    flags.push({
      category: 'Guest Count Risk',
      level: 'Moderate',
      message: `Guest count of ${input.guestCount} exceeds 50 seated — near capacity.`,
      action: 'Reconfirm final guest count with the client at least 72 hours before the event.',
    })
  }

  // 4. Shared Space Risk — "may be shared" is read from real scheduling data (another
  // active event booked the same date), not a guess from a free-text space label.
  if (input.guestCount > 0 && input.guestCount < 30 && input.otherActiveEventsSameDate > 0) {
    flags.push({
      category: 'Shared Space Risk',
      level: 'Low',
      message: `Guest count is under 30 and ${input.otherActiveEventsSameDate} other event(s) are booked the same day — production space may need to be shared.`,
      action: 'Confirm space allocation and timing with the other booked event(s) to avoid overlap.',
    })
  }

  // 5. Main Bar Load Risk — reads calcBarImpact's result, does not recompute it.
  if (input.barImpactLevel === 'Critical') {
    flags.push({
      category: 'Main Bar Load Risk',
      level: 'Critical',
      message: 'Main Bar Impact is rated Critical for this event.',
      action: 'Give the main bar a heads-up well in advance and confirm adequate staff coverage.',
    })
  } else if (input.barImpactLevel === 'High') {
    flags.push({
      category: 'Main Bar Load Risk',
      level: 'High',
      message: 'Main Bar Impact is rated High for this event.',
      action: 'Notify main bar staff in advance and confirm coverage.',
    })
  }

  // 6. Task Completion Risk — only evaluated once task data actually exists for the
  // event, so an event nobody has opened yet isn't falsely flagged (or silently
  // auto-generated — this scanner never writes to the Task system).
  if (input.isBooked && input.hasTaskData && input.within24Hours && input.setupIncomplete > 0 && !input.operationallyReady) {
    flags.push({
      category: 'Task Completion Risk',
      level: 'Critical',
      message: `Event is within 24 hours, ${input.setupIncomplete} setup task(s) remain incomplete, and operational readiness is not complete.`,
      action: 'Complete outstanding setup tasks immediately or reassign staff to close the gap before the event starts.',
    })
  }

  // 7. Floor Plan Risk
  if (input.isBooked && !input.floorPlanNotesPresent) {
    flags.push({
      category: 'Floor Plan Risk',
      level: input.withinDepositWindow ? 'High' : 'Moderate',
      message: 'No floor plan has been finalized for this event.',
      action: 'Finalize and document the floor plan before the event date.',
    })
  }

  // 8. Policy Conflict Risk — one flag per distinct conflict type detected in notes.
  for (const rule of POLICY_CONFLICT_RULES) {
    if (rule.pattern.test(input.noteText)) {
      flags.push({
        category: 'Policy Conflict Risk',
        level: 'High',
        message: `A note mentions ${rule.label}, which conflicts with MP standards.`,
        action: rule.action,
      })
    }
  }

  // 9. Dessert Logistics Risk
  if (input.dessertExpected && !/plate|utensil|cutlery|fork|napkin|clean ?up/i.test(input.noteText)) {
    flags.push({
      category: 'Dessert Logistics Risk',
      level: 'Low',
      message: 'Dessert is expected but no note confirms host-supplied plates/utensils or cleanup responsibility.',
      action: 'Confirm with the host whether plates/utensils are supplied and who handles dessert cleanup.',
    })
  }

  // 10. Child Supervision Risk — flags whenever kids are attending, consistent with the
  // existing dyn_kids task (lib/tasks.ts), which treats patio supervision as the default
  // concern for this venue whenever children attend.
  if (input.kidsAttending) {
    flags.push({
      category: 'Child Supervision Risk',
      level: 'High',
      message: 'Children are attending — patio supervision applies per venue policy.',
      action: 'Confirm the supervision plan and patio access rules with the client and staff ahead of the event.',
    })
  }

  return flags
}

export const RISK_LEVEL_RANK: Record<RiskLevel, number> = { Low: 1, Moderate: 2, High: 3, Critical: 4 }

export function highestRiskLevel(flags: RiskFlag[]): RiskLevel {
  return flags.reduce<RiskLevel>((max, f) => (RISK_LEVEL_RANK[f.level] > RISK_LEVEL_RANK[max] ? f.level : max), 'Low')
}

// Same 4-tier bg-50/text-700/border-200 convention as COMPLEXITY_COLORS (lib/tasks.ts)
// and IMPACT_COLORS (lib/barImpact.ts) — kept visually consistent, not reinvented.
export const RISK_LEVEL_COLORS: Record<RiskLevel, { bg: string; text: string; border: string; dot: string }> = {
  Low:      { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-400'  },
  Moderate: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-400' },
  High:     { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
  Critical: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-400'    },
}
