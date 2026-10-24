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
    /presenters                view-model helpers and form schemas shared by hooks, components, screens
    /services                  orchestration only: multi-repository writes, lib adapters
    /domain                    pure rules: streaks, history, summaries, insights, export formats
    /repositories              the only files that import Drizzle (+ .web.ts twins)
    /dev                       web fixtures (*-fixtures.ts) and __DEV__-only device seeds
    /strategies                FrequencyStrategy implementations, the paused-schedule wrapper, and the
                               completion index (completions bucketed by week/day once per history)
    /test-support              test-only builders and fixtures (never imported by app code)
    constants.ts, types.ts     module constants; the module's own domain types
    messages.ts                the message catalogue: every toast, banner and inline message (HAB-48)
  /modules/todos, /expenses    do not exist yet; they will mirror this shape

  /components/ui
    /primitives                no business meaning: Button, Chip, TextField, Toggle, ...
    /composite                 built from primitives, still generic: ListItem, StatCard, HeatmapCell, header buttons, ...
  /theme                       typed tokens (colour, type, spacing), theme preference store, token-ratchet baseline

  /lib                         cross-module infrastructure (one deliberate exception: `lib/db/database-error-screen` renders the shared `ErrorScreen` from components/ui)
    /db                        Drizzle client, schema.ts, migrations/, database-provider, test-db helpers
    /app-settings              key/value settings (its own repositories/ folder)
    /notifications             adapter around expo-notifications
    /file-export               adapter around expo-file-system / expo-sharing
    /dev-clock                 pins "today" for visual-check and demos
    /logger                    log(), the in-memory ring buffer, global error/rejection handlers
    /diagnostics               app version/build/schema facts + "Copy diagnostics" report
    /clipboard                 adapter around expo-clipboard (falls back to the share sheet)
    /today                     useToday() (rolls over at midnight / on foreground) and currentDay()
  /store                       cross-module Zustand stores (toast)
  /utils                       generic helpers with no app knowledge: useAsyncAction/runSafely, format (pluralise, counts, date ranges — the one home for user-facing counts and dates), day-key (the stored "yyyy-MM-dd" calendar-day key: toDayKey/fromDayKey), useReducedMotion, useScreenReader

/e2e                           Maestro flows, named by feature ID
/scripts                       visual-check, e2e runner, check-architecture, token ratchet, mockup renderer (scripts/README.md)
/docs                          specs, design systems, this file, decisions/ (ADRs), CONTRIBUTING.md, audits/;
                               mockups/ and visual-baseline/ hold PNGs (mockups/v3/ the V3 design files)
/.github/workflows             CI: make check on every PR and push to master
drizzle.config.ts              at the repo root
```

### The `.web.ts` convention

Anything that touches a native API or SQLite has a web twin next to it (`x.ts` + `x.web.ts`) with identical exports. Metro and the web build pick `.web.ts` automatically. The web twins are what let `visual-check` render the whole app in Chromium against in-memory fixtures. A guard test (`_sameShape`) and the `web-twin` architecture rule fail if the exports drift. Every new repository ships a twin.

### Test file naming

Tests are colocated and named after the file they cover: `x.ts` + `x.test.ts`. A variant that exercises one aspect of a file adds a suffix: `x.web.test.ts` (the web twin), `x.live.test.ts` (live-query behaviour), `x.<aspect>.test.ts` (e.g. `category-repository.migration.test.ts`, `habit-lifecycle-service.cycles.test.ts`). Maestro flows in `/e2e` are named by feature ID.

## Layers inside a module

Dependencies point down only: **repositories / strategies / dev ← domain ← services ← presenters ← hooks ← components ← screens** (enforced by `check-architecture`'s `layer-order`).

1. **Repositories** are plain files of exported functions, never classes. They are the only code allowed to import `drizzle-orm`, the db client or the schema (rule 1; this includes `lib/*/repositories/`). They map rows to the module's own `types.ts` types before returning, and they export live-query hooks so nothing above them ever holds a Drizzle query (rule 2; arguments are passed as `useLiveRows` deps). Reason: swapping the data layer then touches `repositories/` only.
2. **Strategies** are one file per frequency type or streak rule, implementing a shared interface (rule 5). Reason: a new frequency is a new file; no tested code is edited.
3. **Dev** (`dev/`) holds the web/visual-check fixtures (`*-fixtures.ts`) and the `__DEV__`-only device seeds. It ranks with repositories because the `.web.ts` twins read its fixtures. Reason: dev data stays out of the production layers' folders.
4. **Domain** (`domain/`) holds pure rules: streaks, history, summaries, insights, off-schedule and retro-log rules, export formats. It may use strategies and types but never repositories or `dev/`, so every rule is testable without a database. One accepted exception: `export-json.ts` stamps the file with the app build from `lib/diagnostics/app-info` (static facts, no I/O). Reason: the rules are the app; keep them in one place and side-effect free.
5. **Services** (`services/`) orchestrate: a write that reads first (the freeze pool), several repositories in one action (habit lifecycle, reminders and the OS), or lib adapters (export, first run). A single repository call is never wrapped in a service (rule 3). Reason: avoid ceremony.
6. **Presenters** (`presenters/`) turn domain results into what a screen shows: labels, grouping, view models, form schemas. Pure; used by hooks, components and screens. Reason: view logic that several layers share must not live in `screens/`.
7. **Hooks** bridge to screens. `use<X>Queries()` reads, `use<X>Actions()` writes (rule 4). Reason: a screen that only writes should not subscribe to every query.
8. **Components, then screens.** Screens assemble documented components; they never restyle a raw `Pressable`/`View`/`Text` in place of a documented element (rule 10).

Modules never import each other (rule 6). A concept two modules need is promoted deliberately into `lib/` or `components/ui/`.

## Cross-cutting decisions

- **Forms:** React Hook Form + Zod, schemas typed against the module's own types.
- **Dates:** `date-fns` for streaks and week boundaries. Dates are stored as local `yyyy-MM-dd` text, instants as integer seconds. No `86400000` arithmetic, no `Date` maths for weeks.
- **Async writes:** a shared `useAsyncAction(action, { scope, failure })` returns `{ execute, run, isLoading, error }`. `execute` rethrows (for the few callers that show a failure inline themselves); **`run` never rejects** — it logs, shows an error toast (`failure` copy from `failureMessage(verb, noun)`) and resolves `{ ok, value }`, so a caller skips its "it worked" follow-up (an Undo toast, closing a sheet) when `!ok`. Every write hook exposes `run` — except forms that show their own inline error (category add/rename, the habit form, export share/save), which use `execute` or their own try/catch and still log — and every Undo callback runs through `runSafely` in `ToastHost`. A screen with no `ToastHost` above it (the New/Edit habit modals) passes `onFailure` to `runSafely` and shows an inline `Banner tone="error"`. No React Query: there is no server.
- **Messages:** user-facing toasts, banners and inline messages come from the module's catalogue, `modules/habits/messages.ts` (HAB-48): each entry has a `tone`, its `text` (fixed, or built from the habit, date or count it names) and an optional `durationMs` (defaults: Undo 5 s, success/info 4 s, warning 6 s, errors until dismissed). **New copy goes there**, not inline in a screen; existing strings move in as V3 rebuilds each screen. Toasts report events, banners describe states that last; never raw error text (that goes to the log).
- **Logging and diagnostics (`lib/logger`):** `log.debug|info|warn|error(scope, message, error?, context?)`. Memory only — a 200-entry ring buffer, mirrored to the console in development; nothing is persisted. Privacy is enforced by the logger: `message` is a static string; `context` keeps only numbers, booleans and null (never a habit, note or category name); error messages are capped and have quoted segments removed — so never interpolate user text into an `Error` message, use the id. An error object is recorded once however many layers report it (hook, boundary, global handler). `installGlobalHandlers()` runs first in the root layout and always calls React Native's previous `ErrorUtils` handler (red box, fatal crash); in release it also turns on Hermes' rejection tracker, which React Native only enables in development. "Copy diagnostics" (Settings → About, error screens, a failed export) builds a report from `getAppInfo()` + the buffer.
- **Live reads:** repositories read through `useLiveRows(query, deps, options)` (`lib/db`), never `useLiveQuery` directly. It returns `{ data, loaded }`; `loaded` flips true with the first result and **stays true when `deps` change** (week navigation, the day rolling over), keeping the previous rows until the next result so nothing flashes blank. Only a query keyed to one entity passes `resetOnDepsChange`. A query error is logged once and **thrown**, which lands in the root `ErrorBoundary` (`RootErrorBoundary`: "Try again" resets expo-router's boundary, the screens remount and the live queries re-subscribe). Habit lists return `{ habits, loaded }`; screens show a neutral blank (`testID="screen-loading"`) until `loaded`, never an empty state.
- **"Today":** query hooks take `useToday()` (updates on returning to the foreground and at local midnight; the same `Date` object all day). A write reads `currentDay()` at the moment it runs and skips if the screen's render is a day behind; an Undo keeps the day of its own action.
- **Startup:** `DatabaseProvider` shows `DatabaseErrorScreen` (Retry, Copy diagnostics, splash hidden) when migrations fail; once ready, `useStartupActions()` reconciles the OS's scheduled reminders against the database exactly once per launch (never prompting for permission, never scheduling anything an enabled reminder doesn't call for).
- **Reminders and the OS (`syncHabitReminders`):** capture the habit's current scheduled identifiers → schedule the new set under a fresh generation (identifiers `"<reminder>:<slot>:<HHmm>:<generation>"` never collide with the old ones) → cancel exactly the captured old identifiers. A failure while scheduling cancels what that run created and leaves the old set; a failed cancel of the old set is logged and left to the reconcile. After a database write has already committed, a scheduling failure is logged but does not fail the action (`syncAfterWrite`).
- **Notifications and file export:** adapters in `lib/` expose this app's own small interface, so the library can be replaced in one file.
- **Navigation params:** typed routes are enabled; each screen declares its params in its own file.
- **Routes stay thin** (rule 9): a route file changes when addresses change, a screen file when content changes.
- **Reuse before create** (rule 10): search `components/ui/primitives|composite` and the module's components first; reuse, extend, then create (in `components/ui/` first, with every documented state). Colours, shadows and font sizes/weights come from `src/theme` tokens.
- **Tests:** colocated (rule 8). Reactive-read behaviour is tested against `src/lib/db/test-live-query.ts`, a stand-in for `useLiveQuery`.
- **Migrations:** see the migration guard in `CLAUDE.md` and `.claude/agents/migration-reviewer.md`.

## Decision log

If a package or approach is replaced, record the change here with a date rather than swapping it silently. Decisions with real trade-offs get an ADR in `docs/decisions/` (context, decision, consequences): 001 Drizzle + `useLiveRows`, 002 foreign keys off on device, 003 `run()` never rejects, 004 the design-token ratchet.

- 2026-09: Categories became a managed table (HAB-24/25). `habits.categoryId` is a NOT NULL FK; the legacy `icon/color/category` columns stay nullable and unused until a cleanup migration.
- 2026-10: Docs consolidated into `architecture.md` and `design-system.md`.
- 2026-10 (V3-0a): module layers became repositories/strategies/dev ← domain ← services ← presenters ← hooks ← components ← screens (pure rules out of `services/`, view helpers out of `screens/`, fixtures out of `repositories/`); per-week history math pre-buckets completions by week (`strategies/completion-index.ts`); CI added.

Not decided: analytics, crash reporting (the app is local-only).
