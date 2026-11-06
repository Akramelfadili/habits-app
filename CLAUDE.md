# Habits App

A personal iOS habit-tracking app (Expo / React Native / TypeScript). Habits only (V3 removed the To-dos and Expenses placeholders, HAB-26); the code still lives in one self-contained module, `src/modules/habits`.

## When you touch X, read Y

Plain pointers, not imports — open the file when the row applies.

| When you touch… | Read first |
|---|---|
| A feature (any `HAB-<id>`) | the resolved spec: HAB-01–13 → `docs/feature-spec.md`; HAB-14–25 → `docs/feature-spec-v2.md` (only that ticket's section + the NEW-/VAR- entries it cites). Use `/implement-feature <id>`, which resolves this for you |
| Navigation, Today, Progress or Habits-tab UI (V3, HAB-26–50) | `docs/feature-spec-v3.md` + `docs/design-system-v3.md` + `docs/mockups/v3/renders/INDEX.md` (no slices? run `npm run mockups:render`) |
| The tab bar, the route tree or anything that pushes a screen | `docs/decisions/006-navigation.md`, then the navigation section of `docs/architecture.md` |
| UI, components, styling, screens | `docs/design-system.md` (V1 and V2 merged; its **Deltas** section: smaller heatmap cells / stat cards on Detail, Weekly Summary, Streak-reset are intentional, not regressions) |
| `src/modules`, layering, data or business logic | `docs/architecture.md` (folders, layers, patterns, stack, `.web.ts` convention) |
| Schema or `src/lib/db/migrations/` | the Migrations guard below + `.claude/agents/migration-reviewer.md` (its checklist); run that subagent when done |
| The iOS Simulator run, `dev-state`, `src/lib/device-validation`, `scripts/device-validation` | `docs/decisions/007-device-validation.md` + README "Device validation" (the flag is build-time, never `__DEV__`; only the simulator workflow may set it) |
| Commands, hooks, `make check`, visual-check setup, allowlists, token ratchet | `docs/dev-tooling.md` |
| Stack choices, project status | `docs/architecture.md` (stack table); `docs/README.md` ("Status"); `CHANGELOG.md` |
| Adding any file that might hold a secret, env value, log, archive, generated output or a >1 MB file (the repo is PUBLIC) | `docs/CONTRIBUTING.md` → "What never goes in git" (`make check` and the `secret-scan` workflow enforce it) |
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
3. **Pure rules live in `domain/`; `services/` only for genuinely composite operations** (repositories + domain + lib adapters); never wrap a single repository call.
4. **Hooks are `use<X>Queries()` / `use<X>Actions()`** — reads and writes separate.
5. **New frequency types and streak rules are a new Strategy file**, not an `if` branch.
6. **Modules never import each other**; inside a module dependencies point down only: repositories/strategies/dev ← domain ← services ← presenters ← hooks ← components ← screens (`domain/` never imports repositories or `dev/`).
7. **Forms: React Hook Form + Zod. Dates: `date-fns`**, never native `Date` math for streaks or week boundaries.
8. **Tests are colocated** (`x.ts` + `x.test.ts`); Maestro flows in `/e2e` named by feature ID.
9. **Routes in `src/app/` stay thin** — import and render a screen from `/modules`.
10. **Reuse before create.** Search `components/ui/primitives|composite` and the module's components first; reuse, else extend, only then create (in `components/ui/` first, with every documented state). No raw styled `Pressable`/`View`/`Text` for a documented element; colours, shadows, font sizes/weights come from `src/theme` tokens (a ratchet test blocks new escapes).

## Guards you will trip

- **Header buttons only via `composite/header-buttons.tsx`** (iOS 26 Liquid Glass bug; guard test). That file also owns `HeaderCircleButton`, the 44 pt circle a screen draws in its own large-title header (the `+` on Today and Habits, the gear on Habits).
- **Navigation is three tabs over one shared route group** (HAB-27, ADR 006): `src/app/(tabs)/(today,progress,habits)/`. A new screen reachable from more than one tab goes in that folder and is pushed with a plain href (`/habit/5`) — the current tab is kept automatically. A link that must land in a given tab names the group (`/(progress)/progress`). Every scrolling screen inside the tabs ends with `TAB_BAR_BOTTOM_PADDING`; the tab bar overlays content. `src/navigation.test.tsx` guards it.
- **First Run and Browse suggestions are root routes outside `(tabs)`** (no tab bar; nothing else hides it — the empty Today has the bar); the gate is `(tabs)/_layout.tsx` (no habits and `habits.seenFirstRun` unset). Leave First Run with `leaveFirstRun(router)`, never a plain `back()`. `lib/db` shows only the copy it is handed (`migrationCopy`).
- **Migrations:** test with foreign keys ON, the whole chain in one transaction, with child rows present. Table rebuilds use `PRAGMA defer_foreign_keys` (`PRAGMA foreign_keys` is a no-op inside the migrator's transaction). Edits under `src/lib/db/migrations/` need approval.
- **Typed routes are generated** (`.expo/types`, gitignored): after adding or moving a route file, start `npx expo start` once so `tsc` knows it.
- **Every `Pressable` proves a 44 × 44 pt hit area** from its style and `hitSlop`, or has a reasoned entry in `src/components/ui/touch-targets.guard.test.ts` (it fails otherwise; the exceptions are the documented ones, e.g. the Week matrix day headers). New pushed screens start VoiceOver on their title (`ScreenHeader` / `useInitialFocus`).
- **Every new `-ax` state in `visual-check` runs with real AX3 type** (`?textSize=ax`: the harness scales text to the 08.6a sizes). V1/V2 mockups live only at git tag `mockups-v1-v2`.
- **Every new repository ships a `.web.ts` twin** with identical exports (`_sameShape` guard).
- **Do not change existing Strategy semantics** (e.g. per-week) while building another feature.
- **Prefer Edit/Write over python/sed edits** — the format hook only fires on Edit/Write.
- **Allowlists only shrink:** `scripts/check-architecture.allowlist.json` entries may be removed, never added; the token baseline only goes down (`npm run ratchet:update`).
- **Never add `Co-Authored-By` or any other attribution line to commit messages or PR descriptions.**

## Definition of done

`make check` green → visual-check on touched screens, light and dark → `spec-reviewer` subagent (+ `migration-reviewer` for schema changes) → log deviations in the backlog and add an "As built" note to the spec section → **commit per step only when the task says so; never push.**

## Session rules

One Claude session per working copy · never `git stash` · never `--no-verify` · a denied push means stop and ask · no attribution lines in commits or PRs · commit per step when the task says so, never push · never pipe `make check` or test commands through `tail`/`head`/`grep`, so the exit code stays visible (reasons: `docs/CONTRIBUTING.md`).
