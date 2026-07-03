'use client'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { EVENT_STATUSES } from '@/lib/constants'
import { Logo } from '@/components/Logo'

const NOTIFICATIONS_POLL_MS = 45_000

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const STATUS_DOT: Record<string, string> = {
  'New':       'bg-gray-400',
  'Contacted': 'bg-blue-400',
  'Converted': 'bg-purple-400',
  'Tentative': 'bg-yellow-400',
  'Confirmed': 'bg-green-400',
  'Closed':    'bg-slate-400',
}

function SubLink({ href, pathname, label, icon, onClose }: { href: string; pathname: string; label: string; icon: string; onClose?: () => void }) {
  const isActive = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs tracking-wide font-medium transition-colors
        ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
    >
      <span className="text-sm leading-none">{icon}</span>
      {label}
    </Link>
  )
}

export function SideNav({ onClose }: { onClose?: () => void }) {
  const pathname  = usePathname()
  const params    = useSearchParams()
  const router    = useRouter()
  const activeStatus = pathname === '/events' ? (params.get('status') ?? null) : null
  const onEvents  = pathname.startsWith('/events')

  const onPrepTools = pathname.startsWith('/prep') || pathname.startsWith('/book')

  // Keep submenus open when on their section
  const [eventsOpen, setEventsOpen] = useState(onEvents)
  const [prepOpen, setPrepOpen] = useState(onPrepTools)

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
    const active = pathname === href && !activeStatus
    return active
      ? 'flex items-center gap-2 pl-[10px] pr-3 py-2 rounded-lg text-xs tracking-widest uppercase font-medium border-l-2 border-[#C8973A] bg-[#C8973A]/10 text-[#C8973A] transition-colors'
      : 'flex items-center gap-2 px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-medium text-gray-400 hover:bg-white/8 hover:text-white transition-colors'
  }

  function todayClass() {
    const active = pathname === '/today'
    return active
      ? 'flex items-center gap-2 pl-[10px] pr-3 py-2 rounded-lg text-xs tracking-widest uppercase font-semibold border-l-2 border-[#C8973A] bg-[#C8973A]/15 text-[#C8973A] transition-colors'
      : 'flex items-center gap-2 px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-semibold bg-[#C8973A]/8 text-[#C8973A] hover:bg-[#C8973A]/15 transition-colors'
  }

  return (
    <nav className="w-56 shrink-0 bg-[#172c3f] border-r border-white/8 flex flex-col print:hidden">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/8 flex items-center gap-3">
        <Logo className="w-9 h-9 shrink-0" color="gold" />
        <div>
          <div className="text-xs font-bold text-[#C8973A] tracking-[0.18em] uppercase leading-tight">Manhattan Project</div>
          <div className="text-[9px] text-gray-500 tracking-widest uppercase mt-0.5">Beer Co. · Events</div>
        </div>
      </div>

      <div className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {/* Today + date picker group */}
        <Link href="/today" onClick={onClose} className={todayClass()}>
          <span className="text-sm leading-none">📅</span>
          Today
        </Link>

        <div className="px-1 pb-2">
          <label className="block text-[9px] tracking-widest uppercase text-gray-600 mb-1 px-2 pt-1">
            Jump to Date
          </label>
          <input
            type="date"
            value={pickerDate}
            onChange={handleDateChange}
            className="w-full bg-[#0f1e2d] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-gray-400
              focus:outline-none focus:border-[#C8973A]/50 focus:text-gray-200 transition-colors cursor-pointer"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 my-1" />

        <Link href="/" onClick={onClose} className={navClass('/')}>Dashboard</Link>
        <Link href="/operations" onClick={onClose} className={navClass('/operations')}>Operations</Link>

        {/* Events with submenu */}
        <div>
          <button
            onClick={() => setEventsOpen(v => !v)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-medium transition-colors
              ${onEvents ? 'text-[#C8973A]' : 'text-gray-400 hover:bg-white/8 hover:text-white'}`}
          >
            <span>Events</span>
            <span className={`text-[10px] transition-transform duration-150 ${eventsOpen ? 'rotate-90' : ''}`}>▶</span>
          </button>

          {eventsOpen && (
            <div className="mt-0.5 ml-3 border-l border-white/8 pl-3 space-y-0.5">
              <Link
                href="/events"
                onClick={onClose}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${pathname === '/events' && !activeStatus
                    ? 'text-white bg-white/8'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/25 inline-block shrink-0" />
                All Events
              </Link>

              {EVENT_STATUSES.map((s) => {
                const isActive = activeStatus === s
                return (
                  <Link
                    key={s}
                    href={`/events?status=${s}`}
                    onClick={onClose}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors
                      ${isActive ? 'text-white bg-white/8' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${STATUS_DOT[s]}`} />
                    {s}
                  </Link>
                )
              })}

              <Link
                href="/events/new"
                onClick={onClose}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#C8973A]/60 hover:text-[#C8973A] transition-colors mt-1"
              >
                <span className="text-base leading-none">+</span>
                New Event
              </Link>
            </div>
          )}
        </div>

        <Link href="/calendar" onClick={onClose} className={navClass('/calendar')}>Calendar</Link>
        <Link href="/reservations" onClick={onClose} className={navClass('/reservations')}>Reservations</Link>
        <Link href="/archive" onClick={onClose} className={navClass('/archive')}>Archive</Link>
        <Link href="/analytics" onClick={onClose} className={navClass('/analytics')}>Analytics</Link>

        <Link href="/notifications" onClick={onClose} className={`${navClass('/notifications')} justify-between`}>
          <span>Notifications</span>
          {pendingAlerts > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#C8973A] text-white leading-none">
              {pendingAlerts}
            </span>
          )}
        </Link>

        {/* Divider before prep tools */}
        <div className="border-t border-white/5 my-1" />

        {/* Prep Tools submenu */}
        <div>
          <button
            onClick={() => setPrepOpen(v => !v)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-medium transition-colors
              ${onPrepTools ? 'text-[#C8973A]' : 'text-gray-400 hover:bg-white/8 hover:text-white'}`}
          >
            <span>Prep & Docs</span>
            <span className={`text-[10px] transition-transform ${prepOpen ? 'rotate-90' : ''}`}>▶</span>
          </button>

          {prepOpen && (
            <div className="mt-0.5 ml-3 border-l border-white/10 pl-3 space-y-0.5">
              <p className="px-2.5 py-2 text-xs text-gray-400 leading-relaxed">
                Open an event and click "Generate Outputs" to build Toast Notes, Kitchen Sheet, FOH, Bar &amp; Run of Show.
              </p>
              <Link
                href="/events"
                onClick={onClose}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs tracking-wide font-medium text-[#C8973A]/70 hover:text-[#C8973A] transition-colors"
              >
                <span className="text-sm leading-none">→</span>
                Go to Events
              </Link>
            </div>
          )}
        </div>

        {/* Divider before settings */}
        <div className="border-t border-white/5 my-1" />

        <Link href="/settings" onClick={onClose} className={navClass('/settings')}>Settings</Link>
      </div>

      {/* Sidebar footer */}
      <div className="px-4 py-3 border-t border-white/5">
        <p className="text-[9px] text-gray-600 tracking-widest uppercase">Internal Use Only</p>
      </div>
    </nav>
  )
}
