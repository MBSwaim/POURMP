import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MPBC Events',
  description: 'Manhattan Project Beer Co. Event Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0f1e2d] text-white min-h-screen`}>
        <div className="flex min-h-screen">
          <nav className="w-56 shrink-0 bg-[#1F3348] border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <div className="text-sm font-bold text-[#C8973A] tracking-wide">MANHATTAN PROJECT</div>
              <div className="text-xs text-gray-400">BEER CO. · EVENTS</div>
            </div>
            <div className="flex-1 p-3 space-y-1">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/events">Events</NavLink>
              <NavLink href="/calendar">Calendar</NavLink>
              <NavLink href="/settings">Settings</NavLink>
            </div>
          </nav>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        <Toaster richColors theme="dark" />
      </body>
    </html>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
    >
      {children}
    </Link>
  )
}
