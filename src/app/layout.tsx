import type { Metadata } from 'next'
import { Josefin_Sans, Crimson_Text } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
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
  title: 'POURMP · Manhattan Project',
  description: "Manhattan Project's Internal Events & Reservations Operations System",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${josefin.variable} ${crimson.variable} font-sans bg-gray-50 text-gray-900 min-h-screen`}>
        {/* Groundwork only — no dark: styles exist yet outside shadcn ui/
            internals, so this is currently a no-op everywhere except the
            new shell chrome. See docs/ROADMAP.md before wiring a real toggle. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AppShell>{children}</AppShell>
          <Toaster richColors theme="light" />
        </ThemeProvider>
      </body>
    </html>
  )
}

