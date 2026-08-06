// Static placeholder data for Taproom Core Certification's first visual slice.
// No database table backs this yet — see the approved implementation scope.
// Curriculum content (purpose/standard/practice/verification copy) is
// intentionally NOT written yet — every lesson shows the framework structure
// with placeholder text until curriculum design happens in a later phase.

export type LessonState = 'not_started' | 'in_progress' | 'complete' | 'trainer_signoff'

export interface Lesson {
  id: string
  title: string
  state: LessonState
  note?: string
  // Shown up front on every lesson, independent of current state — not every
  // lesson needs formal trainer sign-off, but every lesson should say so.
  requiresVerification: boolean
  // The four-part Learning Framework. Left undefined for now on purpose —
  // the UI renders a clearly-labeled "pending curriculum design" placeholder
  // for any section without real copy yet.
  purpose?: string
  standard?: string
  practice?: string
  verification?: string
}

export interface Shift {
  number: number
  title: string
  // The confidence statement that frames this shift's goal, e.g. "I know
  // where I work." Core to the "confidence, not departments" philosophy.
  confidenceStatement: string
  summary: string
  isGraduation?: boolean
  lessons: Lesson[]
}

// The five-shift Core Certification track — nothing else belongs in this
// array. Opening/Closing Certification are separate, locked future paths
// (see FUTURE_CERTIFICATIONS below), not an extension of this list.
export const TAPROOM_SHIFTS: Shift[] = [
  {
    number: 1,
    title: 'Welcome to Manhattan Project',
    confidenceStatement: 'I know where I work.',
    summary: 'Orientation to the taproom, safety basics, and how a shift runs.',
    lessons: [
      {
        id: 's1-l1',
        title: 'Taproom orientation & safety walkthrough',
        state: 'complete',
        requiresVerification: true,
      },
      {
        id: 's1-l2',
        title: 'Meet the team & shift structure',
        state: 'complete',
        requiresVerification: false,
      },
      {
        id: 's1-l3',
        title: 'Point of sale basics (Toast)',
        state: 'in_progress',
        requiresVerification: false,
      },
      {
        id: 's1-l4',
        title: 'Glassware & pour standards',
        state: 'not_started',
        requiresVerification: true,
      },
      {
        id: 's1-l5',
        title: 'Shift 1 trainer check-in',
        state: 'trainer_signoff',
        requiresVerification: true,
        note: 'Your trainer will observe this with you and confirm you’re ready to move to Shift 2.',
      },
    ],
  },
  {
    number: 2,
    title: 'Learning the Floor',
    confidenceStatement: 'I understand how a shift operates.',
    summary: 'Content to be finalized.',
    lessons: [{ id: 's2-l1', title: 'Placeholder lesson', state: 'not_started', requiresVerification: false }],
  },
  {
    number: 3,
    title: 'Serving Guests',
    confidenceStatement: 'I can confidently interact with guests.',
    summary: 'Content to be finalized.',
    lessons: [{ id: 's3-l1', title: 'Placeholder lesson', state: 'not_started', requiresVerification: false }],
  },
  {
    number: 4,
    title: 'Owning My Station',
    confidenceStatement: 'I can manage my responsibilities with less guidance.',
    summary: 'Content to be finalized.',
    lessons: [{ id: 's4-l1', title: 'Placeholder lesson', state: 'not_started', requiresVerification: false }],
  },
  {
    number: 5,
    title: 'Core Certification',
    confidenceStatement: 'I can successfully work a standard taproom shift.',
    summary: 'The graduation shift — content to be finalized.',
    isGraduation: true,
    lessons: [{ id: 's5-l1', title: 'Placeholder lesson', state: 'not_started', requiresVerification: false }],
  },
]

export interface FutureCertification {
  shiftNumber: number
  name: string
  description: string
}

// Separate, locked learning paths that unlock after Core Certification —
// deliberately not part of TAPROOM_SHIFTS.
export const FUTURE_CERTIFICATIONS: FutureCertification[] = [
  { shiftNumber: 6, name: 'Opening Certification', description: 'Unlocks after Core Certification is complete.' },
  { shiftNumber: 7, name: 'Closing Certification', description: 'Unlocks after Core Certification is complete.' },
]

// Further specialty training beyond Core Certification and beyond Opening/
// Closing — labeled only, no functional module yet.
export const FUTURE_SPECIALTY_TRAINING = ['Barista', 'Additional certifications']

// The first Core Certification shift that isn't fully complete — a derived
// read of the static data above, not a persisted "progress" concept.
export function getCurrentShift(): Shift {
  return TAPROOM_SHIFTS.find(s => s.lessons.some(l => l.state !== 'complete')) ?? TAPROOM_SHIFTS[0]
}

export function getShift(number: number): Shift | undefined {
  return TAPROOM_SHIFTS.find(s => s.number === number)
}

export function getFutureCertification(number: number): FutureCertification | undefined {
  return FUTURE_CERTIFICATIONS.find(c => c.shiftNumber === number)
}
