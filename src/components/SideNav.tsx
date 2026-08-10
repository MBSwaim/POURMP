'use client'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Home,
  CalendarDays,
  CalendarCheck,
  Armchair,
  ListChecks,
  Rocket,
  BarChart3,
  LayoutDashboard,
  Search,
  CalendarRange,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { GlobalEventSearch } from '@/components/GlobalEventSearch'
import { DEMO_ADMIN } from '@/app/admin/adminDemoData'

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
      : 'flex items-center gap-2 px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors'
  }

  // My Shift (/home) keeps the always-gold-tinted emphasis previously used
  // for Today — it's the daily-use employee-facing view, still worth a
  // stronger resting state than the other primary links.
  function shiftClass() {
    const active = pathname === '/home'
    return active
      ? 'flex items-center gap-2 pl-[10px] pr-3 py-2 rounded-lg text-xs tracking-widest uppercase font-semibold border-l-2 border-[#C8973A] bg-[#C8973A]/15 text-[#C8973A] transition-colors'
      : 'flex items-center gap-2 px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-semibold bg-[#C8973A]/8 text-[#C8973A] hover:bg-[#C8973A]/15 transition-colors'
  }

  return (
    <nav className="w-56 h-full shrink-0 bg-[#0b0c0e] border-r border-white/10 flex flex-col print:hidden">
      {/* Logo — compact identity relating to the approved front door */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
        <Logo className="w-9 h-9 shrink-0" color="gold" />
        <div>
          <div
            className="text-xs font-bold text-[#C8973A] tracking-[0.18em] uppercase leading-tight"
            title="Planning • Operations • Unified • Readiness Platform"
          >
            POURMP
          </div>
          <div
            className="text-[9px] text-white/40 tracking-widest uppercase mt-0.5"
            title="Manhattan Project's Internal Events & Reservations Operations System"
          >
            FOH Operating System
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {/* Primary — the approved long-term POURMP hierarchy (Home / My
            Shift / Events / Reservations / Operations / Academies /
            Reports). Routes are unchanged except My Shift; only
            labels/order/grouping/iconography move. "Admin" -> "Home": the
            signed-in destination experience lives at /admin, but the
            user-facing concept is entering POURMP's home, not an
            admin-only tool — the route is untouched. "Today" -> "My
            Shift" now points at /home: /home is the real employee-facing
            shift/home experience (today's focus, current shift, learning),
            a truer match than /today's date-scoped event lookup — /today
            remains reachable via Jump to Date below, nothing is removed.
            Icons are a deliberate, scoped extension of the same
            lucide-react exception already used on the front door and
            /admin — reused here, not a new icon library. */}
        <Link href="/admin" onClick={onClose} className={navClass('/admin')}>
          <Home className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Home
        </Link>

        <Link href="/home" onClick={onClose} className={shiftClass()}>
          <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          My Shift
        </Link>

        <Link href="/events" onClick={onClose} className={navClass('/events')}>
          <CalendarCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Events
        </Link>
        <Link href="/reservations" onClick={onClose} className={navClass('/reservations')}>
          <Armchair className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Reservations
        </Link>
        <Link href="/operations" onClick={onClose} className={navClass('/operations')}>
          <ListChecks className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Operations
        </Link>
        <Link href="/academy" onClick={onClose} className={navClass('/academy')}>
          <Rocket className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Launch Pad
        </Link>

        {/* Reports & Insights has no route yet (see the matching Coming Soon
            card on /admin) — represented here so the hierarchy reads
            completely, but inert rather than faked. */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-medium text-white/30 cursor-default">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            Reports
          </span>
          <span className="text-[8px] font-bold uppercase tracking-widest text-white/25 border border-white/15 rounded-full px-1.5 py-0.5">
            Soon
          </span>
        </div>

        {/* Restrained utilities — Search Events and Jump to Date stay fully
            functional but are visually de-emphasized (smaller label, muted
            tone, tighter footprint) so they read as quick tools, not
            primary nav destinations. */}
        <div className="border-t border-white/10 my-2" />
        <div className="px-1 pb-1 space-y-2 opacity-70">
          <div>
            <label className="flex items-center gap-1 text-[8px] tracking-widest uppercase text-white/40 mb-1 px-2">
              <Search className="h-2.5 w-2.5" strokeWidth={2} />
              Search Events
            </label>
            <GlobalEventSearch onNavigate={onClose} />
          </div>
          <div>
            <label className="flex items-center gap-1 text-[8px] tracking-widest uppercase text-white/40 mb-1 px-2">
              <CalendarRange className="h-2.5 w-2.5" strokeWidth={2} />
              Jump to Date
            </label>
            <input
              type="date"
              value={pickerDate}
              onChange={handleDateChange}
              style={{ colorScheme: 'dark' }}
              className="w-full bg-white/[0.06] border border-white/15 rounded-md px-2 py-1 text-[11px] text-white/80
                focus:outline-none focus:border-[#C8973A]/50 focus:text-white transition-colors cursor-pointer"
            />
          </div>
        </div>

        {/* Divider before secondary admin/tools group */}
        <div className="border-t border-white/10 my-1" />
        <p className="text-[9px] tracking-widest uppercase text-white/30 px-3 pt-1 pb-0.5">Admin &amp; Tools</p>

        <Link href="/dashboard" onClick={onClose} className={navClass('/dashboard')}>
          <LayoutDashboard className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Dashboard
        </Link>
        <Link href="/taproom" onClick={onClose} className={navClass('/taproom')}>
          <span className="text-sm leading-none">🍺</span>
          Taproom
        </Link>
        <Link href="/calendar" onClick={onClose} className={navClass('/calendar')}>Calendar</Link>
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
        <div className="border-t border-white/10 my-1" />

        <Link href="/prep-docs" onClick={onClose} className={navClass('/prep-docs')}>Prep Docs</Link>

        {/* Divider before settings */}
        <div className="border-t border-white/10 my-1" />

        <Link href="/settings" onClick={onClose} className={navClass('/settings')}>Settings</Link>
      </div>

      {/* Identity — reuses the same DEMO_ADMIN already shown in AppHeader's
          profile menu (not a new source; deliberately NOT DEMO_IDENTITY,
          which the public front door also reads — this identity stays out
          of that surface). Portrait replaces the initials-circle now that
          an approved photo exists for this identity. */}
      <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2.5">
        <div className="flex items-center justify-center h-7 w-7 shrink-0 rounded-full overflow-hidden ring-1 ring-[#C8973A]/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/brad-swaim.jpg"
            alt={DEMO_ADMIN.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-white truncate">{DEMO_ADMIN.name}</p>
          <p className="text-[10px] text-white/40 truncate">
            {DEMO_ADMIN.role} · {DEMO_ADMIN.location}
          </p>
        </div>
      </div>

      {/* Sidebar footer */}
      <div className="px-4 py-2 border-t border-white/10">
        <p className="text-[9px] text-white/30 tracking-widest uppercase">Internal Use Only</p>
      </div>
    </nav>
  )
}
