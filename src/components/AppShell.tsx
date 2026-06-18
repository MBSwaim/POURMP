'use client'
import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { SideNav } from './SideNav'

const PUBLIC_ROUTES = ['/book']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))

  if (isPublic) {
    return <div className="min-h-screen bg-[#f9f8f6] text-gray-800">{children}</div>
  }

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<nav className="w-56 shrink-0 bg-[#1F3348] border-r border-white/10" />}>
        <SideNav />
      </Suspense>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
