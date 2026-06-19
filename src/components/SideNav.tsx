'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { EVENT_STATUSES } from '@/lib/constants'
import { Logo } from '@/components/Logo'

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
  const activeStatus = pathname === '/events' ? (params.get('status') ?? null) : null
  const onEvents  = pathname.startsWith('/events')

  const onPrepTools = pathname.startsWith('/prep') || pathname.startsWith('/book')

  // Keep submenus open when on their section
  const [eventsOpen, setEventsOpen] = useState(onEvents)
  const [prepOpen, setPrepOpen] = useState(onPrepTools)

  function navClass(href: string) {
    const active = pathname === href && !activeStatus
    return `flex items-center gap-2 px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-medium transition-colors
      ${active ? 'bg-[#C8973A]/20 text-[#C8973A]' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`
  }

  function todayClass() {
    const active = pathname === '/today'
    return `flex items-center gap-2 px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-medium transition-colors
      ${active ? 'bg-[#C8973A]/20 text-[#C8973A]' : 'bg-[#C8973A]/10 text-[#C8973A] hover:bg-[#C8973A]/20'}`
  }

  return (
    <nav className="w-56 shrink-0 bg-[#1F3348] border-r border-white/10 flex flex-col print:hidden">
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <Logo className="w-10 h-10 shrink-0" color="gold" />
        <div>
          <div className="text-sm font-bold text-[#C8973A] tracking-widest uppercase leading-tight">Manhattan Project</div>
          <div className="text-[10px] text-gray-400 tracking-widest uppercase">Beer Co. · Events</div>
        </div>
      </div>

      <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <Link href="/today" onClick={onClose} className={todayClass()}>
          <span className="text-sm leading-none">📅</span>
          Today
        </Link>
        <Link href="/" onClick={onClose} className={navClass('/')}>Dashboard</Link>

        {/* Events with submenu */}
        <div>
          <button
            onClick={() => setEventsOpen(v => !v)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-medium transition-colors
              ${onEvents ? 'text-[#C8973A]' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
          >
            <span>Events</span>
            <span className={`text-[10px] transition-transform ${eventsOpen ? 'rotate-90' : ''}`}>▶</span>
          </button>

          {eventsOpen && (
            <div className="mt-0.5 ml-3 border-l border-white/10 pl-3 space-y-0.5">
              {/* All Events */}
              <Link
                href="/events"
                onClick={onClose}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs tracking-wide font-medium transition-colors
                  ${pathname === '/events' && !activeStatus
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/30 inline-block" />
                All Events
              </Link>

              {/* Per-status links */}
              {EVENT_STATUSES.map((s) => {
                const isActive = activeStatus === s
                return (
                  <Link
                    key={s}
                    href={`/events?status=${s}`}
                    onClick={onClose}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs tracking-wide font-medium transition-colors
                      ${isActive
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${STATUS_DOT[s]}`} />
                    {s}
                  </Link>
                )
              })}

              {/* New event shortcut */}
              <Link
                href="/events/new"
                onClick={onClose}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs tracking-wide font-medium text-[#C8973A]/70 hover:text-[#C8973A] transition-colors mt-1"
              >
                <span className="text-sm leading-none">+</span>
                New Event
              </Link>
            </div>
          )}
        </div>

        <Link href="/calendar" onClick={onClose} className={navClass('/calendar')}>Calendar</Link>
        <Link href="/archive" onClick={onClose} className={navClass('/archive')}>Archive</Link>
        <Link href="/analytics" onClick={onClose} className={navClass('/analytics')}>Analytics</Link>

        {/* Prep Tools submenu */}
        <div>
          <button
            onClick={() => setPrepOpen(v => !v)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs tracking-widest uppercase font-medium transition-colors
              ${onPrepTools ? 'text-[#C8973A]' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
          >
            <span>Prep & Docs</span>
            <span className={`text-[10px] transition-transform ${prepOpen ? 'rotate-90' : ''}`}>▶</span>
          </button>

          {prepOpen && (
            <div className="mt-0.5 ml-3 border-l border-white/10 pl-3 space-y-0.5">
              <SubLink href="/prep/checklist" pathname={pathname} label="Setup Checklist" icon="✓" onClose={onClose} />
              <SubLink href="/prep/kitchen-sheet" pathname={pathname} label="Kitchen Sheet" icon="🍳" onClose={onClose} />
              <SubLink href="/prep/beo" pathname={pathname} label="Banquet Event Order" icon="📋" onClose={onClose} />
              <a
                href="/book"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs tracking-wide font-medium text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors"
              >
                <span className="text-sm leading-none">🔗</span>
                <span>Customer Booking Form</span>
                <span className="ml-auto text-[10px] text-gray-600">↗</span>
              </a>
            </div>
          )}
        </div>

        <Link href="/settings" onClick={onClose} className={navClass('/settings')}>Settings</Link>
      </div>
    </nav>
  )
}
