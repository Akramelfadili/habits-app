# Changelog

What shipped, by version and batch. Dates are merge dates from git history. Detail: the spec "As built" notes (`docs/specs/`) and `docs/backlog.md`. Nothing has been released to anyone but the owner (`package.json` version is a placeholder).

## V3 — habits only, three tabs (2026-10-24 → 2026-11-04)

HAB-26–50. To-dos and expenses removed; Today, Progress and Habits rebuilt on a new token set; accessibility pass.

- **V3-0a** Structure and performance: module layers, per-week frequency speed-up, CI, ADRs (#24).
- **V3-0b** Foundations: habits-only shell, tokens (type, spacing, radius, elevation, focus, motion), ratchet extended, category-order migration, Expo SDK 58 (#25).
- **V3-1** Navigation shell: three tabs as one shared route group, floating pill bar, one toast host; ADR 006 (#26).
- **V3-2a** Today logic: selected day, +1 on quantity habits with Undo, freezes, day-keyed queries (#27).
- **V3-2b** Today UI: completion circle, 60 pt rows, week strip, category cards, quantity and Edit-this-day sheets (#28; Today scroll follow-up #30).
- **V3-3a** Progress data layer: one cell classifier and completion rule, Week/Month/Year summaries, insights (#29).
- **V3-3b** Progress UI: one tab root with range switcher, matrix, month calendar, year heat map (#31).
- **V3-4a** Habits tab, Habit Detail, delete and archive sheets (#32).
- **V3-4b** Add/Edit form, Categories, Reminders, Settings, Export (#33).
- **V3-5** First Run, Browse suggestions, loading/error/update states (#34).
- **V3-6** Accessibility and Dynamic Type to AX3, touch-target guard, baselines, e2e, docs (#35).

## After V3

- **Device validation** (#36, #37): a manual GitHub Actions run renders every visual-check state on an iOS Simulator and records the known-bug flows on video; not a gate (ADR 007).
- **UI fix batch from device testing** (#38): Today strip, toasts, sheets, tab bar and Skip, form and back affordances, reorder buttons, Progress sticky header, Settings hub, dev buttons. Phone checks still open in the backlog.
- **Guardrails** (#39), **accuracy fixes** (#40), **repo hygiene** (#41): repo-hygiene check and secret scan, doc corrections, clean targets.
- **Skill and agent update** (#42): `/implement-feature`, `spec-reviewer`, `migration-reviewer`, `codebase-auditor` rewritten for V1–V3 with a docs map.
- **Branch cleanup** (2026-11-06): stale local and remote branches deleted by commands; no PR.
- **Dev controls removed** (branch `chore/remove-dev-controls`, no PR number yet): the seed, clear and Reset First Run buttons and their helpers are gone from Today; `check-architecture` rule `no-dev-in-ui` keeps them out.
- **Logging** (branch `feat/logging`, no PR number yet): pluggable log sinks with redaction in the core, a persistent 500-entry log in its own `logs.db`, the recovery screen for a database that cannot open, Copy diagnostics with locale and time zone and the stored history; `no-console` architecture rule; ADR 008.
- **Starter habits** (branch `feat/starter-habits`, no PR number yet): a development build applies a list of habits from the gitignored `.env.local` at startup (versioned, one transaction, First Run skipped); `__DEV__`-gated, with a `check-architecture` site rule and a stricter env-file hygiene check; `docs/how-to/starter-habits.md`.
- **Docs set** (branch `chore/docs-set`, no PR number yet): docs index, DESIGN.md, this file.
- **Hardening 1** (branch `chore/hardening-1`, audit 2026-11 batch 13, no PR number yet): SHA-pinned workflows and least-privilege `check.yml`, CodeQL, Dependabot, PR and issue templates, CODEOWNERS, SECURITY.md, an all-rights-reserved LICENSE; zod 4.6.6 and Drizzle Studio dev-only; staged pre-commit, a cheaper Stop hook, `make check-ci`; docs index sizes; ADR 009 (sync parked).

## V2 — categories, summaries, settings (2026-10-02 → 2026-10-05)

HAB-14–25: settings and JSON/CSV export, monthly and yearly summaries, off-schedule logging and retro-log pinning, manage rework, archived/restored Detail states, reminders cleanup, name polish, delete sheet, managed categories (a NOT NULL foreign key on habits).

## V1 — the core habit tracker (2026-09-24 → 2026-10-02)

HAB-01–13: create habits, frequencies, Today and completion, Break habits, day states, first run, quantity habits, streaks and freezes, Detail with heatmap, retro-log with notes, weekly summary, local reminders, reorder/archive/delete. Expo scaffold, Biome, Husky, Jest, Maestro and the Claude Code workflow date from 2026-09-24.

## Unreleased / next

Release prerequisites (from `docs/backlog.md`, "Release prerequisites"):

- Back up the database before a migration runs, and say so on the update screen.
- Import from the JSON export (nothing reads it back today).
- Drop the legacy `habits.icon/color/category` columns (audit B11), after the backup exists.
- `PRAGMA foreign_key_check` in dev builds and the four orphan risks (foreign keys stay off on device, ADR 002).
- `expo-clipboard` and a dev-client rebuild so "Copy diagnostics" copies.
- Device-only checks: VoiceOver, Dynamic Type AX1–AX5, Reduce Motion, reminders firing, share sheet, drag-to-reorder and swipe-to-archive, update-screen first paint.

Hardening still to do (`docs/archive/audit.md` §16): folder moves, error handling, accessibility, diagnostics, crash reporting and versioning.
