import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Shift } from '../taproom/placeholderData'

function shiftStatus(shift: Shift, currentShiftNumber: number): 'complete' | 'current' | 'upcoming' {
  if (shift.lessons.every(l => l.state === 'complete')) return 'complete'
  if (shift.number === currentShiftNumber) return 'current'
  return 'upcoming'
}

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
              'shrink-0 w-[132px] rounded-2xl border px-3.5 py-3 transition-colors',
              status === 'complete' && 'bg-[#111] border-[#111] text-white',
              status === 'current' && 'bg-[#fffdf8] border-[#b07d2e] text-[#1b1b1b] ring-1 ring-[#b07d2e]/40',
              status === 'upcoming' && 'bg-[#fffdf8] border-[#e8e2d7] text-[#777] hover:border-[#cfc6b8]'
            )}
          >
            <p className={cn(
              'text-[10px] font-bold tracking-widest uppercase',
              status === 'complete' ? 'text-white/70' : status === 'current' ? 'text-[#b07d2e]' : 'text-[#999]'
            )}>
              {shift.isOptional ? 'Optional' : `Shift ${shift.number}`}
            </p>
            <p className="text-sm font-semibold mt-1 leading-snug">{shift.title}</p>
            {status === 'current' && (
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#b07d2e] mt-2">You are here</p>
            )}
          </Link>
        )
      })}
    </div>
  )
}
