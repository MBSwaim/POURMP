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
  // ── Setup (always generated) — Manhattan Project operational standard ──
  { key: 'setup_review_beo',        category: 'Setup', role: 'Lead',    condition: () => true, label: () => 'Review BEO, event notes, and floor plan' },
  { key: 'setup_kitchen_menu',      category: 'Setup', role: 'Kitchen', condition: () => true, label: () => 'Confirm kitchen menu and food timing' },
  { key: 'setup_bar_tab_type',      category: 'Setup', role: 'Lead',    condition: () => true, label: () => 'Confirm bar tab, tickets, or individual tabs' },
  { key: 'setup_bar_team_brief',    category: 'Setup', role: 'Bar',     condition: () => true, label: () => 'Confirm with bar team tab name and bar type' },
  { key: 'setup_safety_signage',    category: 'Setup', role: 'FOH',     condition: () => true, label: () => 'Set safety boundaries and reserved signage' },
  { key: 'setup_tables_linens',     category: 'Setup', role: 'FOH',     condition: () => true, label: () => 'Set tables, linens, and seating' },
  { key: 'setup_buffet_chafers',    category: 'Setup', role: 'Kitchen', condition: () => true, label: () => 'Set buffet table, chafers, and sternos' },
  { key: 'setup_serving_ware',      category: 'Setup', role: 'Kitchen', condition: () => true, label: () => 'Set plates, utensils, and serving ware' },
  { key: 'setup_menus_coasters',    category: 'Setup', role: 'FOH',     condition: () => true, label: () => 'Set menus and coasters' },
  { key: 'setup_lighting_music',    category: 'Setup', role: 'FOH',     condition: () => true, label: () => 'Set lighting, music, and volume' },
  { key: 'setup_garage_door',       category: 'Setup', role: 'FOH',     condition: () => true, label: () => 'Set garage door based on weather' },
  { key: 'setup_av',                category: 'Setup', role: 'FOH',     condition: () => true, label: () => 'Set TV, HDMI, or A/V if needed' },
  { key: 'setup_clean_area',        category: 'Setup', role: 'FOH',     condition: () => true, label: () => 'Clean and organize event area' },
  { key: 'setup_guest_ready_check', category: 'Setup', role: 'Lead',    condition: () => true, label: () => 'Complete guest-ready check' },
  { key: 'setup_host_guidelines',   category: 'Setup', role: 'Lead',    condition: () => true, label: () => 'Review host guidelines with host' },

  // ── Breakdown (always generated) — Manhattan Project operational standard ──
  { key: 'breakdown_last_call',        category: 'Breakdown', role: 'Bar',     condition: () => true, label: () => 'Last call on event tab 30 minutes before end' },
  { key: 'breakdown_tab_closed',       category: 'Breakdown', role: 'Bar',     condition: () => true, label: () => 'Confirm event tab is closed or ready' },
  { key: 'breakdown_togo_containers',  category: 'Breakdown', role: 'Kitchen', condition: () => true, label: () => 'Provide to-go containers on buffet table' },
  { key: 'breakdown_clear_buffet',     category: 'Breakdown', role: 'Kitchen', condition: () => true, label: () => 'Clear buffet and food service areas' },
  { key: 'breakdown_remove_chafers',   category: 'Breakdown', role: 'Kitchen', condition: () => true, label: () => 'Remove chafers, sternos, and service items' },
  { key: 'breakdown_discard_disposables', category: 'Breakdown', role: 'FOH', condition: () => true, label: () => 'Discard used plates, utensils, and napkins' },
  { key: 'breakdown_lost_items',       category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Check for personal or lost items' },
  { key: 'breakdown_collect_linens',   category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Collect linens and reusable service ware' },
  { key: 'breakdown_laundry',          category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Start laundry for used linens' },
  { key: 'breakdown_remove_trash',     category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Remove trash from event area' },
  { key: 'breakdown_remove_signage',   category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Remove menus, coasters, and reserved signage' },
  { key: 'breakdown_reset_tables',     category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Reset tables and seating to floor plan' },
  { key: 'breakdown_music_garage',     category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Turn off music and close garage door' },
  { key: 'breakdown_av_power_down',    category: 'Breakdown', role: 'FOH',     condition: () => true, label: () => 'Power down TV, HDMI, and A/V' },
  { key: 'breakdown_production_reset', category: 'Breakdown', role: 'Kitchen', condition: () => true, label: () => 'Clean and reset production space' },
  { key: 'breakdown_dishes_to_kitchen',category: 'Breakdown', role: 'Kitchen', condition: () => true, label: () => 'Take serving dishes to kitchen for cleaning' },
  { key: 'breakdown_final_walkthrough',category: 'Breakdown', role: 'Lead',    condition: () => true, label: () => 'Complete final walkthrough' },
  { key: 'breakdown_report_issues',    category: 'Breakdown', role: 'Lead',    condition: () => true, label: () => 'Report issues or damage to Event Coordinator' },

  // ── Dynamic (only when the condition is true for this event) — Manhattan Project operational standard ──
  { key: 'dyn_dessert_setup',     category: 'Dynamic', role: 'FOH', condition: ctx => !!ctx.dessertExpected,
    label: () => 'Set up dessert station for host-provided dessert' },
  { key: 'dyn_dessert_breakdown', category: 'Dynamic', role: 'FOH', condition: ctx => !!ctx.dessertExpected,
    label: () => 'Clear and reset dessert station area' },
  { key: 'dyn_drink_tickets', category: 'Dynamic', role: 'Bar', condition: ctx => ctx.barTabType === 'Pre-Paid Drink Ticket(s)' && (ctx.drinkTickets ?? 0) > 0,
    label: ctx => `Confirm ${ctx.drinkTickets} drink tickets and hand to host` },
  { key: 'dyn_av_confirm',   category: 'Dynamic', role: 'FOH', condition: ctx => !!ctx.bigScreenTv,
    label: () => 'Confirm A/V content and HDMI source with host, then test connection' },
  { key: 'dyn_av_teardown',  category: 'Dynamic', role: 'FOH', condition: ctx => !!ctx.bigScreenTv,
    label: () => 'Confirm A/V equipment disconnected and returned' },
  { key: 'dyn_kids', category: 'Dynamic', role: 'Lead', condition: ctx => !!ctx.kidsAttending,
    label: () => 'Post patio supervision reminder — kids attending' },
  { key: 'dyn_large_group', category: 'Dynamic', role: 'FOH', condition: ctx => ctx.guestCount > 50,
    label: () => 'Review guest flow and floor plan capacity for large group' },
  { key: 'dyn_high_bar_impact', category: 'Dynamic', role: 'Lead', condition: ctx => ctx.barImpactLevel === 'High' || ctx.barImpactLevel === 'Critical',
    label: ctx => `Give main bar a heads-up — ${ctx.barImpactLevel} impact expected` },
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
  'dyn_kids',           // child supervision reminder — guest safety
  'dyn_high_bar_impact',// main bar heads-up — service escalation
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
