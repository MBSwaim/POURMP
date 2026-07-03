import { calcFloorPlan } from './calculations'

// Event Readiness Score — measures OPERATIONAL prep completion only.
// Deliberately excludes payment/Toast status (deposit paid, invoice sent, etc.) —
// a fully-paid event with no menu or floor plan set is NOT "ready" by this measure.

export interface ReadinessInput {
  guest_count: number
  hasPackage: boolean
  bar_tab_type?: string | null
  setup_notes?: string | null
  floor_plan_notes?: string | null
  dietary_restrictions?: string | null
  staffing_notes?: string | null
  contract_signed?: number | boolean | null
}

export interface ReadinessCheck {
  label: string
  passed: boolean
}

export interface ReadinessResult {
  score: number
  checks: ReadinessCheck[]
  missingLabels: string[]
}

export function calcReadiness(input: ReadinessInput): ReadinessResult {
  const guests = input.guest_count ?? 0
  const floorPlan = guests > 0 ? calcFloorPlan(guests) : null

  const checks: ReadinessCheck[] = [
    { label: 'Guest count confirmed', passed: guests > 0 },
    { label: 'Catering package selected', passed: !!input.hasPackage },
    { label: 'Bar tab type selected', passed: !!input.bar_tab_type },
    { label: 'Setup / floor plan notes provided', passed: !!(input.setup_notes?.trim() || input.floor_plan_notes?.trim()) },
    { label: 'Dietary restrictions reviewed', passed: !!input.dietary_restrictions?.trim() },
    { label: 'Staffing / coordinator notes provided', passed: !!input.staffing_notes?.trim() },
    { label: 'Contract signed', passed: !!input.contract_signed },
    { label: 'Guest count within venue capacity', passed: floorPlan ? !floorPlan.isOverCapacity : true },
  ]

  const passedCount = checks.filter(c => c.passed).length
  const score = Math.round((passedCount / checks.length) * 100)
  const missingLabels = checks.filter(c => !c.passed).map(c => c.label)

  return { score, checks, missingLabels }
}

export function readinessColor(score: number): { bg: string; text: string; border: string; dot: string } {
  if (score >= 90) return { bg: 'bg-green-900/30',  text: 'text-green-300',  border: 'border-green-700/50',  dot: 'bg-green-400'  }
  if (score >= 70) return { bg: 'bg-yellow-900/30', text: 'text-yellow-300', border: 'border-yellow-700/50', dot: 'bg-yellow-400' }
  if (score >= 50) return { bg: 'bg-orange-900/30', text: 'text-orange-300', border: 'border-orange-700/50', dot: 'bg-orange-400' }
  return { bg: 'bg-red-900/30', text: 'text-red-300', border: 'border-red-700/50', dot: 'bg-red-400' }
}
