'use client'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Logo } from '@/components/Logo'
import { GlobalEventSearch } from '@/components/GlobalEventSearch'

const NOTIFICATIONS_POLL_MS = 45_000

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function SideNav({ onClose }: { onClose?: () => void }) {
  const pathname  = usePathname()
  const params    = useSearchParams()
  const router    = useRouter()

  // Date picker: prefill from ?date= if on /today, otherwise use today
  const pickerDefault = (pathname === '/today' && params.get('date')) ? params.get('date')! : todayISO()
  const [pickerDate, setPickerDate] = useState(pickerDefault)

  const [pendingAlerts, setPendingAlerts] = useState(0)
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/notifications')
        const data = await res.json()
        setPendingAlerts(data.pending?.length ?? 0)
      } catch { /* keep last known count on a transient failure */ }
    }
    load()
    const id = setInterval(load, NOTIFICATIONS_POLL_MS)
    return () => clearInterval(id)
  }, [])

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setPickerDate(val)
    if (val) {
      router.push(`/today?date=${val}`)
      onClose?.()
    }
  }

  // Active nav item: left gold bar + background
  function navClass(href: string) {
    const active = pathname === href
    return active
      ? 'flex items-center gap-2 pl-[10px] pr-3 py-2 rounded-lg text-xs tracking-widest uppercase font-medium border-l-2 border-[#C8973A] bg-[#C8973A]/10 text-[#C8973A] transition-colors'
      : 'flex items-center gap-2 px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors'
  }

  function todayClass() {
    const active = pathname === '/today'
    return active
      ? 'flex items-center gap-2 pl-[10px] pr-3 py-2 rounded-lg text-xs tracking-widest uppercase font-semibold border-l-2 border-[#C8973A] bg-[#C8973A]/15 text-[#C8973A] transition-colors'
      : 'flex items-center gap-2 px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-semibold bg-[#C8973A]/8 text-[#C8973A] hover:bg-[#C8973A]/15 transition-colors'
  }

  return (
    <nav className="w-56 shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col print:hidden">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-200 flex items-center gap-3">
        <Logo className="w-9 h-9 shrink-0" color="gold" />
        <div>
          <div
            className="text-xs font-bold text-[#C8973A] tracking-[0.18em] uppercase leading-tight"
            title="Planning • Operations • Unified • Readiness Platform"
          >
            POURMP
          </div>
          <div
            className="text-[9px] text-gray-500 tracking-widest uppercase mt-0.5"
            title="Manhattan Project's Internal Events & Reservations Operations System"
          >
            Manhattan Project · Ops Platform
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {/* Global event search */}
        <div className="px-1 pb-2">
          <label className="block text-[9px] tracking-widest uppercase text-gray-600 mb-1 px-2 pt-1">
            Search Events
          </label>
          <GlobalEventSearch onNavigate={onClose} />
        </div>

        <Link href="/admin" onClick={onClose} className={navClass('/admin')}>
          <span className="text-sm leading-none">🧭</span>
          Admin
        </Link>

        {/* Today + date picker group */}
        <Link href="/today" onClick={onClose} className={todayClass()}>
          <span className="text-sm leading-none">📅</span>
          Today
        </Link>

        <Link href="/taproom" onClick={onClose} className={navClass('/taproom')}>
          <span className="text-sm leading-none">🍺</span>
          Taproom
        </Link>

        <div className="px-1 pb-2">
          <label className="block text-[9px] tracking-widest uppercase text-gray-600 mb-1 px-2 pt-1">
            Jump to Date
          </label>
          <input
            type="date"
            value={pickerDate}
            onChange={handleDateChange}
            className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-700
              focus:outline-none focus:border-[#C8973A]/50 focus:text-gray-900 transition-colors cursor-pointer"
          />
        </div>

        {/* Divider before Academy */}
        <div className="border-t border-gray-200 my-1" />

        <Link href="/academy" onClick={onClose} className={navClass('/academy')}>Academy</Link>

        {/* Divider */}
        <div className="border-t border-gray-200 my-1" />

        <Link href="/" onClick={onClose} className={navClass('/')}>Dashboard</Link>
        <Link href="/operations" onClick={onClose} className={navClass('/operations')}>Operations</Link>

        <Link href="/events" onClick={onClose} className={navClass('/events')}>Events</Link>

        <Link href="/calendar" onClick={onClose} className={navClass('/calendar')}>Calendar</Link>
        <Link href="/reservations" onClick={onClose} className={navClass('/reservations')}>Reservations</Link>
        <Link href="/archive" onClick={onClose} className={navClass('/archive')}>Archive</Link>

        <Link href="/notifications" onClick={onClose} className={`${navClass('/notifications')} justify-between`}>
          <span>Notifications</span>
          {pendingAlerts > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#C8973A] text-white leading-none">
              {pendingAlerts}
            </span>
          )}
        </Link>

        {/* Divider before prep tools */}
        <div className="border-t border-gray-200 my-1" />

        <Link href="/prep-docs" onClick={onClose} className={navClass('/prep-docs')}>Prep Docs</Link>

        {/* Divider before settings */}
        <div className="border-t border-gray-200 my-1" />

        <Link href="/settings" onClick={onClose} className={navClass('/settings')}>Settings</Link>
      </div>

      {/* Sidebar footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-[9px] text-gray-600 tracking-widest uppercase">Internal Use Only</p>
      </div>
    </nav>
  )
}
