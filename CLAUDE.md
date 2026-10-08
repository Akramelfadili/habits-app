# Habits App

A personal iOS habit-tracking app (Expo / React Native / TypeScript). Part of a larger personal app eventually combining Habits, To-dos and Expenses as independent modules sharing one shell — Habits is the only module being built.

## When you touch X, read Y

Plain pointers, not imports — open the file when the row applies.

| When you touch… | Read first |
|---|---|
| A feature (any `HAB-<id>`) | the resolved spec: HAB-01–13 → `docs/feature-spec.md`; HAB-14–25 → `docs/feature-spec-v2.md` (only that ticket's section + the NEW-/VAR- entries it cites). Use `/implement-feature <id>`, which resolves this for you |
| UI, components, styling, screens | `docs/design-system.md` (V1 and V2 merged; its **Deltas** section: smaller heatmap cells / stat cards on Detail, Weekly Summary, Streak-reset are intentional, not regressions) |
| `src/modules`, layering, data or business logic | `docs/architecture.md` (folders, layers, patterns, stack, `.web.ts` convention) |
| Schema or `src/lib/db/migrations/` | the Migrations guard below + `.claude/agents/migration-reviewer.md` (its checklist); run that subagent when done |
| Commands, hooks, `make check`, visual-check setup, allowlists, token ratchet | `docs/dev-tooling.md` |
| Stack choices, project status | `docs/architecture.md` (stack table); `docs/roadmap.md` |
| Deferred work, spec deviations | `docs/backlog.md` — append, never silently drop a deviation |
| What to fix next | `docs/audits/audit.md` (full audit + batched plan B0–B13) |

**V2 beats V1.** Where they conflict V2 wins — and update the V1 text and its tests in the same change.

**Categories** (HAB-24/25, landed): a managed `categories` table; `habits.categoryId` is a NOT NULL FK; the category supplies icon and color. The legacy `habits.icon/color/category` columns are nullable and unused until a cleanup migration — never read or write them, never reintroduce free text.

## Commands

- **`make check`** — the gate: Biome (no writes) + `tsc` + Jest + tooling tests + `check-architecture`. Also runs on pre-push.
- `npx expo start` · `npx expo install <package>` (**always, instead of `npm install`**, for Expo/RN packages) · `npm test` · `npx biome check --write .` · `npm run visual-check` · `npm run e2e` · `npx drizzle-kit generate`

## Expo specifics (do not trust training data)

Before writing code that touches an Expo, EAS or React Native API: check `expo`'s major version in `package.json`, then read `https://docs.expo.dev/versions/v<major>.0.0/` (index: `https://docs.expo.dev/llms.txt`). `ios/` and `android/` are generated — never hand-edit; native config goes in `app.json` / config plugins. Libraries with native code need a dev-client build, not Expo Go.

## Architecture rules

Rules 1, 2, 4, 6, 8, 9 are enforced by `npm run check-architecture` (and rule 1 imports by Biome); reasoning in `docs/architecture.md`.

1. **Only a `repositories/` folder (a module's, or `src/lib/*/repositories/`) and `src/lib/db/` import `drizzle-orm` or the db client/schema.** Everything else gets the module's own `types.ts` types, never Drizzle-inferred ones.
2. **Reactive reads go through a repository-exported live-query hook**, never a raw `useLiveQuery`; a hook whose query takes arguments passes them as `useLiveQuery` deps.
3. **Services only for genuinely composite operations**; never wrap a single repository call.
4. **Hooks are `use<X>Queries()` / `use<X>Actions()`** — reads and writes separate.
5. **New frequency types and streak rules are a new Strategy file**, not an `if` branch.
6. **Modules never import each other**; inside a module dependencies point down only: repositories/strategies ← services ← hooks ← components ← screens.
7. **Forms: React Hook Form + Zod. Dates: `date-fns`**, never native `Date` math for streaks or week boundaries.
8. **Tests are colocated** (`x.ts` + `x.test.ts`); Maestro flows in `/e2e` named by feature ID.
9. **Routes in `src/app/` stay thin** — import and render a screen from `/modules`.
10. **Reuse before create.** Search `components/ui/primitives|composite` and the module's components first; reuse, else extend, only then create (in `components/ui/` first, with every documented state). No raw styled `Pressable`/`View`/`Text` for a documented element; colours, shadows, font sizes/weights come from `src/theme` tokens (a ratchet test blocks new escapes).

## Guards you will trip

- **Header buttons only via `composite/header-buttons.tsx`** (iOS 26 Liquid Glass bug; guard test).
- **Migrations:** test with foreign keys ON, the whole chain in one transaction, with child rows present. Table rebuilds use `PRAGMA defer_foreign_keys` (`PRAGMA foreign_keys` is a no-op inside the migrator's transaction). Edits under `src/lib/db/migrations/` need approval.
- **Every new repository ships a `.web.ts` twin** with identical exports (`_sameShape` guard).
- **Do not change existing Strategy semantics** (e.g. per-week) while building another feature.
- **Prefer Edit/Write over python/sed edits** — the format hook only fires on Edit/Write.
- **Allowlists only shrink:** `scripts/check-architecture.allowlist.json` entries may be removed, never added; the token baseline only goes down (`npm run ratchet:update`).
- **Never add `Co-Authored-By` or any other attribution line to commit messages or PR descriptions.**

## Definition of done

`make check` green → visual-check on touched screens, light and dark (the `today-menu-open*` baselines are stable now — recapture them only when the menu itself changes) → `spec-reviewer` subagent (+ `migration-reviewer` for schema changes) → log deviations in the backlog and add an "As built" note to the spec section → **do not commit or push unless asked.**
