---
title: Habits — Roadmap & Working Agreement
status: active
tags: [roadmap, working-agreement, habits, v1]
---

# Habits — Roadmap & Working Agreement

> [!info] What this file is for
> This is the standing reference for how we work together on this project, and the full roadmap from spec to a maintained real product. Read this at the start of any new chat thread in this project to pick up exactly where things left off — this file, not any one conversation's history, is the source of truth for where we are.

## How we work together

- **This chat (or any chat in this project) is the guide.** Claude Code, run locally by the user in WSL, is the executor. Decisions, architecture, and judgment calls happen here; actual code gets written there.
- **One phase, one feature, one step at a time.** No skipping ahead, no bundling multiple decisions into one unreviewed jump.
- **Each step that involves building produces a concrete, copy-pasteable prompt** for Claude Code — not a vague instruction. The user runs it, reports back what happened, and the guide reviews before moving on.
- **Nothing stays only in chat.** Specs, decisions, and conventions get written into project knowledge or the repo itself (`CLAUDE.md`, ADRs, the feature spec), because Claude Code sessions don't remember each other and chat threads eventually scroll away. The written record is the actual memory of this project.
- **Secondary goal:** the user is learning AI-assisted dev and prompt engineering by seeing real, reasoned prompts for a real project — not just receiving finished output.

## The full roadmap

| Phase | What it covers | Status |
|---|---|---|
| 1 | Product definition — Habits V1 feature spec (12 features, states, edge cases, acceptance criteria) | ✅ Done |
| 2 | UI/UX design — full mockup flow, design system, all states, light + dark themes | ✅ Done |
| 3 | Technical architecture & stack decisions | ✅ Done — see [[Habits - Technical Architecture]] |
| 4 | App architecture (folder structure, layered separation, SOLID, design patterns) | ✅ Done — see [[Habits - App Architecture]] |
| 5 | Development conventions & code quality tooling (linter, formatter, TS strictness, pre-commit hooks) | ✅ Covered within Technical Architecture (Biome, Husky, strict TS) |
| 6 | Testing strategy (what gets tested, with what tools, and why) | ✅ Covered within Technical Architecture + App Architecture (Jest/RNTL/Maestro, colocated test files) |
| 7 | AI-assisted development setup (`CLAUDE.md`, Skills, Hooks, Subagents — see below) | ⏳ Next |
| 8 | Documentation & knowledge management (docs/ folder as an Obsidian vault, Excalidraw diagrams, ADRs) | Not started |
| 9 | User's specific dev environment (WSL + Expo + phone pairing + weekly Mac-signing ritual, as exact steps) | Not started |
| 10 | Step 0 — project scaffolding (one Claude Code session executing phases 3–9) | Not started |
| 11 | Feature-by-feature build (the 12 features from the spec, one at a time) | Not started |
| 12 | "Real product" quality practices (crash/error tracking, semantic versioning, changelog) | Not started |
| 13 | Live with V1, then let real usage inform V2 (backlog already captured in the feature spec) | Not started |

**Immediate next action, whenever the user returns:** begin Phase 7 — write the actual `CLAUDE.md`, an `/implement-feature` skill, hooks, and a reviewer subagent for this specific project (the reference section below is the general pattern; Phase 7 makes it concrete).

## Reference: AI-assisted development setup (for Phase 7, researched and grounded in Anthropic's current guidance)

Four distinct mechanisms, each with a specific job — don't cram everything into one:

- **`CLAUDE.md`** — loaded into *every* Claude Code session. Keep it short: only what Claude can't infer from the code itself (non-obvious commands, code style deviations, testing instructions, repo/commit conventions, architectural decisions, env quirks). A bloated file causes Claude to start ignoring it.
- **Skills** (`.claude/skills/<name>/SKILL.md`) — loaded only on demand. This is the mechanism for the "implement one feature" ritual: a skill invoked as `/implement-feature 03` that encodes "read this feature from the spec, implement it, write tests, run checks, stop." Use `disable-model-invocation: true` so it only runs when explicitly called.
- **Hooks** (`.claude/settings.json`) — the only *deterministic* mechanism (not advisory). E.g. auto-run the linter after every file edit, or block a session from ending until tests pass. This is the actual safety net, since the user won't be reading every line of generated code themselves.
- **Subagents** (`.claude/agents/<name>.md`) — isolated reviewers with a fresh context. The AI-era equivalent of code review for a solo project: after a feature is implemented, a separate subagent that didn't write the code reviews the diff against the spec and reports gaps.

**The workflow shape to apply per feature:** Explore (Claude reads the relevant spec section) → Plan (proposes its approach, reviewable before any code is written) → Implement → Verify (tests/lint run automatically via hooks) → Second opinion (reviewer subagent checks the diff against spec) → Commit.

Sources consulted: Claude Code's official best-practices docs (code.claude.com/docs/en/best-practices), and current (2026) practitioner write-ups on CLAUDE.md/Skills/Hooks/Subagents usage.

## Key decisions already made (carried forward from Phase 1–2)

- Solo personal-use app, V1 scope: Habits module only (To-dos and Expenses are separate, later, independent modules sharing the same visual design language)
- iOS only, local-only storage, no accounts, no cloud sync in V1
- Development on Windows/WSL; no Mac owned; occasional (weekly-plus) access to a Mac for build/signing only, never for coding
- $0 budget preference confirmed — accepting the free-tier weekly re-signing ritual over the $99/year Apple Developer Program, revisit only if this becomes a genuine daily driver
- Refined black/white/grey design system, functional color only (habit accent dots, amber warning, red danger), both light and dark themes designed and confirmed clean
