'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { EVENT_STATUSES } from '@/lib/constants'

const STATUS_DOT: Record<string, string> = {
  'New':       'bg-gray-400',
  'Contacted': 'bg-blue-400',
  'Converted': 'bg-purple-400',
  'Tentative': 'bg-yellow-400',
  'Confirmed': 'bg-green-400',
  'Closed':    'bg-slate-400',
}

function SubLink({ href, pathname, label, icon }: { href: string; pathname: string; label: string; icon: string }) {
  const isActive = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs tracking-wide font-medium transition-colors
        ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
    >
      <span className="text-sm leading-none">{icon}</span>
      {label}
    </Link>
  )
}

export function SideNav() {
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

  return (
    <nav className="w-56 shrink-0 bg-[#1F3348] border-r border-white/10 flex flex-col print:hidden">
      <div className="p-4 border-b border-white/10">
        <div className="text-sm font-bold text-[#C8973A] tracking-widest uppercase">Manhattan Project</div>
        <div className="text-[10px] text-gray-400 tracking-widest uppercase">Beer Co. · Events</div>
      </div>

      <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <Link href="/" className={navClass('/')}>Dashboard</Link>
        <Link href="/leads" className={navClass('/leads')}>Leads</Link>

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
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs tracking-wide font-medium text-[#C8973A]/70 hover:text-[#C8973A] transition-colors mt-1"
              >
                <span className="text-sm leading-none">+</span>
                New Event
              </Link>
            </div>
          )}
        </div>

        <Link href="/calendar" className={navClass('/calendar')}>Calendar</Link>
        <Link href="/archive" className={navClass('/archive')}>Archive</Link>
        <Link href="/analytics" className={navClass('/analytics')}>Analytics</Link>

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
              <SubLink href="/prep/kitchen-sheet" pathname={pathname} label="Kitchen Sheet" icon="🍳" />
              <SubLink href="/prep/beo" pathname={pathname} label="Banquet Event Order" icon="📋" />
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

        <Link href="/settings" className={navClass('/settings')}>Settings</Link>
      </div>
    </nav>
  )
}
