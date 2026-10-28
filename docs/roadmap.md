---
title: Habits — Roadmap
status: V1 and V2 shipped; hardening in progress
tags: [roadmap, habits]
---

# Roadmap

Status of the work. Specs: `docs/feature-spec.md` (HAB-01…13) and `docs/feature-spec-v2.md` (HAB-14…25). Deferred work: `docs/backlog.md`.

| Stage | What | Status |
|---|---|---|
| Product definition | Habits V1 feature spec (13 features) | Done |
| Design | Mockups and design system, light and dark | Done |
| Architecture and stack | `docs/architecture.md` | Done |
| Tooling | Biome, Husky, Jest, Maestro, visual-check, architecture checks, Claude Code setup (`CLAUDE.md`, `/implement-feature`, reviewers, hooks) | Done — see `docs/dev-tooling.md` |
| V1 build | HAB-01…13 | Shipped |
| V2 build | HAB-14…25 (nav menu, settings and export, summaries, logging mechanics, manage rework, detail states, reminders, name polish, delete sheet, categories) | Shipped |
| Hardening | Audit batches B0–B13 in `docs/audits/audit.md` §16 — cleanups, docs, test hygiene done; folder moves, error handling, accessibility and diagnostics next | In progress |
| Real-product practices | Crash/error reporting, versioning, changelog | Not started (diagnostics planned) |
| V3 | Batches V3-0a…V3-6 in `docs/feature-spec-v3.md` | **V3-0a, V3-0b, V3-1, V3-2a, V3-2b, V3-3a done**; next: V3-3b Progress UI |

### V3 progress

- **V3-0a — Structure and performance:** done (#24).
- **V3-0b — Foundations:** done. HAB-26 (To-dos/Expenses removed), HAB-28 tokens (additive: type scale, spacing, radius, elevation, focus, motion, accent), the token ratchet extended to spacing / radius / off-scale font sizes, migration 0011 (HAB-42 data: stored category order, Health/Social off red, six-slot rotation), slow tests out of the pre-push gate. Not in it: HAB-29 component consolidation and the T-05 intensity ramp, T-18 density, T-19 gear (they land with the batches whose screens need them).
- **V3-1 — Navigation shell:** done. The throwaway spike settled the three open questions on SDK 58 (custom `tabBar` on js-tabs, shared routes, the iOS 26 header guard) and became **ADR 006**. HAB-27: three tabs (Today, Progress, Habits) as one shared route group so Detail opens inside the tab it came from; the floating pill (V3-01 B) with its AX fallback to bar A; one 112 pt bottom padding and one shell-level ToastHost; the ⋯ menu deleted. The three tab roots still show the existing Today, weekly summary and Manage screens — V3-2…V3-4 rebuild them. All five Maestro flows rewritten and green for the first time.
- **V3-2a — Today logic:** done (no new visual design). `TodayScreen` split into a thin screen, three action hooks and `components/today/` sections; the selected day (`useSelectedDayQueries`, day-keyed queries and writes, no strip yet); +1 on a quantity circle with Undo (long-press and a count control open the sheet); freezes: the SR3 sheet at zero, "Not now", a freeze returned when a frozen day is logged (one transaction, Undo restores both), `freezesUsedInMonth`; the day-closed state removed; Today screen tests on the in-memory database. Also found and fixed: the visual-check harness froze React's clock, so V3-1 had committed ~33 blank baselines (backlog, "Visual-check").
- **V3-2b — Today UI:** done. V3 components built by replacing their predecessors: completion circle (V3-04, 28 pt in a 44 pt hit, amber Break, violet frozen, dashed not-due, at-risk dot), progress bar with count and %, icon square on the radius rule, count button (replaces the stand-in chip), flat 60 pt habit row (name opens Detail or the streak sheet, circle always logs), Today header with a drawn `+`, empty state (replaces the state panel), toast tones with hold times by tone, week strip with swipe and an adjustable VoiceOver element. Today composed from category cards, the dashed fold row, the rest day and the all-done card. Sheets: quantity (every change saves, one toast with Undo on close), Edit this day (replaces the retro-log sheet; saves per tap, toast inside above Done), at-risk and picker on tokens. Copy moved into `messages.ts`. Ratchet: spacing 251 → 209, radius 53 → 38, font-size literals 23 → 17, off-scale 56 → 48.
- **V3-3a — Progress data layer:** done (no new visual design). One cell classifier and one completion-rate rule (D11, D14: frozen days leave both sides of every rate, bonus never counts, today only once done); Week / Month / Year range summaries with +N pts, perfect days, best day and daily bars, ranked per-habit rows (slipping last, Break tagged, bonus listed as "not counted"); the week matrix, month calendar (L0–3), day detail and a year heat map with month tiles, best month and the AX month list; ranked insights with tone and action; the 7-logged-days gate with distinct no-habits / nothing-logged / too-early / ready views; `use<Range>Queries` hooks on bounded live reads. Behaviour changes on the old screens: the 90-day rate and Weekly exclude frozen days, Monthly opens on the current month, unlocks after 7 logged days and no longer counts a frozen day as perfect. See `docs/progress-data.md`.
- **Next: V3-3b — Progress UI** (HAB-35–38 screens on that layer), then HAB-39–41. Each batch moves the screens it rebuilds onto the V3 tokens and lowers the ratchet baselines.

### V3-6 — Accessibility, baselines, e2e, docs

- Delete the V1/V2 mockup PNGs in `docs/mockups/` (kept until each V3 batch replaces its screens; recoverable from tag `mockups-v1-v2`).
- Null the `mockup:` entries in `scripts/visual-check/screens.mjs` that point at them.
- Point the `/implement-feature` skill and the docs (`design-system.md`, `feature-spec.md`, `feature-spec-v2.md`, `architecture.md`) at the tag instead of `docs/mockups/*.png`.

Working agreement: Claude Code implements one ticket at a time via `/implement-feature <id>`; a reviewer subagent checks the diff against the spec; nothing is committed unless asked. The written record (specs, `CLAUDE.md`, backlog) is the memory between sessions.
