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
              'shrink-0 w-[148px] rounded-2xl border px-3.5 py-3 transition-colors relative',
              shift.isGraduation && 'border-2',
              status === 'complete' && 'bg-[#111] border-[#111] text-white',
              status === 'current' && 'bg-[#fffdf8] border-[#b07d2e] text-[#1b1b1b] ring-1 ring-[#b07d2e]/40',
              status === 'upcoming' && !shift.isGraduation && 'bg-[#fffdf8] border-[#e8e2d7] text-[#777] hover:border-[#cfc6b8]',
              status === 'upcoming' && shift.isGraduation && 'bg-[#fffdf8] border-[#1b1b1b]/50 text-[#1b1b1b] hover:border-[#1b1b1b]'
            )}
          >
            {shift.isGraduation && (
              <span className="absolute -top-2 left-3 text-[9px] font-bold uppercase tracking-widest bg-[#111] text-white rounded-full px-2 py-0.5">
                Graduation
              </span>
            )}
            <p className={cn(
              'text-[10px] font-bold tracking-widest uppercase',
              status === 'complete' ? 'text-white/70' : status === 'current' ? 'text-[#b07d2e]' : 'text-[#999]'
            )}>
              Shift {shift.number}
            </p>
            <p className="text-sm font-semibold mt-1 leading-snug">{shift.title}</p>
            <p className={cn(
              'text-[11px] italic mt-1.5 leading-snug',
              status === 'complete' ? 'text-white/60' : 'text-[#999]'
            )}>
              “{shift.confidenceStatement}”
            </p>
            {status === 'current' && (
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#b07d2e] mt-2">You are here</p>
            )}
          </Link>
        )
      })}
    </div>
  )
}
