# Progress data layer (V3-3a)

The logic behind Progress (HAB-35–38) — no new visual design; V3-3b builds the screens on it. Specs: `docs/feature-spec-v3.md` (HAB-35–38, D6, D8, D11, D14, D15), `docs/assessment-v3.md` (A.1.6, A.2 rows 35–38), mockup frames P1–P17 and the Handoff "Data needs" (DN) table (`docs/mockups/v3/renders/handoff/text.txt`, "Data needs — final").

The old Weekly / Monthly / Yearly summary screens keep working on their existing hooks until V3-3b replaces them. Where a rule changes (D14, D15, the 7-day unlock) the old domain functions change with it, so there is one definition.

## Rules in one place

| Rule | Where it lives |
|---|---|
| A (habit, day) is exactly one **cell status**: `done`, `partial`, `missed`, `frozen`, `bonus`, `not-due`, `before-start`, `nothing-logged`, `future`, `today` | `domain/day-status.ts` (`classifyHabitDays`) |
| **Completion rate** = done ÷ due, whole number. Due = `done` + `partial` + `missed`. Frozen leaves both sides (D14), bonus never counts (D11), paused / before-start / future / not-due are not due, today joins only once done. Break habits: a logged day is "resisted" = done (D8, same entry mechanism). × per week habits are due on open days only — `wasScheduledOn` answers, unchanged | `domain/completion-rate.ts` (`completionPercent`, `tally`) |
| **Perfect day** = at least one due habit, all done, none frozen | `domain/completion-rate.ts` (`isPerfectDay`) |
| **Day level** (calendar, year map): done ÷ due → L0 none, L1 1–49 %, L2 50–99 %, L3 100 % | `domain/completion-rate.ts` (`dayLevel`) |
| Weeks start Monday (`WEEK_STARTS_ON`) | unchanged |

## Interpretations (the mockup is ambiguous; stated so V3-3b and review can overrule)

- **"7 days of logs"** = 7 distinct calendar days with at least one entry (any habit, bonus included), counted over all history. Days remaining = 7 − logged days. Nothing logged at all is its own view state and wins over "too early".
- **Best streak**: Week = the highest *current* streak among habits (P1's 13 cannot fit inside a 7-day window); Month and Year = the longest run *inside* the range (P7/P10: 13 days in October, 14–15 missed), as Yearly's `longestOf` already does.
- **Best day**: the weekday with the highest done ÷ due over the range (earliest weekday wins a tie). For Week each weekday is one date, so the same numbers are the daily bars (P1).
- **Row totals** (week matrix): `done / target`, target = days the habit is due in the whole week (future days included; before-start and paused days not); × per week shows `n / timesPerWeek`.
- **Slipping** is per habit and per range scale: Week = lower than last week by ≥ 25 points with ≥ 3 due days this week; Month = Monthly's existing weekly-trend rule; Year = Yearly's existing "never stuck" rule. **Improved**: ≥ +10 points on the previous range (Monthly's `IMPROVED_MIN_POINTS`), Year's best-month / stuck.

## DN rows → code

*Existing* = already in the repo; *extend* = the existing function changes; *new* = no counterpart.

| DN row (frames) | Existing today | Change needed | Step |
|---|---|---|---|
| Completion rate, any range (P1, P7, P12) | `outcomesFor` + `counts` + `rateOf` in `domain/monthly-summary.ts` (frozen already excluded); `buildWeeklySummary` (frozen **not** known, counts it as missed); `calculateCompletionRate` in `domain/habit-history.ts` (frozen counted as missed, D14) | **Extend**: one `completionPercent` / `tally` in `completion-rate.ts`; `outcomesFor` rebuilt on `classifyHabitDays` (same outputs, tests pin it); `buildWeeklySummary` takes `frozenDays` and drops them; `calculateCompletionRate` takes `frozenDates` and drops them. **New**: `day-status.ts` (the classifier) | 2 |
| +N pts vs previous (P7, D1) | `previousMonthWindow`, per-habit `deltaPoints` (Month only) | **Extend**: `previousRangeWindow(kind, window)` for week / month / year; `buildRangeSummary` runs the same function on both | 3 |
| Perfect days (P7) | `perfectDays` / `countedDays` inside `buildMonthlySummary` | **Extend**: moved to `isPerfectDay` over day aggregates; Monthly keeps its field, same value | 2–3 |
| Best day, daily bars (P1) | `bestDay` in `buildWeeklySummary` — most completions, not a ratio | **New** `bestWeekday` + `weekdayBars` in `range-summary.ts` (done ÷ due per weekday); old Weekly keeps its field until V3-3b | 3 |
| Per-habit month rates, bonus listed (P8) | `MonthlyHabitRow` (rate, weeks, `deltaPoints`) | **Extend**: `RangeHabitRow` = rate in whole points, `isBreak`, `frozen`, `bonus` (listed, "not counted"), `slipping`, ranked best → worst, slipping last | 3 |
| Week matrix, row totals (P1, P2, P4, P5) | Detail's `buildHeatmapWeeks` (one habit, 10 weeks) | **New** `buildWeekMatrix` on the shared classifier; partial level 1/2 via `heatmapLevelFor`'s ratio rule | 4 |
| Month calendar, day level, perfect (P7, P9, P10) | `buildCalendar` inside `buildMonthlySummary` (level 1–3) | **Extend**: `buildMonthCalendar` on day aggregates, level 0–3 + `perfect`; Monthly's calendar derives from it | 4 |
| Year day detail / Month day card (P13, RL1) | `useRetroLogQueries` (unbounded `useAllEntries`), `edit-day-status.ts` | **New** `buildDayDetail` (each habit's state on one date) and a date-bounded hook read | 4, 8 |
| Per-day year levels, all habits or one (P12, P15) | `buildYearlySummary` month cells only | **New** `buildYearMap` (365 aggregates, month bands, `bestMonth`, month list for the AX fallback); one habit = the same call with `[habit]` (binary falls out: 1 of 1 or 0) | 5 |
| Streak, longest, 90-day rate (Detail, P1) | `calculateCurrentStreak`, `calculateLongestStreak`, `calculateCompletionRate`; `longestOf` in yearly | **Extend**: 90-day rate excludes frozen (step 2); `bestStreakIn(range)` reuses `calculateLongestStreak` clipped to the range, Week reuses `currentStreakAsOf` | 2–3 |
| Slipping / improved (P1, P5, P7) | `insightFor` (weekly), `slippingInsight` / `improvedInsight` (monthly), `yearlyInsightsFor` | **Extend**: `progress-insights.ts` ranks slipping → improved → nothing to fix on top of them; pattern is Later (PR-03), not surfaced | 6 |
| Best month (P12) | `bestMonth`, `YearMonthCell` | **Extend**: on the year map's month tiles; insight "best month" is an *improved*-class card; year-scale insights need ≥ 3 months of history | 5–6 |
| Too-early gates (P2, P9, P14) | `monthUnlock` (30 days), `yearUnlock` (3 months), weekly `too-early` insight | **Replace** by one 7-logged-days gate for all three ranges (`progress-unlock.ts`); `monthUnlock` / `MONTH_UNLOCK_DAYS` retire, the old Monthly hook uses the new gate; `yearUnlock` stays only for the ≥ 3-month insight rule | 7 |
| Nothing logged / no habits (P3, P4) | `state: "empty"` in the summary hooks | **New** distinct view states `no-habits` and `nothing-logged` | 7 |
| Freeze log by date (P1, P5, S4, RL3) | `useFrozenDays()` (unbounded), `freezeDates` in Monthly | **Extend**: `useFrozenDaysInRange` (+ web twin), freezes used per range, `freezesLeft` for the current month | 3, 8 |
| Month default (D15) | `defaultSummaryMonth` (last complete month) | **Replace**: current month, `month` parameter (Year opens a given month); `defaultSummaryMonth` retires | 3, 8 |

## Reads

Every Progress hook reads **bounded** ranges: entries for the Monday-aligned span of the range and its previous range, frozen days for the same span. The two unbounded needs are small and separate: the logged-day count / first log (`useLoggedDays`, one aggregate row) and Week's current-streak tile (`useAllEntries`, like Detail). Per-week habits make every cell depend on its Monday–Sunday week, which is why ranges widen to week boundaries (`monthEntryRange`, `yearEntryRange`).

## Performance

Completions are bucketed once per habit (`strategies/completion-index.ts`); the classifier builds one context per habit and answers each day in O(1). No per-day scan of entries. Timings (5 years × 20 habits, Node): see the perf smoke test `domain/year-map.perf.test.ts` and the step-5 note below.
