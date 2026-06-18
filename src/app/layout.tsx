import type { Metadata } from 'next'
import { Josefin_Sans, Crimson_Text } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/components/AppShell'

const josefin = Josefin_Sans({
  subsets: ['latin'],
  variable: '--font-josefin',
  display: 'swap',
})

const crimson = Crimson_Text({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-crimson',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MPBC Events',
  description: 'Manhattan Project Beer Co. Event Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${josefin.variable} ${crimson.variable} font-sans bg-[#0f1e2d] text-white min-h-screen`}>
        <AppShell>{children}</AppShell>
        <Toaster richColors theme="dark" />
      </body>
    </html>
  )
}

