import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Shift } from '../taproom/placeholderData'

function shiftStatus(shift: Shift, currentShiftNumber: number): 'complete' | 'current' | 'upcoming' {
  if (shift.lessons.every(l => l.state === 'complete')) return 'complete'
  if (shift.number === currentShiftNumber) return 'current'
  return 'upcoming'
}

// Renders only the five-shift Core Certification track — Opening/Closing
// Certification are shown elsewhere as separate, locked future paths.
// Visual-only POURMP restyle: shiftStatus() and the rendered sequence are
// unchanged — only the Tailwind classes per status changed. "Current" still
// carries a literal "You are here" text label alongside its gold treatment,
// not color alone.
export function ShiftProgressTrack({ shifts, currentShiftNumber }: { shifts: Shift[]; currentShiftNumber: number }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
      {shifts.map(shift => {
        const status = shiftStatus(shift, currentShiftNumber)
        return (
          <Link
            key={shift.number}
            href={`/academy/taproom/${shift.number}`}
            className={cn(
              'shrink-0 w-[148px] rounded-xl border px-3.5 py-3 transition-colors relative',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b355]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]',
              shift.isGraduation && 'border-2',
              status === 'complete' && 'bg-white/[0.06] border-white/20 text-white/80 hover:border-white/30',
              status === 'current' && 'bg-[#C8973A]/10 border-[#e0b355] text-white',
              status === 'upcoming' && !shift.isGraduation && 'bg-white/[0.02] border-white/10 text-white/40 hover:border-white/20',
              status === 'upcoming' && shift.isGraduation && 'bg-white/[0.02] border-[#C8973A]/25 text-white/40 hover:border-[#C8973A]/40'
            )}
          >
            {shift.isGraduation && (
              <span className="absolute -top-2 left-3 text-[9px] font-bold uppercase tracking-widest bg-[#0b0c0e] border border-[#C8973A]/40 text-[#C8973A] rounded-full px-2 py-0.5">
                Graduation
              </span>
            )}
            <p className={cn(
              'text-[10px] font-bold tracking-widest uppercase',
              status === 'complete' ? 'text-white/40' : status === 'current' ? 'text-[#e0b355]' : 'text-white/30'
            )}>
              Shift {shift.number}
            </p>
            <p className={cn(
              'text-sm font-semibold mt-1 leading-snug',
              status === 'upcoming' ? 'text-white/60' : 'text-white'
            )}>
              {shift.title}
            </p>
            <p className={cn(
              'text-[11px] italic mt-1.5 leading-snug',
              status === 'complete' ? 'text-white/40' : status === 'current' ? 'text-white/60' : 'text-white/25'
            )}>
              “{shift.confidenceStatement}”
            </p>
            {status === 'current' && (
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#e0b355] mt-2">You are here</p>
            )}
          </Link>
        )
      })}
    </div>
  )
}
