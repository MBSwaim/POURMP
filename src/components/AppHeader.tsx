'use client'

import { DEMO_IDENTITY } from '@/lib/demoIdentity'
import {
  Menu,
  MenuTrigger,
  MenuPortal,
  MenuPositioner,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
} from '@/components/ui/menu'

// Desktop-only shell utility row. Identity is isolated prototype data (see
// demoIdentity.ts) — there is no real session, auth, or Sign Out yet. Every
// action inside the profile menu besides identity display is intentionally
// inert ("Coming Soon") for this sprint — see profile menu items below.
function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function ComingSoonBadge() {
  return (
    <span className="text-[8px] font-bold uppercase tracking-widest text-white/30 border border-white/15 rounded-full px-1.5 py-0.5 whitespace-nowrap">
      Soon
    </span>
  )
}

export function AppHeader() {
  return (
    <header className="hidden md:flex h-14 shrink-0 items-center justify-end gap-4 bg-[#0b0c0e] border-b border-white/10 px-6 print:hidden">
      {/* Feedback — conceptual home moved here from /admin. Inert, no form/state. */}
      <button
        type="button"
        disabled
        title="Feedback — coming soon"
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30 cursor-default"
      >
        Feedback
        <ComingSoonBadge />
      </button>

      <div className="h-4 w-px bg-white/10" />

      <Menu>
        <MenuTrigger
          className="flex items-center justify-center h-8 w-8 rounded-full bg-[#C8973A] text-[#0b0c0e] text-xs font-bold tracking-wide outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#C8973A]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]"
        >
          {initials(DEMO_IDENTITY.name)}
        </MenuTrigger>
        <MenuPortal>
          <MenuPositioner align="end" sideOffset={10}>
            <MenuContent>
              <div className="px-2.5 py-2">
                <p className="text-sm font-medium text-white">{DEMO_IDENTITY.name}</p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  {DEMO_IDENTITY.role} · {DEMO_IDENTITY.location}
                </p>
              </div>

              <MenuSeparator />

              <MenuItem disabled>
                Change User
                <ComingSoonBadge />
              </MenuItem>

              <MenuSeparator />

              <MenuLabel>Preferences</MenuLabel>
              <MenuItem disabled>
                Appearance
                <ComingSoonBadge />
              </MenuItem>

              <MenuSeparator />

              <MenuItem disabled>
                Help / About POURMP
                <ComingSoonBadge />
              </MenuItem>
            </MenuContent>
          </MenuPositioner>
        </MenuPortal>
      </Menu>
    </header>
  )
}
