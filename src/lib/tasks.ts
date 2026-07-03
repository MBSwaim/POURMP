import { calcFloorPlan } from './calculations'

// Internal Task Management — modular, event-driven task generation.
// Each event gets Setup + Breakdown tasks (always) plus Dynamic tasks
// (only when the triggering condition is true for that event). Rules are
// data, not code branches, so adding a new dynamic task is a one-line entry.

export type TaskRole = 'Lead' | 'FOH' | 'Kitchen' | 'Bar'
export type TaskCategory = 'Setup' | 'Breakdown' | 'Dynamic'

export const TASK_ROLES: TaskRole[] = ['Lead', 'FOH', 'Kitchen', 'Bar']

export interface TaskTemplate {
  key: string
  category: TaskCategory
  role: TaskRole
  label: string
}

// Context a rule can key off of. Callers compute bar impact / floor plan
// upstream (they already need those for other features) and pass the result
// in, rather than this module reaching into calculations.ts/barImpact.ts itself.
export interface TaskContext {
  guestCount: number
  hasPackage: boolean
  packageCount: number
  barTabType?: string | null
  drinkTickets?: number | null
  bigScreenTv?: number | boolean | null
  kidsAttending?: number | boolean | null
  dessertExpected?: number | boolean | null
  dietaryRestrictions?: string | null
  barImpactLevel?: string | null
}

interface TaskRule {
  key: string
  category: TaskCategory
  role: TaskRole
  condition: (ctx: TaskContext) => boolean
  label: (ctx: TaskContext) => string
}

const TASK_RULES: TaskRule[] = [
  // ── Setup (always generated) ──────────────────────────────────────────
  { key: 'setup_production_close', category: 'Setup', role: 'Lead',    condition: () => true, label: () => 'Close off production space' },
  { key: 'setup_tables_chairs',    category: 'Setup', role: 'FOH',     condition: () => true, label: () => 'Tables and chairs set per floor plan' },
  { key: 'setup_linens',           category: 'Setup', role: 'FOH',     condition: () => true, label: () => 'Linens placed' },
  { key: 'setup_prep_station',     category: 'Setup', role: 'Kitchen', condition: () => true, label: () => 'Buffet/prep station positioned and ready' },
  { key: 'setup_trash',            category: 'Setup', role: 'FOH',     condition: () => true, label: () => 'Trash can with liner placed' },
  { key: 'setup_signage',          category: 'Setup', role: 'FOH',     condition: () => true, label: () => 'Signage placed at entrance' },
  { key: 'setup_confirm_host',     category: 'Setup', role: 'Lead',    condition: () => true, label: () => 'Confirm floor plan and guest count with host' },
  { key: 'setup_bar_station',      category: 'Setup', role: 'Bar',     condition: () => true, label: () => 'Bar station set up per beverage option' },

  // ── Breakdown (always generated) ──────────────────────────────────────
  { key: 'breakdown_last_call',    category: 'Breakdown', role: 'Bar',     condition: () => true, label: () => 'Last call called, bar closed' },
  { key: 'breakdown_clear_tables', category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Clear all tables and chairs' },
  { key: 'breakdown_linens',       category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Remove and bag linens' },
  { key: 'breakdown_reset_layout', category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Reset tables/high-tops to standard layout' },
  { key: 'breakdown_trash',        category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Trash checked and replaced' },
  { key: 'breakdown_sweep',        category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Sweep / spot clean floor' },
  { key: 'breakdown_buffet_clear', category: 'Breakdown', role: 'Kitchen', condition: () => true, label: () => 'Food service and buffet areas cleared' },
  { key: 'breakdown_equipment',    category: 'Breakdown', role: 'Kitchen', condition: () => true, label: () => 'Remaining catering equipment removed and cleaned' },
  { key: 'breakdown_production',   category: 'Breakdown', role: 'Kitchen', condition: () => true, label: () => 'Production space returned to standard configuration' },
  { key: 'breakdown_walkthrough',  category: 'Breakdown', role: 'Lead',    condition: () => true, label: () => 'Final event walkthrough completed' },

  // ── Dynamic (only when the condition is true for this event) ─────────
  { key: 'dyn_dessert',         category: 'Dynamic', role: 'FOH',     condition: ctx => !!ctx.dessertExpected,
    label: () => 'Set up dessert station area (host-provided cake/cupcakes)' },
  { key: 'dyn_drink_tickets',   category: 'Dynamic', role: 'Bar',     condition: ctx => ctx.barTabType === 'Pre-Paid Drink Ticket(s)' && (ctx.drinkTickets ?? 0) > 0,
    label: ctx => `Prep and stage ${ctx.drinkTickets} drink tickets for host distribution` },
  { key: 'dyn_tv_hdmi',         category: 'Dynamic', role: 'FOH',     condition: ctx => !!ctx.bigScreenTv,
    label: () => 'Set up TV and test HDMI connection' },
  { key: 'dyn_kids',            category: 'Dynamic', role: 'Lead',    condition: ctx => !!ctx.kidsAttending,
    label: () => 'Post patio supervision reminder — kids attending' },
  { key: 'dyn_buffet',          category: 'Dynamic', role: 'Kitchen', condition: ctx => ctx.hasPackage,
    label: () => 'Prep chafers and place buffet signage' },
  { key: 'dyn_individual_tabs', category: 'Dynamic', role: 'Bar',     condition: ctx => ctx.barTabType === 'Individual Tabs',
    label: () => 'Brief bar staff: individual tabs — no food charges on guest tabs' },
  { key: 'dyn_by_consumption',  category: 'Dynamic', role: 'Bar',     condition: ctx => ctx.barTabType === 'By Consumption',
    label: () => 'Open host tab in Toast at event start' },
  { key: 'dyn_high_bar_impact', category: 'Dynamic', role: 'Lead',    condition: ctx => ctx.barImpactLevel === 'High' || ctx.barImpactLevel === 'Critical',
    label: ctx => `Give main bar a heads-up — ${ctx.barImpactLevel} impact expected` },
  { key: 'dyn_large_group',     category: 'Dynamic', role: 'FOH',     condition: ctx => ctx.guestCount >= 50,
    label: () => 'Confirm floor plan capacity and signage for large group' },
  { key: 'dyn_dietary',         category: 'Dynamic', role: 'Kitchen', condition: ctx => !!ctx.dietaryRestrictions?.trim(),
    label: ctx => `Confirm dietary accommodations with kitchen: ${ctx.dietaryRestrictions}` },
  { key: 'dyn_over_capacity',   category: 'Dynamic', role: 'Lead',    condition: ctx => calcFloorPlan(ctx.guestCount).isOverCapacity,
    label: () => 'ESCALATE — guest count exceeds capacity, confirm with owner before setup' },
  { key: 'dyn_multi_package',   category: 'Dynamic', role: 'Kitchen', condition: ctx => ctx.packageCount > 1,
    label: () => 'Confirm prep timing across multiple packages' },
]

export function generateTasksForEvent(ctx: TaskContext): TaskTemplate[] {
  return TASK_RULES
    .filter(rule => rule.condition(ctx))
    .map(rule => ({ key: rule.key, category: rule.category, role: rule.role, label: rule.label(ctx) }))
}

// Dynamic task keys treated as safety/escalation-level rather than routine logistics —
// used by the Operational Dashboard's Task Awareness "Needs Attention" flag. Keyed off
// TaskRule.key (stored as event_tasks.source_key), so no schema change is needed.
export const CRITICAL_DYNAMIC_TASK_KEYS: ReadonlySet<string> = new Set([
  'dyn_over_capacity', // guest count exceeds floor plan capacity — requires owner sign-off
  'dyn_dietary',       // dietary/allergy accommodation — guest safety
  'dyn_kids',          // child supervision reminder — guest safety
])

// ─── Task Complexity Rating ─────────────────────────────────────────────────

export type ComplexityLevel = 'Low' | 'Moderate' | 'High' | 'Heavy Reset'

export interface ComplexityResult {
  level: ComplexityLevel
  score: number
  factors: string[]
}

export function calcTaskComplexity(ctx: TaskContext, dynamicTaskCount: number): ComplexityResult {
  let score = 0
  const factors: string[] = []
  const guests = ctx.guestCount ?? 0

  if (guests >= 66)      { score += 4; factors.push(`Very large group (${guests} guests)`) }
  else if (guests >= 51) { score += 3; factors.push(`Large group (${guests} guests)`) }
  else if (guests >= 37) { score += 2; factors.push(`Medium-large group (${guests} guests)`) }
  else if (guests >= 20) { score += 1; factors.push(`Medium group (${guests} guests)`) }

  const floorPlan = calcFloorPlan(guests)
  if (floorPlan.warningLevel === 'danger') { score += 4; factors.push('Over capacity — floor plan escalation required') }
  else if (floorPlan.warningLevel === 'caution') { score += 2; factors.push('Near capacity — floor plan needs care') }

  if (ctx.barImpactLevel === 'Critical') { score += 3; factors.push('Critical main bar impact') }
  else if (ctx.barImpactLevel === 'High') { score += 2; factors.push('High main bar impact') }
  else if (ctx.barImpactLevel === 'Moderate') { score += 1; factors.push('Moderate main bar impact') }

  if (ctx.packageCount > 1) { score += 1; factors.push(`${ctx.packageCount} catering packages`) }
  if (ctx.bigScreenTv)      { score += 1; factors.push('AV / TV setup and teardown') }

  if (dynamicTaskCount >= 5)      { score += 2; factors.push(`${dynamicTaskCount} special requirements`) }
  else if (dynamicTaskCount >= 3) { score += 1; factors.push(`${dynamicTaskCount} special requirements`) }

  let level: ComplexityLevel
  if (score >= 10)     level = 'Heavy Reset'
  else if (score >= 7) level = 'High'
  else if (score >= 4) level = 'Moderate'
  else                 level = 'Low'

  return { level, score, factors }
}

export const COMPLEXITY_COLORS: Record<ComplexityLevel, { bg: string; text: string; border: string; dot: string }> = {
  Low:          { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-400'  },
  Moderate:     { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-400' },
  High:         { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
  'Heavy Reset':{ bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-400'    },
}

// For printable docs (white background) — same level → color mapping as IMPACT_PRINT_COLORS
export const COMPLEXITY_PRINT_COLORS: Record<ComplexityLevel, string> = {
  Low: '#15803d',
  Moderate: '#a16207',
  High: '#c2410c',
  'Heavy Reset': '#b91c1c',
}

// ─── Event Milestone Tracker ────────────────────────────────────────────────

export interface MilestoneProgress {
  category: TaskCategory
  total: number
  completed: number
  pct: number
}

export interface TaskLike {
  category: string
  completed: number | boolean
}

export function calcMilestones(tasks: TaskLike[]): MilestoneProgress[] {
  const categories: TaskCategory[] = ['Setup', 'Dynamic', 'Breakdown']
  return categories.map(category => {
    const inCategory = tasks.filter(t => t.category === category)
    const completed = inCategory.filter(t => !!t.completed).length
    const total = inCategory.length
    return { category, total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 100 }
  })
}
