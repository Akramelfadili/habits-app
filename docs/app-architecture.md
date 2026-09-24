---
title: Habits — App Architecture (Code Structure & Design Patterns)
status: decided for V1
tags: [architecture, solid, design-patterns, folder-structure, habits, v1]
---

# Habits — App Architecture

> [!info] What this file is for
> Phase 4 of the [[Habits - Roadmap and Working Agreement|Roadmap]]: not *which* technologies (that's [[Habits - Technical Architecture|Technical Architecture]]), but *how the code is organized* — folder structure, where business logic lives vs UI vs data access, and which design patterns keep the app extendable as it grows into V2/V3/V4 and eventually gains the To-dos and Expenses modules. Every choice here is justified against one test: **"if this needs to change or grow later, does this decision make that easy or hard?"**

## The core problem this file solves

Without deliberate structure, a mobile app built feature-by-feature (as this one will be, per the Feature Spec's build order) tends to accumulate:
- Business logic (streak math, scheduling rules) scattered inside UI components, so it can't be tested or reused
- Direct database calls sprinkled through screens, so changing *how* data is stored means touching every screen
- One growing `if/switch` statement per new frequency type or habit variant, so adding a feature means editing old, working code instead of adding new code
- No real boundary between the Habits module and the future To-dos/Expenses modules, so they end up tangled together despite being conceptually independent (as already decided in Phase 1)

Everything below exists to prevent these four things specifically.

## Folder structure

```
/src
  /app                        → Expo Router routes ONLY (see "Routing" below)
    /(tabs)/
      habits.tsx
      todos.tsx               (placeholder tab for now, inactive)
      expenses.tsx            (placeholder tab for now, inactive)
    /habit/[id].tsx
    ...

  /modules
    /habits                   → everything Habits-specific lives here, nothing else touches it
      /screens                → one file per screen (Today, New Habit, Habit Detail, ...)
      /components             → components used only within Habits (e.g. CompletionCircle)
      /hooks                  → useHabitsToday(), useHabitActions(), ... (see hook naming below)
      /services               → habit-service.ts — orchestration logic, ONLY for composite operations
      /repositories           → habit-repository.ts, entry-repository.ts — the ONLY files that import Drizzle
      /strategies             → FrequencyStrategy implementations (see Design Patterns below)
      /types.ts                → Habit, Entry, Frequency, etc. — this module's own domain types

    /todos                    → does not exist yet; when built, mirrors this same shape, isolated
    /expenses                 → same

  /components/ui
    /primitives                → no business meaning: Button, Chip, TextField, Toggle, IconSquare
    /composite                 → built from primitives, still generic: ListItem, StatCard, ProgressBar,
                                  HeatmapCell, Toast (used by ANY module, per the Design System Reference)
  /theme                       → theme.ts — typed tokens (colors, type scale, spacing)

  /lib
    /db                        → Drizzle client setup, schema.ts, migrations/, drizzle.config.ts
    /notifications              → thin wrapper around expo-notifications (see Adapter pattern below)

  /store                      → cross-module Zustand stores, if any ever exist (most state stays in-module)
  /utils                      → generic helpers with zero app-specific knowledge (date math, formatting)

/e2e                          → Maestro flow files
```

**Why `modules/` instead of the more common `screens/` + `components/` split:** this app is explicitly going to become three modules sharing one shell (per Phase 1's decision). A flat `screens/` folder works fine for a single-purpose app, but it actively fights you the moment a second module (To-dos) arrives — you'd have Habits and To-dos screens sitting in the same folder with no boundary. Organizing by module first means **To-dos and Expenses get built later by adding new folders, not by touching Habits code at all.** This is the single biggest "won't block the future" decision in this file.

**Why routes stay thin (`/app`):** Expo Router route files should do nothing but import and render a screen from `/modules`. This keeps file-based routing (which is about *addresses*) from mixing with business logic (which is about *behavior*) — a route file changes only when a URL/screen relationship changes, a screen file changes only when what it shows changes.

**Why `components/ui` splits into `primitives/` and `composite/`, not a full atoms/molecules/organisms taxonomy:** your Design System Reference already documents ~15 component families (Button, Chip, Toggle, ProgressBar, HeatmapCell, StatCard, ListItem...), several with multiple variants — a flat folder gets hard to scan at that size. Two tiers is enough: primitives have no business meaning and combine into composites; composites are still generic and reusable by any future module. Going further into the classic atoms/molecules/organisms split adds naming debates without adding real value for a solo project.

**Hook naming convention, applied consistently:** every module's hooks split into `use<X>Queries()` (reads — wraps a repository's live-query hook) and `use<X>Actions()` (writes — calls repository functions, or a service for composite ones). A screen importing `useHabitActions()` should never be able to accidentally also pull in every query the module has — this is the Interface Segregation principle from a naming-convention level, not just a diagram.

## The layers inside a module, and why each exists

> [!warning] Revised after review (2026-09-24)
> The first version of this file made all four layers below mandatory for every operation. That's over-engineering for a solo app: routing a one-field toggle through Hook → Service → Repository is ceremony with no payoff. The corrected rule is **Services are optional — only used when an operation is genuinely composite.** Most features are just Hook → Repository.

1. **Screens/Components (UI layer)** — renders what the Design System Reference specifies. Knows nothing about SQLite, Drizzle, or how a streak is calculated. Only calls hooks and displays what they return.
2. **Hooks (application layer)** — e.g. `useTodayHabits()`, `useCompleteHabit()`. This is what a screen actually talks to. **For a simple read or write, a hook calls a repository function directly — no service required.**
3. **Services (domain/business-logic layer) — only when genuinely needed.** e.g. `completeHabit(habitId)` in `habit-service.ts`, needed because completing a habit really does mean updating an entry, recalculating a streak, and checking freeze eligibility as one operation. This is where multi-step *rules* from the Feature Spec live (e.g. "a Break habit's streak counts resisted days, not completed ones") — in one place, not duplicated across screens. If an operation is a single repository call, it does not get a service wrapping it "for consistency" — that's the exact ceremony this correction removes.
4. **Repositories (data-access layer)** — e.g. `getScheduledForToday()` in `habit-repository.ts`. The *only* files in the entire app allowed to import Drizzle or write a query. Everything above this layer talks in plain domain terms ("get today's habits"), never in query terms. **A repository here is a plain file of exported functions, not a class implementing an interface** — matching Drizzle's own recommended style, and avoiding backend-style ceremony that buys nothing in a solo TypeScript codebase.

> [!warning] Two isolation gaps closed after review (2026-09-24)
> **Reactive reads.** `useLiveQuery` (Drizzle's live-reactivity hook — the reason the UI auto-updates when data changes) takes a Drizzle query object as its argument. If an application-layer hook called `useLiveQuery(...)` directly, Drizzle would leak past the repository boundary despite the rule above. Fix: repositories export small **live-query hooks** too (e.g. `useHabitsToday()`), with the Drizzle query itself defined inside the repository file. Application hooks call `useHabitsToday()` and get back plain data — they never see a Drizzle query object.
>
> **Return types.** If a repository's return type is just whatever Drizzle infers from the schema, every hook/service/screen signature is secretly shaped by Drizzle even without importing it — coupling hiding behind a clean-looking function call. Fix: repositories map raw rows to this module's own domain types (defined in `types.ts`) before returning anything. This is what makes "swapping the DB only touches `repositories/`" an actual guarantee rather than a mostly-true claim.

**Why this split (in its now-lighter form) still matters concretely for this project:** if Drizzle is ever replaced or its API changes in a future SDK, the fix is contained to the `repositories/` folder — hooks and screens don't change, because they never knew Drizzle existed. The composite operations (the ones actually worth protecting) get a service; the simple ones don't pay a tax for it.

**On "Clean Architecture" generally:** the classic Uncle-Bob layering (entities / use-cases / interface-adapters as fully separate, framework-agnostic layers) is a common over-engineering trap when it's imported wholesale into a small client app — it's built for large teams and long-lived backend systems, not a solo mobile app. What's described here is a deliberately lighter subset: isolate the two things actually worth isolating (persistence, and genuinely multi-step business rules), and skip formal ceremony everywhere else.

## SOLID, applied concretely (not just named)

- **Single Responsibility** — a repository only fetches/writes data; a service (when one exists) only orchestrates business rules; a hook only bridges data to a screen; a screen only renders. Concretely: `habit-repository.ts` never contains streak logic, and `habit-service.ts` never contains a SQL query. When something breaks, there's exactly one place to look.

- **Open/Closed — the one that matters most for extensibility.** The Feature Spec defines several frequency types (Daily, Specific weekdays, X-per-week) and this list *will* grow (a V2/V3 idea is one edit away from becoming a fifth type). Instead of one `calculateSchedule()` function with a growing `if/else` per type, each frequency type is its own class/object implementing a shared `FrequencyStrategy` interface (`isScheduledFor(date): boolean`). **Adding a new frequency type in V2 means adding one new file — zero existing, tested files are touched or risk breaking.** This is the concrete, load-bearing example of "Open for extension, closed for modification" in this app, not just a textbook definition.

- **Liskov Substitution** — any `FrequencyStrategy` (or any repository module) is fully interchangeable with another of the same shape — a service calling `strategy.isScheduledFor(date)` never needs to know or care *which* frequency type it's holding.

- **Interface Segregation** — hooks are narrow and purpose-built (`useHabitActions()` for mutations, `useHabitQueries()` for reads) rather than one giant `useHabits()` hook that returns everything a screen might ever want. A screen that only needs to mark a habit done shouldn't be forced to also subscribe to every query.

- **Dependency Inversion — the second most load-bearing principle here.** Services and hooks depend on a repository's *exported functions* (what operations exist), not on Drizzle directly. In practice for a solo project this doesn't mean full abstract-interface machinery everywhere — it means: **nothing outside `repositories/` imports `drizzle-orm`, and repository functions return this module's own domain types, not Drizzle-inferred ones.** That one discipline is what keeps the data layer swappable and the business logic testable in isolation (a service's tests can pass in a fake repository instead of touching real SQLite).

## Design patterns used, and what each buys you

- **Repository pattern** (data layer, above) — isolates persistence details from everything else.
- **Strategy pattern** (frequency rules, above) — the concrete mechanism behind Open/Closed for scheduling logic; also the natural fit for **streak-calculation rules**, since Build-habit streaks and Break-habit streaks are counted differently (per the Feature Spec) — each is its own strategy rather than a branch inside one function.
- **Service / Facade pattern (used selectively)** — `habit-service.ts` presents one simple function (`completeHabit(habitId)`) that internally coordinates the entry repository, the streak calculation, and freeze-eligibility checks. Screens and hooks get a single clean call instead of needing to know the multi-step sequence themselves — but only where that sequence genuinely exists.
- **Adapter pattern** — `lib/notifications` wraps `expo-notifications` behind this app's own small interface (`scheduleReminder()`, `cancelReminder()`). If the underlying library is ever replaced, or a second notification path is added, nothing outside this one file needs to change.
- **Observer pattern (already built-in, not hand-rolled)** — Drizzle's `useLiveQuery` and Zustand both work this way already: UI subscribes to state/data and re-renders automatically when it changes. Worth naming explicitly so it's clear this pattern is already present via the chosen tools, not something to build separately.

## Cross-cutting concerns (added after review — these were missing)

These aren't new layers or patterns — they're decisions that apply across every module, needed as soon as the first feature (Create a habit) is actually built.

**Form validation: React Hook Form + Zod.** The Design System Reference documents a text-field error state (e.g. "Give this habit a name"), and several Feature Spec items have real validation rules (required name, valid quantity amounts). Zod schemas define these rules once, typed against this module's own domain types (`types.ts`), and drive both the error message shown and the block on saving invalid data. React Hook Form handles the form state itself without re-rendering the whole screen per keystroke.

**Date/time handling: `date-fns` v4.** Streaks, the weekly summary, the heatmap, and day-boundary logic ("has today closed yet") are all date arithmetic — the highest-risk area in this app for a bug that looks fine in testing and misbehaves quietly later (timezones, week boundaries). The newer native Temporal API isn't reliably supported across JS engines yet (including Hermes, React Native's engine), so a library is still the right call for 2026, not a reason to wait for Temporal. `date-fns` is functional and tree-shakable, which fits the plain-function style already used for repositories and strategies.

**Async action state: one shared utility, not a library.** Every write goes through a hook like `useHabitActions()`; each needs a consistent loading/error shape so screens don't each invent their own pattern. A small shared `useAsyncAction()` wraps any repository or service call and returns `{ execute, isLoading, error }`. No React Query or similar is needed — there's no server and no caching problem to solve, just consistent shape across screens.

**Typed navigation params.** Screens pass data to each other (Today → Habit Detail needs a habit id). Expo Router's typed-routes output is enabled from the start, and each screen declares the params it expects in its own file — not a separate central types file — so the contract lives next to what uses it and can't silently drift.

**Test file placement.** Colocated: `habit-repository.test.ts` sits next to `habit-repository.ts`, same convention for services, strategies, and components. Maestro E2E flows in `/e2e` are named by Feature Spec ID (e.g. `hab-01-create-habit.yaml`), so any flow's coverage is traceable straight back to the spec item it verifies.

## Why this specifically protects the future you asked about

- **A new module (To-dos, Expenses):** copy the `modules/habits` shape into `modules/todos`, wire one new tab and route. Zero risk to existing Habits code, because modules never import from each other. **If two modules later need to share a real concept** (e.g. a "category" idea used by both To-dos and Expenses), that's a deliberate promotion into `lib/` or a new `shared/` domain folder at the point it's actually needed — never a silent import from one module into another.
- **A more complex V4 feature** (e.g. a new frequency type, a new stat, a new notification behavior): each maps to *adding* a new Strategy/Service/Repository method — not editing a large existing function that already works.
- **A backend/sync layer, if ever added:** because repositories are the only files touching persistence, a future "sync to server" concern gets added *inside* the repository layer (e.g. write-through to an API in addition to SQLite) without services, hooks, or screens needing to know sync exists at all.
- **Swapping a tool** (Vitest maturing for React Native, a different ORM, a different notification library): each is contained to exactly one layer/folder, per the Technical Architecture file's own "record changes here" note.

## Notes for whoever builds from this file

- This structure is intentionally not "enterprise-heavy" — no interface files, no dependency-injection framework, no abstract classes for their own sake, and no service layer for operations that don't need one. For a solo project, the discipline that actually matters is: repositories are the only Drizzle importers, frequency types are Strategies, and services exist only for genuinely composite operations.
- When a Claude Code prompt implements a Feature Spec item, it should say explicitly which layer(s) it touches (e.g. "add a repository function and a hook — no service needed, this is a single write" vs. "add a repository function, a service to compose the streak/freeze update, and a hook") so review against this file is a quick, mechanical check rather than a judgment call each time.
- If a screen ever seems to need direct database access "just this once," that's the signal to add a repository function instead — this file's whole value collapses the first time that shortcut is taken and not caught.
- If a hook ever seems to need a service "just to be consistent" for a single repository call, that's over-applying this file — skip the service.

Sources consulted for current (2026) practice: [Expo's own folder-structure guidance](https://expo.dev/blog/expo-app-folder-structure-best-practices), the [Obytes React Native/Expo starter's feature-oriented structure](https://starter.obytes.com/getting-started/project-structure/), [Drizzle's data-access-pattern-first approach](https://medium.com/drizzle-stories/the-data-access-pattern-first-approach-with-drizzle-bca035bbdc63), and current guidance on [React Hook Form + Zod for React Native](https://medium.com/front-end-world/ultimate-guide-to-form-validation-in-react-native-with-react-hook-form-and-zod-efeacba401da) and [date-fns v4 vs the still-immature Temporal API](https://www.pkgpulse.com/guides/date-fns-v4-vs-temporal-api-vs-dayjs-2026).

## Still open (deliberately not decided here)

- **Accessibility conventions** — belongs with the Design System, not code architecture; not addressed in this file.
- **Env/config management, seed data for local dev** — low stakes for a local-only solo app; will be decided if and when it's actually needed rather than now.
- **Crash/error reporting** — already owned by Roadmap Phase 12, not duplicated here.

If anything else in the actual build surfaces a decision this file doesn't cover, that's a sign to add it here — not to decide it silently mid-feature.
