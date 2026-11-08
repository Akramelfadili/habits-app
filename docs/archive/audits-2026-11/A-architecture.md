# A — Architecture (audit 2026-11)

Scope: layers, dependency direction, repository twins, domain purity, duplication, size, dead code, error handling, TS strictness. The layering is in very good shape: no violations found beyond what the checker already allowlists (6 date-args/colocated-tests entries, all dev/test fixtures). Counts: High 0, Med 2, Low 4. Main themes: week-window helper bypassed in 11 places, TS strictness flags off (noUncheckedIndexedAccess would flag 477 errors, 119 in non-test code), whole-log subscriptions beyond the one the backlog names.

### A-01 — Week window computed by hand in 11 places although `weekWindowFor` exists
- Severity: Med
- Effort: S
- Evidence: src/modules/habits/domain/weekly-summary.ts:37-42 (`weekWindowFor`, end = `startOfDay(endOfWeek(..))`); hand-rolled `startOfWeek/endOfWeek` pairs at hooks/use-today-queries.ts:73-74, hooks/use-week-strip-queries.ts:33-34, hooks/use-rollover-queries.ts:37-38, hooks/use-off-schedule-queries.ts:26-27, domain/progress-grid.ts:247-248 and 327-328, domain/range-summary.ts:87-88, domain/monthly-summary.ts:68-71, domain/yearly-summary.ts:55-56, screens/progress-screen.tsx:104, presenters/progress-calendar-presenter.ts:291.
- Why it matters: the copies disagree on the end bound: the hooks use bare `endOfWeek` (23:59:59.999) while the domain uses `startOfDay(endOfWeek)` (00:00). Range queries (`useEntriesInRange`) and domain windows can therefore differ by up to a day for entries stored with a time part. It also makes WEEK_STARTS_ON a 20-site concern. Not in backlog (grep "week" only finds the streak tile and parity items).
- Fix: Move `weekWindowFor` to `src/utils` (or domain/week-window.ts) as the single helper, decide the end-bound convention once, replace the hand-written pairs.
- Needs: none

### A-02 — `noUncheckedIndexedAccess` is off; it would flag 477 errors (119 outside tests)
- Severity: Med
- Effort: L
- Evidence: tsconfig.json:1-9 (only `strict: true` on top of expo base). Estimate via temp tsconfig in the scratchpad: noUncheckedIndexedAccess 477 errors (119 non-test, of which 32 habit-fixtures.ts, 10 category-fixtures.ts, 8 presenters/progress-calendar-presenter.ts, 6 domain/progress-grid.ts, 6 theme/theme.ts, 6 yearly-fixtures.ts); baseline `tsc --noEmit` is 0.
- Why it matters: the date-grid and calendar code indexes arrays by computed offsets, the exact place where an off-by-one yields `undefined` at runtime (crash in release). Roughly 80 of the 119 are in domain/presenters/theme (the rest are dev fixtures), so a targeted adoption is cheap.
- Fix: Enable per-folder (tsconfig project reference or a second `tsc -p` in `make check`) for domain/, presenters/, strategies/ first; leave fixtures/tests for later.
- Needs: none

### A-03 — Whole entry log subscribed by Today, Habits, Detail, Retro-log and Export, not only Week
- Severity: Low
- Effort: M
- Evidence: hooks/use-today-queries.ts:76, hooks/use-habits-queries.ts:46, hooks/use-habit-detail-queries.ts:64, hooks/use-progress-week-queries.ts:47, hooks/use-retro-log-queries.ts:36, hooks/use-export-queries.ts:25 (`useAllEntries()`). Backlog (line 157) only names Week's streak tile.
- Why it matters: Today, the hottest screen, re-reads and re-maps the full history on every tap-to-log (live query returns all rows, then Maps are rebuilt in render). Fine at today's data size (the perf test exists), grows linearly with years of use.
- Fix: Serve streaks from a bounded lookback or a per-habit cached streak read model (backlog line 195 already lists a shared read model as "Later"); fold this item into it.
- Needs: none

### A-04 — Stricter TS flags not on: `exactOptionalPropertyTypes` (83), `noPropertyAccessFromIndexSignature` (371), `noImplicitOverride` (4)
- Severity: Low
- Effort: M
- Evidence: tsconfig.json:1-9; counts from temp tsconfigs. exactOptionalPropertyTypes: 83 (65 non-test). noPropertyAccessFromIndexSignature: 371 (style, not safety). noImplicitOverride: 4. noFallthroughCasesInSwitch, noUnusedLocals, noUnusedParameters: 0 each (free to enable now; Biome may already cover unused).
- Why it matters: the zero-error flags are free insurance; the others are optional polish.
- Fix: Add `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters` now (0 errors); fix the 4 overrides and add `noImplicitOverride`; skip the 371 one.
- Needs: none

### A-05 — Largest units are screen components of 170-220 lines; messages.ts is 1385 lines
- Severity: Low
- Effort: M
- Evidence: function scan (non-test): screens/habits-screen.tsx:62 HabitsScreen 222 lines; screens/manage-categories-screen.tsx:33 217; screens/today-screen.tsx:85 TodayContent 205; screens/habit-detail-screen.tsx:59 203; screens/progress-screen.tsx:60 198; screens/reminders-screen.tsx:55 171; components/export-sheet.tsx:43 166; components/edit-day-sheet.tsx:38 134; ui/composite/collapsing-header.tsx useCollapsingHeader 120; domain/range-summary.ts:236 buildRangeSummary 92 (longest non-React function). Largest files: messages.ts 1385, dev/habit-fixtures.ts 813, screens/habit-form-screen.tsx 706 (SlimHabitForm split already in backlog line 195), presenters/progress-presenter.ts 630, ui/composite/tab-bar-pill.tsx 527, domain/habit-history.ts 481, domain/range-summary.ts 462, presenters/habit-detail-presenter.ts 456, services/reminder-service.ts 413, domain/monthly-summary.ts 402.
- Why it matters: domain and services are well sized; the pain is screen bodies that mix hook wiring, handlers and JSX. Reading and testing them is harder than needed. messages.ts is one flat copy file, so size alone is harmless.
- Fix: Extract handler clusters into `use<X>Screen` view-model hooks for the top 5 screens when next touched; no standalone refactor needed.
- Needs: none

### A-06 — Dead code: knip reports 4 files, 98 exports, 42 types (production mode); 21 exports + 31 types in full mode
- Severity: Low
- Effort: S
- Evidence: `npx knip --production` (4 unused files: lib/logger/sinks/sink-fixtures.ts, test-support/animation.ts, console.ts, in-act.ts; these are test helpers, expected in production mode). `npx knip` full: unused exports 21, e.g. domain/weekly-summary.ts:59 `summaryWeekWindow`, domain/progress-insights.ts:24 `MAX_PROGRESS_INSIGHTS`, domain/progress-unlock.ts:17 `PROGRESS_UNLOCK_DAYS`, lib/notifications/notifications.ts:89 `notificationIdentifier`, messages.ts:1385 `notificationCopy`, dev/starter-profile.ts:58 `starterProfileSchema`; 2 unlisted deps (sharp used by scripts/device-validation/contact-sheet.mjs:62, react-test-renderer used in habits-accessibility.test.tsx:4) and 1 unlisted binary (maestro). Backlog's known test-only exports were not recounted.
- Why it matters: most of the 98 are tests-only or constants exported "for tests"; 21 in full mode are truly unreferenced anywhere. Unlisted `sharp`/`react-test-renderer` work by transitive install, which can break on a lockfile change.
- Fix: Drop `export` from the 21 (or delete `summaryWeekWindow` if unused); add `sharp`/`react-test-renderer` to devDependencies via `npx expo install`; add `maestro` to knip ignoreBinaries.
- Needs: none

### A-07 — Error handling is consistent; two unlogged `.catch(() => {})` patterns remain
- Severity: Low
- Effort: S
- Evidence: write paths go through `runSafely` (utils/run-safely.ts:25-39, logs `action.failed`, toasts); services catch and log (reminder-service.ts:109,165,190,208,359,391; reconcile-service.ts:129,167). Silent catches: utils/use-screen-reader.ts:17, utils/use-reduced-transparency.ts:30, utils/use-reduced-motion.ts:20 (`.catch(() => {})` on an accessibility probe; defensible), lib/db/transaction.ts:45 and lib/logger/sinks/ring-buffer-sink.ts:47 (`.catch(() => undefined)` to keep the queue alive; the error is surfaced to the caller / dropped by design). `runSafely` is imported by only 4 files outside tests (use-async-action, toast-host, habit-form-screen, itself); the other hooks rely on `useAsyncAction`.
- Why it matters: nothing is swallowed that matters; the a11y probes drop an error with no log line, so a platform change would be invisible. Floating-promise lint is already in the backlog (A3-12), not re-reported.
- Fix: Replace the three `{}` handlers with `log.warn` of the error (one line each).
- Needs: none

## Verified clean (no finding)
- Domain purity: no `react`, `expo`, `drizzle`, `@/lib`, `@/store`, `Date.now`, `new Date(`, `Math.random` in domain/ or strategies/ outside tests; only `@/utils/day-key`, `../constants`, date-fns, and the documented `export-json.ts` -> `lib/diagnostics/app-info` exception.
- Repository layer: all 8 repositories have a `.web.ts` twin (category, dev-state, entry, frozen-day, habit, reminder, starter-profile; category-rows is shared); ports are plain exported functions (documented, no interfaces by design); no component, screen, presenter, or `src/app` file imports repositories; services import them as intended. `check-architecture.mjs` (511 lines) enforces layer-order, web-twin, date-args, colocated-tests; allowlist has 6 entries, all fixture/test-support.
- Streak logic: one source (`domain/streaks.ts` calculateCurrentStreak/getStreakAtRisk); hooks call it rather than re-implementing.

## Not checked
- Import cycles (no madge/dpdm in repo; skipped to avoid installing tools).
- Repository `.web.ts` export parity beyond the existing `_sameShape` guard (relied on the guard).
- Runtime cost of A-03 (no profiling run; perf tests belong to another scope).

## Strengths
- Layer rules are mechanically enforced (`layer-order`, `web-twin`, `module-isolation`) with a tiny, shrink-only allowlist; domain/ and strategies/ are genuinely free of I/O, React and clocks.
- One streak implementation (`domain/streaks.ts`) and one frequency-strategy interface with a shared completion index; new frequencies are new files.
- Consistent write-error funnel: `runSafely` logs with scope, toasts, and returns a result so callers skip the success follow-up; services log with context.
- Repositories are plain functions with live-query hooks and web twins, so visual-check runs the whole app in Chromium against fixtures.
- `tsc --noEmit` is at 0 errors and `as any` / `@ts-ignore` are absent from production code (only 3 `as unknown as` casts, in test-db and a navigation guard).
