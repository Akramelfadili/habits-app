# Full app audit — 2026-10-05

Read-only audit of the whole app, produced by 12 parallel area auditors and merged here. **No code was changed and nothing was committed**; this file is the only artifact. Every finding was verified by reading code unless marked "device" (needs a phone). Findings that several areas reported independently are merged under one entry and cross-referenced (`= A2-01`).

Format per finding: **ID** · severity · effort (S ≤ 1 h, M ≤ 1 day, L > 1 day) · refs — what is wrong. *Fix:* the concrete change.

## 0. Baseline (run before the audit)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0, no errors |
| `npx biome check .` | exit 0, 433 files checked, no fixes needed |
| `npx jest --ci` | 178 suites / 1378 tests passed, ~24 s |

Note: Jest passes only without `--coverage`; with coverage 3 screen tests exceed the 5 s default timeout (A10-01).

## 1. Headline

The hard architecture rules hold (no Drizzle leaks, no raw `useLiveQuery`, no module cross-imports, tests colocated, routes thin). The code is clean on the things tooling already checks. The problems are in what nothing checks:

1. **One real data bug (A7-01):** `useEntriesInRange` never re-subscribes when its range changes (verified in `node_modules/drizzle-orm/expo-sqlite/query.js`: `useLiveQuery(query, deps = [])`). The Weekly Last/This-week toggle and week/month rollover are stale. Web, visual-check, e2e and unit tests cannot see it (web filters in JS; unit tests mock the hook).
2. **Failures are invisible** (A3-01…A3-04): no logger, no error boundary, a migration failure likely leaves the app on the splash forever, ~20 write call sites fail silently, export discards the original error.
3. **Performance cliff for per-week habits with years of data** (A9-02): O(n)-per-day strategy; 1.4 s for a 20-habit yearly summary in Node, probably several seconds on Hermes.
4. **Enforcement is prose-only** (A11-14): rules 1, 2, 4, 6, 8, 9 are cheap to enforce mechanically and aren't; no CI; pre-commit runs Biome only; the Stop hook runs the whole Jest suite on every stop yet never `tsc`; the format hook misses Bash-made edits.
5. **The design system has no spacing/radius/shadow tokens** (A4-01): ~270 padding/margin literals and 80+ radius literals; type scale bypassed 25 times.
6. **Docs/process drift:** CLAUDE.md "mid-migration" paragraph is false, roadmap frozen pre-build, 3 of 5 Maestro journeys currently fail, `/implement-feature` points at V1 docs only.

## 2. Summary table (counts by area and severity)

| # | Area | High | Medium | Low | Info | Total |
|---|---|---:|---:|---:|---:|---:|
| 1 | Architecture | 0 | 3 | 10 | 0 | 13 |
| 2 | Folder/file structure | 3 | 7 | 7 | 0 | 17 |
| 3 | Logging, errors, observability | 4 | 6 | 2 | 0 | 12 |
| 4 | Design-system conformance | 0 | 5 | 5 | 0 | 10 |
| 5 | UI/UX structure & consistency | 0 | 8 | 16 | 0 | 24 |
| 6 | Accessibility | 1 | 6 | 9 | 0 | 16 |
| 7 | Data layer & migrations | 1 | 4 | 6 | 0 | 11 |
| 8 | Code quality | 1 | 6 | 11 | 1 | 19 |
| 9 | Performance | 2 | 3 | 5 | 0 | 10 |
| 10 | Tests | 1 | 5 | 6 | 0 | 12 |
| 11 | AI setup | 6 | 13 | 4 | 0 | 23 |
| 12 | Docs & process | 1 | 4 | 9 | 0 | 14 |
| | **Total (as reported)** | **20** | **70** | **90** | **1** | **181** |

Many of these overlap (see §15 "Cross-area duplicates"); the number of distinct issues is roughly 140.

---

## 3. Area 1 — Architecture vs CLAUDE.md / app-architecture.md

**Clean (verified):** zero `drizzle-orm` imports outside module `repositories/`, `lib/app-settings/repositories/`, `lib/db/`; `$inferSelect` only in repositories and every repository export returns `types.ts` types; no raw `useLiveQuery` outside repositories; `@/lib/db/client` only imported by repositories and the provider; nothing in `lib/components/theme/store/utils` imports `@/modules`; all tests colocated; scheduling is strategy-based (exhaustive map in `strategies/frequency-strategy.ts:37-48`); hook naming consistent and no hook mixes reads and writes; every native-only package is covered by a `.web` counterpart; no service wraps exactly one repository call.

- **A1-01** · medium · M — Hooks and components import view-model helpers from `screens/*-helpers.ts`: `hooks/use-today-queries.ts:17,25`, `use-manage-habits-queries.ts:9`, `use-today-menu-queries.ts:11-17`, `use-settings-queries.ts:12`; `components/export-sheet.tsx:33`, `reminder-card.tsx:15`, `habit-entry-row.tsx:9`. Data layer depends on UI layer. (= A2-01) *Fix:* move shared helpers to `presenters/` (see §4 target tree); ban `hooks/`/`components/` → `screens/` imports with Biome `noRestrictedImports`.
- **A1-02** · low · S — Components import types from hooks: `components/reminder-card.tsx:10`, `retro-log-sheet.tsx:12`. *Fix:* move `ReminderWithConflicts`, `RetroLogDay` to `types.ts`.
- **A1-03** · low · S — Service depends on UI theme: `services/habit-history.ts:16` imports `HeatmapLevel` from `@/theme/theme`; `heatmapLevelFor` (l.206) is presentation. *Fix:* define the type in `types.ts` or move the function to a presenter.
- **A1-04** · medium · M — Frequency-type branching outside `strategies/` (rule 5): `services/export-csv.ts:61`, `screens/habit-detail-helpers.ts:22`, `components/quantity-log-sheet-helpers.ts:6`, `components/habit-picker-helpers.ts:17`, `screens/today-screen-helpers.ts:121`, `screens/habit-form-schema.ts:120-139`, `repositories/habit-repository.ts:31-58`. Four label functions disagree ("3x per week", "3× a week", "3× per week"); two have silent `default` fallbacks, so a 4th frequency type would be mislabelled instead of failing `tsc`. Streak logic itself never branches on direction (only copy does). *Fix:* add `describe()`/label to `FrequencyStrategy` or an exhaustive `Record<FrequencyType, …>`; drop silent defaults; add `assertNever`.
- **A1-05** · low · S — Manual `begin/commit` transactions span two repositories (`habit-repository.ts:194-214`, ~282, calling lib `setSetting` inside). Documented, but see A7-03. *Fix:* confirm intentional; add a rollback test.
- **A1-06** · medium · S — Dev seed code ships in production hooks: `hooks/use-habit-actions.ts:1-110` (`seedStreakAtRiskHabit`, `seedHabitWithHistory`, `clearAllHabits`, importing the 838-line `habit-fixtures.ts`), `hooks/use-first-run-actions.ts` (`resetFirstRun`), `screens/today-screen.tsx:58-64,234-252,433-451`; repositories export `createHabitAt`/`deleteAllHabits` behind `if (!__DEV__) throw` (`habit-repository.ts:363,376`). (= A5-03, A8-14, A12-14) *Fix:* move to a `dev/` folder / `useDevActions` loaded only when `__DEV__`; keep repository guards. *Device:* confirm release bundle drops the fixtures (`npx expo export --platform ios`).
- **A1-07** · low · S — Duplicated action wiring: `archiveHabit`/`restoreHabit`/`deleteHabit` wrapped in `useAsyncAction` in 2–3 hooks; `useHabitQueries.getHabitById` is a linear find used only by `habit-form-screen.tsx:78`. *Fix:* single owner per action; use `useHabitDetailQueries`.
- **A1-08** · low · S — `services/` is mostly pure domain code (~15 of 20 files), contradicting rule 3's "optional orchestration". (= A2-02) *Fix:* split `domain/` (pure) from `services/` (orchestration).
- **A1-09** · low · S — `"yyyy-MM-dd"` redeclared as `DATE_FORMAT` in ~10 files and inlined in ~12 more; weekday name tables duplicated in 5 places (`export-csv.ts:49`, `monthly-summary-helpers.ts:15`, `habit-detail-helpers.ts:6`, `habit-picker-helpers.ts:4`, `reminders-helpers.ts:5`). (= A8-08, A8-09) *Fix:* `src/utils/day-key.ts` (`DAY_FORMAT`, `toDayKey`, `fromDayKey`) + one weekday-label module.
- **A1-10** · low · S — `lib/app-settings/repositories/app-settings-repository.web.ts:15-16,34-37` hardcodes Habits keys (`habits.seenFirstRun`, `habits.eveningReview`, `habits.lastExport`), duplicating `modules/habits/constants.ts:144,277,280`. *Fix:* inject seeds from the module, or add a test that literals equal the constants.
- **A1-11** · low · S — `database-provider.web.tsx`, `pin-clock.web.ts`, `time-wheel.web.tsx` lack the `_sameShape` compile-time check every repository/lib pair has. *Fix:* add it.
- **A1-12** · low · S — Non-route code in `src/app`: `_layout.tsx` (95 lines: `ThemeGate`, splash, notification bootstrap), `(tabs)/habits/_layout.tsx:72` builds `backTo`. *Fix:* move bootstrap/`ThemeGate` to a shell component.
- **A1-13** · low · S — Habits-flavoured composites in shared `components/ui/composite` (`freeze-pool-card`, `unlock-card`, `archived-banner`, `category-row`). They import nothing from modules, and `design-system-v2.md` lists them as composites. *Fix:* confirm intent only.

**Architecture judgement.** Mostly the right architecture and it is being followed: repository isolation, strategies, and type-checked web/native parity all pay off. ~430 files under `src/` (the "~690" figure includes docs/e2e/migrations/baselines). *Over-built:* one hook per screen is thin glue; the `*-helpers.ts` files are an unofficial fifth layer that now leaks upward; the `modules/` split is speculative but free. *Under-built:* "service" is overloaded; dev fixtures ride in production hooks; frequency presentation sits outside the strategy pattern; enforcement is almost absent. *Simplify:* `domain/` vs `services/`, `presenters/`, `dev/`, central day-key/weekday. *Strengthen:* exhaustive `Frequency` handling and tooling (§11).

## 4. Area 2 — Folder and file structure

**Clean:** no barrel files; all source files kebab-case; routes 5–13 lines; max depth 5; `.web` pairs sit beside natives; the 128 visual baselines match the 128 `SCREENS` keys exactly; no jest/tsconfig/babel/metro change is needed for moves under `src/`.

- **A2-01** · high · M — = A1-01 (hooks/components import `screens/` helpers; helpers import each other: `manage-habits-helpers` → `habit-detail-helpers`, `yearly-summary-helpers` → `monthly-summary-helpers`). *Fix:* 16 `*-helpers.ts` (11 in `screens/`, 5 in `components/`) → `modules/habits/presenters/`.
- **A2-02** · high · M — = A1-08. 13 of 18 `services/` files import no repository/lib: `category-rules`, `export-csv`, `export-data`, `export-formats`, `export-json`, `habit-history`, `monthly-insights`, `monthly-summary`, `off-schedule`, `retro-log`, `weekly-summary`, `yearly-insights`, `yearly-summary`. Orchestrators: `export-service`, `first-run-service`, `habit-lifecycle-service`, `reminder-service`; `habit-service` is mixed (only `applyFreeze` composite). *Fix:* `domain/` for pure files; optionally split `habit-service`.
- **A2-03** · high · S–M — Seven fixture files (~1,690 lines) live in `repositories/`: `category-/entry-/frozen-day-/habit-(838 lines)/monthly-/reminder-/yearly-fixtures.ts`. Imported by `*.web.ts` repos, `hooks/use-habit-actions.ts:5,10,15` (dev seeds), 4 summary tests, comments in `screens.mjs:8,515,969` and `SKILL.md:29`; `test-support/export-fixtures.ts` is a second, test-only home. *Fix:* move to `modules/habits/fixtures/`.
- **A2-04** · medium · S — Schemas/pure fn in wrong layers: `components/category-name-schema.ts`, `components/retro-log-schema.ts`, `screens/habit-form-schema.ts`; `components/category-symbol.ts` (17 importers incl. 6 screens). *Fix:* `schemas/` and `presenters/`.
- **A2-05** · medium · M — Flat dirs: `modules/habits/components` 32 non-test files (60 with tests), `hooks` 27, `screens` 22, `services` 18, `repositories` 18, `ui/composite` 38, `ui/primitives` 22. *Fix:* subfolder `components/` by feature (categories, log, detail, reminders, summaries, today, settings); leave `hooks` and `ui/*` flat (consistently named).
- **A2-06** · medium · S — `scripts/reset-project.js` + `reset-project` npm script are Expo template code; one accidental run deletes/moves `src/` and `scripts/`. (= A8-05, A12-10) *Fix:* delete script, npm script and the `example` line in `.gitignore`.
- **A2-07** · medium · S — Unreferenced template assets: `assets/images/react-logo*.png`, `tutorial-web.png`, `expo-badge*.png`, `expo-logo.png`, `logo-glow.png`, `tabIcons/*` (tab bar uses `SymbolView`). Keep `icon/favicon/splash-icon/android-icon-*` and `assets/expo.icon/` (referenced by `app.json`). *Fix:* delete the unreferenced ones.
- **A2-08** · medium · S — `docs/mockups/retro-log .png` has a trailing space; all code/doc references say `retro-log.png` and never resolve; `scripts/visual-check.mjs:169` special-cases it. (= A12-07) Also unreferenced: `component-library.png`, `design-tokens.png`, `hab-14-a1/a3`, `hab-16-c1` (ask before deleting the first two). *Fix:* `git mv` or delete; drop the special case. **Fixed (B1, 1573646):** renamed to `retro-log.png`; no special case left in `visual-check.mjs`. The unreferenced PNGs are kept (removal planned in V3-6, `docs/roadmap.md`).
- **A2-09** · medium · S — Generated/one-off files in `docs/`: `visual-baseline/` (128 PNGs, 13 MB; only path reference `visual-check.mjs:46`), `ux-audit-2026-09.md` (dated, says "33 states"; since deleted, history in git), `v3-backlog.md` (7 references). *Fix:* baseline → `scripts/visual-check/baseline/`; audit → `docs/audits/`; backlog renamed (§12).
- **A2-10** · medium · S — `docs/app-architecture.md` drifted: shows `/(tabs)/habits.tsx`, `/habit/[id].tsx` (real: nested `(tabs)/habits/` stack + root `new-habit`, `edit-habit/[id]`); puts `drizzle.config.ts` under `lib/db` (it is at the root); omits `lib/app-settings`, `lib/dev-clock`, `lib/file-export`, `constants.ts`, `test-support/`, the `.web.ts` convention. (= A12-09, A11-17) *Fix:* update as part of the migration.
- **A2-11** · low · S — Root docs/tooling stale: `README.md` is create-expo-app boilerplate; `AGENTS.md` recommends `npx expo lint` and bun; `package.json` `lint` = `expo lint` with no ESLint; `Makefile` duplicates npm scripts and is undocumented. (= A8-04, A11-12, A12-10) *Fix:* short README; `lint` → `biome check .`; AGENTS.md → stub pointing at CLAUDE.md.
- **A2-12** · low · S — `tsconfig.json` alias `@/assets/*` unused. *Fix:* remove.
- **A2-13** · low · S — `src/theme/theme-preference-store.ts` is a Zustand store in `theme/` while `src/store/` holds `toast-store`. *Fix:* leave or move; document.
- **A2-14** · low · S — `components/today-state-panel` is generic (6 screens, no Habits logic). *Fix:* keep; promote when another module needs it (rule 6).
- **A2-15** · low · S — Three tests don't mirror a source file: `services/habit-lifecycle-cycles.test.ts`, `repositories/habit-repository.live.test.ts`, `repositories/category-migration.test.ts`. *Fix:* rename or document `*.<suffix>.test.ts`.
- **A2-16** · low · S — `scripts/visual-check/screens.mjs` is one ~1,000-line registry. *Fix:* optional split by feature.
- **A2-17** · low · S — `.gitkeep` in non-empty dirs (`e2e/`, `modules/habits/components/`, `services/`). `expo-symbol 2.svg` is coupled to `icon.json` (leave). Multi-ID e2e names deviate from the CLAUDE.md example but are documented. *Fix:* delete the `.gitkeep`s.

### Target structure

```
src/
  app/                       unchanged (thin routes)
  components/ui/{primitives,composite}/   unchanged
  lib/  theme/  store/  utils/            unchanged (theme-preference-store optional → store/)
  modules/habits/
    types.ts  constants.ts
    screens/        11 screens + tests only
    presenters/     16 *-helpers.ts (+tests), category-symbol.ts
    schemas/        habit-form-, category-name-, retro-log-schema.ts
    components/
      categories/   add-category-sheet, category-picker, delete-category-sheet, rename-category-field
      log/          completion-circle, habit-today-row, off-schedule-row, habit-picker-row/-sheet,
                    quantity-log-sheet, retro-log-row/-sheet, streak-at-risk-sheet
      detail/       habit-entry-row, habit-heatmap, delete-habit-sheet, habit-badge
      reminders/    reminder-card, reminder-time-sheet
      summaries/    range-switcher
      today/        today-header, today-nav-menu, today-state-panel
      settings/     export-sheet
    hooks/          unchanged
    domain/         category-rules, habit-history, off-schedule, retro-log, weekly-/monthly-/yearly-summary,
                    monthly-/yearly-insights, export-{csv,json,data,formats}
    services/       habit-service, habit-lifecycle-service, reminder-service, first-run-service, export-service
    repositories/   11 repository files + category-rows + tests
    strategies/     unchanged
    dev/            seed actions (A1-06)
    fixtures/       7 web/dev fixtures
    test-support/   habit-builder, in-production, export-fixtures
scripts/  visual-check.mjs  e2e.mjs  lib/  visual-check/{screens.mjs, baseline/}
docs/     (see §11 lean doc set)  mockups/  audits/  backlog.md
```
Subfolder names under `components/` are a proposal from file-name prefixes — confirm before moving.

### Migration path (moves + import rewrites only)

Method per step: `git mv` (move `.web` pairs together) → rewrite specifiers in static imports, `jest.mock`, `jest.requireActual`, `import()` strings (`tsc` does not check string forms; ~122 use `../`) → `biome check --write`, `tsc`, `npm test` → one commit per step. Use a ts-morph/language-service codemod; keep imports relative inside the module.

0. Housekeeping (no src moves): delete `.gitkeep`s, unused images, `tabIcons/`, `reset-project` (script, npm script, `.gitignore` line), `@/assets/*` alias, fix `retro-log .png` + `visual-check.mjs:169`, fix `lint` script, rewrite README/AGENTS.
1. Docs/baseline: baseline → `scripts/visual-check/baseline/` (update `visual-check.mjs:46` and header comment, `Makefile:35`, `CLAUDE.md:24`, `SKILL.md:30`; check `e2e/README.md` and `roadmap.md`); ux-audit → `docs/audits/`. Mockups stay (≈40 paths in `screens.mjs`).
2. `repositories/*-fixtures.ts` → `fixtures/` (rewrite `use-habit-actions.ts`, 5 `*.web.ts` repos, 2 repo web tests, 4 summary tests; update comments in `screens.mjs`/`SKILL.md`).
3. `schemas/` + `presenters/` (A2-01, A2-04); afterwards grep that nothing in `hooks/` or `services/` imports `screens/` or `components/`.
4. `domain/` vs `services/` (13 pure files + tests; leave `habit-service.ts`, document the one-way `domain → services` import or split it).
5. Feature subfolders in `components/` (`./x` → `../group/x`; add one `../` to `constants`/`types` imports; update `jest.mock` strings).
6. Optional: `theme-preference-store` → `store/`; split `screens.mjs`.
7. Docs: update the architecture tree and CLAUDE.md folder notes; fix path references in `feature-spec-v2.md:100,126` and `v3-backlog.md:16`.

---

## 5. Area 3 — Logging, errors, observability

**Clean:** no `console.log` leftovers (single dev-gated `console.warn` at `habit-detail-screen.tsx:88`); no `.catch(() => {})`; every empty catch has a justification comment; `loadThemePreference` can't block startup; export cleans up its scratch file and writes "last export" last; `useAsyncAction` clears loading in `finally`; Detail archive/delete and category add/rename/delete handle failure well (sheet stays open, one-tap retry).

- **A3-01** · high · S — Migration failure is invisible. `src/app/_layout.tsx:20` `SplashScreen.preventAutoHideAsync()`; the only `hide()` is in `ThemeGate` (`:36-38`), a child of `DatabaseProvider` (`:56-57`). `lib/db/database-provider.tsx:10-27` renders an unstyled `Database migration failed: {error.message}` with no theme, retry, log or copy — and `ThemeGate` never mounts, so the splash probably never hides. *Fix:* in the error branch call `SplashScreen.hide()`; render a self-contained themed error screen (RN `useColorScheme` only) with friendly text, "Copy diagnostics", "Try again"; log it. *Device:* confirm the splash sticks.
- **A3-02** · high · S — No error boundary or global handlers: no `ErrorBoundary` export in `app/_layout.tsx` or `(tabs)/habits/_layout.tsx`; no `ErrorUtils.setGlobalHandler`; floating rejections are silent in release. *Fix:* root `ErrorBoundary` export (verify name/props in expo-router v57 docs) + `installGlobalHandlers()` (see proposal).
- **A3-03** · high · M — Most user writes have no failure handling (= A5-05). `useAsyncAction` (`utils/use-async-action.ts:19-24`) stores and rethrows; its `error` fields are read by no `.tsx`. Unhandled: `today-screen.tsx:108-114` (toggle), `:126-135`, `:142-161`, `:163-167`; Undo closures `:112,134,152,159` run from `toast-host.tsx` `toast.onAction?.()` with no catch; `habit-form-screen.tsx:168-200` `onSubmit`; `habit-detail-screen.tsx:76-79,114-122` (while archive/delete in the same file are wrapped); `manage-habits-screen.tsx:52-65,85`; `reminders-screen.tsx:74,106-111,139-144` (the time sheet closes before the await, so a failed save silently loses the edit); `first-run-screen.tsx:42,46`; `settings-screen.tsx:56,76`. *Fix:* one wrapper that logs, toasts on failure and never rejects to the UI; wrap Undo callbacks too.
- **A3-04** · high · M — Export discards the error: `export-service.ts:117-126`, `use-export-actions.ts:72-83` drop `caught`; `ExportFailedError` has no `cause`; everything non-storage becomes "Something went wrong while writing the file" (`settings-helpers.ts:90`). `share`/`saveToFiles` (`use-export-actions.ts` ~92-100) have no try/catch and are bound to `onPress` (`export-sheet.tsx:177,181`); `saveToFiles` result ignored; `lib/file-export/file-export.ts:80` treats every `pickDirectoryAsync` error as "cancelled"; `new File(uri).copy(folder)` (~:83) is outside the try. *Fix:* `new ExportFailedError(reason, { cause })` + `log.error`; wrap share/save with "Couldn't share the file. Try again."; distinguish cancel from error. *Device:* what `pickDirectoryAsync` throws on cancel vs error in SDK 57.
- **A3-05** · medium · M — Notification scheduling unlogged and non-atomic: `notifications.ts:~100-124` `scheduleReminder` cancels the prefix first then schedules in a loop (mid-loop failure loses the reminder; no counts, no 64-pending awareness); `reminder-service.ts:~120-157` commits the DB row then syncs (UI reports an error though the row changed); `:~166-178` `setEveningReview` stores the setting before scheduling; `habit-lifecycle-service.ts:44-47,~76-79` archive/delete: DB write then `cancelRemindersWithPrefix` — if cancel throws the UI says "Couldn't delete" though the habit is gone; no launch-time reconciliation of OS-scheduled vs DB; `use-notification-permission.ts:58,60` `void refresh()` uncaught. *Fix:* schedule first/revert in catch; catch+log cancel separately and treat the action as succeeded; add a logged `syncAllReminders()` at startup.
- **A3-06** · medium · S — Live-query `error` ignored (infinite loading): `habit-repository.ts:121-122`, `category-repository.ts:11`, `entry-repository.ts:31,50,114`, `reminder-repository.ts:43,49`, `frozen-day-repository.ts:23`, `app-settings-repository.ts:38`. *Fix:* a `useLiveRows(query, deps)` wrapper in repositories that logs once and throws to the boundary (also the natural place to fix A7-01).
- **A3-07** · medium · S — DB open/migration unlogged, no version anywhere: `lib/db/client.ts:4` `openDatabaseSync` runs at import, uncaught; no pre-migration backup; no About/version row (expo-constants/expo-device are dependencies but unused). *Fix:* log app start/version/migration count; Settings "About" row.
- **A3-08** · medium · S — Export carries no app/db version: `export-json.ts:9,~44` only `version: EXPORT_JSON_VERSION` (layout). *Fix:* additive `app: {version, build}` and `schema` fields.
- **A3-09** · medium · S — Inconsistent failure copy and surface: "Couldn't archive. Try again." / "Couldn't delete." (`habit-detail-helpers.ts:17-18`, toast) vs "Couldn't delete this category. Try again." (`manage-categories-screen.tsx:22`, toast) vs inline field errors (`rename-category-field.tsx:18`, `add-category-sheet.tsx:30`) vs export banner (`settings-helpers.ts:86-93`) vs raw migration text (`database-provider.tsx:15`). `Toast` has no error tone; the only `ToastHost` is `(tabs)/habits/_layout.tsx:63`, so a toast raised from the New/Edit modals renders behind them. *Fix:* one `failureMessage(verb, noun)` helper; `tone: "error"` on Toast (document in `design-system-v2.md` first, rule 10); inline Banner in modals.
- **A3-10** · medium · M — No on-device logs/diagnostics: no logger, ring buffer, "copy diagnostics", or breadcrumbs; three catches discard the error object (`add-category-sheet.tsx:95`, `rename-category-field.tsx:72`, `manage-categories-screen.tsx:63`); intentional silent catches (`theme-preference.ts:20`, `theme-preference-store.ts:39`, `file-export.ts:57`) should log at debug/warn. Crash reporting is deliberately deferred to Roadmap Phase 12 (`app-architecture.md:146`, `roadmap.md:35`). *Fix:* see proposal.
- **A3-11** · low · S — Rollback can mask the original error: `habit-repository.ts:210-212,304-306,357-359`, `category-repository.ts:109-111`. *Fix:* wrap rollback in its own try/catch + log.
- **A3-12** · low · S — `destructive-confirm-sheet.tsx:91-97` swallows handler rejections (latch is correct; add a dev warning); Biome recommended preset has no floating-promises rule (needs type-aware linting — verify in Biome 2.5 docs); `void promise` at `_layout.tsx:20,35`, `use-notification-permission.ts:58,60`, `settings-screen.tsx:88`.

### Proposed approach (sized for a solo app)

1. **Logger** `src/lib/logger/logger.ts`: `log.debug|info|warn|error(scope, message, ctx?)`. Dev → `console.*`. Prod drops debug; info+ goes to a ~300-entry in-memory ring; warn/error also appended to a capped (~200 KB, one rotation) file via the file adapter (verify the expo-file-system v57 `File` append API). Not in SQLite (logs matter most when the DB fails). Errors serialised as `{name, message, stack, cause}`; never log habit names/notes. `getDiagnostics()` = app version (expo-constants) + OS/device (expo-device) + migration count + last ~100 entries. `installGlobalHandlers()` wraps `ErrorUtils.setGlobalHandler` and a promise-rejection tracker (verify the Hermes/RN 0.86 mechanism). Breadcrumbs: app start, each mutating action (via `useAsyncAction`), migrations, notification sync (counts), export (format, bytes).
2. **Standard failure surfacing:** extend `useAsyncAction(action, { scope, failure })` — logs, sets error, and a non-rejecting `run()` that toasts `tone: "error"` and returns `{ ok, value }`. Copy from one `failureMessage("archive", "habit")` ("Couldn't archive this habit. Try again."). Inline Banner where no `ToastHost`.
3. **Error boundary + startup failure:** root `ErrorBoundary` (themed, no DB/theme-store dependency): "Something went wrong", "Try again", "Copy diagnostics"; same screen for the `DatabaseProvider` error branch (also hides the splash). Settings "About" row with version + Copy/Share diagnostics (reuses `shareFile`).

Verify every Expo API above against `https://docs.expo.dev/versions/v57.0.0/`.

---

## 6. Area 4 — Design-system conformance

**Clean:** no hex/rgb/oklch/'white'/'black' outside `src/theme` except two sites (A4-03); pressed/disabled/dimmed opacities all from `interactionOpacity`; no `TouchableOpacity`; only 2 font weights (500/600); V2 consolidations in place (single completion-grid, heatmap-cell, stat-card size); V2 Deltas verified (stat-card padding 14, `statCompact` 26, `micro` 10, cell radius `floor(size/3)`) — **smaller cells/cards are intentional**; no screen contains a raw `Pressable` (3 module components do, all defensible: `completion-circle.tsx:98`, `habit-today-row.tsx:83`, `reminder-card.tsx:55`). Caveat: `design-reference/*.dc.html` cited by the docs is not in the repo, so values were checked against docs and PNG mockups only.

- **A4-01** · medium · L — **Root finding:** `src/theme/theme.ts` exports only `surfaceColors`, `semanticColors`, `typeScale`, `interactionOpacity`, accent helpers; no spacing, radius, border-width or shadow scale. ~270 padding/margin/gap literals (8×49, 12×50, 16×42), 80+ `borderRadius` literals in 34 files (16×9, 999×8, 12×6, 14×5, one-offs 18, 10, 9, 7, 6, 4, 3, 15, 20, 22, 44), ~20 `borderWidth` literals (1, 1.5, 2: `completion-circle.tsx:110-122`, `banner.tsx:82`, `add-row.tsx:64`, `checkbox.tsx:32`). Card chrome (radius 16, padding 12–16) re-declared in `container.tsx`, `freeze-pool-card.tsx:61`, `unlock-card.tsx:53`, `insight-card.tsx:75`, `stat-card.tsx:77`, `archived-banner.tsx:66`, `action-card.tsx:62`; screen horizontal padding 16 is a literal in all 11 screens (`today-screen.tsx:492`, `settings-screen.tsx:136`, `habit-form-screen.tsx:451`). (= A8-15) *Fix:* add `spacing`, `radius`, `borderWidth`, `shadow.popover` tokens; migrate `Container` and the card composites first; derived values (`floor(size/3)`, `size/2`) may stay.
- **A4-02** · medium · M — Type scale bypassed: 25 `fontSize` literals — duplicates of existing tokens (`list-item.tsx:198,202,205`, `menu-row.tsx:80`, `header-buttons.tsx:168,172`, `button.tsx:154`, `text-field.tsx:161,169,173`) and off-scale sizes (13 in button/chip/weekday-chip/segmented-control/category-chip, 13.5, 14 in `toast.tsx:51,60`, 12 in `menu-row.tsx:84`/`category-picker.tsx:128`, stepper 18/22/17/32). menu-row subline is 12 vs list-item subtitle 12.5 for the same role. 600 on 17px headlines in `quantity-log-sheet.tsx:141`, `streak-at-risk-sheet.tsx:108`, `destructive-confirm-sheet.tsx:154` vs 500 in `today-state-panel.tsx:84`, `reminder-card.tsx:130`, `sheet-header.tsx:53`. `lineHeight` literals 16/17/18 in 8 places; `letterSpacing` 0.8 (`stat-card.tsx:85`) vs 1.2 (`section-label.tsx:20`). ~50 raw `<Text>` carry local size/weight/colour triples. *Fix:* make `typeScale` entries full text styles or add a `Text` primitive; add tokens for control 13, toast text, stepper numerals (or snap to scale).
- **A4-03** · low · S — `nav-menu.tsx:90-94` the app's only shadow (`#000`, .18, r24, elevation 8; not scheme-aware); `category-chip.tsx:58` `rgba(255,255,255,0.22)`. *Fix:* `shadow.popover` and `onAccentSoft` tokens.
- **A4-04** · medium · S–M — Accent-badge props rebuilt inline 17×: `habit-picker-row.tsx:49`, `off-schedule-row.tsx:35`, `retro-log-row.tsx:61`, `habit-entry-row.tsx:43`, `habit-today-row.tsx:94`, `quantity-log-sheet.tsx:65`, `today-screen.tsx:342`, `manage-habits-screen.tsx:119`, `habit-detail-screen.tsx:193`, `yearly-summary-screen.tsx:251,268`, `monthly-summary-screen.tsx:281`, `manage-categories-screen.tsx:55`, `delete-category-sheet.tsx:45`, `category-picker.tsx:36`, `add-category-sheet.tsx:147`, `habit-badge.tsx:15`. `HabitBadge` exists but is hard-wired to `size="compact"`. *Fix:* `size` prop on `HabitBadge` or a `useAccent(hue)` hook.
- **A4-05** · medium · M — Near-duplicates: (1) `habit-picker-row`, `off-schedule-row`, `retro-log-row` = three `ListItem` wrappers with the same IconBadge + Checkbox → one `HabitLogRow` (trailing: check/stepper/amount); (2) `menu-row` re-implements a pressable row (own padding 8/12, minHeight 44) instead of `ListItem`; (3) `archived-banner.tsx:70-74` hand-builds a 30px/r9 square ≈ `IconBadge` compact (28px/r9); (4) `empty-state-card.tsx:50-57` (44/r12) and `today-state-panel.tsx:66-86` (64/r20, 88 circle) hand-build icon tiles → `IconTile` primitive; (6) `modal-form-header.tsx` is a navigator-options hook, not a view (rename); sheet headlines hand-rolled in 4 sheets instead of `SheetHeader`; (7) **`IconSquare` is dead** (zero importers; only `app-architecture.md:48`; the V2 category rework removed its use) (= A8-01); (8) `freeze-pool-card`, `unlock-card`, `insight-card`, `archived-banner`, `stat-card` each re-declare a card instead of wrapping `Container` (give it a padding prop); (9) streak-at-risk pips (`streak-at-risk-sheet.tsx:63-80`, 28/r8) vs `FreezePoolCard` (30/r10 from `HeatmapCell`) — same thing, two sizes → `FreezePips`; (10) `add-category-sheet.tsx:139` hand-built inset panel (r14/p12) where `Container variant="inset"` exists (r16/p16); (11) `today-screen.tsx:365-372` hand-built "N of M complete" row vs `ProgressRow`. Mandated separations hold (Chip vs CategoryChip, ProgressBar vs ColumnBars, InsightCard vs ActionCard, CompletionCircle vs HeatmapCell; banner vs archived-banner is listed as separate in `design-system-v2.md`).
- **A4-06** · low · S — Screen titles/layout inconsistent: all 24/500 except `settings-screen.tsx:146` (600, extra `paddingHorizontal 4`); title margin 8 in `monthly-summary-screen.tsx:397`/`yearly-summary-screen.tsx:383`, 4 in `reminders-screen.tsx:163`, none elsewhere; `paddingTop` 12 on first-run/manage/settings/today vs 8 on detail/monthly/yearly/weekly/reminders; gap 16 except reminders (12); titles are raw `<Text>` in 9 screens (rule 10: "Screen title" is documented). (= A5-09) *Fix:* `ScreenTitle` composite + `Screen` content wrapper.
- **A4-07** · low · S — Rule 10 otherwise satisfied; remaining one-offs are A4-05 (9–11).
- **A4-08** · medium · S–M — Uneven states: `segmented-control.tsx` has no pressed feedback (every other primitive uses `opacity.pressed`); `Button` `loading` replaces the label with a spinner (`button.tsx` ~98-100) whereas the component-library mockup shows spinner + "Saving". TextField (default/focused/error/warning), Toggle, destructive Button (text-only by design), MenuRow match the docs. Dark-baseline coverage not checked for every screen.
- **A4-09** · low · S — `useTheme().type` unused; `typeScale` imported directly in ~30 files. *Fix:* remove from the hook or standardise.
- **A4-10** · low · S — Doc drift: `design-reference/*.dc.html` cited but absent (= A12-06); `design-system.md` still describes the Evening review row on Reminders (removed by HAB-21).

**Proposed design-token lint** (Jest guard in the style of `header-buttons.guard.test.ts`, run in `npm test`/CI over `src` excluding tests and `src/theme`): fail on `#[0-9a-fA-F]{3,8}`, `rgba?\(`, `oklch\(`, `'white'|'black'`; on `shadow*`/`elevation` outside theme; on `fontSize:\s*\d`, `lineHeight:\s*\d`, any `fontWeight` other than 500/600; once spacing/radius tokens exist, on numeric `borderRadius|padding*|margin*|gap` literals with a **ratcheting baseline file** (count may only go down) and an allowlist for nav-menu/category-chip until A4-03. A Biome 2 GritQL plugin can do the same at lint time (Biome has no built-in rule). Also: screens never import `Pressable` from react-native (allowlist the 3 components); every file using `Pressable` references `opacity.pressed` (would have caught segmented-control).

---

## 7. Area 5 — UI/UX structure and consistency

Static code read, app not run. Prior `docs/ux-audit-2026-09.md` (since deleted; history in git) status: **fixed** #1, 2, 3, 4, 5, 7, 8, 12, 13, 15, 16, 17 (+ P3: stat caption month, name field placeholder/counter, Day-closed times, delete sheet duplicate card, retro-log pinning); **partly** #9 ("logs kept" remains in archived banner and Manage), #10 (Manage title still "Habits", Settings weight differs); **open** #11 (first-run suggestions still use plain dots, `first-run-screen.tsx:~80`) and the "Developer" label for dev buttons; #6 and #14's dimming/stepper points not re-verified.

- **A5-01** · medium · S — Copy bug: `manage-habits-helpers.ts:~46` `NOTHING_ARCHIVED_MESSAGE` says "Archive a habit from Edit habit…" but Edit habit has no Archive action (lives on Detail `habit-detail-screen.tsx:~290` and Manage swipe). *Fix:* "Archive a habit from its page, or swipe it left here…".
- **A5-02** · medium · S–M — "Add habit" on a populated Today is only a ghost link below every group (`today-screen.tsx:~418-423`, comment `:~409` calls it temporary); no header "+" and no menu row (`today-nav-menu.tsx` has 5 rows). *Fix:* header "+" next to ⋯ or an "Add habit" menu row.
- **A5-03** · low · S — 4 dev buttons in identical ghost style under "Add habit" (`today-screen.tsx:~425-455`). (= A1-06) *Fix:* "Developer" SectionLabel or move behind `__DEV__` in Settings.
- **A5-04** · medium · M — No loading states. Live queries start as `[]` (`drizzle-orm/expo-sqlite/query.js:9-11`), so Today derives "no-habits" on first frame ("Nothing to track yet", `today-screen.tsx:~228`) and Detail/Reminders show "Habit not found" (`habit-detail-screen.tsx:~143`, `reminders-screen.tsx:~52`, `use-habit-detail-queries.ts:59`); only `use-first-run-queries.ts` guards its flash. *Fix:* repository hooks expose a loaded flag (via `updatedAt`) and screens render a neutral blank until then. *Device:* likely sub-frame; verify on cold launch/deep link.
- **A5-05** · medium · M — = A3-03 (silent write failures on Today toggle/quantity/freeze, Manage archive/restore, Detail restore, habit form submit, retro-log save, reminders).
- **A5-06** · medium · S — Undo inconsistency: Undo exists for complete, off-schedule log, archive (Manage + Detail), Detail restore. Missing: Manage Restore (`manage-habits-screen.tsx:63`) while Detail Restore has it (`habit-detail-screen.tsx:118-122`); un-tick gives no toast; using a freeze/reset streak (`today-screen.tsx:~175`) no toast; reminder Remove (`reminder-card.tsx:105`, `reminders-screen.tsx:~120`) deletes with no confirm and no Undo. Delete habit/category are confirm-sheet only (intentional). *Fix:* Undo for Manage restore (reuse `undoRestoreHabit`), toast for freeze, Undo or confirm for reminder Remove.
- **A5-07** · low · S — Toast wording drift: `Marked '<n>' complete` (quoted, `today-screen.tsx:99-101`) vs `<n> logged · off-schedule` (unquoted, `:120`); `Restored '<n>' — back on Today` (`manage-habits-screen.tsx:63`) vs `<n> is back on Today` (`habit-detail-helpers.ts:119-120`) for the same action; failure toasts differ (A3-09). *Fix:* one template set; quote consistently.
- **A5-08** · low · S — Toast: `ToastHost` is `bottom: 16` in the Habits stack only (modals unhosted); no live-region/announce (= A6-02); message not line-limited so long names make a multi-line 999-radius pill odd. *Fix:* `numberOfLines={2}`.
- **A5-09** · low · S — Titles: Settings 600 vs 500 elsewhere (`settings-screen.tsx:146`); `role="header"` only on Manage/Categories/Reminders (= A6-09); summary titles "Your week/month/year" vs menu rows "Weekly summary"/"Monthly"/"Yearly" (`today-nav-menu.tsx:~40-55`); Manage title "Habits" vs menu "Manage & archive" (see intentional list). *Fix:* unify weight/role; rename rows consistently.
- **A5-10** · low · S — Back labels are hard-coded in `(tabs)/habits/_layout.tsx`: pushed screens read "Today" (categories → "Settings", reminders → habit name); Detail opened from Manage or an off-schedule row still says "Today". *Fix:* derive from the previous route or use "Back" when ambiguous.
- **A5-11** · low · S — "Delete" vs "Remove" (reminder card has no confirm); confirm labels "Delete permanently" (`delete-habit-sheet.tsx:56`) vs "Delete category"/"Delete and move N habits". *Fix:* reminder "Delete" or confirm.
- **A5-12** · low · S — Sheet dismiss labels "Cancel" (add-category, export, reminder-time, retro-log) vs "Close" (habit-picker, export failed) vs "Done" (export ready) — consistent with the audit rule (draft ⇒ Cancel). Noted only.
- **A5-13** · medium · M — Keyboard: Name/Unit fields pass no `onSubmitEditing` (`habit-form-screen.tsx:~228,~385`) so there is no return-key action (`text-field.tsx:114-115` sets `returnKeyType="done"` only with a handler); form `ScrollView` lacks `keyboardDismissMode`; retro-log list lacks `keyboardShouldPersistTaps` (`retro-log-sheet.tsx:~113`), so the first tap on a row may only dismiss the keyboard. *Fix:* Name → focus Unit/dismiss; `keyboardDismissMode="on-drag"`; `keyboardShouldPersistTaps="handled"`. *Device.*
- **A5-14** · low · S — No discard prompt on Cancel in New/Edit habit (`modal-form-header.tsx:~33`; spec `feature-spec.md:77` says none; swipe-back disabled by full-screen modal). Product call: prompt only for edit-with-dirty-form?
- **A5-15** · medium · S–M — Overflow: `ListItem` title/subtitle/value have no `numberOfLines` (`list-item.tsx:109,115,118,124`); Detail name (`habit-detail-screen.tsx:~190`), Quantity sheet target/unit (`quantity-log-sheet.tsx:~72,~95`), Toast unbounded. Names capped at 32 and units at 20 (`constants.ts:83`), quantity max 9999/target 999; `StatCard` guards numbers with `adjustsFontSizeToFit`. *Fix:* opt-in `numberOfLines`/tail ellipsis on `ListItem`, full text in the accessibility label.
- **A5-16** · low · S — Hard-coded plurals: `export-sheet.tsx:175` "1 habits"; `settings-helpers.ts:65` "N logs · N notes"; `yearly-summary-helpers.ts:131,139,149,184` ("One months", "of one months"); `monthly-summary-helpers.ts:157,159` ("You're 1 days in"); `monthly-summary-screen.tsx:359` "N days tracked"; `weekly-summary-helpers.ts:62` ("Zero of one days"); `habit-detail-helpers.ts:75` "1 of 1 days". Delete-habit/freeze/category/first-run copy handles singular correctly. (= A8-10) *Fix:* shared `pluralise(n, "day")`.
- **A5-17** · low · S — Terminology drift "logs kept" (`habit-detail-helpers.ts:114`, `manage-habits-helpers.ts:~19`) / "days logged" (`delete-habit-sheet-helpers.ts:~12`) / "entries" (`settings-helpers.ts:55`) / "logs" (`:65`) / "days tracked". *Fix:* "days logged" per habit, "entries" for export.
- **A5-18** · low · S — Dates: `d MMMM` (16 uses) vs `d MMM` (5); range separators em dash spaced (`weekly-summary-helpers.ts:32-33`, `monthly-summary-helpers.ts:31`, `yearly-summary-helpers.ts:42`) vs spaced en dash (`habit-detail-helpers.ts:150-151`, `settings-helpers.ts:75`) vs unspaced "Mon–Fri"; `toLocaleString("en-GB")` hard-coded; times always 24h (`reminders-helpers.ts:26-30`, `habit-picker-helpers.ts:39`) while the native time wheel may show 12h. *Fix:* one dash style, one date-format module, decide 24h vs device (product).
- **A5-19** · low · S — Spelling mix: "colour" (`delete-category-sheet-helpers.ts:17,18`) vs "summarize" (`weekly-summary-screen.tsx:80`, monthly :69, yearly :68) vs "Color". Dates are en-GB → pick British.
- **A5-20** · low · S — Punctuation (ellipsis "…", arrows "→", em dash in toasts vs middot elsewhere) is consistent enough; noted only.
- **A5-21** · low · S — Placeholder To-dos/Expenses tabs are a single "coming soon" Text with no title/icon (`placeholder-tab-screen.tsx:~18`); Expenses tab uses a generic circle SymbolView (`(tabs)/_layout.tsx:~48`). Product call.
- **A5-22** · medium · M (product) — Tap depth: complete 1; quantity 2–3; week summary 3; Manage 2; Settings 2; **Export 4** (menu → Settings → Export row → Export) +share; **Categories 4 deep**; **Edit habit 3** (row → Detail → Edit); Add habit 1 only if scrolled (A5-02); archive from Today 3; reminders 3. *Fix:* Add habit (A5-02); consider Edit/Archive via row swipe/long-press.
- **A5-23** · low · S — NavMenu is an overlay (not a Modal; `accessibilityViewIsModal` set, closes on blur); the "Summaries" eyebrow also sits over Manage/Settings (`today-nav-menu.tsx:~34`); first frame uses a 110 anchor (`today-screen.tsx` `menuAnchorBottom`) → possible one-frame jump (device). *Fix:* label "Menu"/"Habits" or a second label.
- **A5-24** · low · S — Light/dark parity only partly verifiable statically: tokens via `useTheme`; `ThemeGate` prevents a wrong first frame; the only hard-coded colour is the nav-menu shadow.

### States table (screen/sheet → empty / loading / error)

| Surface | Empty | Loading | Error |
|---|---|---|---|
| Today populated | n/a | none (flashes "no habits", A5-04) | write errors unhandled |
| Today no-habits / rest-day / day-closed | yes | none | n/a |
| First run | n/a | button spinner | add/skip failure unhandled |
| Habit Detail | "No entries yet" + empty heatmap | none (false "not found") | archive/delete toast; restore/retro-save unhandled |
| Reminders | only Add row + caption | none (false "not found") | none |
| Manage | EmptyStateCard / "Nothing archived" | none | none |
| Settings | n/a | none | export failure in sheet; theme/evening toggle unhandled |
| Categories | "Yours" holds only the Add row | none | delete toast, add/rename inline |
| Weekly / Monthly / Yearly | "Nothing to summarize yet" + per-row empties | none | none |
| New/Edit habit | n/a | edit: plain "Loading…"; Save spinner | submit failure unhandled; field errors yes |
| Quantity / At-risk / Retro-log / Picker / Reminder-time sheets | picker "Nothing to log here" | Save spinners | none |
| Add category / Delete habit / Delete category sheets | n/a | spinner / inert | inline / toast |
| Export sheet | "No entries yet" range | determinate progress | failed phase (good) |
| To-dos / Expenses tabs | "coming soon" | n/a | n/a |

---

## 8. Area 6 — Accessibility

Contrast computed with a script replicating `theme/oklch.ts`. **Clean:** no `allowFontScaling={false}`/`maxFontSizeMultiplier` anywhere; every interactive primitive/composite has role, label where text is ambiguous and state; header buttons ≥ 44pt with "Back to X"; swipe-to-archive has an accessible alternative (`manage-habits-screen.tsx:170-175`); drag reorder has Move up/down actions (`reorderable-list.tsx:143-156`); `ProgressBar` has role + value; `FieldHelper`/`Caption` errors use `role="alert"`; `NavMenu` uses `accessibilityViewIsModal`.

- **A6-02** · high · S — Toasts silent to VoiceOver: no `accessibilityLiveRegion`, no `announceForAccessibility` (`toast.tsx:15`, `toast-host.tsx:45-58`); Undo vanishes after 4 s (`TOAST_DURATION_MS`). *Fix:* announce in the `ToastHost` effect; `accessibilityLiveRegion="polite"`, `role="alert"`; longer timeout with a screen reader on.
- **A6-01** · medium · S — Reduced motion never checked (no `useReducedMotion`/`isReduceMotionEnabled`): `reorderable-list.tsx:125,239` (150 ms), `sheet.tsx:41` (`animationType="slide"`), swipeable row. *Fix:* reanimated `useReducedMotion()` → duration 0; Sheet "none"/"fade".
- **A6-03** · medium · M — Touch targets < 44pt: Checkbox 24 + hitSlop 8 = 40 (`checkbox.tsx:47-48,25`); WeekdayChip 36×36, no hitSlop (`weekday-chip.tsx:53-54`); Chip ≈ 39 (`chip.tsx:60`); SegmentedControl ≈ 37 / ≈ 32 compact (`segmented-control.tsx:91,94`); CategoryChip minHeight 36 (`category-chip.tsx:150`); IconSquare 36 (`icon-square.tsx:61`, dead anyway); Toast Undo ≈ 37 (`toast.tsx:56`); Link/inline/destructive Buttons ≈ 42 + hitSlop 8 (`button.tsx:76,147`). OK: Stepper, CompletionCircle, DragHandle, HeaderMenuButton, header buttons, MenuRow. Heatmap cells (18/11/16 pt) are documented V2 Deltas — do not "fix" to 44. *Fix:* hitSlop or `minHeight 44` on the failing ones.
- **A6-05** · medium · S — Selection groups lack semantics: Chip/SegmentedControl/WeekdayChip/IconSquare/CategoryChip use `role="button"` + `selected`, no group role/label ("Build, button, selected" with no "Direction"). *Fix:* SegmentedControl `role="tab"`/`radio` + `label` prop; WeekdayChip `role="checkbox"` + `checked`.
- **A6-09** · medium · S — Headings missing: only `sheet-header.tsx:27`, `destructive-confirm-sheet.tsx:115`, `reminders-screen.tsx:92`, `manage-categories-screen.tsx:78`, `manage-habits-screen.tsx:72` set `role="header"`. Missing on screen titles (`today-header.tsx:54`, `settings-screen.tsx:46`, `first-run-screen.tsx:56`, `weekly-summary-screen.tsx:53`, `monthly-summary-screen.tsx:91`, `yearly-summary-screen.tsx:92`, `habit-detail-screen.tsx:198`), every `SectionHeader` (`section-header.tsx:39-73`), export-sheet titles (`:126,164,195`), `quantity-log-sheet.tsx:71`. *Fix:* role inside `SectionHeader` (one change covers most) + each screen title.
- **A6-12** · medium · M (device) — Dynamic Type clipping risk: `NavMenu` (`nav-menu.tsx:56-66`) and `Sheet` (`sheet.tsx:57-61`) have no `ScrollView`; WeekdayChip letters in fixed 36pt circles in a space-between row; `numberOfLines={1}` in `trend-row.tsx:39`, `progress-row.tsx:38`, `category-chip.tsx:87`, `category-picker.tsx:78`, `stat-card.tsx:50,62`; 10–11 pt base sizes. *Fix:* ScrollView with `maxHeight` in sheet/menu; `maxFontSizeMultiplier` on stat numerals/weekday letters.
- **A6-13** · medium · S — Contrast failures (table below): light `faint` on `inner` 4.41 (disabled Chip `chip.tsx:55`, SectionLabel on inner); light `warnInk` on `warnTint` 4.31 and on `bg` 4.39 (11 pt: `field-helper.tsx:23`, `character-counter.tsx:34`, `delta-label.tsx:26`, `reminder-card.tsx:71`, `stat-card.tsx:54-66`); dark `dangerBg` as text 3.93 on card / 4.41 on bg (`caption.tsx:20`, `text-field.tsx:134`); unchecked Checkbox/CompletionCircle outlines use `border` at 1.25–1.31:1 vs 3:1 (`checkbox.tsx:32`, `completion-circle.tsx:108-117`). *Fix:* use `faint`/`sub` for outlines; retune `faint`, `warnInk`, dark danger text.
- **A6-04** · low · S — Today row: row button and checkbox are two stops and the name is read twice (`habit-today-row.tsx:83`, `completion-circle.tsx:98`); at-risk shown only by an amber border (`completion-circle.tsx:110-112`), not in the label (`habit-today-row.tsx:48-55`). *Fix:* hint "Opens details"; add at-risk to the label.
- **A6-06** · low · S — Stepper has no adjustable semantics/`accessibilityValue` (`stepper.tsx:29-70`). *Fix:* `role="adjustable"` with increment/decrement actions, or a polite live region.
- **A6-07** · low · S (device) — Time wheel unlabeled (`time-wheel.tsx:25-38`, `labelsHidden()`).
- **A6-08** · low · S — Decorative icons not hidden (no `importantForAccessibility`/`accessibilityElementsHidden` anywhere): IconBadge, chevrons, banner marker, field-helper dot. Mostly a TalkBack issue.
- **A6-10** · low · S — `SectionHeader` reads title and count as two stops (`section-header.tsx:39-60`). *Fix:* one accessible element "title, count" with `role="header"`.
- **A6-11** · low · S — Non-pressable heatmap cells aren't focusable on iOS (`heatmap-cell.tsx:131-136` View with label but no `accessible`); Monthly (`monthly-summary-screen.tsx:130`)/Yearly (`yearly-summary-screen.tsx:200`) per-day labels likely never read; status partly colour-led. *Fix:* `accessible` when labelled, or one grid summary label.
- **A6-14** · low · S — Reorder handle uses `adjustable` but handles no increment/decrement (`reorderable-list.tsx:140-157`). *Fix:* `role="button"` or map increment/decrement to move up/down.
- **A6-15** · low · S — Sheet scrim "Dismiss" still exposed when `dismissible=false` (`sheet.tsx:49-56`); no `onAccessibilityEscape`/focus management on Sheet/NavMenu.
- **A6-17** · low · S — TextField error text lacks `role="alert"` (`text-field.tsx:133-135`).

| Pair | Light | Dark |
|---|---|---|
| ink on bg / card / inner | 15.71 / 17.42 / 15.02 | 14.81 / 13.20 / 11.53 |
| sub on bg / card / inner | 5.86 / 6.50 / 5.60 | 7.04 / 6.27 / 5.48 |
| faint on bg / card / inner | 4.61 / 5.11 / **4.41 ✗** | 6.16 / 5.49 / 4.79 |
| warnInk on warnTint | **4.31 ✗** | 6.70 |
| warnInk on card / bg | 4.86 / **4.39 ✗** | 7.49 / 8.41 |
| onAccent on dangerBg | 5.16 | 4.41 |
| dangerBg text on card / bg | 5.16 / 4.65 | **3.93 ✗ / 4.41 ✗** |
| frozenInk on frozenBg (UI) | 4.28 | 5.73 |
| border on card (non-text, 3:1) | **1.31 ✗** | **1.25 ✗** |
| heatmap level 1 vs card (graphics) | 1.41–1.47 | 1.60–1.81 (design ramp, see intentional) |

Accent ink (icons/dots, need 3:1): all 19 hues pass (light on card 3.83–5.16; Creativity on bg 3.45).

---

## 9. Area 7 — Data layer and migrations

**Clean:** schema ↔ snapshot ↔ journal ↔ `migrations.js` consistent for 0000–0010 (drizzle-kit API diff = no statements); all 11 migrations apply in one `BEGIN…COMMIT` and match `schema.ts`; 0010 handled correctly (`defer_foreign_keys`, ids copied verbatim, AUTOINCREMENT high-water mark preserved, covered with FK on/off by `category-migration.test.ts`); data migrations 0004/0008/0009 deterministic; dates stored as local text `yyyy-MM-dd`, instants as integer seconds; indexes cover every query (`entries` UNIQUE(habit_id,date)+date, `frozen_days`, `entry_notes`, `reminders(habit_id)`); no `86400000`/`setDate`/`getTimezoneOffset` in non-test src; `getTime()` only on `startOfDay`-normalised values (DST-safe); no N+1 in services; `saveDayLog` uses a correct sync transaction; `deleteHabitAndHistory` covers all four child tables.

- **A7-01** · **high** · S — **Bug.** `entry-repository.ts:28-39` `useEntriesInRange(start, end)` calls `useLiveQuery(query)` with no deps; drizzle 0.45.3's `useLiveQuery(query, deps = [])` runs its effect once, so the first render's query is captured forever (verified in `node_modules/drizzle-orm/expo-sqlite/query.js`). Affects: Weekly Last/This-week toggle, Today/off-schedule after the week rolls over while mounted, Monthly/Yearly when `today` changes. Invisible to web (JS filter), visual-check, e2e, and unit tests (mock the hook). `useHabitReminders` already passes `[habitId]`. *Fix:* `useLiveQuery(query, [startDate, endDate])`; add a range-change test using the real `useLiveQuery` stand-in from `habit-repository.live.test.ts`; verify on device.
- **A7-02** · medium · M — Day rollover: `today = startOfDay(new Date())` is computed per render only (`use-today-queries.ts:58`, weekly/monthly/yearly/detail/off-schedule hooks); nothing handles foreground/midnight (only `use-notification-permission` uses `AppState`). A backgrounded-overnight app still shows yesterday as today and `toggleCompletion(habit.id, today, …)` (`today-screen.tsx` ~110-134) writes onto the previous day. *Fix:* one `useToday()` (AppState "active" + timeout to next local midnight via date-fns), used by every query hook; key live-query deps on its `yyyy-MM-dd`. *Device.*
- **A7-03** · medium · M — Raw `db.run(sql\`begin\`)…commit` across awaits (`createHabitsAndMarkSetting`, `reorderHabits`, `deleteHabitAndHistory`, `category-repository.ts deleteCategory`) on the single shared connection: live-query refetches/other writes interleave inside the open transaction; a concurrent second `begin` throws; `deleteCategory` reads "Other" before `begin` (TOCTOU). `saveDayLog`'s sync `db.transaction(tx => …run())` is the safe pattern. *Fix:* sync tx callbacks or `expoDb.withExclusiveTransactionAsync`; add a concurrent-write test. *Device.*
- **A7-04** · medium (design) · S–M — Foreign keys are OFF on device (`expo-sqlite` default; `client.ts` doesn't set it) and every FK is `ON DELETE NO ACTION`, so FKs are documentation only; code compensates (`resolveHabitCategory` falls back to Other, manual child deletes; dev `deleteAllHabits` leaves orphans); tests run on node:sqlite with FK ON (stricter than production). *Fix:* pick and document one — (a) keep off + `foreign_key_check` assertion in `test-db` and a dev startup check, or (b) `PRAGMA foreign_keys=ON` after migrations + make `deleteAllHabits` delete children (needs a device pass).
- **A7-05** · medium · M — Over-fetch (= A9-04): Today runs `useEntriesInRange` + `useAllEntries` + frozen days + all reminders; Manage loads all entries only to count logs (`use-manage-habits-queries.ts`); Detail loads all entries/notes then filters one habit in JS; stacked screens each subscribe; one table tick re-runs 4–6 full scans; `getFreezesUsedInMonth` selects rows and returns `rows.length`; hooks use `data ?? []`, ignoring `updatedAt`. Documented as intentional at current size. *Fix:* per-habit count hook for Manage; `useHabitEntries(habitId)` with deps; `count()` for freezes; loaded flag.
- **A7-06** · low · S–M — No DB-level case-insensitive unique on `categories.name` (rule only in `findDuplicateCategory`); shape enum, hour 0–23, minute 0–59, `times_per_week` 1–7, `target_amount > 0`, date format are TS-only (CHECKs need a table rebuild); 0009's ASCII-only `lower()` may have produced accent-case duplicates. *Fix:* `CREATE UNIQUE INDEX … ON categories(name COLLATE NOCASE)` after checking data; CHECKs only alongside the legacy cleanup.
- **A7-07** · low · S — Migrator compares only the last applied `created_at` to each journal `when`; a lower `when` is silently skipped. 0010's `when` (1790943040001) was hand-set 41 ms after 0009; all 11 monotonic today but unenforced; the FK-failure iterations aren't in history (0009 + 0010 in one commit; lesson lives in 0010's header comment). *Fix:* test for strictly increasing `when`, idx = position, snapshot `prevId` chain, tag/file/import parity.
- **A7-08** · low · M — Migration failure shows raw text only, no retry/backup (`database-provider.tsx`); migrator is atomic so the old schema survives. (= A3-01) *Fix:* copy `habits.db` → `habits.db.bak` when migrations are pending; Retry. *Device.*
- **A7-09** · low · S — `updateHabit`, `setHabitArchived`, `setHabitRestored` with a missing id throw a `TypeError` in `toHabit` (category functions throw a clear "not found"). *Fix:* shared `requireRow`.
- **A7-10** · low · S — Every native/web pair has a `_sameShape` guard and matching exports (web-only extras `applyCategoryChange`, `reassignHabitsToCategory` documented); behavioural gaps: web `deleteHabitAndHistory` doesn't clear entries, web batch-create isn't atomic, web range filtering is in JS (hides A7-01). *Fix:* a parity test for range changes.
- **A7-11** · low · S — `toISOString()` used as React keys (`monthly-summary-screen.tsx:128`, `habit-heatmap.tsx:87`, `yearly-summary-screen.tsx:198`) — UTC for a local-day key (harmless as keys). *Fix:* `format(d, "yyyy-MM-dd")`.

### Legacy column cleanup plan
Legacy nullable columns on `habits`: `icon`, `color`, `category` (free text); nothing in `src` reads or writes them (only `category-migration.test.ts` and 0009/0010 SQL); no other table has legacy columns. Sequence: (1) ship one release with 0010 in the field and confirm upgrade-in-place worked; (2) remove the three fields from `schema.ts` and run `drizzle-kit generate` (owner runs it — expect a full `__new_habits` rebuild); (3) replace the rebuild by hand with three `ALTER TABLE habits DROP COLUMN …` (columns are not indexed or in any FK/UNIQUE/CHECK; SQLite ≥ 3.35 — verify the version bundled with expo-sqlite) keeping the generated snapshot; (4) re-run the drift check and the populated-DB migration test with FK on and off; (5) don't bundle other constraint changes unless a rebuild is wanted anyway (then reuse 0010's pattern); (6) optional NOCASE unique index (A7-06).

### Proposed migration-safety check
Jest test e.g. `src/lib/db/migrations.safety.test.ts` on the `test-db.ts` helpers: for each journal entry N build a DB migrated to N-1 with FK ON and OFF, seed ≥ 2 rows in every table (incl. id gaps/deleted rows), apply N and the rest in one `BEGIN…COMMIT`, assert `PRAGMA foreign_key_check` empty, row counts and child→parent joins unchanged, `sqlite_sequence` not reduced, `sqlite_master` diff only the expected object. Static checks: `when` strictly increasing, idx = position, `prevId` chain, tag/file/import parity; fail on `PRAGMA foreign_keys` in any `.sql` or on `DROP TABLE` of habits/categories without `defer_foreign_keys`; drift test with `drizzle-kit/api` (`generateSQLiteMigration(latestSnapshot, generateSQLiteDrizzleJson(schema))` must be `[]`). Commit a V1-era (0008) DB fixture with realistic rows and upgrade it to HEAD in CI.

---

## 10. Area 8 — Code quality

Method: `knip` (npx cache, config in scratchpad, repo untouched) in default and `--production` mode + grep verification. **Clean:** no `any`, `@ts-ignore`, `@ts-expect-error` or non-null `!`; no FIXME/XXX/HACK; hook naming and kebab-case consistent; native/web export surfaces match; all `biome-ignore` (10) have reasons (8 `noArrayIndexKey` on fixed positional layouts, 1 `useExhaustiveDependencies`, 1 `useDateNow` in tests).

- **A8-01** · medium · S — `src/components/ui/primitives/icon-square.tsx` (+ test) has no production importer; `docs/app-architecture.md:48` lists it. (= A4-05 #7) *Fix:* delete and update the doc line.
- **A8-02** · medium · S — Unused deps (template leftovers): `expo-device`, `expo-image`, `expo-web-browser`, `expo-glass-effect` (`package.json` l.12, 16, 17, 27; `expo-glass-effect` is already a dependency of expo-router). Legit without direct imports: `expo-constants`, `expo-linking`, `expo-font`, `react-native-screens`, `react-dom`, `react-native-web` (peers), `expo-system-ui`, `@expo/ui`, `expo-drizzle-studio-plugin`, `babel-plugin-inline-import`, `husky`, `@types/node`. *Fix:* remove the four (note A3-07 may want `expo-device`/`expo-constants` for diagnostics — keep those two if A3 is implemented).
- **A8-03** · low · S — `sf-symbols-typescript` imported type-only in 8 files but not in `package.json` (resolves transitively). *Fix:* add as devDependency or re-export the type once.
- **A8-04** · medium · S — `"lint": "expo lint"` has no ESLint behind it; Biome is the real linter. (= A2-11, A12-10) *Fix:* `biome check .`.
- **A8-05** · low · S — `scripts/reset-project.js` + npm script (= A2-06). *Fix:* delete.
- **A8-06** · medium · M — Production-mode knip: 67 unused exports, 15 unused exported types, 5 files reachable only from tests. Truly dead (not used even in tests): `HeaderButton`, `COUNTER_FROM_RATIO`, `COUNTER_THRESHOLD`, `EVENING_REVIEW_NOTIFICATION_ID` (evening review removed in HAB-21), `THIS_WEEK_FROM_ISO_DAY`, `EXPORT_JSON_VERSION`, `COMPLETION_RATE_WINDOW_DAYS`, threshold constants in `monthly-insights.ts`/`yearly-insights.ts`, ~12 exported types; ~15 fixture exports unused (`GARDEN_FIXTURE`, `*_HABIT_FIXTURES`, `habitDetailArchivedFixtures`, `retroLogFixtures`, `*_CLOCK` …) — confirm against `scripts/visual-check` first; a third group is exported only for tests (message constants, `escapeCsvField`, `heatmapLevelFor`, `weekWindowFor`, `getFrequencyStrategy`) — acceptable. *Fix:* delete group 1; keep group 3.
- **A8-07** · medium · S–M — Six `.web.ts` repositories repeat the same in-memory store boilerplate (`store`, `listeners = new Set`, `subscribe`, notifying setter, `useSyncExternalStore`, ~12 lines each): habit, entry, frozen-day, reminder, category, app-settings. Sizes native/web: habit 391/329, entry 182/158, category 113/101, reminder 102/111, frozen-day 60/82, app-settings 43/91. *Fix:* one `createMemoryStore<T>` in `src/lib/`.
- **A8-08** · medium · S — `const DATE_FORMAT = "yyyy-MM-dd"` redeclared in 11 files; literal appears 54× in 28 files. (= A1-09) *Fix:* shared `toDayKey`/constant.
- **A8-09** · low · S — Weekday name tables copied 4–5× (`habit-detail-helpers`, `reminders-helpers`, `habit-picker-helpers`, `export-csv`, `monthly-summary-helpers`, `completion-grid`) though `constants.ts:99` has one.
- **A8-10** · low · S — `n === 1 ? "x" : "xs"` appears 13×; number formatting split between `thousands()` (regex) and `formatCount` (`toLocaleString("en-GB")`). (= A5-16) *Fix:* `pluralise` + one count formatter.
- **A8-11** · low · S — Percentage rounding repeated: `monthly-summary-helpers.ts:35`, `habit-detail-helpers.ts:61`, inline `today-screen.tsx:370`, `points` in `yearly-insights.ts`/`monthly-summary.ts`; yearly helpers import `percent` from the monthly helpers file. *Fix:* shared helper.
- **A8-12** · **high** · L — Oversized components: `TodayScreen` is a 448-line function (`today-screen.tsx:37`, 8 `useState`), `HabitFormScreen` 372 lines, `HabitDetailScreen` 267, `ExportSheet` 169, `ManageCategoriesScreen` 163, `ManageHabitsScreen` 155. *Fix:* sheet-state hook, dev-tools component, move toast/undo logic out of the screen; split the form into section components.
- **A8-13** · low · S — Stale comments: `today-screen.tsx:411-418` "Temporary until HAB-13" (shipped); `scripts/visual-check/screens.mjs:148` "Coming soon until HAB-15"; `segmented-control.tsx:7` "Year, until HAB-17".
- **A8-14** · low · S — 4 inline "(dev)" buttons + Alert handlers in `today-screen.tsx:423-457` (= A1-06).
- **A8-15** · low · M — Magic numbers: 270 padding/margin/gap and 55 `borderRadius` literals, 25 `fontSize` (≥ 11 duplicate `typeScale`), `rgba(255,255,255,0.22)` at `category-chip.tsx:58` (= A4-01…03). The design docs may specify raw pixels deliberately.
- **A8-16** · low · S — `src/lib/db/test-db.ts` and `modules/habits/test-support/*` reachable only from tests. *Fix:* ignore in the dead-code config.
- **A8-17** · low · S — Naming: `useExportQueries` lives in `use-settings-queries.ts`; `use-streak-actions.ts` has no test of its own (used at `today-screen.tsx:30,65`, mocked in `today-screen.test.tsx`); boolean naming mixed (`open`, `loading`, `visible`, `pickerOpen`, `isAddCategoryOpen`, `isAdding`).
- **A8-18** · low · S — Tighten production casts: `yearly-insights.ts:106` (`longest.habit as Habit`), `habit-repository.ts:134` (`as HabitRow[]`), `Number(day) as IsoWeekday` (`habit-repository.ts:37`, `reminder-repository.ts:23`), `getISODay(...) as IsoWeekday` in 3 files (a `toIsoWeekday` helper removes them), `habit-fixtures.ts:116`. `as unknown as` only in `test-db.ts:95,99` and `habit-repository.test.ts:181` (fine).
- **A8-19** · info — `biome-ignore` suppressions all justified; no action.

**Large files (non-test, > ~300 lines):** `habit-fixtures.ts` 838, `today-screen.tsx` 508, `habit-form-screen.tsx` 477, `monthly-summary.ts` 409, `monthly-summary-screen.tsx` 406, `yearly-summary-screen.tsx` 392, `habit-repository.ts` 391, `habit-history.ts` 369, `habit-detail-screen.tsx` 364, `habit-repository.web.ts` 329, `entry-fixtures.ts` 310. Next tier: `constants.ts` 280, `yearly-summary.ts` 268, `reorderable-list.tsx` 250. Longest functions: TodayScreen 448, HabitFormScreen 372, HabitDetailScreen 267, ExportSheet 169, `makeEntryFixtures` 122, `buildMonthlySummary` 91.

**Proposed dead-code check:** `knip` as devDependency; scripts `"deadcode": "knip --production"`, `"deadcode:all": "knip"`; `knip.json`: entry `src/app/**/*.{ts,tsx}`, `scripts/**/*.{js,mjs}`, `src/**/*.test.{ts,tsx}`, `jest.setup.js`; project `src/**/*.{ts,tsx,js}` + `scripts/**/*.{js,mjs}`; ignore `src/lib/db/migrations/**`; `ignoreDependencies: ["sf-symbols-typescript"]`; production variant suffixes entries with `!` and ignores test-support/test-db. Without custom config knip reports 184 false "unused files" (doesn't detect the Jest setup). Run before PRs / CI (too slow for pre-commit).

---

## 11. Area 9 — Performance

React Compiler is enabled (`app.json` `experiments.reactCompiler=true`); `use-theme`, `entry-repository`, `today-screen`, `use-today-queries` compile and `use-theme`/`TodayScreen` are auto-memoized, so manual-memo/zustand-selector/theme-object concerns are low. Benchmarks: services transpiled and run in Node with a synthetic 3-year history, 20 habits, ~15k entries; Hermes is likely 2–5× slower.

**Clean:** zustand selectors return primitives; Today menu does no work while closed (mounted only when open, `today-screen.tsx:214-219`); yearly menu row avoids reading year entries; weekly/monthly/yearly hooks use bounded range queries; startup is clean (migrations apply only unapplied ones, splash held for the theme read, no seeding or notification rescheduling on launch — `scheduleNotificationAsync` only at `notifications.ts:96,109`; `useDrizzleStudio` null outside `__DEV__`); no heavy deps (date-fns imported by name).

- **A9-01** · **high** · M — Today recomputes streak-at-risk over all entries every render: `use-today-queries.ts:63,98-120` + `habit-service.ts:47-130`. `useAllEntries` is unbounded; `getStreakAtRisk` filters and `parseISO`s every entry of each due habit before cheap checks: ≈ 45 ms/render (Node) when nothing is at risk, ≈ 125 ms when all are; runs on menu open, toggle, sheet, and every entry write. *Fix:* cheap string-Set checks first (yesterday due, missed, freezes left), then heavy work; memoize per habit or bound the query.
- **A9-02** · **high** · M — Per-week strategy is O(n) per day: `strategies/per-week-frequency.ts:36-70` (`wasScheduledOn` runs `isSameWeek`/`startOfWeek` over all completed dates per call; ≈ 80% of CPU). Per-day callers: `habit-history.ts:96,153,217`, `monthly-summary.ts` `outcomesFor` (~233), `yearly-summary.ts`. Node timings: longest-streak 3-year per-week habit **735 ms**, 90-day rate 57 ms, heatmap 82 ms, `buildYearlySummary` 20 habits **1.4 s**. Habit Detail runs several per render → probable multi-second freeze on Hermes for per-week habits with years of data. *Fix:* pre-bucket completed days by week in the strategy context so `wasScheduledOn` is O(1) (keeps the Strategy pattern); compute `longestOf` once in the yearly summary. *Device:* profile.
- **A9-03** · medium · S — Summary/detail/menu hooks compute in render without memo; opening the menu mounts weekly+monthly summaries and ≈ 7 live subscriptions (`use-today-menu-queries.ts:64-71`; `buildMonthlySummary` ≈ 50 ms Node), sublines resolve asynchronously (likely flicker); `today = startOfDay(new Date())` is a new object each render, defeating memo deps (`use-habit-detail-queries.ts`, `use-monthly-summary-queries.ts`, `use-yearly-summary-queries.ts`). *Fix:* stable `todayKey` string + `useMemo`; menu sublines from cheap counts.
- **A9-04** · medium · S — = A7-05 (duplicate/unbounded live queries: ≈ 10 subscriptions on Today incl. two weekly-entries queries and two `useActiveHabits` (2 queries each); drizzle refires on any table change with a fresh array; `use-habit-detail-queries.ts:53-55`, `use-retro-log-queries.ts:26-27`, `use-manage-habits-queries.ts:31`, `use-settings-queries.ts:55-57` filter in JS). *Fix:* share one entries subscription per screen; filter by `habitId` in SQL.
- **A9-05** · medium · S — `useTodayQueries` returns fresh Maps/Sets every render (compiler prunes its memo blocks), so memoized children re-render; low impact at ~20 habits. *Fix:* `useMemo` the body.
- **A9-06** · low — Today list is `ScrollView` + `.map` (`today-screen.tsx:381-404`), no `React.memo` anywhere; fine at 20–40 rows. Don't prioritise.
- **A9-07** · low — Other lists (70-cell heatmap, 12-month chart, Manage/categories) are small.
- **A9-08** · low — Startup clean (above).
- **A9-09** · low — Bundle/deps fine; web-only/dev-only packages (react-native-web, react-dom, drizzle-studio, playwright, pixelmatch) only add install size; unused deps → A8-02.
- **A9-10** · low — `useTheme` clean (selects a primitive; compiler memoizes the object).

*Device:* seed 3 years × 20 habits incl. ≥ 5 per-week habits; profile Today first render and post-toggle render, Habit Detail (per-week), Yearly/Monthly, menu-open animation; JS-thread time after each entry write; cold start on a populated DB. `useAllEntries` unbounded is documented in `entry-repository.ts:38-49`; the fetch is fine, the CPU is in the strategy math.

---

## 12. Area 10 — Tests

Overall coverage: lines 93.7 %, branches 87.5 %; services and strategies > 80 % lines. Plain suite: 178/178, 22–24 s. **Clean:** no order dependence by inspection (web repo tests use `jest.isolateModules`); `pin-clock.web.test.ts` restores `Date` in `afterEach`; call-order assertions limited to 2 justified cases (`reminder-service.test.ts:133`, `habit-lifecycle-service.test.ts:79`); `visual-check` writes only to git-ignored `.visual-checks/` unless `--update-baseline`.

- **A10-01** · medium · S — Coverage run times out: with `--coverage`, `today-screen.test.tsx:189,204` and `habit-form-screen.test.tsx:97` exceed the 5000 ms default (screen suites take 140–180 s under coverage). *Fix:* `testTimeout: 15000` in the `package.json` jest config.
- **A10-02** · medium · M — Zero coverage: `use-streak-actions.ts` and `use-off-schedule-queries.ts` are never imported by any test (`today-screen.test.tsx:85,111` mock them); `use-off-schedule-queries.ts` has real week-range and `new Date()` logic.
- **A10-03** · low · S — No colocated tests for `habit-picker-helpers`, `habit-picker-row`, `off-schedule-row`, `today-header`, `today-nav-menu`, `export-formats`, `export-json`, `category-rows`, `constants`, `theme-preference-store`, `use-theme` (mostly covered indirectly). Priority: `export-json`/`export-formats` (data-export correctness), then `today-nav-menu`.
- **A10-04** · low · S — Repository branch gaps: `frozen-day-repository` 57 % lines / 0 % branches; `reminder-repository` 33 % branches; `entry-repository` 72 % lines; `app-settings-repository` 67 %; `category-repository.web` 71 %.
- **A10-05** · low · S — Never imported by any test: db `client`, `database-provider`, `file-export` (+web), `notifications.web`, `time-wheel.web`, `pin-clock.ts`, all `src/app` routes. Only `file-export` has logic worth testing.
- **A10-06** · medium · S — Midnight flake risk: only 9 of 178 suites use fake timers; `entry-repository.web.test.ts:15` computes `TODAY` at module load then calls `new Date()` again, `use-retro-log-actions.test.ts:38` same pattern. *Fix:* `jest.useFakeTimers()` + `setSystemTime`.
- **A10-07** · medium · M — Untyped hook mocks: `today-screen.test.tsx` mocks 9 own hooks with hand-written return shapes (30 `jest.mock("../hooks…")` overall) with no type tie to the real hooks. *Fix:* `satisfies ReturnType<typeof useX>` or drive screens from the in-memory test DB.
- **A10-08** · low · S — Style-coupled assertions (`toHaveStyle`/`StyleSheet.flatten`) in ~32 files duplicate the visual baseline with hard-coded sizes/colours (will all need edits when tokens land, A4-01).
- **A10-09** · **high** · M — No V2 e2e coverage. 5 Maestro flows, all V1 (HAB-01/03/06, 09/10, 11, 12, 13); missing V1: HAB-02, 04, 05, 07, 08; missing all V2: HAB-14 (nav menu), 15 (settings/export), 16 (monthly), 17 (yearly), 18 (off-schedule + retro-log pinning), 19 (manage rework), 20 (archived/restored detail), 21, 22, 24/25 (categories), delete sheet. Highest value first: HAB-18, HAB-24/25, HAB-14–16 navigation, HAB-15 export. Moreover (A12-02) 3 of the 5 existing journeys currently fail.
- **A10-10** · medium · S — `today-menu-open` flake root cause (from reading code; not reproduced): the popover position settles through a chain of `setTimeout`-deferred measurements. `TodayHeader.handlePress` (`today-header.tsx:31-36`) opens the menu then measures the button; the anchor starts as a guess of 110 (`today-screen.tsx:75`); react-native-web's `measureInWindow` defers via `setTimeout`, so the real anchor arrives a task later; `NavMenu` (`nav-menu.tsx:36-47`) measures itself again from both a `[anchorBottom]` effect and `onLayout`, so the popover jumps twice. The capture waits on the text "Weekly summary" (appears before positioning), then a fixed 400 ms (`screens.mjs:132-142`) + 500 ms from the runner — while 4 Chromium pages run at once (`visual-check.mjs:53`). Under CPU load the macrotask chain sometimes outlasts the window; a 1-px shift on the shadowed popover exceeds `MAX_DIFF_PIXELS=10`. `animations: "disabled"` doesn't help (jumps are JS-driven); `page.clock.setFixedTime` fixes only `Date`. No earlier commit changed the wait strategy; the 400 ms wait was introduced in HAB-14 (36ecf7f) and copied to today-empty-menu-open, the monthly/yearly menu states and the dark twin. *Fix (in order):* (a) replace the fixed wait with a helper polling until the popover's `getBoundingClientRect().top` is stable for 3 consecutive frames and equals button bottom + 8; (b) measure the button before `setMenuOpen` so `NavMenu` renders once at the final position, drop the duplicate onLayout/effect measure; (c) `CONCURRENCY` 2 and retry a failing state once. (= A11-09)
- **A10-11** · low · S — Baseline bloat: 128 PNGs / 13 MB in git, ~34 are dark and long-name twins; 36ecf7f alone touched 8 PNGs.
- **A10-12** · low · S — No `collectCoverageFrom`/threshold, so never-imported files are invisible and fixtures dilute the numbers.

**Slowest suites (plain run):** habit-form-screen 10.9 s, habit-detail-screen 8.5 s, manage-habits-screen 7.2 s, today-screen 5.7 s, manage-categories/monthly/yearly 5.0 s, reorderable-list 2.7 s, swipeable-row 2.6 s; slowest single test 1.4 s.

**Visual-baseline cost/benefit:** keep it — it catches cross-screen regressions from shared components with a zero-noise tolerance — but trim: fix the flake with a deterministic wait; keep dark twins for 4–5 chrome-heavy screens and long-name twins for today/detail/manage only; pin Chromium and fonts (or regenerate on CI); don't gate pre-commit on it.

---

## 13. Area 11 — The AI setup (how this is built with Claude Code)

Evidence: all config/docs read, `git log` for HAB-14…25, 12 V2 session transcripts with their spec-reviewer runs. No `.mcp.json`, no `~/.claude/CLAUDE.md`, no project memory dir, no `.github/` (no CI). User settings only set theme and `model=opus`.

**Working well (keep):** rules 1–2 hold (0 violations); the mockup gate and "plan, then wait for Go" in `/implement-feature` worked in every V2 session; the visual-check recipe is concrete and used in all 12 sessions (9–24 runs each); `header-buttons.guard.test.ts` is the right model (bug → mechanical guard); 178 colocated tests and every V2 feature added tests; the spec-reviewer prompt is skeptical and architecture-specific.

- **A11-01** · high · S — `SKILL.md:3,9,12,36` points only at `feature-spec.md` and `design-system.md`; V2 lives in the `-v2` files, so the agent greps outlines every session; "no Maestro unless asked" was wrong for HAB-14 (flows had to be edited). *Fix:* resolve the spec file by id range; read the Deltas.
- **A11-02** · high · S — No migration-safety step. HAB-24's migration 0010 table rebuild failed with `FOREIGN KEY constraint failed` (SQLite ignores `PRAGMA foreign_keys` inside the migrator's single transaction); found only because the user asked for an FK-on test before committing (b04fe815, 12:32); fixed with `defer_foreign_keys` in 0651cbc. *Fix:* schema-change branch in the skill + `check-migrations` (A7 proposal) + a `migration-reviewer` subagent run only on schema diffs.
- **A11-03** · high · S — The reviewer step lives only in CLAUDE.md prose; the user typed "run the spec-reviewer" by hand in ~9 of 12 sessions. *Fix:* make it a skill step.
- **A11-04** · high · S — The user restates the same constraints in every "Go": "do not commit" (HAB-17, 18, 20, 21, 22, 23), "keep the today-menu-open* baselines out" (8 sessions), "log deviations in v3-backlog.md", "device checklist, light and dark" — and still "did u commit something ?" (24d759ef). *Fix:* make them skill steps and CLAUDE.md rules.
- **A11-05** · high · S — The PostToolUse format hook matches only `Edit|Write`, but later sessions edit through Bash `python`/`sed` (Edit/Write vs bash-edit calls: b04fe815 9 vs 76, 69eb40e1 0 vs 31, ee6cc5be 0 vs 28, 24d759ef 0 vs 31). *Fix:* a CLAUDE.md rule "prefer Edit/Write"; run formatting in the Stop hook and pre-commit rather than relying on the matcher.
- **A11-06** · medium · S — Stop hook runs the full Jest suite on every stop: 159 Stop events at 10–29 s each (peak 57.6 s in 24d759ef), also on Q&A turns, never runs `tsc`. *Fix:* skip on a clean tree; `jest --onlyChanged`; add `tsc --incremental`; honour `stop_hook_active`.
- **A11-07** · medium · S — `format.sh` runs Biome over the whole repo after each of 720 edits and streams output into context. *Fix:* format only `.tool_input.file_path`.
- **A11-08** · high · M — Pre-commit is only `biome check --write .`: no `tsc`, no tests, no CI; `technical-architecture.md:65` promised tests via Husky and it never happened; `package.json` `lint` is dead and `AGENTS.md` tells the agent to run it, contradicting CLAUDE.md. *Fix:* `tsc` + `check-architecture` in pre-push/CI; fix `lint`.
- **A11-09** · medium · M — `today-menu-open*` baselines flaky (74 px popover offset); the user said "don't touch these" in 8 consecutive sessions; still unfixed (`v3-backlog.md:25-32`); visual-check is manual and run 9–24× per session. (= A10-10)
- **A11-10** · medium · M — Maestro ran in only 4 of 12 V2 sessions; no V2 flows; HAB-14 broke flows that tapped removed buttons. (= A10-09, A12-02)
- **A11-11** · medium · S — CLAUDE.md:15 "Categories, mid-migration" is stale (HAB-24 landed); `v3-backlog.md` is missing from the doc list although every V2 session edits it. (= A12-01)
- **A11-12** · medium · S — `AGENTS.md` duplicates ~40 % of CLAUDE.md and contradicts it on lint and `bunx`. (= A2-11)
- **A11-13** · medium · S — `make check` is the real definition of done but isn't in CLAUDE.md.
- **A11-14** · medium · M — Rules 1, 2, 4, 6, 8, 9 are cheap to enforce and aren't; rule 7 has 84 non-test `new Date(` occurrences and no allowlist, so it can't be linted as stated.
- **A11-15** · medium · S — `spec-reviewer` is hard-coded to `feature-spec.md`/`design-system.md` (V2 worked only because each parent prompt re-listed files); doesn't check migrations, leftover TODO markers, backlog entry, baselines touched, `.web.ts` parity, dark states.
- **A11-16** · low · S — `codebase-auditor` used once (09-25) and never again; its mechanical items should be a script, keep the agent for judgement items.
- **A11-17** · medium · M — Docs ≈ 171 KB (≈ 43k tokens); `app-architecture.md` (≈ 5k tokens) was `cat`ed whole in several sessions (half is rationale prose); stale: `roadmap.md` (Phase 7 "Next", "12 features"), `feature-spec.md` (`status: draft`), `technical-architecture.md` ("SDK 55+" vs expo ~57), folder tree omits `lib/app-settings`, `dev-clock`, `file-export`, `.web.ts` pairs.
- **A11-18** · medium · S — The plan step doesn't force a search for existing components; the user repeatedly corrected plans: "Build HabitPickerRow on ListItem/Checkbox/Stepper" (HAB-18), "ChartCard: extend Container" (HAB-17), "tomorrow row from ListItem" (HAB-14), "no half-applied delta on StatCard/HeatmapCell" (HAB-16).
- **A11-19** · medium · S — Liquid Glass: the user found the header-button capsule on device after HAB-24 (b04fe815 12:44); fix d26ad57 went into PR #13; CLAUDE.md never mentions the helper or its guard.
- **A11-20** · medium · S — Git hygiene: PR #23 holds both HAB-22 and HAB-23, PR #18 has a "small fix" commit, branch naming varies; the skill has no branch/commit/PR step.
- **A11-21** · low · S — No `permissions` allow/deny block in `.claude/settings.json`.
- **A11-22** · low · S — The WSL Chromium recipe sits inside the per-feature skill (move to a shared doc/script).
- **A11-23** · low · S — No lighter `/fix` skill, so small fixes run with no verification flow.

### What slowed V2 / let mistakes through
1. V2 took ≈ 7.5 h wall clock for 9 tickets on 10-02, then ≈ 45 min each for HAB-21…23; each ticket = plan → "Go" + 5–8 amendments → implement → one or more "before I commit" rounds; the amendments carry the repeated invariants.
2. FK migration failure caught late, on the user's initiative (A11-02).
3. Header buttons caught on device because web visual-check can't see them (A11-19).
4. The agent changed `per-week-frequency.ts` semantics in HAB-18; the user ordered it reverted ("Revert the per-week-frequency.ts change … show me the concrete case"). No rule says "do not change existing Strategy semantics".
5. V1 and V2 specs conflict (HAB-20 vs HAB-13); the user ruled per ticket; no doc says which wins.
6. Spec-reviewer findings arrive at the end and trigger extra rounds (HAB-19: new variants undocumented in `design-system-v2.md`).
7. Flaky baselines worked around by instruction in 8 sessions.
8. Hook cost (A11-06/07) and the format hook missing Bash edits (A11-05).
9. Wholesale `cat` of docs and new-component-instead-of-extend (A11-17/18).

### Proposed CLAUDE.md edits
- Replace the V1/V2 spec bullets with: **V2 beats V1; update the V1 text and tests in the same change; `docs/backlog.md` is append-only.**
- Replace the stale categories paragraph: managed `categories` table and `habits.category_id`; legacy `icon/color/category` columns nullable and unused; no free text.
- Add **Definition of done**: `make check`; visual-check light and dark; never update the `today-menu-open*` baselines; run `spec-reviewer`; log deviations and "As built"; do not commit unless asked.
- Add **Guards you will trip**: header buttons only via the helper; migrations tested with FK on, in one transaction, with child rows, `defer_foreign_keys` for table rebuilds; a `.web.ts` twin for every new repository; do not change existing Strategy semantics; prefer Edit/Write over python/sed edits.
- Rewrite rule 10 as "Reuse before create" in ~4 lines, keeping the Deltas note.
- Make `AGENTS.md` a stub; shorten "Expo specifics".
- Extend rule 1 wording to "a `repositories/` folder (module or `lib/*`)" (`lib/app-settings/repositories` imports drizzle, A12-09).

### Proposed `/implement-feature` flow
0. Resolve id → spec file, mockups, design-system section; create branch `feat/hab-<id>-<slug>`.
1. Explore: read only the HAB section, referenced NEW-/VAR- entries and Deltas; `rg` for existing components and list shared components touched with their consumers; stop if the mockup is missing.
2. Plan, then wait for "Go": layers table; **reuse table** (existing / extend / new, why); migration plan for any schema change; baselines expected to change; V1/V2 conflicts; open questions with defaults.
3. Implement, tests first, Edit/Write only.
4. Verify: `make check`; `check-architecture`; `check-migrations` if schema changed; visual-check on touched screens + dark; one full run excluding the flaky list; e2e only if a flow references touched labels.
5. Spawn `spec-reviewer`; fix blocking findings.
6. Report: acceptance criteria one by one, baselines changed, backlog/"As built" updated, device-only checklist.
7. Commit only when told: one conventional commit, one PR per ticket.

### Proposed checks, subagents, hooks
- `scripts/check-architecture.mjs` (in `make check`, pre-push, CI, Stop): Drizzle and `useLiveQuery` placement; cross-module imports; hook naming; thin `src/app`; colocated tests; `.web.ts` twins; hex colours and `new Date(args)` outside theme/utils.
- `scripts/check-migrations` (= A7 proposal) + `drizzle-kit check`.
- dependency-cruiser (module boundaries, cycles, layer order, no production→test imports, orphans); knip (A8).
- Biome `noRestrictedImports` with overrides for `repositories/**`, `lib/db/**`, tests (verify the rule name against Biome 2.5).
- `.claude/settings.json`: permissions **allow** `tsc`, `biome`, `jest`, `visual-check`, read-only `git`; **deny** `npm install`, `git push`, `git commit`, `rm -rf`; `migrations/**` edits → **ask** (0010 legitimately needed a hand edit); PostToolUse `Edit|Write` → `format.sh` formatting only the single file from stdin `.tool_input.file_path`; Stop → `verify.sh`: skip if the tree is clean, then `tsc --incremental`, `check-architecture`, `jest --onlyChanged`, exit 2 on failure, honour `stop_hook_active`. (Exact snippets were drafted by the area auditor and are not reproduced here; ask and I'll write them out.)
- New `migration-reviewer` subagent (schema diffs only); revised `spec-reviewer` taking the feature id, naming the V2 docs and adding the A11-15 checklist.

### Rules → tooling enforcement

| Rule | Enforceable | How |
|---|---|---|
| 1 Drizzle placement | Yes, fully | Biome `noRestrictedImports` + override, dependency-cruiser; grep `$inferSelect` (0 violations now) |
| 2 live-query hook | Yes | restrict `drizzle-orm/expo-sqlite`; grep `useLiveQuery(` |
| 3 services only if composite | No | reviewer/auditor; optional heuristic script |
| 4 hook naming | Yes | script on file and exported names |
| 5 Strategy, not if-branch | Partly | grep `direction ===` / `frequency.type ===` outside `strategies/`; reviewer |
| 6 no cross-module imports | Yes | dependency-cruiser or Biome restricted pattern |
| 7 RHF+Zod, date-fns | Partly | ban `new Date(args)` and `.setDate`; shared clock for "now"; grep forms |
| 8 colocated tests, e2e names | Yes | script |
| 9 thin routes | Yes | script: `src/app` imports only `modules/` or `expo-router`, line cap |
| 10 reuse primitives | Partly | grit/regex for `StyleSheet.create` with `Pressable` in `*-screen.tsx`, plus hex colours; rest is reviewer |
| Header buttons | Already | the guard test |
| Migration safety | Yes | `check-migrations` + `drizzle-kit check` in CI |
| no `npm install`, no commit/push | Yes | permissions deny |

### Lean doc set (proposal)
`CLAUDE.md` ≈ 1.2k tokens; `AGENTS.md` stub; `docs/architecture.md` merging `app-architecture` + `technical-architecture` (≈ 4 KB: updated tree, the 10 rules with one-line reasons, patterns table; drop SOLID essays, sources, "still open"); one `design-system.md` with the V2 Deltas applied; one spec file per ticket `docs/specs/hab-NN.md` with "As built" in the same file plus an index (so `/implement-feature` reads 1–3 KB instead of `sed`-ing a 34 KB file); `docs/backlog.md` append-only and out of default context; `docs/audits/` for dated reports; `roadmap.md` collapsed to a status table; new `docs/decisions.md` for cross-ticket rulings (V2 beats V1, category order, archived-habit insight rule, flaky-baseline list).

---

## 14. Area 12 — Docs and process

Branch note: the audited tree is `master` at 53062fb per the auditor (HAB-22 + HAB-23 both merged in PR #23; every ticket HAB-14…25 merged: #13, #14, #15, #16, #17, #18, #19, #20, #21, #22, #23).

**Clean:** all 13 docs named in CLAUDE.md exist; every mockup path referenced from docs/scripts/src resolves except `retro-log.png`; the built-in and rotation category tables match `design-system-v2.md` exactly ("Other" hue null); "As built" notes for HAB-14/15/17/18/19/20/22/23/24/25 spot-checked against code and match (HAB-16 only partly checked); `technical-architecture.md` lists no library absent from `package.json`; `feature-spec.md` HAB-20 "superseded" notes present (lines 473, 478, 485, 487).

- **A12-01** · medium · S — CLAUDE.md "Categories, mid-migration" is false: `schema.ts:25` has a `categories` table; `habits.categoryId` (`schema.ts:61`) is NOT NULL FK; legacy `icon/color/category` remain nullable (`schema.ts:53-60`). (= A11-11) *Fix:* replace with the A11 wording.
- **A12-02** · **high** · M — Last Maestro run (`.e2e-output/report.xml`, 2026-10-05 13:52): **3 of 5 journeys FAIL**: hab-13 asserts "Manage habits" (`e2e/hab-13-manage-archive-delete.yaml:45`; title is now "Habits"; the line-46 footnote text is stale — now "Order is set per category and matches Today…", `manage-habits-helpers.ts:31`); hab-06 asserts a "Morning" group (`e2e/hab-06-01-03-first-run-add-and-log.yaml:24`; first-run groups are now category names, `constants.ts:170-215`); hab-09-10 can't find `id "Glass of water, done"` (also used in hab-11 `:34,43,52`, which passed). `e2e/README.md` describes all five as working and has no V2 journeys. *Fix:* update selectors, re-run `npm run e2e`, note the uncovered V2 flows.
- **A12-03** · medium · S — `docs/roadmap.md` frozen pre-build: Phase 7 "Next", Phases 8–13 "Not started", "12 features" (there are 13), no V2/HAB-14…25 row, "Immediate next action: begin Phase 7". *Fix:* mark 7–11 done, add V2 row, fix the count, replace the next action.
- **A12-04** · low · S — `feature-spec.md` `status: draft` with all 64 acceptance boxes unchecked; "Name 1–40 characters" (l.53) superseded by HAB-22 (32, `constants.ts:83`) and Category/Icon/Color rows (54–56) superseded by HAB-24 — no "superseded" note; "Anytime" survives only as a comment (`today-screen-helpers.ts:14`). *Fix:* tick boxes or drop the tracker claim; add "Superseded by" notes.
- **A12-05** · low · S — Only HAB-14, 15, 17, 18, 19, 20 have "As built" in `feature-spec-v2.md`; HAB-16, 21, 22, 23, 24, 25 have none. HAB-17's rule "Archive at the foot of Edit habit" (l.89) is stated as a rule but not built; HAB-16's "pattern insight opens Reminders with Add a time + day preselected" (l.71) not built (TODO in code). Rotation rule: spec says "next pair not already visible", built is "slot with fewest existing customs, ties to lowest" (`category-rules.ts:37-60`), `design-system-v2.md:123` says "Nth custom gets Nth slot". *Fix:* As-built/Deviations stubs pointing at the backlog.
- **A12-06** · medium · S — Docs cite `design-reference/Habit System.dc.html`, `Habit Flow.dc.html`, `HabitFlowV2.dc.html`, `habit-components.js` as in-repo sources of truth (`design-system.md:10,161`, `design-system-v2.md:10,124`, `feature-spec-v2.md:3`); none exist and git history has no trace. *Fix:* add them or state they live outside the repo and the PNGs are the only in-repo reference.
- **A12-07** · low · S — `docs/mockups/retro-log .png` trailing space (= A2-08). **Fixed (B1, 1573646).**
- **A12-08** · low · S — `technical-architecture.md` "SDK 55+" (l.146, 202) vs expo ~57 / RN 0.86; stack table omits reanimated, gesture-handler, expo-sharing, expo-file-system, `@expo/ui`, expo-glass-effect, expo-symbols, react-hook-form/zod/date-fns, playwright/pixelmatch/pngjs.
- **A12-09** · low · S — `app-architecture.md` tree outdated (= A2-10); `src/lib/app-settings/repositories/app-settings-repository.ts:1-2` imports `drizzle-orm` (+ `drizzle-orm/expo-sqlite` `useLiveQuery`), which CLAUDE.md rule 1 doesn't cover. *Fix:* extend rule 1.
- **A12-10** · medium · S — `AGENTS.md`/`README.md`/`package.json` stale (= A2-11, A8-04, A8-05); also AGENTS.md references `bunx` (no `bun.lock`).
- **A12-11** · low · S — (resolved: the file was deleted, history in git) `ux-audit-2026-09.md` had no top-level status; "33 states" vs 128 baselines. *Fix:* "Status: superseded by V2; open items in backlog" + per-item status (§7).
- **A12-12** · low · S — `v3-backlog.md` name says V3, no V3 planned; mixes `TODO(V3)`, `TODO(V2.1)` and the flake; lines 15, 54, 81 mention V3.
- **A12-13** · low · S — CLAUDE.md "Live, in-progress" wording for the V2 spec is stale (all V2 tickets merged); "Commands" omits that `npm run lint` is broken and `visual-check -- --list`.
- **A12-14** · low · S — `today-screen.tsx` still renders the ghost "Add habit" (lines 233, 419) and 4 dev buttons (236-254, 426-455); comment 410-416 "Temporary until HAB-13". (= A1-06, A5-03) Gating on `__DEV__` was not confirmed by this auditor (A1 reports the hooks are dev-gated).

### Consolidated backlog (every item in `docs/v3-backlog.md`)

| Source | Item | Status / relevance |
|---|---|---|
| HAB-19 | Manage keeps back + "Habits" title, no "Done" | Open design decision; still true (e2e hab-13 asserts the old title) |
| HAB-19 | Category order: first-appearance vs managed | Open alternative; must change Today + Manage together |
| HAB-19 | Archived-row subtitle "no logs" | Decided; note only |
| HAB-16 | C1 omits Last/This week switch | Open decision |
| HAB-16 | Year disabled until HAB-17 | Struck through, done |
| HAB-16 | Pattern action should open Reminders with "Add a time" + day | **Not built**; `TODO(V3)` `monthly-summary-screen.tsx:301` |
| HAB-16 | Slipping body omits C3 second sentence | Won't-fix (not derivable) |
| HAB-16 | Unlock date = first day + 30 | Note |
| HAB-16 | Frozen days leave both sides of rate | Note |
| HAB-16 | Detail heatmap left-aligned (matches mockup) | Optional polish |
| HAB-16 | `PATTERN_CAUSE_SHARE` 0.25 weaker than spec | Open; revisit with data |
| HAB-16 | Today menu computes full monthly summary for the subline | Open perf idea (= A9-03) |
| HAB-16 | Frozen days on Monthly calendar hide completions | Open; revisit after use |
| Visual-check | `today-menu-open` (+ -empty, -yearly) flaky, 74 px popover offset | Open bug; root cause in A10-10 |
| HAB-17 | Archive not at foot of Edit habit (card says "Edit or archive") | Open; spec rule unbuilt (`yearly-summary-screen.tsx:278`) |
| HAB-17 | C5 shows 4 cards, rule max 3 | Decided |
| HAB-17 | Month in progress not judged | Decided |
| HAB-17 | Dropped underivable clauses | Decided |
| HAB-17 | Unlock progress "12 of 91" vs mockup "90" | Decided |
| HAB-17 | Chart bars scaled to 100% vs tallest month | Decided/polish |
| HAB-17 | Yearly shows only the current year; early-January empty | Open |
| HAB-17 | Early-year card, empty state, fallback cards have no mockup | Note |
| HAB-17 | "Logged" counts completed scheduled days | Note |
| HAB-17 | Fixture numbers differ from C4 | Note |
| HAB-17 | Baselines recaptured | Note |
| HAB-17 | Archived habits excluded from Yearly insights | Done |
| Monthly vs Yearly | Monthly insights can still name/link archived habits | **Open**, labelled V3; real inconsistency |
| HAB-18 | Retro log keeps "Cancel" vs D4 "Close" | Decided (unsaved draft) |
| HAB-18 | D4 origin card simpler (no target row) | Open polish |
| HAB-18 | Picker rows lack per-row frequency progress | Open polish |
| HAB-18 | Picker is a sheet; chevron blank on web | Note |
| HAB-18 | D2 time = entry `createdAt` | Note |
| HAB-18 | OffScheduleRow opens Detail; check not toggle | Note |
| HAB-18 | No legend entry for the bonus dot on Detail | **Open**, small |
| HAB-18 | Retro log lists rest-day bonus rows as normal | Open, minor |
| HAB-20 | Detail Reminders/Edit rows differ from D5/D6/E1 | Open polish |
| HAB-20 | "N of M days" wording | Decided |
| HAB-20 | "BEFORE ARCHIVE" label shrink; check on device | Open (device) |
| HAB-20 | Paused/reset cell treatments are interpretations | Open |
| HAB-20 | Reset note only in current month | Decided |
| HAB-20 | no-freezes fixture mostly grey | Fixture tweak |
| HAB-20 | No prior archived banner | Note |
| HAB-21 | Monthly pattern insight `?addTime=<day>` | Duplicate of the HAB-16 entry |
| HAB-21 | Remove NEW-27 pointer (`TODO(V2.1)`) | Open cleanup (`moved-setting-pointer.tsx` + test, `reminders-screen.tsx:129`) |
| HAB-21 | Caption always shown | Done |
| HAB-21 | Settings back label reads "Today" from the Reminders pointer | Moot once the pointer is removed |
| HAB-21 | Notifications-off notice placement | Note |
| HAB-21 | `toggleEveningReview` lives in `use-reminder-actions.ts` though Settings is its only home; `setEveningReview` in reminder-service untouched | Open tidy-up |
| HAB-23 | E7 "from Edit habit" but Edit habit has no delete entry | Open product decision (and A5-01) |

### Code TODOs (grep `TODO|FIXME|XXX|HACK` in `src`, `scripts`, `e2e`, `.claude`)
1. `src/components/ui/composite/moved-setting-pointer.tsx:18` — `TODO(V2.1): remove — temporary, for people who look for Evening review where…`
2. `src/modules/habits/screens/reminders-screen.tsx:129` — `TODO(V2.1): remove NEW-27 and this pointer (docs/v3-backlog.md).`
3. `src/modules/habits/screens/monthly-summary-screen.tsx:301` — `TODO(V3): open with "Add a time" and the day (?addTime=<day>) pre-selected — see docs/v3-backlog.md.`

No FIXME/XXX/HACK. The V2.1 vs V3 tags refer to the same backlog file; unify to `TODO(backlog)`.

### UX-audit items not yet in the backlog
#11 habit visual identity (first-run dots; Tomorrow preview now uses IconBadge); Today dev buttons need a "Developer" label (A5-03); "Best day: All · every day full" wording (`weekly-summary-helpers.ts:52`); "Missed yesterday" row caption (not found in code); "Not due yet" empty state and Day-closed times (unverified); audit #9 says "days logged" but Manage still shows "N logs kept" (`manage-habits-helpers.ts:11,20`); `COUNTER_THRESHOLD = 40` (`text-field.tsx:36`) still drives the legacy remaining-chars counter for non-name fields (e.g. the 20-char unit field shows a counter from the first keystroke).

### Rename plan: `docs/v3-backlog.md` → `docs/backlog.md`
`git mv docs/v3-backlog.md docs/backlog.md`; change the title "# V3 backlog" → "# Backlog"; update these 8 references: `docs/feature-spec-v2.md:105`, `:153`; `src/components/ui/composite/moved-setting-pointer.tsx:20`; `src/modules/habits/screens/reminders-screen.tsx:129`; `manage-habits-screen.tsx:70`; `monthly-summary-screen.tsx:301`; `yearly-summary-screen.tsx:278`; `scripts/visual-check/screens.mjs:783` (written without extension). Inside the file reword lines 15, 54, 81 (mention V3) and change the `TODO(V3)` tag in `monthly-summary-screen.tsx:301` to `TODO(backlog)`. CLAUDE.md, AGENTS.md, README, roadmap, skill and agents don't reference the file (add it to CLAUDE.md per A11-11).

---

## 15. Cross-area duplicates (merged above)

| Issue | IDs |
|---|---|
| hooks/components import `screens/` helpers | A1-01 = A2-01 |
| `services/` is mostly pure domain | A1-08 = A2-02 |
| dev seeds/fixtures/buttons in production code | A1-06, A2-03, A5-03, A8-14, A12-14 |
| `DATE_FORMAT` / weekday tables / plurals / percent | A1-09 = A8-08, A8-09, A8-10, A8-11, A5-16 |
| template leftovers + dead `lint` script | A2-06 = A8-05; A2-11 = A8-04 = A12-10 = A11-12 |
| `IconSquare` dead | A4-05 #7 = A8-01 |
| silent write failures | A3-03 = A5-05 |
| toast not announced | A6-02 (+ A5-08) |
| hardcoded spacing/radius/font literals | A4-01, A4-02 = A8-15 |
| over-fetching live queries | A7-05 = A9-04 |
| stale live-query range / day rollover / render-time `new Date()` | A7-01, A7-02, A9-03 |
| migration failure UX | A3-01 = A7-08 |
| `retro-log .png` | A2-08 = A12-07 |
| CLAUDE.md categories paragraph stale | A11-11 = A12-01 |
| docs/architecture drift | A2-10 = A12-09 = A11-17 |
| e2e gaps / failures | A10-09 = A11-10 = A12-02 |
| `today-menu-open` flake | A10-10 = A11-09 |
| screen-title weight / headings | A4-06 = A5-09 = A6-09 |

---

## 16. Fix plan — batches (independently committable, ordered by risk)

| Batch | Contents | Size | Risk |
|---|---|---|---|
| **B0 — AI setup + tooling enforcement** (first; makes every later batch safer) | CLAUDE.md edits (V2-beats-V1, categories paragraph, Definition of done, Guards, rule-1 wording, `docs/backlog.md` listed); rewrite `/implement-feature` (spec-file resolution, reuse table, migration step, reviewer step, branch/commit rules); revised `spec-reviewer` + new `migration-reviewer`; `.claude/settings.json` permissions + per-file `format.sh` + `verify.sh` Stop hook (skip clean tree, `tsc`, `jest --onlyChanged`); `scripts/check-architecture.mjs`; Biome `noRestrictedImports`; dependency-cruiser; knip config; design-token ratchet guard (start with the existing baseline count); `make check` = tsc + biome + jest + check-architecture; pre-push hook (CI optional); AGENTS.md → stub. A11-01…A11-23 (minus doc-set rewrite), A1 tooling, A4 lint, A8 dead-code check. | M (≈ 1 day) | None for runtime |
| **B1 — Safe mechanical cleanups** | Delete `reset-project`, `.gitkeep`s, unused images/`tabIcons/`, the four unused deps (keep `expo-device`/`expo-constants` if B6 diagnostics are planned), `@/assets/*` alias, `IconSquare`, truly dead exports (A8-06 group 1); `lint` → `biome check .`; add `sf-symbols-typescript`; fix `retro-log .png` + `visual-check.mjs:169`; stale comments (A8-13); README; rename `v3-backlog.md` → `backlog.md` (8 refs) and `TODO(V3)` tags; `testTimeout: 15000`; remove unused `tsconfig` alias; rename the 3 odd test files. A2-06/07/08/11/12/15/17, A8-01…05, A8-13, A12-07/10/12. | S | Very low |
| **B2 — Docs refresh** | roadmap status table; `feature-spec.md` superseded notes/status; As-built stubs for HAB-16/21/22/23/24/25; technical-architecture SDK/stack refresh; app-architecture tree + `.web.ts` convention; `design-reference` note; ux-audit status + move to `docs/audits/`; backlog consolidation incl. the open items in §14. A12-01…13, A2-09/10, A4-10. | S–M | None |
| **B3 — Test hygiene** (no product behaviour) | Fix the 3 failing e2e journeys + README (A12-02); fake timers for the midnight-flake tests (A10-06); type the hook mocks (A10-07); tests for `use-off-schedule-queries`, `use-streak-actions`, `export-json`/`export-formats`, `today-nav-menu`; `collectCoverageFrom`; **`today-menu-open` flake fix** (poll-until-stable helper, then NavMenu single-measure, CONCURRENCY 2 + retry); migration-safety test + journal/snapshot/drift test + V1-era DB fixture (A7-07 proposal); trim baseline twins (decision needed). A10-01…12, A7-07. | M | Low |
| **B3a — Bug fix (pull forward if you want it early)** | **A7-01** one-line `useLiveQuery(query, [startDate, endDate])` + range-change test. Tiny and isolated; I'd do it right after B0 rather than wait for the data batch. | S | Low (needs a device check) |
| **B4 — Mechanical moves** (one commit per step, `git mv` + import rewrites only) | §4 steps 1–5: baseline → `scripts/visual-check/baseline/`; fixtures → `fixtures/`; `schemas/` + `presenters/`; `domain/` vs `services/`; `components/` feature subfolders; optional `theme-preference-store` → `store/`; update architecture doc + CLAUDE.md. A1-01/02/08, A2-01…05/13/16. | M–L (codemod makes it mechanical) | Low if `tsc` + tests + visual-check stay green |
| **B5 — Small shared-helper refactors** | `day-key`/weekday labels/`pluralise`/percent/count formatter; `createMemoryStore<T>`; `toIsoWeekday`; tighten casts; frequency labels via `FrequencyStrategy.describe()` + `assertNever` (A1-04); move dev seeds to `dev/` (A1-06); types moved to `types.ts` (A1-02/03); `_sameShape` for 3 more pairs; app-settings web seeds (A1-10); `requireRow` (A7-09); `format` instead of `toISOString` keys (A7-11); `useHabitQueries.getHabitById` cleanup; `useExportQueries` file. A1-02…12, A8-07…11/16…18, A7-09/11. | M | Low–medium (copy changes need baseline review) |
| **B6 — Logging, errors, observability** (behaviour-affecting) | Logger + diagnostics; `useAsyncAction` non-rejecting `run()` with error toast; `failureMessage` helper; Toast `tone: "error"` (update `design-system-v2.md` first); root `ErrorBoundary` + global handlers; `DatabaseProvider` error screen + splash hide + retry; wrap all unhandled writes (A3-03) and Undo callbacks; export `cause` + share/save handling + version fields; notification scheduling order/logging/startup reconcile; live-query error → boundary via `useLiveRows`; rollback masking; About row with Copy/Share diagnostics. A3-01…12, A5-05, A7-08 (backup). | L | Medium (new UI states → baselines; device-verify migration failure, share) |
| **B7 — Design tokens and component consolidation** | Add `spacing`/`radius`/`borderWidth`/`shadow` tokens; migrate `Container` + card composites, then screens (ratchet the lint down); type-scale tokens or `Text` primitive; `useAccent`/`HabitBadge size`; `HabitLogRow`, `IconTile`, `FreezePips`, `ScreenTitle`/`Screen`; `MenuRow` → `ListItem`; `SegmentedControl` pressed state; `Button` loading label; nav-menu shadow token. A4-01…09, A8-15, A10-08. | L (split into 3–4 commits) | Medium (visual baselines move; tolerate zero-diff on the token-only steps) |
| **B8 — Accessibility** | Announce toasts; heading roles (`SectionHeader` first); touch targets; contrast token fixes (`faint`/`warnInk`/dark danger/outlines); reduced motion; selection-group semantics; Stepper/handle semantics; sheet/menu scroll for Dynamic Type; decorative-icon hiding; TextField error alert. A6-01…17, A5-08/09. | M | Low–medium (contrast changes alter baselines; heatmap sizes stay) |
| **B9 — UX copy and flows** | Fix "Archive from Edit habit" copy; header "+" / menu "Add habit"; loading flags (A5-04); Undo/confirm gaps (A5-06); keyboard fixes; `ListItem` `numberOfLines`; pluralisation/terminology/date/dash/spelling pass; Back-label derivation; reminder "Remove" wording; placeholder tabs decision. A5-01…24 (those that are not product calls). | M | Medium (needs your calls, see §18) |
| **B10 — Performance + data-layer correctness** (behaviour-affecting; last) | `useToday()` rollover (A7-02); transactions → sync/exclusive (A7-03); FK decision (A7-04); over-fetch hooks (A7-05/A9-04); streak-at-risk early-exit (A9-01); per-week strategy pre-bucketing (A9-02); memoise summary hooks (A9-03/05); `useTodayQueries` memo; split `TodayScreen`/`HabitFormScreen`/`HabitDetailScreen` (A8-12). | L | Highest — do with the new tests from B3, profile on device |
| **B11 — Legacy column cleanup migration** | Drop `habits.icon/color/category` after one release with 0010 in the field; optional NOCASE unique index on `categories.name`; reuse the B3 migration-safety test. | S–M | High (schema) — after B3 |
| **B12 — Doc-set consolidation** (optional) | Lean doc set per §13 (merged architecture doc, single design-system, per-ticket specs, `decisions.md`). | M | None |
| **B13 — Missing e2e coverage** (optional, ongoing) | Maestro flows for HAB-18, 24/25, 14–16, 15, then the rest of A10-09. | L | Low |

---

## 17. Items only you can judge on a real device (or by using the app)

- **A3-01** Corrupt a migration/DB in a dev client: does the splash really stick, and what shows?
- **A1-06** Release bundle: are the `__DEV__`-guarded fixtures and the 838-line `habit-fixtures.ts` dropped? (`npx expo export --platform ios`, inspect the bundle.)
- **A5-04** Cold launch / deep link: flash of "Nothing to track yet" or "Habit not found".
- **A7-01 / A7-02** Weekly Last/This-week toggle; Today after the app was backgrounded across midnight / week rollover; logging then lands on which day?
- **A7-03** Double-tap / concurrent writes during a transaction (reorder, delete).
- **A7-04** Actual `PRAGMA foreign_keys` value on device; upgrade-in-place of a real V1 (0008) DB to 0010 (`defer_foreign_keys`, `row_number() OVER` needs SQLite ≥ 3.25, child rows survive).
- **A3-04 / A3-05** `pickDirectoryAsync` cancel vs error; `Sharing.shareAsync` rejection; out-of-storage path; notification schedule/cancel failures, the 64-pending cap, permission edge cases; log-file append surviving an app kill.
- **A3-02** ErrorBoundary and unhandled-rejection behaviour in a release Hermes build (dev shows a red box).
- **A9-01 / A9-02** Profile with 3 years × 20 habits incl. ≥ 5 per-week habits: Today first render and post-toggle, Habit Detail (per-week), Yearly/Monthly, menu-open animation; JS-thread time after each write; cold start on a populated DB.
- **A5-13** Keyboard: Return key, dismissal, Save lift, retro-log note with list taps.
- **A5-18** 12h/24h locale: reminder card (always 24h) vs the native time wheel.
- **A5-23 / A4** NavMenu first-open anchor jump, popover shadow in light and dark; iOS 26 header-button rendering and 44pt targets; fractional font sizes (12.5, 13.5) and letter-spacing vs the web baseline.
- **A6** VoiceOver: toast announcement and Undo reachability, Today row double stop, SegmentedControl/chip announcements, heatmap-cell focus on Month/Year/Detail, reorder handle, time wheel label, sheet focus on open, NavMenu escape. Dynamic Type AX1–AX5 on Today rows, WeekdayChip, StatCard, NavMenu/sheets, forms. Reduce Motion (sheet slide, reorder, transitions). Increase Contrast / Bold Text with ≈ 1.3:1 borders. Switch Control / Voice Control on 18pt heatmap cells.
- **Contrast in dark mode** for `faint`, `warnInk` on `warnTint`, category tints, amber at-risk ring, toast pill.
- **A4-08** Feel of SegmentedControl pressed feedback and Button loading layout.
- **HAB-20** "BEFORE ARCHIVE" label shrink; swipe-to-archive discoverability and drag reorder in Manage.

## 18. Looks like an intentional product decision — confirm rather than "fix"

- Manage keeps the pushed back button and the "Habits" title with no "Done" (menu row says "Manage & archive") — backlog HAB-19; e2e hab-13 still asserts the old title (A12-02).
- Weekly screen title "Your week" vs menu row "Weekly summary" vs "Monthly"/"Yearly" (A5-09).
- Retro-log sheet keeps "Cancel" (draft exists); no discard prompt on Cancel in New/Edit habit (`feature-spec.md:77`) (A5-14).
- Streak-at-risk sheet non-dismissible; tapping a name opens the sheet (spec).
- Delete has no Undo (HAB-13); archive does. Restored habit's streak starts fresh (HAB-20 overrides V1 HAB-13). Delete only reachable from Detail (E7 "from Edit habit" label unbuilt).
- Placeholder To-dos / Expenses tabs visible (shared-shell roadmap) (A5-21).
- 24-hour reminder times (`formatReminderTime` comment says deliberate) (A5-18).
- Settings has a Categories row with no mockup (proposal); Evening review lives only in Settings with a temporary pointer on Reminders (`TODO(V2.1)`); "Other" category has no hue; category rotation is fewest-use, not strictly Nth.
- Monthly Pattern action opens Reminders without the sheet pre-opened; `PATTERN_CAUSE_SHARE = 0.25`; Yearly shows only the current year; month in progress not judged; bars scaled to 100 %; Detail 90-day tile "N of M days".
- Smaller heatmap cells (18/11/16 pt) and stat cards from `design-system-v2.md` **Deltas**; faint level-1/track fills (≈ 1.4:1) and hairline borders (≈ 1.3:1) as the design's shade ramp; destructive Button text-only; Break habits use a dashed/outline circle; custom header buttons replace the system back button for iOS 26 glass; fixed 4 s toast = the undo window.
- Architecture/data decisions documented in code: unbounded all-entries/notes/frozen/reminders live reads at current size; raw `begin/commit` instead of Drizzle async `db.transaction` (documented bug rationale); no `ON DELETE CASCADE`, manual child deletes, FKs off on device with the Other fallback; legacy `icon/color/category` kept nullable for one release; local-text dates, `archivedAt` as timestamp, `pausedRanges` as comma-joined text; 0010 hand-edited from drizzle-kit's rebuild with a hand-set journal `when`; web repositories backed by in-memory fixtures with web-only helper exports; `useAsyncAction` rethrows by design; crash reporting deferred to Roadmap Phase 12; silent commented theme catches ("must never keep the app from opening"); habit-flavoured composites in shared `ui/composite`; fixtures with low coverage (web-only dev data); mocked hooks in screen tests (only the missing type tie is a problem); `icon-square.tsx` documented as a primitive though unused; Makefile/AGENTS.md possibly wanted as shortcut layer/cross-tool convention; stock Expo icon art (branding, out of scope).

## 19. Not verified / caveats

- Findings come from reading code, plus Node-side benchmarks and a scratch migration/drift check; the app was not run on a device or simulator, and `visual-check`/`e2e` were not executed by the auditors (the e2e failures in A12-02 come from the last saved `.e2e-output/report.xml`). The `today-menu-open` root cause (A10-10) is from code reading, not reproduced.
- `design-reference/*.dc.html` is absent, so exact design values could not be checked against it (A12-06).
- Expo/Biome API names mentioned in proposals (`ErrorBoundary` props, file-append API, Biome `noRestrictedImports` rule name, unhandled-rejection tracking on Hermes/RN 0.86) must be verified against the v57 docs / Biome 2.5 docs before implementing, per CLAUDE.md.
- A few items were explicitly not re-verified by their auditors: UX-audit #6, #14 dimming/stepper points; HAB-16 "As built" beyond `PATTERN_CAUSE_SHARE`; the export filename "As built" rename; dark-baseline coverage for every screen.
- The raw per-area reports (with full detail, snippets and tables) live in the session scratchpad (`area-01.md` … `area-12.md`) and are not committed.

## 20. B6 — as built

Landed in the working tree (not committed). Findings: A3-01 (error screen, splash hidden, Retry, Copy diagnostics — `DatabaseErrorScreen`), A3-02 (root `ErrorBoundary` + `installGlobalHandlers`), A3-03 / A5-05 (every write and every Undo through `run()` / `runSafely`), A3-04 (cause kept and logged; share/save errors inline; picker cancel is silent), A3-05 (schedule-then-cancel-old with generations, post-commit failures logged, launch reconcile), A3-06 (`useLiveRows`: logged once, thrown to the boundary), A3-07 (start/migration logging, About), A3-08 (`app` and `schema` in the JSON export), A3-09 (`failureMessage`, error toast/banner tones), A3-10 (logger + diagnostics; the silent catches now log), A3-11 (`rollbackQuietly`), A7-02 (`useToday()`), A5-04 (`loaded` flags), A7-04 (FKs stay off; `foreign_key_check` in the safety tests; orphan risks in `docs/backlog.md`). A7-01 was already fixed.

Deviations from the batch plan:
- **A7-08 (`.db.bak`) not built**; Retry is a fresh mount of the migrator. A transactional migration failure is atomic, so Retry mainly helps with transient errors (a locked file, low storage), not a broken migration.
- **A3-12** only partly: the confirm sheet logs and toasts a rejecting handler; no lint rule.
- **Toast inside sheets.** A native Modal covers the page, so `Sheet` now mounts its own `ToastHost` at the top of the screen and the page-level host steps aside while a sheet is open — the Detail delete confirmation's failure toast was previously invisible behind its own sheet.
- **Log file skipped** (owner decision); **`expo-clipboard`** is used when present, otherwise the share sheet.
- Reminder notification identifiers changed to `"<reminder>:<slot>:<HHmm>:<generation>"`; older identifiers are replaced by the first launch's reconcile.
- `useActiveHabits` / `useArchivedHabits` / `useHabitsList` now return `{ habits, loaded }`; `useHabitDetailQueries` and `useReminderQueries` return `undefined` while loading; the monthly/yearly views gained `{ state: "loading" }`, the weekly view `isLoaded`.
- Visual-check reaches the new states through web fixtures only (`?fixtures=migration-fails`, `?failWrites=1`); no route or button was added to the app.

## 21. B8 / B9 — as built

Landed in the working tree (not committed). **Fixed:** A5-01 (Edit habit now has Archive, so the Manage copy is true — and mentions the swipe), A5-02 (header `+`; the ghost link is gone), A5-05/A5-06 (Undo for un-tick, quantity drop below target, Manage Restore, freeze, reminder Remove — all through `run()`; new `restoreReminder`, `unfreezeHabitDay`, `undoRestoreHabit` in Manage), A5-07 (one quoted template set), A5-08 (toast two lines, announced), A5-09 (Settings title 500/no extra padding, headings), A5-13 (Return key, dismiss mode, tap-through, Unit scroll-into-view), A5-15 (`ListItem`/Detail/Quantity/Toast overflow), A5-16/17/18/19 (`src/utils/format.ts`; "days logged"/"entries"; one dash; British), A6-01 (one `useReducedMotion` hook: sheet, reorder, swipe), A6-02 (announce once per toast, 8 s with a screen reader), A6-03 (44 pt: Checkbox, WeekdayChip, Chip, CategoryChip, SegmentedControl, text Buttons, Toast Undo), A6-05 (tab/tablist, checkbox), A6-06 (Stepper adjustable), A6-09/A6-10 (headings; `SectionHeader` one stop), A6-12 (Sheet and NavMenu scroll; sheet shrinks above the keyboard), A6-13 (token fixes + `outline`), A6-17 (error `alert`). Plus the HAB-16 / HAB-17 backlog items: the Monthly pattern's `?addTime=<day>` and archived habits out of Monthly insights.

**Left out:** A5-03/A1-06 (dev buttons — B1), A5-04 (done in B6), A5-10 (Back labels — navigation), A5-11 (Remove stays "Remove": Undo replaces a confirm), A5-12/A5-20 (noted only), A5-14 and A5-21–24 (product calls / noted), A6-04, A6-07, A6-08, A6-11, A6-14, A6-15 (lower priority, outside the brief), and the partial quantity pie's `border` track (see `docs/backlog.md`).

Deviations from the brief:
- **Tick keeps its toast.** The brief said the new Undo goes "on un-tick only, never on tick"; completing already had a toast + Undo (UX audit #2, design system "Feedback"), so only the *new* Undo was added — for un-tick. If the intent was to remove the tick toast, that is a product change to make explicitly.
- **Touch targets use real footprint, not hitSlop or negative margins** (a margin trick breaks at large text): chips, segmented controls, text links and weekday rows are taller (see `design-system.md`, "Accessibility and touch targets"). The Checkbox is the one exception — a 44 pt box with −10 margin that reaches only into its host row's padding.
- **Settings' Appearance control is labelled "Theme"** for the screen reader (a heading already says "Appearance").
- **Reduce Motion** uses `AccessibilityInfo` through one hook rather than reanimated's `useReducedMotion`, so the Modal's `animationType` (not a worklet) can follow it too; reanimated animations get `ReduceMotion.Always` / zero duration from the same flag.

Device checks: VoiceOver/TalkBack toast announcement and Undo reachability (8 s), the tab list/checkbox announcements, Dynamic Type AX1–AX5 on Today header (`+` and `⋯` beside the title), Toast two lines, Sheet and NavMenu scrolling, WeekdayChip rows on a 375 pt phone, Reduce Motion (sheet fade, reorder, swipe), keyboard (Name → Unit → Done, sheet above keyboard on Android, Retro-log note), 12/24 h time wheel vs the 24 h card, Increase Contrast.
