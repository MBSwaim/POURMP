'use client'
import { usePathname } from 'next/navigation'
import { Suspense, useState } from 'react'
import { SideNav } from './SideNav'
import { Logo } from './Logo'

const PUBLIC_ROUTES = ['/book']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (isPublic) {
    return <div className="min-h-screen bg-[#f9f8f6] text-gray-800">{children}</div>
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block print:hidden">
        <Suspense fallback={<nav className="w-56 shrink-0 bg-[#1F3348] border-r border-white/10" />}>
          <SideNav />
        </Suspense>
      </div>

      {/* Mobile top bar — hidden on md+ */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-12 bg-[#1a2e42] border-b border-[#C8973A]/30 flex items-center justify-between px-4 print:hidden shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2">
          <Logo className="w-7 h-7 shrink-0" color="gold" />
          <div>
            <div className="text-sm font-bold text-[#C8973A] tracking-widest uppercase leading-none">Manhattan Project</div>
            <div className="text-[9px] text-gray-400 tracking-widest uppercase leading-none mt-0.5">Beer Co. · Events</div>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          className="text-gray-300 hover:text-white text-xl p-1"
        >
          ☰
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex print:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative flex flex-col w-64 max-w-[85vw] h-full bg-[#0f1e2d] shadow-2xl animate-slide-in-left overflow-y-auto">
            {/* Close button */}
            <div className="flex items-center justify-end p-3 border-b border-white/10">
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="text-gray-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>
            <Suspense fallback={null}>
              <SideNav onClose={() => setDrawerOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}

      {/* Main content — add top padding on mobile for the sticky header */}
      <main className="flex-1 overflow-auto overflow-x-hidden pt-12 md:pt-0">{children}</main>
    </div>
  )
}
