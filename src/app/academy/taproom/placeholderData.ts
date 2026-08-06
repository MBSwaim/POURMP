// Static placeholder data for the Taproom Academy first visual slice.
// No database table backs this yet — see the approved implementation scope.
// Curriculum content is illustrative only, not finalized.

export type LessonState = 'not_started' | 'in_progress' | 'complete' | 'trainer_signoff'

export interface Lesson {
  id: string
  title: string
  state: LessonState
  note?: string
}

export interface Shift {
  number: number
  title: string
  isOptional: boolean
  summary: string
  lessons: Lesson[]
}

export const TAPROOM_SHIFTS: Shift[] = [
  {
    number: 1,
    title: 'Welcome & Foundations',
    isOptional: false,
    summary: 'Orientation to the taproom, safety basics, and how a shift runs.',
    lessons: [
      { id: 's1-l1', title: 'Taproom orientation & safety walkthrough', state: 'complete' },
      { id: 's1-l2', title: 'Meet the team & shift structure', state: 'complete' },
      { id: 's1-l3', title: 'Point of sale basics (Toast)', state: 'in_progress' },
      { id: 's1-l4', title: 'Glassware & pour standards', state: 'not_started' },
      {
        id: 's1-l5',
        title: 'Shift 1 trainer check-in',
        state: 'trainer_signoff',
        note: 'Requires a trainer to observe and sign off before moving to Shift 2.',
      },
    ],
  },
  {
    number: 2,
    title: 'Placeholder',
    isOptional: false,
    summary: 'Content to be finalized.',
    lessons: [{ id: 's2-l1', title: 'Placeholder lesson', state: 'not_started' }],
  },
  {
    number: 3,
    title: 'Placeholder',
    isOptional: false,
    summary: 'Content to be finalized.',
    lessons: [{ id: 's3-l1', title: 'Placeholder lesson', state: 'not_started' }],
  },
  {
    number: 4,
    title: 'Placeholder',
    isOptional: false,
    summary: 'Content to be finalized. Opening/closing training may begin here or later.',
    lessons: [{ id: 's4-l1', title: 'Placeholder lesson', state: 'not_started' }],
  },
  {
    number: 5,
    title: 'Placeholder',
    isOptional: false,
    summary: 'Content to be finalized.',
    lessons: [{ id: 's5-l1', title: 'Placeholder lesson', state: 'not_started' }],
  },
  {
    number: 6,
    title: 'Optional — Placeholder',
    isOptional: true,
    summary: 'Additional practice shift, added if the core five aren’t enough.',
    lessons: [{ id: 's6-l1', title: 'Placeholder lesson', state: 'not_started' }],
  },
  {
    number: 7,
    title: 'Optional — Placeholder',
    isOptional: true,
    summary: 'Additional practice shift, added if the core five aren’t enough.',
    lessons: [{ id: 's7-l1', title: 'Placeholder lesson', state: 'not_started' }],
  },
]

// Future specialty tracks — labeled only, no functional module yet.
export const FUTURE_SPECIALTY_TRAINING = ['Opener', 'Closer', 'Barista', 'Additional certifications']

// The first shift that isn't fully complete — a derived read of the static
// data above, not a persisted "progress" concept.
export function getCurrentShift(): Shift {
  return TAPROOM_SHIFTS.find(s => s.lessons.some(l => l.state !== 'complete')) ?? TAPROOM_SHIFTS[0]
}

export function getShift(number: number): Shift | undefined {
  return TAPROOM_SHIFTS.find(s => s.number === number)
}
