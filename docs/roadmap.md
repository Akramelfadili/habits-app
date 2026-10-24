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
| V3 | Batches V3-0a…V3-6 in `docs/feature-spec-v3.md` | Planned |

### V3-6 — Accessibility, baselines, e2e, docs

- Delete the V1/V2 mockup PNGs in `docs/mockups/` (kept until each V3 batch replaces its screens; recoverable from tag `mockups-v1-v2`).
- Null the `mockup:` entries in `scripts/visual-check/screens.mjs` that point at them.
- Point the `/implement-feature` skill and the docs (`design-system.md`, `feature-spec.md`, `feature-spec-v2.md`, `architecture.md`) at the tag instead of `docs/mockups/*.png`.

Working agreement: Claude Code implements one ticket at a time via `/implement-feature <id>`; a reviewer subagent checks the diff against the spec; nothing is committed unless asked. The written record (specs, `CLAUDE.md`, backlog) is the memory between sessions.
