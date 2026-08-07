// Static demo identity + Friday-prototype-only fallback content for /home.
//
// No authentication/current-user model exists yet anywhere in POURMP (see
// docs/ROADMAP.md — "no route currently checks who's making the request").
// DEMO_EMPLOYEE is a deliberately isolated stand-in for what will eventually be
// the authenticated employee's own context. It is NOT read from staff_members,
// and it must never be mistaken for a real "current user" mechanism — when real
// auth lands, this identity is replaced, not extended.
export const DEMO_EMPLOYEE = {
  firstName: 'Jordan',
  shiftContext: 'Evening Shift · Taproom',
}

// Shift.todaysFocus is intentionally left unpopulated on every real Academy shift
// (see src/app/academy/taproom/placeholderData.ts — curriculum content is not
// invented there). This fallback exists only so the Friday prototype can show what
// the "Today's Focus" section is for when the real field is empty; it is never
// written back into the Academy data model.
export const FALLBACK_TODAYS_FOCUS =
  "Slow down at the door — a warm, unhurried greeting sets the tone for the whole table."

// LearningExperienceCard requires estimatedTime/learningObjective, neither of which
// exists on the real Academy Lesson model (curriculum copy is deliberately not
// written yet — see placeholderData.ts). This is the minimum prototype-only display
// metadata needed to demo the card honestly, keyed by the real lesson id. It is
// display metadata only — it must never be merged into the Academy curriculum data.
export const LESSON_DISPLAY_METADATA: Record<string, { estimatedTime: string; learningObjective: string }> = {
  's1-l3': {
    estimatedTime: '8 Minutes',
    learningObjective: 'Get comfortable ringing in a simple order on Toast before your first live shift.',
  },
}
export const DEFAULT_LESSON_DISPLAY_METADATA = {
  estimatedTime: 'A few minutes',
  learningObjective: 'Build confidence with the next step in your certification.',
}

// Today's Manhattan Moment — one short, quiet cultural line for the prototype.
// Distinct from the core brand statement in docs/VISION.md, which is explicitly
// reserved for the Dashboard welcome area only and should not be reused here.
// No rotation, scheduling, or administration yet — a single static message.
export const MANHATTAN_MOMENT = 'Great shifts are built one small kindness at a time.'

// Growth / Recognition — one illustrative example of how coaching and recognition
// may eventually surface on Employee Home. Entirely static and isolated here —
// there is no Growth Note or Recognition backend anywhere in POURMP to read from
// (see docs/USER_ACCOUNTABILITY_FRAMEWORK.md, a design-only, unbuilt proposal).
export const GROWTH_RECOGNITION_EXAMPLE = {
  note: 'Great job staying calm and warm with the birthday party at table 303 — guests mentioned it by name.',
  source: 'From your Shift Lead',
  date: 'Aug 5',
}

// Credentials — prototype/demo data only. No credential backend, expiration
// automation, file upload, reminder delivery, or approval workflow exists
// anywhere in POURMP yet. These two entries only demonstrate the intended future
// concept (required within 30 days of employment; expiration tracked; a reminder
// window; eventual renewal + upload) — nothing here is computed from a real hire
// date or tied to any real employee record.
export type CredentialStatus = 'current' | 'due_soon'

export interface CredentialDemoItem {
  name: string
  status: CredentialStatus
  detail: string
}

export const CREDENTIALS_DEMO: CredentialDemoItem[] = [
  {
    name: 'TABC Certification',
    status: 'current',
    detail: 'Valid through Jan 12, 2027',
  },
  {
    name: 'Texas Food Handler Certification',
    status: 'due_soon',
    detail: 'Required within your first 30 days',
  },
]
