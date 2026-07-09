'use client'
import { shiftTime, to12Hour } from '@/lib/timeUtils'
import { DRINK_TICKET_PRICE } from '@/lib/constants'
import {
  calcAllItems,
  formatCateringText,
  formatEquipmentText,
  countChafingDishes,
  vesselLabelFor,
  parseMenuItemOverrides,
  formatCurrency,
} from '@/lib/calculations'
import type { EventForNotes } from '@/lib/noteGenerators'
import { calcBarImpact, IMPACT_PRINT_COLORS } from '@/lib/barImpact'
import { calcReadiness } from '@/lib/readiness'
import { TOAST_STAGES } from '@/lib/toastStatus'
import { RISK_LEVEL_COLORS } from '@/lib/riskScanner'
import { TASK_ROLES, calcTaskComplexity, COMPLEXITY_PRINT_COLORS, type TaskRole, type TaskContext } from '@/lib/tasks'
import type { EventTask } from '@/lib/db'
import type { RiskFlag } from '@/lib/riskScanner'
import type { ClientHistoryEntry } from '@/lib/prepOutputsData'

// ─── Shared print styles injected once ────────────────────────────────────────

export function PrintStyles() {
  return (
    <style>{`
      @media print {
        body { background: white !important; color: black !important; }
        nav, [data-sidenav], .no-print { display: none !important; }
        .print-doc { box-shadow: none !important; border: none !important; }
        .print-page-break { page-break-after: always; }
        @page { margin: 0.5in 0.75in 0.75in 0.75in; size: letter; }
      }
    `}</style>
  )
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────

interface DocProps {
  title: string
  ev: EventForNotes
  children: React.ReactNode
}

function fmtDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return dateStr }
}

export function PrintDoc({ title, ev, children }: DocProps) {
  return (
    <div className="print-doc bg-white text-gray-900 rounded-xl overflow-hidden shadow-sm border border-gray-200">
      {/* MP Header */}
      <div className="border-b-2 border-[#C8973A] px-8 pt-4 pb-4">
        <p className="font-[var(--font-josefin)] text-[10px] tracking-[0.25em] uppercase text-[#C8973A] mb-1">
          Manhattan Project Beer Co. · Internal Operations
        </p>
        <h1 className="font-[var(--font-josefin)] text-2xl font-bold uppercase tracking-wider text-gray-900 leading-tight">
          {title}
        </h1>
        <h2 className="font-[var(--font-crimson)] text-xl italic text-gray-600 mt-1">
          {ev.event_name}
        </h2>
        <p className="font-[var(--font-josefin)] text-xs tracking-wide text-gray-500 mt-2">
          {fmtDate(ev.event_date)}
          {ev.event_time ? ` · ${to12Hour(ev.event_time)} – ${to12Hour(ev.teardown_time)}` : ''}
          {ev.space ? ` · ${ev.space}` : ''}
          {ev.guest_count > 0 ? ` · ${ev.guest_count} Guests` : ''}
        </p>
      </div>

      {/* Body */}
      <div className="px-8 py-6 space-y-6">
        {children}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-8 py-3 flex justify-between items-center">
        <p className="font-[var(--font-josefin)] text-[9px] tracking-widest uppercase text-gray-400">
          Internal Use Only — Pre-Toast Document
        </p>
        <p className="font-[var(--font-josefin)] text-[9px] tracking-widest uppercase text-gray-400">
          Manhattan Project Beer Co.
        </p>
      </div>
    </div>
  )
}

// ─── Section / Row primitives ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-[var(--font-josefin)] text-[10px] font-bold tracking-[0.2em] uppercase text-[#C8973A] border-b border-[#C8973A]/30 pb-1 mb-3">
        {title}
      </h3>
      <div className="space-y-1.5">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="font-[var(--font-josefin)] text-[10px] uppercase tracking-wider text-gray-400 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="font-[var(--font-crimson)] text-base text-gray-800 flex-1">{value}</span>
    </div>
  )
}

function TimeRow({ time, label }: { time: string; label: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="font-[var(--font-josefin)] text-sm font-bold text-gray-900 w-20 shrink-0">{to12Hour(time)}</span>
      <span className="font-[var(--font-crimson)] text-base text-gray-700">{label}</span>
    </div>
  )
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 w-4 h-4 border border-gray-400 rounded-sm inline-block" />
      <span className="font-[var(--font-crimson)] text-base text-gray-800 leading-snug">{children}</span>
    </div>
  )
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#C8973A] mt-1 shrink-0">•</span>
      <span className="font-[var(--font-crimson)] text-base text-gray-800 leading-snug">{children}</span>
    </div>
  )
}

function PolicyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-[var(--font-crimson)] text-sm italic text-gray-500 leading-snug">{children}</p>
  )
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">{children}</div>
}

function ImpactBadge({ ev }: { ev: EventForNotes }) {
  const impact = calcBarImpact(ev)
  return (
    <span className="font-[var(--font-josefin)] font-bold" style={{ color: IMPACT_PRINT_COLORS[impact.level] }}>
      {impact.level.toUpperCase()}
    </span>
  )
}

function ImpactRow({ ev, label = 'Main Bar Impact' }: { ev: EventForNotes; label?: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="font-[var(--font-josefin)] text-[10px] uppercase tracking-wider text-gray-400 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="font-[var(--font-crimson)] text-base flex-1"><ImpactBadge ev={ev} /></span>
    </div>
  )
}

// ─── Task checklist (role-filtered, open tasks only) ──────────────────────────

function TaskChecklist({ tasks, role, category }: { tasks?: EventTask[]; role: TaskRole; category?: EventTask['category'] }) {
  if (!tasks) return null
  const open = tasks.filter(t => t.role === role && !t.completed && (!category || t.category === category))
  if (open.length === 0) {
    return <p className="font-[var(--font-crimson)] text-sm text-gray-500 italic">No open {role} tasks.</p>
  }
  return (
    <div className="space-y-1">
      {open.map(t => <CheckItem key={t.id}>{t.label}</CheckItem>)}
    </div>
  )
}

// ─── Extra tab notes dedup ─────────────────────────────────────────────────────

const STANDARD_TAB_DESCRIPTIONS: Record<string, string> = {
  'Pre-Paid Drink Ticket(s)': 'Includes all beer selections on tap, wine, rosé, sparkling brut, beer- and wine-based cocktails, coffee, and non-alcoholic beverage options.',
  'By Consumption': 'All event beverages are to be rung to the event tab and charged according to actual consumption.',
  'Individual Tabs': 'Guests will open individual tabs directly at the bar for drink selections only.',
}
function extraTabNotes(ev: EventForNotes): string {
  if (!ev.tab_details) return ''
  const standard = STANDARD_TAB_DESCRIPTIONS[ev.bar_tab_type ?? ''] ?? ''
  return ev.tab_details.trim() === standard.trim() ? '' : ev.tab_details.trim()
}

function beverageLabel(ev: EventForNotes) {
  if (!ev.bar_tab_type) return '—'
  if (ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)') {
    const qty = ev.drink_tickets ?? 0
    return `BAR TAB | Pre-Paid Drink Tickets${qty > 0 ? ` (${qty} @ $${DRINK_TICKET_PRICE.toFixed(2)} each)` : ''}`
  }
  return `BAR TAB | ${ev.bar_tab_type}`
}

// ─── RUN OF SHOW ──────────────────────────────────────────────────────────────

export function RunOfShowDoc({ ev, tasks }: { ev: EventForNotes; tasks?: EventTask[] }) {
  const decorateTime = ev.decorate_time || ev.setup_time
  const foodServed = shiftTime(ev.event_time, -15)
  const lastCall = shiftTime(ev.teardown_time, -30)

  return (
    <PrintDoc title="Run of Show" ev={ev}>
      {tasks && (
        <Section title="Lead Tasks">
          <TaskChecklist tasks={tasks} role="Lead" />
        </Section>
      )}

      <Section title="Timeline">
        {ev.production_close_time && <TimeRow time={ev.production_close_time} label="Production space closed off" />}
        {ev.setup_time && <TimeRow time={ev.setup_time} label="MP event setup begins" />}
        {decorateTime && <TimeRow time={decorateTime} label="Host / decorator access begins" />}
        {foodServed && <TimeRow time={foodServed} label="Food service begins" />}
        {ev.event_time && <TimeRow time={ev.event_time} label="Event starts — guests arrive" />}
        {lastCall && <TimeRow time={lastCall} label="Last call" />}
        {ev.teardown_time && <TimeRow time={ev.teardown_time} label="Event ends — reset begins" />}
      </Section>

      <Section title="Setup Access">
        <BulletItem>Host/decorator access begins at {to12Hour(decorateTime)}.</BulletItem>
        <BulletItem>FOH confirms tables, linens, buffet placement, drink ticket setup, signage, and trash placement.</BulletItem>
        {ev.setup_notes && <BulletItem>Setup Notes: {ev.setup_notes}</BulletItem>}
        {ev.floor_plan_notes && <BulletItem>Floor Plan: {ev.floor_plan_notes}</BulletItem>}
      </Section>

      <Section title="Guest Arrival">
        <BulletItem>Guests enter through taproom/event space glass door.</BulletItem>
        <BulletItem>Bar service begins — {beverageLabel(ev)}</BulletItem>
        {ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && (ev.drink_tickets ?? 0) > 0 && (
          <BulletItem>{ev.drink_tickets} tickets — host distributes, redeemed at bar on event tab.</BulletItem>
        )}
        <BulletItem>Main Bar Impact: <ImpactBadge ev={ev} /> — give main bar a heads-up before guests arrive.</BulletItem>
        <BulletItem>FOH monitors guest flow and answers host questions.</BulletItem>
        <BulletItem>Restrooms: exit through glass door closest to event space.</BulletItem>
      </Section>

      <Section title="Food Service">
        <Row label="Package" value={ev.package_name} />
        <Row label="Guest Count" value={ev.guest_count > 0 ? String(ev.guest_count) : undefined} />
        <Row label="Dietary Notes" value={ev.dietary_restrictions} />
        <Row label="Sauce Notes" value={ev.selected_sauces} />
        <Row label="Food Notes" value={ev.food_notes} />
        <Row label="Kitchen Notes" value={ev.kitchen_notes} />
      </Section>

      <Section title="Beverage Service">
        <Row label="Beverage Option" value={beverageLabel(ev)} />
        {extraTabNotes(ev) && <Row label="Notes" value={extraTabNotes(ev)} />}
        <BulletItem>Last call at {to12Hour(lastCall)} (30 min before event end).</BulletItem>
        <BulletItem>Responsible service: refuse service to visibly intoxicated guests.</BulletItem>
        <BulletItem>No outside alcohol permitted.</BulletItem>
      </Section>

      <Section title="Event Close & Reset">
        <BulletItem>Event ends at {to12Hour(ev.teardown_time)} — bar closed.</BulletItem>
        <BulletItem>Host walkthrough — confirm all décor and personal items removed.</BulletItem>
        <BulletItem>Final payment reminder if balance outstanding.</BulletItem>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2">
          {['Clear all tables','Remove and bag linens','Reset tables to standard layout','Trash check — replace liners','Sweep / spot clean floor','Return production space to standard'].map(t => (
            <CheckItem key={t}>{t}</CheckItem>
          ))}
        </div>
      </Section>
    </PrintDoc>
  )
}

// ─── Catering item renderer (used by KitchenSheetDoc) ────────────────────────

function CateringItems({ ev }: { ev: EventForNotes }) {
  if (!ev.menuItems || ev.menuItems.length === 0 || !ev.package_name) {
    return <p className="font-[var(--font-crimson)] text-base italic text-gray-400">No catering package selected.</p>
  }

  const items = calcAllItems(
    ev.menuItems as Parameters<typeof calcAllItems>[0],
    ev.guest_count,
    (ev.buffer_pct ?? 0) / 100,
    parseMenuItemOverrides(ev.menu_item_overrides_json),
  )

  const sauceSet = ev.selected_sauces
    ? new Set(ev.selected_sauces.split(',').map(s => s.trim()).filter(Boolean))
    : null

  const SAUCE_RULES_LOCAL = [
    { trigger: 'French Fries',   sauces: ['Ketchup', 'Garlic Aioli'],           selectable: false },
    { trigger: 'Thai Fried Chicken', sauces: ['Thai Chili Sauce', 'Nam Jim'],   selectable: true  },
  ]

  function saucesFor(itemName: string): string[] {
    return SAUCE_RULES_LOCAL
      .filter(r => itemName.toLowerCase().includes(r.trigger.toLowerCase()))
      .flatMap(r => r.sauces.filter(s => !r.selectable || !sauceSet || sauceSet.has(s)))
  }

  const rendered = items.filter(item => typeof item.total_qty === 'number' && item.total_qty > 0)

  return (
    <div className="space-y-1.5">
      <p className="font-[var(--font-josefin)] text-sm font-bold tracking-wide text-gray-900 mb-2">
        {ev.package_name.toUpperCase()}
      </p>
      {rendered.map((item, i) => {
        const isStaggered = typeof item.total_qty === 'number' && item.total_qty > 1
        const sauces = saucesFor(item.item_name)
        return (
          <div key={i}>
            <div className="flex items-baseline gap-3">
              <span className="font-[var(--font-josefin)] text-sm font-semibold text-gray-900 shrink-0 w-6 text-right">
                ({item.total_qty})
              </span>
              <span className="font-[var(--font-crimson)] text-base text-gray-800 flex-1">
                {vesselLabelFor(item) ? `${vesselLabelFor(item)} of ` : ''}{item.item_name}
                {item.piece_count ? ` (${item.piece_count} pcs)` : ''}
                {isStaggered && (
                  <span className="text-gray-500 text-sm"> — Serve 1 at a time</span>
                )}
              </span>
              {item.purchase_unit && (
                <span className="font-[var(--font-josefin)] text-xs text-gray-400 tracking-wide shrink-0">
                  {item.purchase_unit}
                </span>
              )}
            </div>
            {sauces.map(s => (
              <p key={s} className="font-[var(--font-crimson)] text-sm text-gray-500 ml-10">— {s}</p>
            ))}
            {item.half_pan_qty ? (
              <div className="flex items-baseline gap-3">
                <span className="font-[var(--font-josefin)] text-sm font-semibold text-gray-900 shrink-0 w-6 text-right">
                  ({item.half_pan_qty})
                </span>
                <span className="font-[var(--font-crimson)] text-base text-gray-800 flex-1">
                  Half Chafer of {item.item_name}
                </span>
              </div>
            ) : null}
          </div>
        )
      })}
      {(ev.buffer_pct ?? 0) > 0 && (
        <p className="font-[var(--font-josefin)] text-xs tracking-wide text-gray-500 pt-1">
          Prep count with {ev.buffer_pct ?? 0}% buffer: {Math.ceil(ev.guest_count * (1 + (ev.buffer_pct ?? 0) / 100))} guests
        </p>
      )}
    </div>
  )
}

// ─── KITCHEN SHEET ────────────────────────────────────────────────────────────

export function KitchenSheetDoc({ ev, tasks }: { ev: EventForNotes; tasks?: EventTask[] }) {
  const items = ev.menuItems
    ? calcAllItems(ev.menuItems as Parameters<typeof calcAllItems>[0], ev.guest_count, (ev.buffer_pct ?? 0) / 100, parseMenuItemOverrides(ev.menu_item_overrides_json))
    : []
  const serveStyle = (() => { try { return JSON.parse(ev.serve_style_json ?? '{}') } catch { return {} } })()
  const chafing = countChafingDishes(items, serveStyle)

  // Build equipment lines individually
  const equipmentLines: string[] = []
  if (chafing.fullSize > 0) equipmentLines.push(`(${chafing.fullSize}) Full-Size Chafing ${chafing.fullSize === 1 ? 'Dish' : 'Dishes'}`)
  if (chafing.halfSize > 0) equipmentLines.push(`(${chafing.halfSize}) Half-Size Chafing ${chafing.halfSize === 1 ? 'Dish' : 'Dishes'}`)
  if (chafing.total > 0)   equipmentLines.push(`(${chafing.total * 2}) Sternos`)

  // Count utensils from servingware rules
  const UTENSIL_TRIGGERS = [
    { trigger: 'French Fries',       utensil: 'Tongs'         },
    { trigger: 'Chips',              utensil: 'Tongs'         },
    { trigger: 'Arepa',              utensil: 'Tongs'         },
    { trigger: 'Thai Fried Chicken', utensil: 'Tongs'         },
    { trigger: 'Shrimp Kabob',       utensil: 'Tongs'         },
    { trigger: 'Thai Chicken Kabob', utensil: 'Tongs'         },
    { trigger: 'Slider',             utensil: 'Tongs'         },
    { trigger: 'Veggies',            utensil: 'Tongs'         },
    { trigger: 'Cheese',             utensil: 'Tongs'         },
    { trigger: 'Hummus',             utensil: 'Serving Spoon' },
    { trigger: 'Rice',               utensil: 'Serving Spoon' },
    { trigger: 'Salsa',              utensil: 'Small Ladle'   },
    { trigger: 'Queso',              utensil: 'Small Ladle'   },
    { trigger: 'Slaw',               utensil: 'Tongs'         },
    { trigger: 'Salad',              utensil: 'Tongs'         },
  ]
  const utensilCounts = new Map<string, number>()
  for (const item of items) {
    if (typeof item.total_qty !== 'number') continue
    const dishCount = item.total_qty + (item.half_pan_qty ?? 0)
    if (dishCount === 0) continue
    const rule = UTENSIL_TRIGGERS.find(r => item.item_name.toLowerCase().includes(r.trigger.toLowerCase()))
    if (rule) utensilCounts.set(rule.utensil, (utensilCounts.get(rule.utensil) ?? 0) + dishCount)
  }
  Array.from(utensilCounts.entries()).forEach(([utensil, count]) => {
    equipmentLines.push(`(${count}) ${utensil}${count > 1 && utensil !== 'Tongs' ? 's' : ''}`)
  })

  return (
    <PrintDoc title="Kitchen Sheet" ev={ev}>
      {tasks && (
        <Section title="Kitchen Tasks">
          <TaskChecklist tasks={tasks} role="Kitchen" />
        </Section>
      )}

      <Section title="Catering Order">
        <CateringItems ev={ev} />
      </Section>

      {equipmentLines.length > 0 && (
        <Section title="Service Equipment">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {equipmentLines.map((line, i) => (
              <span key={i} className="font-[var(--font-crimson)] text-base text-gray-800">{line}</span>
            ))}
          </div>
        </Section>
      )}

      <TwoCol>
        <Section title="Dietary / Allergy Notes">
          <p className="font-[var(--font-crimson)] text-base text-gray-800">{ev.dietary_restrictions || 'None noted'}</p>
        </Section>
        <Section title="Sauce Notes">
          <p className="font-[var(--font-crimson)] text-base text-gray-800">{ev.selected_sauces || '—'}</p>
        </Section>
      </TwoCol>

      {ev.food_notes && (
        <Section title="Additional Food Notes">
          <p className="font-[var(--font-crimson)] text-base text-gray-800">{ev.food_notes}</p>
        </Section>
      )}

      <Section title="Kitchen Notes">
        <p className="font-[var(--font-crimson)] text-base text-gray-800">{ev.kitchen_notes || '—'}</p>
        <PolicyNote>Taproom food menu is NOT available during private events.</PolicyNote>
        {ev.production_close_time && (
          <PolicyNote>All food production stops at production close: {to12Hour(ev.production_close_time)}</PolicyNote>
        )}
      </Section>
    </PrintDoc>
  )
}

// ─── FOH NOTES ────────────────────────────────────────────────────────────────

export function FOHNotesDoc({ ev, tasks }: { ev: EventForNotes; tasks?: EventTask[] }) {
  const decorateTime = ev.decorate_time || ev.setup_time
  const lastCall = shiftTime(ev.teardown_time, -30)

  return (
    <PrintDoc title="FOH Notes" ev={ev}>
      {tasks && (
        <Section title="FOH Tasks">
          <TaskChecklist tasks={tasks} role="FOH" />
        </Section>
      )}

      <Section title="Timeline">
        {ev.production_close_time && <TimeRow time={ev.production_close_time} label="Production space closed off" />}
        {ev.setup_time && <TimeRow time={ev.setup_time} label="MP setup begins" />}
        {decorateTime && <TimeRow time={decorateTime} label="Host arrival / decorating access" />}
        {ev.event_time && <TimeRow time={shiftTime(ev.event_time, -15)} label="Food service begins" />}
        {ev.event_time && <TimeRow time={ev.event_time} label="Event starts — guests arrive" />}
        {lastCall && <TimeRow time={lastCall} label="Last call" />}
        {ev.teardown_time && <TimeRow time={ev.teardown_time} label="Event ends — reset begins" />}
      </Section>

      <Section title="Main Bar Impact">
        <ImpactRow ev={ev} label="Expected Impact" />
        {calcBarImpact(ev).guestFlowNotes.map((note, i) => (
          <BulletItem key={i}>{note}</BulletItem>
        ))}
      </Section>

      <Section title="Setup Checklist">
        <CheckItem>Tables and chairs set per floor plan{ev.floor_plan_notes ? ` — ${ev.floor_plan_notes}` : ''}</CheckItem>
        <CheckItem>Linens placed</CheckItem>
        <CheckItem>Buffet station set{ev.setup_notes ? ` — ${ev.setup_notes}` : ''}</CheckItem>
        {ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && (ev.drink_tickets ?? 0) > 0 && (
          <CheckItem>Drink tickets staged — {ev.drink_tickets} tickets for host distribution</CheckItem>
        )}
        <CheckItem>Signage placed</CheckItem>
        <CheckItem>Trash can with liner positioned</CheckItem>
        {ev.big_screen_tv ? <CheckItem>TV / HDMI connected and tested</CheckItem> : null}
      </Section>

      <Section title="Service Reminders">
        <BulletItem>Guests enter through taproom/event space glass door.</BulletItem>
        <BulletItem>Restrooms: exit through glass door closest to event space.</BulletItem>
        <BulletItem>Guests may NOT walk through employee-only production areas.</BulletItem>
        <BulletItem>Production exit doors are emergency-use only.</BulletItem>
        {ev.guest_count > 0 && ev.guest_count < 30 && (
          <BulletItem>Guest count under 30 — production space may be shared with other guests.</BulletItem>
        )}
        <BulletItem>Children allowed but must remain supervised.</BulletItem>
        <BulletItem>No outside vendors, musicians, DJs, or live performances.</BulletItem>
        <BulletItem>Decorations must be free-standing — no glitter or confetti.</BulletItem>
        <BulletItem>Cakes/cupcakes allowed — host provides plates, utensils, napkins, and cleanup.</BulletItem>
      </Section>

      {ev.staffing_notes && (
        <Section title="Staffing Notes">
          <p className="font-[var(--font-crimson)] text-base text-gray-800">{ev.staffing_notes}</p>
        </Section>
      )}
    </PrintDoc>
  )
}

// ─── BAR NOTES ────────────────────────────────────────────────────────────────

export function BarNotesDoc({ ev, tasks }: { ev: EventForNotes; tasks?: EventTask[] }) {
  const lastCall = shiftTime(ev.teardown_time, -30)

  const impact = calcBarImpact(ev)

  return (
    <PrintDoc title="Bar Notes" ev={ev}>
      <Section title="Main Bar Impact">
        <ImpactRow ev={ev} />
        {impact.congestionNotes.map((note, i) => (
          <BulletItem key={i}>{note}</BulletItem>
        ))}
      </Section>

      {tasks && (
        <Section title="Bar Tasks">
          <TaskChecklist tasks={tasks} role="Bar" />
        </Section>
      )}

      <Section title="Beverage Setup">
        <Row label="Beverage Option" value={beverageLabel(ev)} />
        {ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && (ev.drink_tickets ?? 0) > 0 && (
          <Row label="Ticket Value" value={`${ev.drink_tickets} tickets · $${(ev.drink_tickets! * DRINK_TICKET_PRICE).toFixed(2)} total`} />
        )}
        {extraTabNotes(ev) && <Row label="Notes" value={extraTabNotes(ev)} />}
      </Section>

      <Section title="Bar Checklist">
        {ev.bar_tab_type === 'Pre-Paid Drink Ticket(s)' && (ev.drink_tickets ?? 0) > 0 && <>
          <CheckItem>Stage {ev.drink_tickets} drink tickets for host distribution</CheckItem>
          <CheckItem>Tickets redeemed at bar — ring to event tab</CheckItem>
        </>}
        {ev.bar_tab_type === 'By Consumption' && <>
          <CheckItem>Open host tab in Toast at event start</CheckItem>
          <CheckItem>All event beverages rung to event tab — confirm tab holder with host</CheckItem>
        </>}
        {ev.bar_tab_type === 'Individual Tabs' && <>
          <CheckItem>Guests open individual tabs at bar — drink selections only</CheckItem>
          <CheckItem>Food items may NOT be added to individual guest tabs</CheckItem>
        </>}
        <CheckItem>Last call at {to12Hour(lastCall)} (30 min before event end)</CheckItem>
        <CheckItem>Bar closed at {to12Hour(ev.teardown_time)}</CheckItem>
      </Section>

      <Section title="Responsible Service Policy">
        <BulletItem>No outside alcohol permitted under any circumstances.</BulletItem>
        <BulletItem>No capped open bars — budget control via pre-paid drink tickets only.</BulletItem>
        <BulletItem>In accordance with responsible alcohol service practices, Manhattan Project Beer Co. reserves the right to refuse service to any guest who appears intoxicated. Guests and hosts are expected to comply with all applicable alcohol laws. Management decision on service is final.</BulletItem>
      </Section>
    </PrintDoc>
  )
}

// ─── SETUP CHECKLIST ──────────────────────────────────────────────────────────

export function SetupChecklistDoc({ ev, tasks }: { ev: EventForNotes; tasks?: EventTask[] }) {
  const decorateTime = ev.decorate_time || ev.setup_time
  const lastCall = shiftTime(ev.teardown_time, -30)

  return (
    <PrintDoc title="Setup Checklist" ev={ev}>
      <TwoCol>
        <Section title="Key Times">
          {ev.production_close_time && <TimeRow time={ev.production_close_time} label="Production close" />}
          {ev.setup_time && <TimeRow time={ev.setup_time} label="MP setup begins" />}
          {decorateTime && <TimeRow time={decorateTime} label="Host access" />}
          {ev.event_time && <TimeRow time={ev.event_time} label="Event start" />}
          {lastCall && <TimeRow time={lastCall} label="Last call" />}
          {ev.teardown_time && <TimeRow time={ev.teardown_time} label="Event end" />}
        </Section>
        <Section title="Event Info">
          <Row label="Host" value={`${ev.first_name} ${ev.last_name}${ev.company ? ' / ' + ev.company : ''}`} />
          <Row label="Package" value={ev.package_name} />
          <Row label="Beverage" value={ev.bar_tab_type ? `BAR TAB | ${ev.bar_tab_type}` : undefined} />
          {ev.big_screen_tv ? <Row label="AV" value="TV / HDMI requested" /> : null}
          <ImpactRow ev={ev} />
        </Section>
      </TwoCol>

      <Section title="Setup Tasks">
        <TwoCol>
          {TASK_ROLES.map(role => (
            <div key={role}>
              <p className="font-[var(--font-josefin)] text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{role}</p>
              <TaskChecklist tasks={tasks} role={role} category="Setup" />
            </div>
          ))}
        </TwoCol>
        {ev.floor_plan_notes && <PolicyNote>Floor Plan: {ev.floor_plan_notes}</PolicyNote>}
      </Section>
    </PrintDoc>
  )
}

// ─── LEADS PACK ───────────────────────────────────────────────────────────────
// Master control sheet for whoever is running point on the event — readiness,
// Toast status, main bar impact, and a condensed timeline in one place.

export function LeadsPackDoc({ ev, tasks, risks, clientHistory }: { ev: EventForNotes; tasks?: EventTask[]; risks?: RiskFlag[]; clientHistory?: ClientHistoryEntry[] }) {
  const decorateTime = ev.decorate_time || ev.setup_time
  const lastCall = shiftTime(ev.teardown_time, -30)
  const impact = calcBarImpact(ev)
  const readiness = calcReadiness({
    guest_count: ev.guest_count,
    hasPackage: !!ev.package_name,
    bar_tab_type: ev.bar_tab_type,
    setup_notes: ev.setup_notes,
    floor_plan_notes: ev.floor_plan_notes,
    dietary_restrictions: ev.dietary_restrictions,
    staffing_notes: ev.staffing_notes,
    contract_signed: ev.contract_signed,
  })
  const dynamicCount = tasks?.filter(t => t.category === 'Dynamic').length ?? 0
  const taskCtx: TaskContext = {
    guestCount: ev.guest_count,
    hasPackage: !!ev.package_name,
    packageCount: ev.package_name ? 1 : 0,
    barTabType: ev.bar_tab_type,
    drinkTickets: ev.drink_tickets,
    bigScreenTv: ev.big_screen_tv,
    barImpactLevel: impact.level,
  }
  const complexity = calcTaskComplexity(taskCtx, dynamicCount)

  return (
    <PrintDoc title="Leads Pack" ev={ev}>
      <TwoCol>
        <Section title="Planning Readiness">
          <div className="flex items-baseline gap-2">
            <span className="font-[var(--font-josefin)] text-3xl font-bold text-gray-900">{readiness.score}%</span>
            <span className="font-[var(--font-josefin)] text-[10px] uppercase tracking-widest text-gray-400">operational</span>
          </div>
          {readiness.missingLabels.length === 0 ? (
            <p className="font-[var(--font-crimson)] text-sm text-gray-600 mt-1">All operational checks complete.</p>
          ) : (
            <div className="mt-1 space-y-0.5">
              {readiness.missingLabels.map(label => <BulletItem key={label}>{label}</BulletItem>)}
            </div>
          )}
        </Section>

        <Section title="Toast Status">
          {TOAST_STAGES.map(stage => {
            const date = ev[stage.key]
            return (
              <div key={stage.key} className="flex items-center gap-2 text-sm">
                <span className={`w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center text-[10px] ${date ? 'bg-gray-800 border-gray-800 text-white' : 'border-gray-400'}`}>
                  {date ? '✓' : ''}
                </span>
                <span className="font-[var(--font-crimson)] text-base text-gray-800">{stage.label}</span>
                {date && <span className="font-[var(--font-josefin)] text-[10px] text-gray-400 ml-auto">{date}</span>}
              </div>
            )
          })}
        </Section>
      </TwoCol>

      <Section title="Main Bar Impact">
        <ImpactRow ev={ev} />
        {impact.congestionNotes.slice(0, 3).map((note, i) => (
          <BulletItem key={i}>{note}</BulletItem>
        ))}
      </Section>

      <div className="flex gap-2 text-sm">
        <span className="font-[var(--font-josefin)] text-[10px] uppercase tracking-wider text-gray-400 w-36 shrink-0 pt-0.5">Task Complexity</span>
        <span className="font-[var(--font-josefin)] font-bold flex-1" style={{ color: COMPLEXITY_PRINT_COLORS[complexity.level] }}>
          {complexity.level}
        </span>
      </div>

      {tasks && tasks.length > 0 && (
        <div className="flex gap-2 text-sm">
          <span className="font-[var(--font-josefin)] text-[10px] uppercase tracking-wider text-gray-400 w-36 shrink-0 pt-0.5">Task Completion</span>
          <span className="font-[var(--font-josefin)] font-bold flex-1 text-gray-900">
            {tasks.filter(t => !!t.completed).length}/{tasks.length} complete
          </span>
        </div>
      )}

      {tasks && (
        <Section title="Open Tasks by Role">
          <TwoCol>
            {TASK_ROLES.map(role => (
              <div key={role}>
                <p className="font-[var(--font-josefin)] text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{role}</p>
                <TaskChecklist tasks={tasks} role={role} />
              </div>
            ))}
          </TwoCol>
        </Section>
      )}

      <Section title="Financial Tracking">
        <p className="font-[var(--font-crimson)] text-[11px] text-gray-500 mb-1 italic">Internal visibility only — Toast processes all payments.</p>
        <TwoCol>
          <Row label="Total Event Value" value={ev.total_event_value != null ? formatCurrency(ev.total_event_value) : undefined} />
          <Row label="Deposit Due" value={ev.deposit_due != null ? formatCurrency(ev.deposit_due) : undefined} />
          <Row label="Deposit Received" value={ev.deposit_received != null ? formatCurrency(ev.deposit_received) : undefined} />
          <Row label="Deposit Outstanding" value={formatCurrency(Math.max(0, (ev.deposit_due ?? 0) - (ev.deposit_received ?? 0)))} />
          <Row label="Final Amount Due" value={ev.final_amount_due != null ? formatCurrency(ev.final_amount_due) : undefined} />
          <Row label="Final Amount Received" value={ev.final_amount_received != null ? formatCurrency(ev.final_amount_received) : undefined} />
          <Row label="Final Outstanding" value={formatCurrency(Math.max(0, (ev.final_amount_due ?? 0) - (ev.final_amount_received ?? 0)))} />
        </TwoCol>
      </Section>

      <Section title="Risk Scanner Summary">
        {!risks || risks.length === 0 ? (
          <p className="font-[var(--font-crimson)] text-sm text-gray-600">No active risk flags.</p>
        ) : (
          <div className="space-y-1.5">
            {risks.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={`shrink-0 font-[var(--font-josefin)] text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${RISK_LEVEL_COLORS[r.level].text} ${RISK_LEVEL_COLORS[r.level].border}`}
                >
                  {r.level}
                </span>
                <span className="font-[var(--font-crimson)] text-base text-gray-800 leading-snug">
                  <strong>{r.category}:</strong> {r.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {clientHistory && clientHistory.length > 0 && (
        <Section title="Repeat Client Intelligence">
          <p className="font-[var(--font-crimson)] text-base text-gray-800">
            {clientHistory.length} past event{clientHistory.length === 1 ? '' : 's'} on file —{' '}
            {clientHistory.filter(h => h.would_repeat_client === 'Yes').length} of {clientHistory.length} marked would-repeat.
          </p>
        </Section>
      )}

      <Section title="Quick Timeline">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          {ev.production_close_time && <TimeRow time={ev.production_close_time} label="Production closed off" />}
          {ev.setup_time && <TimeRow time={ev.setup_time} label="MP setup begins" />}
          {decorateTime && <TimeRow time={decorateTime} label="Host access begins" />}
          {ev.event_time && <TimeRow time={ev.event_time} label="Event starts" />}
          {lastCall && <TimeRow time={lastCall} label="Last call" />}
          {ev.teardown_time && <TimeRow time={ev.teardown_time} label="Event ends" />}
        </div>
      </Section>

      <Section title="Key Info">
        <Row label="Host" value={`${ev.first_name} ${ev.last_name}${ev.company ? ' / ' + ev.company : ''}`} />
        <Row label="Package" value={ev.package_name} />
        <Row label="Beverage" value={ev.bar_tab_type ? `BAR TAB | ${ev.bar_tab_type}` : undefined} />
        {ev.staffing_notes && <Row label="Staffing Notes" value={ev.staffing_notes} />}
      </Section>
    </PrintDoc>
  )
}
