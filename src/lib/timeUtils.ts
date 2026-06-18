/** Convert HH:MM (24-hr) to h:MM AM/PM */
export function to12Hour(time: string | null | undefined): string {
  if (!time) return '—'
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

/** Add (or subtract) minutes to a HH:MM string, returns HH:MM */
export function shiftTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Compute auto-times from an event start time + duration in minutes */
export function computeEventTimes(eventTime: string, durationMins: number) {
  return {
    productionClose: shiftTime(eventTime, -120),   // 2 hr before
    setupTime:       shiftTime(eventTime, -90),    // 1.5 hr before
    decorateTime:    shiftTime(eventTime, -60),    // 1 hr before (customer access)
    eventEnd:        shiftTime(eventTime, durationMins),
  }
}
