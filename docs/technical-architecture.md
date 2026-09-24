---
title: Habits — Technical Architecture & Stack
status: decided for V1
tags: [architecture, stack, decisions, habits, v1]
---

# Habits — Technical Architecture & Stack

> [!info] What this file is for
> The record of every technology decision made for this project, why each one was picked over its alternatives, and what it's for in plain terms. This is Phase 3 of the [[Habits - Roadmap and Working Agreement|Roadmap]]. Read this alongside the [[Habits - Feature Spec|Feature Spec]] (what to build) and the [[Habits - Design System Reference|Design System Reference]] (how it should look) — this file is the third leg: what it's built *with*.

## Constraints this stack was chosen under

- Solo developer, learning mobile dev for the first time
- Windows + WSL as the primary dev machine; no Mac owned, occasional (weekly-plus) access to a borrowed Mac for build/signing only
- $0 budget preference — no paid services, no Apple Developer Program membership for V1
- No backend, no accounts, no cloud sync — fully local-only app
- Must not be a dead end: chosen so that buying a Mac later, or growing into a V4 with real complexity, requires no rework — only addition

## Framework & runtime

**Expo (SDK 55+), React Native, New Architecture**
Expo is the toolchain that makes "build an iOS app with no Mac" possible at all — it provides Expo Go, a sandbox app on the App Store that live-reloads your code on a real iPhone straight from WSL, with no native build step for most features. As of SDK 55, React Native's "New Architecture" (a rewritten, faster core) is no longer optional — it's the only architecture there is, the old one is frozen and unmaintained. Building on it now means never migrating off a deprecated foundation later. This isn't a hobbyist shortcut: production apps like Bluesky run on Expo.

**TypeScript, strict mode**
Catches mistakes (wrong types passed around, missing fields, typos in property names) at write-time instead of runtime. Especially important here because most code is written by Claude Code, not typed by hand — strict types are a big part of what lets an AI agent's output be trusted without reading every line.

## Navigation

**Expo Router**
File-based routing: each screen is a file in a folder, and the folder structure *is* the navigation structure — no manually wired-up navigator tree to maintain by hand. This is Expo's own recommended default for new apps as of 2026 (built on React Native Screens under the hood). Chosen over React Navigation (the older, code-configured alternative) because file-based routing scales more cleanly as screens are added in V2/V3/V4 — a new screen is a new file, not an edit to a growing central config.

## Data layer

**Expo SQLite** — the actual on-device database. Local-only storage, matches the no-cloud-sync requirement exactly.

**Drizzle ORM** — the layer between app code and SQLite. Lets code say "get all habits scheduled for today" as typed, autocompleted function calls instead of hand-written SQL strings. Includes `useLiveQuery`, which makes the UI update automatically whenever underlying data changes (mark a habit done → the Today screen updates itself, no manual refresh logic).

**drizzle-kit** — the migrations CLI. When the schema changes (e.g. adding a new field to a habit), `drizzle-kit generate` produces a migration file describing exactly what changed, applied safely at app startup. Without this, every schema change would risk silently corrupting or losing existing local data.

**Drizzle Studio** (`expo-drizzle-studio-plugin`) — a GUI, opened in a browser tab, that shows the actual on-device database tables and rows while the app is running. This is the debugging tool for "why does this habit's streak look wrong" — inspect real data directly instead of guessing from console logs.

## State management

**Zustand** — holds UI-only state (e.g. "which tab is active," "is this sheet open") that doesn't belong in the database. Chosen over Redux for having a fraction of the setup/boilerplate while still being a standard, widely-used choice — appropriate since SQLite (via Drizzle) is the actual source of truth for anything that matters, not this layer.

## Styling

**Typed `theme.ts` + React Native `StyleSheet`** — the app's colors, spacing, and type scale (as documented in the [[Habits - Design System Reference|Design System Reference]]) live in one typed object that every component imports from, so a color or size is never hand-typed twice. No UI component library — the design system's components (completion circles, chips, segmented controls, etc.) are custom-built to match the mockup exactly, since no off-the-shelf kit matches this specific look.

## Notifications

**`expo-notifications`** — schedules local reminders on-device, no backend or push service involved (matches the no-cloud NFR). This is the one feature that can't be tested inside Expo Go and needs a real "dev client" build — which is exactly why the weekly borrowed-Mac re-signing ritual exists in the dev workflow (see the Roadmap file's Phase 9).

## Testing

**Jest + React Native Testing Library** — unit tests (business logic: streak calculations, frequency/scheduling rules) and component tests (does a screen render the right thing for a given state). This is where most test coverage should live — fast, runs without a simulator. *(Vitest was considered — it's faster for plain TypeScript — but React Native Testing Library's own maintainers confirm Vitest support is currently broken/experimental for React Native specifically, so Jest stays for this project.)*

**Maestro** — end-to-end tests: scripted, YAML-based flows that drive the actual running app (e.g. "create a habit, mark it done, confirm the streak incremented"). Minimal setup, cross-platform, CI-friendly — chosen over the heavier Detox, which needs more native configuration than a solo project warrants.

Tests are not written exhaustively for all 12 features on day one — coverage grows feature by feature, as a standard step in each feature's build process (see Roadmap, "How we work together").

## Code quality & tooling

**Biome** — a single tool replacing the older ESLint + Prettier + lint-staged combination: linting, formatting, and import sorting from one config file, fast enough to run on every commit without friction. Chosen for a clean, greenfield 2026 TypeScript project where the older combo's extra moving parts aren't needed.

**Husky** — wires Biome (and later, tests) into actual git hooks, so a commit can't land with unformatted code, and a push can be blocked until tests pass.

## Not yet decided (deliberately deferred)

- **Analytics/usage tracking** — flagged for a future discussion once there's a real need (e.g. understanding your own usage patterns once V1 is actually in daily use). Not part of V1; will be evaluated on its own when raised, consistent with local-only/no-backend constraints unless a specific need changes that.
- **Crash/error tracking, versioning** — covered by Roadmap Phase 12, not yet started.

## Full stack at a glance

| Layer | Choice |
|---|---|
| Framework | Expo (SDK 55+), React Native New Architecture |
| Language | TypeScript (strict) |
| Navigation | Expo Router |
| Database | Expo SQLite |
| ORM / queries | Drizzle ORM |
| Migrations | drizzle-kit |
| DB inspection | Drizzle Studio (`expo-drizzle-studio-plugin`) |
| State | Zustand |
| Styling | Typed `theme.ts` + StyleSheet |
| Notifications | `expo-notifications` |
| Unit / component tests | Jest + React Native Testing Library |
| E2E tests | Maestro |
| Lint / format | Biome |
| Git hooks | Husky |

## Notes for whoever builds from this file

- If a package needs replacing later (e.g. Vitest matures for React Native, or Expo Router is superseded), record the change and reasoning as a new dated entry here rather than silently swapping it — this file is the durable decision log, not just a snapshot.
- Nothing here is Mac-dependent. If a Mac is acquired later, this exact stack keeps working unchanged — the only difference is native builds can run locally instead of through the weekly re-sign workaround.
