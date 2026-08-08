"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"

function Menu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="menu" {...props} />
}

function MenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />
}

function MenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="menu-portal" {...props} />
}

function MenuPositioner({ className, sideOffset = 8, ...props }: MenuPrimitive.Positioner.Props) {
  return (
    <MenuPrimitive.Positioner
      data-slot="menu-positioner"
      sideOffset={sideOffset}
      className={cn("z-50 outline-none", className)}
      {...props}
    />
  )
}

function MenuContent({ className, children, ...props }: MenuPrimitive.Popup.Props) {
  return (
    <MenuPrimitive.Popup
      data-slot="menu-content"
      className={cn(
        "min-w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0b0c0e] p-1.5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.5)] outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        className
      )}
      {...props}
    >
      {children}
    </MenuPrimitive.Popup>
  )
}

function MenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        "flex cursor-default items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs tracking-wide text-white/80 outline-none select-none data-highlighted:bg-white/10 data-highlighted:text-white data-disabled:pointer-events-none data-disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
}

// Plain label, not @base-ui/react's Menu.GroupLabel — that part requires a
// wrapping Menu.Group/Menu.RadioGroup, which the profile menu doesn't need.
function MenuLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="menu-label"
      className={cn(
        "px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[#C8973A]",
        className
      )}
      {...props}
    />
  )
}

function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="menu-separator"
      className={cn("my-1 h-px bg-white/10", className)}
      {...props}
    />
  )
}

export {
  Menu,
  MenuTrigger,
  MenuPortal,
  MenuPositioner,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
}
