# POURMP — Operations Guide

*For Manhattan Project Beer Co. staff — how to run an event through POURMP from booking to breakdown.*

Related: [README.md](README.md) · [ARCHITECTURE.md](ARCHITECTURE.md)

This guide walks through the life of one event, in order, the way an Event Coordinator actually works through it in POURMP. Every section names the real tab, button, or page you'll be looking at.

---

## 1. Creating an Event

Start at **`+ New Event`** (top of the Events page, or the Dashboard).

- Enter the **event name**, **date**, and **start time**. POURMP checks the date against Manhattan Project's actual business hours and won't let you pick a start time before the venue opens (plus a 1-hour buffer) or after close.
- Pick a **duration** (defaults to 180 minutes). POURMP automatically computes and fills in the supporting timeline from this: **Production Close** (2 hours before start), **Setup Begins** (90 minutes before start), **Decorate/Host Access** (1 hour before start), and **Event End**. You don't need to calculate these — check them, don't retype them.
- Choose the **space** and attach the **client** — search for an existing client or add a new one inline.
- If you already know the guest count and package, you can set them here too; otherwise leave catering for the Planning step below.
- **Status** defaults to **Confirmed** — that's the correct starting point. An event only reaches POURMP once it's a real booking; "New/Contacted/Converted" leads are handled separately (see the note at the end of this section).

Save, and you land on the event's detail page — the hub for everything that follows.

> **If this event came from a lead** (the public inquiry form at `/book`), create the event from the Leads view instead of from scratch — POURMP automatically marks that lead **Converted** and carries its details into the new event, so you're not re-typing what the customer already told you.

## 2. Planning

The event detail page has five tabs: **Overview, Catering, Floor Plan, Tasks, Notes.** Planning is the work of filling in Catering and Floor Plan (below) and watching two numbers on the Overview tab as you go:

- **Event Readiness Score** — a checklist-based percentage: guest count confirmed, catering package selected, bar tab type selected, setup/floor plan notes provided, dietary restrictions reviewed, staffing notes provided, contract signed. This is your **planning/admin** completeness — not whether day-of tasks are done.
- **Toast Status Tracker** — five checkboxes mirroring where the event actually stands in Toast: Proposal Sent, Confirmed, Invoice Sent, Deposit Received, Final Payment. Keep this current so anyone glancing at the event can answer "have we invoiced this yet?" without opening Toast. **Toast itself is still the real record** — this is just a fast internal mirror.

Move the event's **status** (Confirmed → Planning → Ready → Active) along the top of the page as work progresses — this drives which column it shows up in on the Dashboard's Kanban board and the Operations page's "This Week" section.

## 3. Menu Selection

Go to the **Catering** tab.

- Click **+ Add Package**, choose the package (e.g. Arepa Buffet), and enter that package's **guest count** and **buffer %**. An event can carry more than one package — for example a kids' menu alongside the adult buffet — and each one tracks its own guest count independently.
- POURMP calculates every item's **quantity and serving unit** automatically (a chafer, a half-chafer, a bowl, a platter — whatever the recipe's yield produces for that guest count). You'll see this in the Qty/Unit table right below the package.
- If a specific item needs to be split unevenly (say, more pork arepas and fewer black bean for one event), use the **piece-count field** next to that item to override the automatic even split — it's saved per event and doesn't touch the package's default recipe.
- Set **serve style** per item — "All at once" or "1 @ a time" (staggered) — this feeds directly into the Equipment count and Toast Notes, so set it to match how the buffet will actually be run.
- If the package has sauces tied to specific items, select which ones apply for this event in the sauce checkboxes.

Everything you enter here is the **source of truth** — the Catering Summary, the Equipment list, the Kitchen Sheet, and Toast Notes are all generated from exactly this data, so you only enter it once.

## 4. Floor Plans

Go to the **Floor Plan** tab.

- POURMP recommends a layout automatically based on guest count — table count, high-top count, seated capacity, and a capacity warning if you're pushing toward the venue's 75-guest ceiling. This updates the moment you change guest count on the Catering tab.
- Below the recommendation is a **standard setup checklist** pulled straight from the venue's floor plan reference, plus a **Big Screen TV** checkbox if the event needs it.
- Use the **Final Floor Plan Notes** field for anything that deviates from the standard recommendation (a specific layout request, a placement constraint, etc.) — this note is what shows up on the printed Floor Plan section of the BEO and Prep Docs.

## 5. Tasks

Go to the **Tasks** tab.

POURMP auto-generates a checklist the moment the event has enough data: **Setup** and **Breakdown** tasks always appear; **Dynamic** tasks appear only when they're relevant to this specific event (dessert logistics, kids attending, etc.). Every task is tagged with a role — **Lead, Kitchen, Bar,** or **FOH** — so each team can filter to just their own list.

Check items off as they're completed — day-of, this is what the **Task Completion** percentage on the Operations page is reading. This number is tracked separately from Readiness on purpose: a fully-planned event can still show incomplete setup tasks the morning of, and that distinction is what tells ownership where to actually intervene.

## 6. Prep Docs

Once catering, floor plan, and tasks are in reasonable shape, go to **Prep Docs** (`/prep-docs` from the sidebar, or the Prep Outputs tab on the event itself) and pick the event from the dropdown. Eleven documents are generated from the same event data:

| Doc | What it's for |
|---|---|
| **Toast Notes** | Copy/paste block for Toast's own event-notes field (see §7) |
| **Pre-Shift Brief** | One-page readiness/risk/task summary for a pre-shift huddle |
| **Main Bar Impact** | How much this event will load the main taproom bar |
| **Run of Show** | Minute-by-minute timeline from setup through breakdown |
| **Kitchen Sheet** | Printable prep quantities and equipment (see §8) |
| **FOH Notes** | Front-of-house setup/service checklist |
| **Bar Notes** | Bar-specific setup and tab handling |
| **Leads Pack** | Master control sheet for whoever's running point on the event |
| **Handoff Pack** | Full export for handing the event to someone else |
| **Setup Checklist** | Printable pre-event checklist |
| **Debrief** | Post-event form (see §11) |

Anything marked printable has a **Print / Save as PDF** button; the rest are copy/paste text blocks. Regenerate and re-check these any time the event's details change — they're always computed fresh from current data, never stale copies.

## 7. Toast Notes

**Toast Notes** deserves its own callout because of what it's *for*: it's the one Prep Doc explicitly meant to leave POURMP. Open it, hit **Copy to Clipboard**, and paste the whole block into the event's notes field inside Toast Catering & Events itself. It includes the event timeline, the full catering breakdown with serving vessels, bar tab details, Main Bar Impact level, and task complexity — everything Toast needs to reflect operationally, without you re-typing any of it a second time by hand.

## 8. Kitchen Coordination

Hand the **Kitchen Sheet** to the kitchen — either the printed version from Prep Docs, or the live version at `/prep/kitchen-sheet` (select the event from the dropdown there). It shows exact quantities and serving units per item, the piece counts behind each quantity, serve style (all at once vs. staggered), sauce assignments, and the full equipment count — full-size vs. half-size chafing dishes, sternos, and utensils, all derived from the same Catering Builder data you entered in §3. If quantities on this sheet ever look off, the fix is in the Catering tab, not on the sheet itself.

## 9. Day-of Execution

On the day of the event, use the **Today** dashboard (`/today`, or the Dashboard's date picker for a different day) — a card per event scheduled that day, with:

- A time strip: Production Closes → Setup Begins → Food Ready By → Event Start → Event End
- The buffet breakdown at a glance (package, guest count, item quantities, sauces)
- Bar setup (tab type, drink tickets, tab limit)
- Dietary restriction alerts, called out in red if present
- Staff notes (food, setup, staffing)
- Quick links straight to that event's Setup Checklist, full event page, Kitchen Sheet, and BEO

This is the page to have open on a shared screen or tablet during setup and service — it's a read-only summary, so nothing you do here changes the underlying event data.

## 10. Breakdown

Work through the **Breakdown** section of the Tasks tab the same way you did Setup — role by role, checked off as completed. The Setup Checklist and BEO both list the standard breakdown checklist (clear buffet, remove chafers/sternos, collect linens, reset tables, final walkthrough) if you need the reference printed rather than in the app.

## 11. Closing the Event

Once breakdown is done:

1. Move the event's **status to Closed** on the event detail page — this moves it out of the active Kanban board and Operations page, and into the **Archive**.
2. Fill out the **Debrief** (Prep Docs → Debrief, or the Debrief tab on the event): actual guest count vs. planned, what went well, any issues, catering accuracy, bar impact accuracy, and whether you'd repeat this client. If the client has booked before, POURMP shows their prior debrief history right alongside — use it.
3. Confirm the **Toast Status Tracker** is fully checked off (Final Payment marked) so the event's Toast record and its POURMP record agree.

That closes the loop — the event now lives in Archive, and its debrief becomes part of that client's history for the next time they book.
