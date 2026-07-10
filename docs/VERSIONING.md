# POURMP — Versioning Guidelines

Related: [VERSION_HISTORY.md](VERSION_HISTORY.md) · [CHANGELOG.md](CHANGELOG.md) · [ROADMAP.md](ROADMAP.md)

This is the process to follow from here forward, so version history stops being reconstructed after the fact from git logs and instead gets written down as work happens.

## Version numbers

POURMP uses `MAJOR.MINOR.PATCH`, pre-1.0:

- **MAJOR (`1.0`)** — reserved for the first release that clears everything in the **High Priority** section of [ROADMAP.md](ROADMAP.md). Until then, everything stays `0.x`.
- **MINOR (`0.X.0`)** — a new feature, page, or data-model addition. Anything that shows up as a new bullet under "Added" in the changelog.
- **PATCH (`0.X.Y`)** — a bug fix, consistency fix, or internal refactor with no new user-facing capability. Anything that's only "Fixed" and/or "Architectural" in the changelog, with nothing under "Added."

If a change is a mix (a new feature that also fixes something along the way), it takes the higher of the two — bump MINOR.

## When you land a major feature or architectural change

Every time you finish something that would read as a real changelog entry, before moving on:

1. **Update `docs/CHANGELOG.md`.**
   Add a new entry at the top (or update `[Unreleased]` if it's still uncommitted). Use only the categories that apply — **Added / Improved / Removed / Fixed / Architectural** — don't pad the entry with empty sections.

2. **Recommend the next version number.**
   Apply the MAJOR/MINOR/PATCH rule above and state it explicitly, e.g. "this should ship as `0.8.0`." Don't silently pick a number — say why.

3. **Summarize what changed.**
   A few plain-language bullets under the right category. Write for someone who wasn't in the room: what's different now, not how the code does it.

4. **Identify any breaking changes.**
   Call out anything that changes existing behavior a staff member might rely on — a renamed field, a doc that now looks different, a workflow that now requires an extra step. If there are none, say so explicitly ("No breaking changes") rather than leaving it unaddressed.

5. **Document architectural decisions.**
   If the change touched the data model, added a migration, introduced a new shared module, or replaced a pattern that was duplicated in multiple places, put that under **Architectural** in the changelog entry — even if it's invisible to a user. Future work (including future audits) depends on this being written down, not re-discovered by reading the diff.

## When a version reaches a real milestone

If enough MINOR bumps accumulate into something that reads as a coherent chapter (the way `0.1`–`0.7` are grouped in [VERSION_HISTORY.md](VERSION_HISTORY.md)), add a new section there too, in the same format: a version heading, a date range, and the real feature list — not a copy of every changelog bullet, but the narrative summary of what that stretch of work was actually about.

## Keeping `package.json` in sync

`package.json`'s `"version"` field has been sitting at `0.1.0` since the initial scaffold and does not reflect any of the versions in this history. When the next version bump is committed, update it to match — and keep it in sync from then on, since it's the one place a version number could be checked programmatically (build output, `npm run` banners, etc.).

## Revisiting the roadmap

Treat [ROADMAP.md](ROADMAP.md) as living, not fixed:

- When a High Priority item ships, move it into the changelog entry that shipped it and delete it from the roadmap rather than checking it off in place.
- When new gaps are discovered (the way this round of documentation surfaced the unused `tax_pct` field and the zero-auth surface), add them under the right priority tier with a one-line reason, the same way the existing entries are written — grounded in something specific found in the code, not a guess.
