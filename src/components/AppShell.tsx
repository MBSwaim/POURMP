'use client'
import { usePathname } from 'next/navigation'
import { Suspense, useState } from 'react'
import { SideNav } from './SideNav'
import { AppHeader } from './AppHeader'
import { Logo } from './Logo'

const PUBLIC_ROUTES = ['/book']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Root is its own full-bleed arrival experience — no SideNav, no shell chrome
  // at all. Uses an exact match (not startsWith, like PUBLIC_ROUTES below) so
  // this never matches any other route.
  if (pathname === '/') {
    return <>{children}</>
  }

  if (isPublic) {
    return <div className="min-h-screen bg-[#f9f8f6] text-gray-800">{children}</div>
  }

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block print:hidden">
        <Suspense fallback={<nav className="w-56 h-full shrink-0 bg-[#0b0c0e] border-r border-white/10" />}>
          <SideNav />
        </Suspense>
      </div>

      {/* Mobile top bar — hidden on md+ */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-12 bg-white border-b border-[#C8973A]/30 flex items-center justify-between px-4 print:hidden shadow-sm">
        <div className="flex items-center gap-2">
          <Logo className="w-7 h-7 shrink-0" color="gold" />
          <div>
            <div
              className="text-sm font-bold text-[#C8973A] tracking-widest uppercase leading-none"
              title="Planning • Operations • Unified • Readiness Platform"
            >
              POURMP
            </div>
            <div
              className="text-[9px] text-gray-500 tracking-widest uppercase leading-none mt-0.5"
              title="Manhattan Project's Internal Events & Reservations Operations System"
            >
              Manhattan Project · Ops Platform
            </div>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          className="text-gray-500 hover:text-gray-900 text-xl p-1"
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
          <div className="relative flex flex-col w-64 max-w-[85vw] h-full bg-[#0b0c0e] shadow-2xl animate-slide-in-left overflow-y-auto">
            {/* Close button */}
            <div className="flex items-center justify-end p-3 border-b border-white/10">
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="text-white/50 hover:text-white text-lg p-1"
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

      {/* Desktop utility header + main content column. AppHeader is hidden on
          mobile (md:flex), so mobile layout/padding below is unaffected. */}
      <div className="flex flex-col flex-1 min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-auto overflow-x-hidden pt-12 md:pt-0">{children}</main>
      </div>
    </div>
  )
}
