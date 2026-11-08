# G — Tests (audit 2026-11)

Summary: 2904 tests in 357 suites pass (one coverage run: 96.95% lines, 91.54% branches, 94.53% functions). The pyramid is solid and domain/strategies are at 99-100%. Gaps are in time handling (one DST test, no TZ matrix, no jest `TZ`), the thin Maestro layer (6 flows), and the absence of property or mutation testing on the pure rules.
Counts: High 0, Med 4, Low 4 (8 findings).

## Measurements

Test files (src, `*.test.ts(x)`): 361 total incl. 2 `.perf` and 2 `.slow` files (not run by default config). By folder: domain 31, strategies 8, services 12, repositories 23, hooks 47, presenters 14, screens 20, components 135, lib 40. Plus `scripts/**/*.test.mjs` (node --test). Snapshots: 0 (`toMatchSnapshot` / inline: none). Maestro: 6 flows in `e2e/`. Visual-check: about 49 states in `scripts/visual-check/screens.mjs`.

Coverage by folder (one run, statements / branches / functions):

| Folder | Stmt | Br | Fn |
|---|---|---|---|
| domain | 99.4 | 96.4 | 100 |
| strategies | 100 | 100 | 100 |
| services | 99.7 | 92.8 | 100 |
| hooks | 98.4 | 92.3 | 100 |
| presenters | 97.3 | 91.2 | 99.4 |
| components | 96.0 | 92.3 | 94.2 |
| utils | 97.8 | 88.5 | 96.5 |
| lib | 92.8 | 83.6 | 93.9 |
| screens | 91.0 | 89.6 | 82.5 |
| repositories | 90.0 | 81.5 | 87.7 |
| src/app (routes) | 92.9 | 71.9 | 88.4 |

Only one file under 60% lines: `src/lib/file-export/file-export.ts` (37.5%, 24 lines).

Slowest files (4 workers, with coverage, so inflated): `src/navigation.test.tsx` 136 s, `habit-form-screen.test.tsx` 79 s, `progress-screen.test.tsx` 70 s, `components/ui/composite/toggle-row.test.tsx` 54 s (an outlier for a small component), `today-screen.db.test.tsx` 21 s. Slowest single tests: `replaceAllData` scenario registry 7.4 s, First Run 5.8 s, form layout 3.9 s. Whole run 275 s. "A worker process has failed to exit gracefully" printed again (already in backlog, "Jest: worker process has failed to exit"). No new evidence beyond: it also happens at 4 workers with coverage.

## Findings

### G-01 — Time-zone and DST coverage is a single test; jest runs in whatever TZ the machine has
- Severity: Med
- Effort: S
- Evidence: `package.json:79-96` (jest config has no `TZ`, no `globalSetup`); `src/modules/habits/domain/monthly-summary.test.ts:275-286` is the only test that sets `process.env.TZ` (Europe/Paris, month calendar only); `src/modules/habits/domain/day-status.test.ts:195` has a DST date but no zone. `streaks.test.ts`, `day-grid`, `week-strip`, `weekly-summary`, `year-map`, `yearly-summary` never set a zone. Source builds days with `new Date(year, month-1, day)` (`src/utils/day-key.ts:28`).
- Why it matters: day keys are local calendar days, and streaks/weeks/year map walk dates by cursor. A DST day (23 h or 25 h) or a negative-offset zone is the classic cause of off-by-one streaks. The suite passes today only for the developer's zone, and CI zone (UTC) differs from device zone.
- Fix: set `TZ` in a jest `globalSetup` (default e.g. `Pacific/Auckland` or `America/Los_Angeles`, different from CI's UTC), and add one `describe.each(["UTC","Europe/Paris","America/Sao_Paulo","Pacific/Auckland"])` over streaks, day-grid, week-strip and year-map across both DST days. Run `make check` under two zones in CI once.
- Needs: none

### G-02 — Frozen-day repository test builds month bounds from UTC instants, so it depends on machine TZ
- Severity: Med
- Effort: S
- Evidence: `src/modules/habits/repositories/frozen-day-repository.test.ts:16-17` (`new Date("2026-09-01T00:00:00Z")`, `...09-30T00:00:00Z`), while the repository converts with local `toDayKey(monthStart)` (`frozen-day-repository.ts:61`).
- Why it matters: in any zone west of UTC the window becomes 31 Aug-29 Sep, so the shared-pool (HAB-08) month-boundary test checks the wrong range. Today it passes only because of the machine zone. The freeze pool "resets on the 1st" rule (`constants.ts:120`) has no test of 30/31 vs 1st rows at the boundary in the service either: `freeze-service.test.ts` mocks the repository count and never passes a boundary date.
- Fix: use `new Date(2026, 8, 1)` / `new Date(2026, 8, 30)`; add rows on 31 Aug, 1 Sep, 30 Sep, 1 Oct and assert 1 Sep and 30 Sep are the only counted.
- Needs: none

### G-03 — Leap-year handling is tested for the day-key only; year map and streaks never see 29 Feb
- Severity: Med
- Effort: S
- Evidence: `src/utils/day-key.test.ts:24,29` (2024-02-29 round trip, every day of a leap year) is the only `02-29` in tests; `grep 366` hits only `habit-history.test.ts:363`. No test covers `year-map.ts`, `yearly-summary.ts` or a streak crossing 28 Feb to 1 Mar (leap and non-leap).
- Why it matters: the year map must be 366 cells in 2028 and 365 otherwise; a streak or per-week count that spans 29 Feb is the natural place for an off-by-one. The app is date-driven, so this fails once every four years and nobody notices.
- Fix: add year-map tests for 2024/2028 (366 days, 29 Feb present) vs 2026 (365); streak across 2028-02-28..03-01; a yearly goal on a leap year.
- Needs: none

### G-04 — Maestro covers 6 of 50 HAB ids; whole V2/V3 areas have no journey
- Severity: Med
- Effort: M
- Evidence: `e2e/` has 6 flows named for HAB 06/01/03, 09/10, 11, 12, 13/12, 46. `docs/how-to/e2e.md:18` already lists V2 gaps (15-22, 24/25) and V1 gaps (02, 04, 05, 07, 08); not repeated here. New: the doc says nothing about V3. Of HAB-26..50, flows touch only 27, 32, 46. No journey for the V3 Progress tab beyond the slipping insight (HAB-11 flow), nor for freeze use (HAB-08 appears only inside the 09-10 flow's title, not a freeze action), Backup/Import, or categories.
- Why it matters: the screen tests use mocks; only these flows exercise the real DB plus navigation. The highest-risk user paths (freeze, export, category assignment) are web-driver-only unproven.
- Fix: add to the existing e2e.md gap list a "V3 gaps" line, and add 3 flows: freeze a missed day (HAB-08), category create/assign (HAB-24/25), export (HAB-15). Cite e2e.md, do not rewrite it.
- Needs: none

### G-05 — No property-based testing on pure rules whose inputs are huge (strategies, streaks, rates, day keys)
- Severity: Low
- Effort: M
- Evidence: `fast-check` absent from `package.json`; hand-picked examples in `streaks.test.ts`, `day-key.test.ts`; `per-week-frequency.equivalence.slow.test.ts` is a hand-rolled equivalence check (shows the need).
- Why it matters: streak and rate code must hold invariants across arbitrary logs; example tests miss unusual combinations.
- Fix: `npx expo install --dev fast-check` is not an Expo package, so approve first. Targets: (1) `toDayKey(fromDayKey(k)) === k` for all valid dates 1970-2100; (2) `completion-rate` is within 0..1 and monotone when adding a completion; (3) streak(current) <= streak(best) and adding a log on the next scheduled day never lowers the current streak; (4) per-week strategy equals its reference on random logs (replaces the slow test); (5) `year-map` length equals 365/366 and cells are strictly increasing days.
- Needs: none (adding a dev dependency per CLAUDE.md rules: ask first)

### G-06 — No mutation testing; coverage 99-100% in domain says little about assertion strength
- Severity: Low
- Effort: M
- Evidence: no `stryker` in `package.json`; `strategies/` 100% and `domain/` 99.4% statements (coverage run).
- Why it matters: high line coverage with exact-value assertions is likely but unproven; the Strategy semantics must not change (CLAUDE.md).
- Fix: run Stryker once, manually (not in `make check`), with `mutate: ["src/modules/habits/strategies/*.ts","src/modules/habits/domain/{streaks,completion-rate,day-status,week-strip,year-map,freeze*}.ts"]` and the jest runner scoped to those test files; target 85% kill rate; record surviving mutants in backlog.
- Needs: none

### G-07 — Test data: a good builder exists but hand-written object literals still repeat
- Severity: Low
- Effort: M
- Evidence: `src/modules/habits/test-support/habit-builder.ts:44,59` (`makeHabitInput`, `makeHabit`, `makeCategory`) is imported by 109 files. Yet `frequency: {` literals appear 157 times in tests; top files: `domain/habit-history.test.ts` (20), `hooks/use-today-queries.test.ts` (10), `domain/streaks.test.ts` (10), `services/reminder-service.test.ts` (9). `daily(...)` helpers are redefined locally (e.g. `monthly-summary.test.ts`). No entry builder (`makeEntry`/`makeFreeze`); `dev/*-fixtures.ts` is app seeding, not test API.
- Why it matters: a schema or Habit shape change touches many tests; local helpers drift.
- Fix: add `makeEntry`, `makeFreeze`, `daily()`, `weekdays()`, `perWeek()` to the builder file; migrate the four top files opportunistically.
- Needs: none

### G-08 — Unclear slow outlier and file-export has low coverage
- Severity: Low
- Effort: S
- Evidence: `components/ui/composite/toggle-row.test.tsx` took 54 s in the single run (a small component; others in the folder took seconds, so likely worker starvation or a leaked timer, not necessarily the test). `src/lib/file-export/file-export.ts` 37.5% lines (24 lines). `src/app` branch coverage 71.9%.
- Why it matters: a possible leaked timer links to the already-backlogged worker-exit message; file export is the user's only data-out path.
- Fix: re-run that file alone with `--detectOpenHandles` to see whether it is real; add a test of the share/save branches in `file-export.ts`.
- Needs: none

## Midnight and week-boundary checks (no finding)
Monday-first weeks are tested (`week-strip.test.ts:20,27`, `day-grid.test.ts:65`, `day-status`, `week-matrix`, `weekday-picker`). Midnight rollover is tested in `lib/today/use-today.test.ts`, `day-key.test.ts`, `streaks.test.ts`, `today-screen*.test.tsx`. Both are adequate; only the zone dimension is missing (G-01).

## Not checked
- Flakiness over repeated runs: one run only (rules limit jest to once). Perf and worker-exit are in backlog.
- Whether `.slow` and `.perf` tests pass: excluded from the default config and not run.
- Visual-check state count is from a `name:` grep (about 49), not from `--list`.
- Mutation score and property-test fit are recommendations only; neither tool was run.

## Strengths
- Zero snapshot tests: assertions are explicit; visual regression is delegated to visual-check with baselines.
- Domain, strategies and services at 99-100%, hooks 98%, with `make check` green: 2904 tests, 0 failures, 0 skipped.
- `test-support/habit-builder.ts` shared by 109 files; `fake-expo-notifications` and `measure-in-window` isolate native/perf concerns.
- Targeted regression tests exist for DST in the month calendar, every day of a leap year for day keys, and parity/equivalence tests for refactors.
- Clear tiering: perf and slow tests have their own scripts and are kept out of the default run; e2e doc lists its gaps honestly.
