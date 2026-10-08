# Architecture

How the code is organised and what it is built with. Enforcement lives in `docs/dev-tooling.md` (`check-architecture`, Biome, token ratchet); the one-line rules are in `CLAUDE.md`. This file gives the reasons.

## Constraints

- Solo developer; Windows + WSL dev box, occasional access to a Mac for builds and signing only.
- Local-only: no backend, no accounts, no sync.
- Habits is the only module being built, but the shell is meant to host To-dos and Expenses later without touching Habits code.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Expo SDK 57, React Native 0.86 (New Architecture), React 19 | Expo makes iOS development possible without owning a Mac; the New Architecture is the only one left |
| Language | TypeScript, strict | Most code is written by an agent; strict types are what make its output reviewable |
| Navigation | Expo Router (file-based) | A new screen is a new file, not an edit to a central navigator config |
| Database | `expo-sqlite` + Drizzle ORM + `drizzle-kit` migrations | Typed queries, `useLiveQuery` for reactive reads, safe schema changes |
| DB inspection | `expo-drizzle-studio-plugin` | Look at real on-device rows when a streak looks wrong |
| UI state | Zustand (`src/store`, `src/theme`) | SQLite is the source of truth; Zustand holds UI-only state |
| Forms | React Hook Form + Zod | Schemas define the rules once and drive the error text |
| Dates | `date-fns` v4 | Streaks, week boundaries and day-closing are date arithmetic; Temporal is not reliable on Hermes yet |
| Styling | Typed tokens in `src/theme` + `StyleSheet`; custom components | No kit matches the design; tokens are ratcheted (see dev-tooling) |
| Animation / gestures | `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler` | Reorderable lists, sheets |
| Native UI / icons | `@expo/ui`, `expo-symbols` (SF Symbols; blank on web) | Platform look |
| Other Expo modules | `expo-notifications` (local reminders), `expo-file-system` + `expo-sharing` (export), `expo-font`, `expo-splash-screen`, `expo-system-ui`, `expo-status-bar`, `expo-linking`; `expo-device` and `expo-constants` are kept for planned diagnostics | |
| Unit / component tests | Jest (`jest-expo`) + React Native Testing Library | Vitest is not reliable for React Native |
| E2E | Maestro (`/e2e`) | YAML flows, little setup |
| Visual regression | Playwright + pixelmatch + pngjs on the web build (`npm run visual-check`) | Fast screenshot diff of every screen state |
| Lint / format | Biome; Husky hooks | One tool, fast enough for every commit |
| Dead code | knip (`npm run deadcode`) | Report only |

Notifications and native modules need a dev-client build, not Expo Go. Nothing here needs a Mac; one only speeds up native builds.

## Folder structure

```
/src
  /app                         Expo Router routes ONLY (thin: import and render a module screen)
    _layout.tsx, index.tsx
    new-habit.tsx              root-level modal
    edit-habit/[id].tsx        root-level modal
    (tabs)/
      _layout.tsx
      habits/                  nested stack: index (Today), [id] (Detail), manage, categories,
                               settings, week, month, year, reminders/[id]
      todos.tsx, expenses.tsx  placeholder tabs

  /modules/habits              everything Habits-specific; nothing outside imports into it
    /screens                   one file per screen
    /components                components used only by Habits
    /hooks                     use<X>Queries() / use<X>Actions()
    /services                  pure domain logic and genuinely composite operations
    /repositories              the only files that import Drizzle; also the dev fixtures (*-fixtures.ts)
    /strategies                FrequencyStrategy implementations and the paused-schedule wrapper
    /test-support              test-only builders and fixtures (never imported by app code)
    constants.ts, types.ts     module constants; the module's own domain types
  /modules/todos, /expenses    do not exist yet; they will mirror this shape

  /components/ui
    /primitives                no business meaning: Button, Chip, TextField, Toggle, ...
    /composite                 built from primitives, still generic: ListItem, StatCard, HeatmapCell, header buttons, ...
  /theme                       typed tokens (colour, type, spacing), theme preference store, token-ratchet baseline

  /lib                         cross-module infrastructure
    /db                        Drizzle client, schema.ts, migrations/, database-provider, test-db helpers
    /app-settings              key/value settings (its own repositories/ folder)
    /notifications             adapter around expo-notifications
    /file-export               adapter around expo-file-system / expo-sharing
    /dev-clock                 pins "today" for visual-check and demos
  /store                       cross-module Zustand stores (toast)
  /utils                       generic helpers with no app knowledge (useAsyncAction)

/e2e                           Maestro flows, named by feature ID
/scripts                       visual-check, e2e runner, check-architecture, token ratchet
/docs                          specs, design system, this file; mockups/ and visual-baseline/ hold PNGs
drizzle.config.ts              at the repo root
```

### The `.web.ts` convention

Anything that touches a native API or SQLite has a web twin next to it (`x.ts` + `x.web.ts`) with identical exports. Metro and the web build pick `.web.ts` automatically. The web twins are what let `visual-check` render the whole app in Chromium against in-memory fixtures. A guard test (`_sameShape`) and the `web-twin` architecture rule fail if the exports drift. Every new repository ships a twin.

### Test file naming

Tests are colocated and named after the file they cover: `x.ts` + `x.test.ts`. A variant that exercises one aspect of a file adds a suffix: `x.web.test.ts` (the web twin), `x.live.test.ts` (live-query behaviour), `x.<aspect>.test.ts` (e.g. `category-repository.migration.test.ts`, `habit-lifecycle-service.cycles.test.ts`). Maestro flows in `/e2e` are named by feature ID.

## Layers inside a module

Dependencies point down only: **repositories / strategies ← services ← hooks ← components ← screens**.

1. **Repositories** are plain files of exported functions, never classes. They are the only code allowed to import `drizzle-orm`, the db client or the schema (rule 1; this includes `lib/*/repositories/`). They map rows to the module's own `types.ts` types before returning, and they export live-query hooks so nothing above them ever holds a Drizzle query (rule 2; arguments are passed as `useLiveQuery` deps). Reason: swapping the data layer then touches `repositories/` only.
2. **Strategies** are one file per frequency type or streak rule, implementing a shared interface (rule 5). Reason: a new frequency is a new file; no tested code is edited.
3. **Services** hold pure domain rules (summaries, insights, history, export formats) and multi-step orchestration. A single repository call is never wrapped in a service (rule 3). Reason: avoid ceremony; keep the rules in one place and testable.
4. **Hooks** bridge to screens. `use<X>Queries()` reads, `use<X>Actions()` writes (rule 4). Reason: a screen that only writes should not subscribe to every query.
5. **Components, then screens.** Screens assemble documented components; they never restyle a raw `Pressable`/`View`/`Text` in place of a documented element (rule 10).

Modules never import each other (rule 6). A concept two modules need is promoted deliberately into `lib/` or `components/ui/`.

## Cross-cutting decisions

- **Forms:** React Hook Form + Zod, schemas typed against the module's own types.
- **Dates:** `date-fns` for streaks and week boundaries. Dates are stored as local `yyyy-MM-dd` text, instants as integer seconds. No `86400000` arithmetic, no `Date` maths for weeks.
- **Async writes:** a shared `useAsyncAction()` returns `{ execute, isLoading, error }`. No React Query: there is no server.
- **Notifications and file export:** adapters in `lib/` expose this app's own small interface, so the library can be replaced in one file.
- **Navigation params:** typed routes are enabled; each screen declares its params in its own file.
- **Routes stay thin** (rule 9): a route file changes when addresses change, a screen file when content changes.
- **Reuse before create** (rule 10): search `components/ui/primitives|composite` and the module's components first; reuse, extend, then create (in `components/ui/` first, with every documented state). Colours, shadows and font sizes/weights come from `src/theme` tokens.
- **Tests:** colocated (rule 8). Reactive-read behaviour is tested against `src/lib/db/test-live-query.ts`, a stand-in for `useLiveQuery`.
- **Migrations:** see the migration guard in `CLAUDE.md` and `.claude/agents/migration-reviewer.md`.

## Decision log

If a package or approach is replaced, record the change here with a date rather than swapping it silently.

- 2026-09: Categories became a managed table (HAB-24/25). `habits.categoryId` is a NOT NULL FK; the legacy `icon/color/category` columns stay nullable and unused until a cleanup migration.
- 2026-10: Docs consolidated into `architecture.md` and `design-system.md`.

Not decided: analytics, crash reporting (the app is local-only).
