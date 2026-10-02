# Habits App

A personal iOS habit-tracking app (Expo / React Native / TypeScript). Part of a larger personal app eventually combining Habits, To-dos, and Expenses as independent modules sharing one shell — Habits is the only module being built right now.

## Full specs and decisions

The complete, authoritative specs live in `docs/`. Read the relevant one before implementing anything — this file only holds what you can't infer from the code itself:

- `docs/feature-spec.md` — all 13 V1 features (HAB-01 through HAB-13), states, edge cases, acceptance criteria
- `docs/feature-spec-v2.md` — V2 features (HAB-14 through HAB-25): nav entry point, settings/export, month/year summaries, categories rework, and fixes/polish to V1 flows. Live, in-progress — don't treat it as finished the way the V1 file is.
- `docs/design-system.md` — exact colors, type scale, component states, screen-by-screen structure (V1)
- `docs/design-system-v2.md` — V2 addendum: category colors/shapes, new/changed component states, and a **Deltas** section listing exact V1 screens (Detail, Weekly Summary, Streak-reset) whose component sizes changed as part of the V2 component-consolidation audit, independent of any specific HAB ticket. Check it before touching those screens for any reason — smaller heatmap cells/stat cards there are intentional, not a regression to "fix."
- `docs/technical-architecture.md` — the full stack and why each piece was chosen
- `docs/app-architecture.md` — folder structure, layered separation, SOLID/design-pattern rules (read this before writing any code that touches data or business logic)
- `docs/roadmap.md` — process, working agreement, phase status

**Categories, mid-migration:** V1 code has habit categories as a free-text string field. HAB-24 (`docs/feature-spec-v2.md`) replaces this with a managed set — ten fixed built-ins plus user-created custom ones, each supplying the habit's icon and color — backed by its own table, not a plain string. Until HAB-24 lands, treat category as the old free-text field; after, follow `docs/design-system-v2.md`'s category model and don't reintroduce free text anywhere.

## Commands

- `npx expo start` — dev server (scan QR with Expo Go on the phone)
- `npx expo install <package>` — **always use this instead of `npm install`** for any Expo/RN package; it resolves the version compatible with this project's SDK, plain `npm install` does not
- `npm test` — Jest + React Native Testing Library
- `npm run visual-check` — renders every screen/state on web, diffs against `docs/visual-baseline/`, writes `.visual-checks/report.html` (mockup | current | baseline | diff); `-- --update-baseline` to accept intended changes
- `npm run e2e` — Maestro journeys in `/e2e` against the web build (see `e2e/README.md` for setup and what web can't cover)
- `npx biome check --write .` — lint + format
- `npx tsc --noEmit` — typecheck
- `npx expo-doctor` — diagnose dependency/config issues
- `npx drizzle-kit generate` — generate a migration after a schema change

## Expo specifics (do not trust training data here)

Expo ships breaking changes every SDK release — remembered APIs are frequently renamed, moved, or removed between versions. Before writing any code touching an Expo, EAS, or React Native API:
1. Check the `expo` package's major version in `package.json`.
2. Fetch the matching versioned docs at `https://docs.expo.dev/versions/v<major>.0.0/` rather than answering from memory.
3. For anything else, `https://docs.expo.dev/llms.txt` indexes all Expo docs with corrections to common AI misconceptions about the framework.

Other rules:
- If `ios/` and `android/` directories don't exist, they're generated (Continuous Native Generation) — never hand-create or edit them; native config goes in `app.json` / config plugins.
- Expo Go only includes its bundled native modules. After adding any library with native code (including once `expo-notifications` needs real device testing per the Technical Architecture doc), the app needs a real dev-client build (`npx expo run:ios` on a Mac, or `eas build --profile development`), not Expo Go.
- EAS (`eas build`, `eas submit`, `eas update`) builds/signs in the cloud and ships OTA updates without local Xcode — relevant once the $0-budget weekly-Mac-signing workflow (Roadmap Phase 9) is set up; not needed yet.

## Non-negotiable architecture rules

(Full reasoning is in `docs/app-architecture.md` — this is the enforced summary.)

1. **Only two places may import `drizzle-orm`: a module's `repositories/` folder, and `src/lib/db/`.** `lib/db/` is the shared database infrastructure the repositories build on (client, `schema.ts`, migrations, provider, test db), per `docs/app-architecture.md` — importing Drizzle there is intended, not a violation. It holds setup only, never queries or business logic. Screens, hooks, services, and components never touch Drizzle directly, and never receive Drizzle-inferred types — repositories map raw rows to this module's own types in `types.ts` before returning anything.
2. **Reactive reads go through a repository-exported live-query hook** (e.g. `useHabitsToday()`), never a raw `useLiveQuery(...)` call outside `repositories/`.
3. **Services are optional — only for genuinely composite operations** (e.g. completing a habit = entry + streak + freeze check, together). A single repository call never gets wrapped in a service "for consistency."
4. **Hooks follow `use<X>Queries()` / `use<X>Actions()` naming** — reads and writes stay in separate, narrow hooks, never one hook that returns everything.
5. **New frequency types are a new Strategy file, not a new `if` branch** in existing scheduling logic. Same for streak-calculation rules (Build vs. Break habits count differently).
6. **Modules never import from each other.** `modules/habits`, `modules/todos` (future), `modules/expenses` (future) are isolated. A concept shared between modules gets deliberately promoted to `lib/` or `shared/` — never a silent cross-module import.
7. **Forms use React Hook Form + Zod.** Dates use `date-fns`, never native `Date` math for anything involving streaks or week boundaries.
8. **Tests are colocated** (`habit-repository.test.ts` next to `habit-repository.ts`). Maestro E2E flows live in `/e2e`, named by feature ID (`hab-01-create-habit.yaml`).
9. **Routes in `/app` stay thin** — import and render a screen from `/modules`. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) out of `src/app/` entirely.
10. **Before building a screen, check `components/ui/primitives/` and `components/ui/composite/` for every UI element it needs, per `docs/design-system.md` and, for V2 work, `docs/design-system-v2.md`.** Reuse what exists. If something's missing, create it there first (with all documented states — default, pressed, disabled, error, etc.), then import it into the screen. A screen file never contains raw styled `Pressable`/`View`/`Text` where a primitive or composite is documented for that element. V2 explicitly consolidated several near-duplicate V1 components (one completion-grid, one bar/chart component, one stat-card size) — when a V2 ticket's component already exists from a prior V1 build, extend/reuse it rather than creating a second version.

## Workflow

Use `/implement-feature <id>` to build a feature from `docs/feature-spec.md` (V1, HAB-01–HAB-13) or `docs/feature-spec-v2.md` (V2, HAB-14–HAB-25) — don't implement a feature ad hoc outside that skill. After implementation, the `spec-reviewer` subagent checks the diff against the spec and architecture docs before the feature is considered done.