# V3 assessment: impact, architecture review, plan

Date: 2026-10-24 · Branch: `chore/cleanup-docs-tests` (HEAD `7363a0b`) · Scope: read-only; nothing in the app was changed for this document.

Inputs: `docs/specs/feature-spec-v3.md`, `docs/design/design-system-v3.md`, `docs/mockups/v3/renders/` (text + slices), `CLAUDE.md`, `ARCHITECTURE.md`, `docs/how-to/dev-tooling.md`, `docs/audits/audit.md` (the 2026-10-05 audit), `docs/backlog.md`, the code, plus measurements run for this document (benchmarks, coverage, knip, an AST scan; method in §C.3).

**Evidence tags.** **VERIFIED** = read in code or reproduced by running it. **INFERRED** = follows from verified facts but not exercised end-to-end. **UNKNOWN** = could not be established here (why in §C.3).

---

## 0. Summary

1. **To-dos and Expenses have no data.** They are two placeholder tabs that share one placeholder component. There are no tables, modules, migrations, flows or export fields. HAB-26 is a small, data-free deletion, so the "irreversible data decision" in the spec does not arise. VERIFIED (`src/app/(tabs)/todos.tsx`, `expenses.tsx`, `src/lib/db/schema.ts`).
2. **Freezes are not earned.** There is a fixed shared pool of **2 per calendar month** across all habits. It resets on the 1st and nothing rolls over. Each use is stored as a `frozen_days` row (habit + date + createdAt). Freezes are never used automatically. So PR-07 and PR-08 can both pass. PR-11 (a logged frozen day returns the freeze) is **not** today's behaviour. VERIFIED.
3. **Migrations are atomic.** All pending migrations run in one `BEGIN…COMMIT`, with `ROLLBACK` on error, so "Nothing was changed" is true. However, the migrator is **synchronous** and has no progress callback, so SY3's determinate "step N of M" bar cannot be built on it. VERIFIED (atomic) / INFERRED (no progress).
4. **The mockup's data assumptions are partly wrong.** "Quantity +1 log — Exists (step logs)" is false: there is one row per habit per day, holding an absolute value. "Stored streak values" is false: streaks are computed on read. `createdAt` is the time a row was first inserted, not the completion time. VERIFIED.
5. **Week start is hard-coded to Monday** (`WEEK_STARTS_ON = 1`). The per-week Strategy depends on it. Following the iOS first weekday (D9) changes Strategy semantics, which CLAUDE.md forbids without an explicit decision. It also needs a new native module (`expo-localization`). VERIFIED.
6. **Category order is not stored.** Today and Manage order categories by first appearance in the habit order. Hues live on the `categories` rows (seeded by migration 0009), so moving Health from 25 to 175 and Social from 345 to 230 needs a data migration. Both new hues are already used by the custom-category rotation. VERIFIED.
7. **Performance is the main technical risk** for Progress and Detail on a large log. With 5 years × 20 habits (~27–29k entries), per-week habits cost seconds in the streak, heatmap and year maths: longest streak **3.6–5.6 s**, `buildYearlySummary` **1.3–2.0 s** (Node, not Hermes). These are the prior audit's open findings A9-01/A9-02. VERIFIED (benchmark).
8. **The codebase is healthy at the line level and loose at the structural level.** There are 0 `any`, 0 non-null assertions, 2 TODOs and 94 % line coverage. But 5 screens are 370–570-line single functions. There are 394 raw spacing/size literals, about 252 inline UI strings in screens and components, `DATE_FORMAT` declared 11 times, and 11 hooks or components importing from `screens/` (all allowlisted). There is no CI.
9. **Navigation can be done without new dependencies.** Use the bundled JS tabs with a custom `tabBar` (floating pill) and expo-router **shared routes** `(today,progress,habits)` so Detail pushes inside the originating tab. Sheets are native `Modal`s and already cover a tab bar. VERIFIED (types and docs) / INFERRED (fit).
10. **About 135 of the 137 visual baselines and all 5 Maestro flows will be invalidated.** Every flow navigates through the ⋯ menu or the Habits tab stack. The remaining 2 (`tab-todos`, `tab-expenses`) are deleted outright. INFERRED.

**Three biggest risks:** (1) the per-week streak maths on Progress/Year/Detail freezing the JS thread on real history; (2) the week-start change silently re-scoring per-week history and streaks; (3) Today's day-view rewrite inside a 568-line screen whose Undo/rollover rules are only tested through hand-written hook mocks.

---

# Part A — Impact per ticket

## A.1 Answers to every "Check against code" line

### 1. Freezes (blocks PR-07, PR-08, PR-11 and all freeze copy)

| Question | Answer | Evidence | Tag |
|---|---|---|---|
| How are freezes earned? | **They aren't.** A fixed shared pool of `FREEZE_POOL_SIZE = 2` per calendar month for all habits. It resets on the 1st and unused freezes don't roll over | `src/modules/habits/constants.ts:123-124`; `freezesRemainingInMonth` `services/habit-service.ts:132-142`; rule text `docs/specs/feature-spec.md` §08 | VERIFIED |
| How are they stored? | One `frozen_days` row per frozen missed day: `habit_id`, `date` ("yyyy-MM-dd"), `created_at`; unique `(habit_id, date)`; index on `date` | `src/lib/db/schema.ts` (`frozenDays`) | VERIFIED |
| Is there a freeze event with date + habit? | **Yes.** Each row is that event. The pool counts rows whose **missed date** falls in the month, not the month the freeze was used in | `frozen-day-repository.ts:33-48`; `habit-service.ts:132-142` | VERIFIED |
| How are they used? | Manually only. The at-risk sheet's "Use a freeze" → `applyFreeze` re-reads the pool, then inserts. The grace window is **yesterday only**. Undo deletes the row | `habit-service.ts:98-129,150-162`; `today-screen.tsx:212-227`; `use-streak-actions.ts` | VERIFIED |
| Is there any auto-use? | **No.** No code path inserts a freeze except `applyFreeze` and the dev seed (`use-habit-actions.ts:78-79`, `__DEV__` only) | grep of `freezeHabitDay` callers | VERIFIED |
| What happens with 0 left? | **No prompt.** The streak silently resets (`getStreakAtRisk` returns null when the pool is empty). **This conflicts with V3 SR3**, which shows a one-button sheet | `habit-service.ts:105`; V1 rule `feature-spec.md` §08 | VERIFIED |
| What does "Reset streak" do? | **It writes nothing.** It closes the sheet (`handleResetStreak`). The at-risk state is recomputed on the next read, so it reappears until the day rolls over | `today-screen.tsx:229-231` | VERIFIED |
| Does logging a frozen day return the freeze (PR-11)? | **No.** Logging writes `entries` only. The `frozen_days` row stays and still counts against the month's pool | `entry-repository.ts:62-120` (no `frozenDays` access) | VERIFIED |
| Is there a freeze log in the export? | Yes, `frozenDates` per habit | `services/export-data.ts:42,80-105` | VERIFIED |

**PR outcomes:** **PR-07 passes as a rule:** state it, e.g. "2 freezes a month, shared by all habits. They don't roll over." **PR-08 passes:** used counts per month, per habit and per date can be derived from `frozen_days`. Spec V3 says "saved", which is undefined: decide whether it means "streaks saved" (= used). **PR-11** is a small new composite write: delete the freeze and insert the entry in one transaction. The fallback (read-only) costs nothing.

### 2. Current delete flow

**A single confirm sheet with Archive offered first. Not two-step.** Detail → "Delete habit" → `DeleteHabitSheet`, built on `DestructiveConfirmSheet`. The sheet has "Keep habit" (primary), an "Archive instead" card when the habit is active, and "Delete permanently" (small red text link). It is non-dismissible, and controls latch while working. On success the sheet closes, Detail pops and a toast with no Undo appears. On failure the sheet stays open with an error toast. Deletion is one transaction over entries, notes, frozen days, reminders and habit. VERIFIED: `modules/habits/components/delete-habit-sheet.tsx`; `components/ui/composite/destructive-confirm-sheet.tsx:20-60`; `habit-detail-screen.tsx:91-130,295-330`; `habit-repository.ts:356-373`.

How it differs from DC1: V3 makes **Archive instead the default-focus primary**, ends with Cancel, and names the log count ("and its 214 logs"). The current sheet makes **Keep** the primary, and its body copy comes from `deleteConsequence(loggedDays)`. The DC4 failure banner inside the sheet replaces today's error toast. Delete is reachable only from Detail (backlog: "Edit habit has Archive but no Delete").

### 3. Migrations: one transaction? partial failure? (PR-12)

- **One transaction.** Drizzle's expo-sqlite driver uses `SQLiteSyncDialect` (`node_modules/drizzle-orm/expo-sqlite/driver.js:8,14`). Its `migrate` runs `BEGIN`, applies every pending migration plus its `__drizzle_migrations` row, then `COMMIT`, with `ROLLBACK` on any throw (`node_modules/drizzle-orm/sqlite-core/dialect.js:657-675`). VERIFIED.
- **Partial failure.** Everything rolls back, including migrations earlier in the same batch. `DatabaseProvider` shows `DatabaseErrorScreen` with Retry and Copy diagnostics, and Retry remounts the migrator. VERIFIED: `src/lib/db/database-provider.tsx:11-46`.
- **Are "Nothing was changed" and "Nothing is deleted" true?** **Yes, for a failed migration.** SQLite DDL is transactional, and no migration contains its own `BEGIN`/`COMMIT` (only `PRAGMA defer_foreign_keys`, which ends at COMMIT: `migrations/0010_empty_iron_man.sql:16`). `migrations.safety.test.ts` upgrades every step with FKs on and off and with child rows present. VERIFIED. **Caveat:** a migration that *succeeds with wrong data* is not protected. There is no `.db.bak` (backlog A7-08).
- **SY3 "migration in progress … step/count/determinate bar":** **not possible on the current migrator.** `useMigrations` calls the sync `migrate` once, and it runs every statement in one synchronous loop on the JS thread with no callback. The app shows a plain "Loading…" `Text` meanwhile (`database-provider.tsx:39-44`). INFERRED: there is no hook or API in `migrator.js`, and the loop blocks rendering. Options: an indeterminate SY3, or a custom migrator that runs one migration per tick, which loses whole-batch atomicity unless redesigned.
- FKs are **off on device** (`expo-sqlite` default; `client.ts` never enables them). This is a recorded decision (backlog "Orphan risks…", audit A7-04). VERIFIED in code / UNKNOWN on device (never read with `PRAGMA foreign_keys` on a phone).

### 4. Timestamps and the quantity step-log

| Question | Answer | Evidence | Tag |
|---|---|---|---|
| Is completed-at stored per log or per entry? | Per **entry row**: `entries.created_at`, set on **first insert** only. Quantity upserts keep it (`onConflictDoUpdate` sets `value` only). Retro-logged days get the time of the retro-log, not the day | `schema.ts` (`entries`); `entry-repository.ts:62-120,135-185` | VERIFIED |
| Can "Done 07:10" be shown? | **Only approximately.** For a check habit logged live it's right. For quantity it's the time of the *first* sip, not when the target was reached. For retro-logs it's wrong, and un-tick/re-tick resets it. **Recommend dropping the time** (spec fallback), or adding `completed_at` updated on the write that crosses the target | as above | INFERRED |
| Does a step-log model exist? | **No.** `unique(habit_id, date)`; `value` is the absolute day total; `value <= 0` deletes the row | `schema.ts` (`entries_habit_date_unique`); `entry-repository.ts:93-120` | VERIFIED |
| Can "+1 with Undo removes that entry" work? | **Yes, without a step log.** Write `previous + 1`; Undo writes `previous`, captured at tap time. That's exactly how `handleSaveQuantity` does Undo today. Two rapid +1s then Undo restores the value from before the *second* tap, which is correct for "one toast at a time" | `today-screen.tsx:186-209` | INFERRED |

### 5. Month default, week start, category order, hues

| Item | Today | Evidence | Tag |
|---|---|---|---|
| Month default | **The last complete month**, or the current month if that ended before any habit existed. The Monthly unlock is 30 days (`MONTH_UNLOCK_DAYS`). There is no month pager | `services/monthly-summary.ts:66-82,92-100`; `hooks/use-monthly-summary-queries.ts:43-57` | VERIFIED |
| Week start | **Monday, hard-coded**: `WEEK_STARTS_ON = 1`, used by the per-week Strategy, Today, off-schedule, the weekly/monthly/yearly summaries, history and fixtures (13 call sites) | `constants.ts:89-92`; `strategies/per-week-frequency.ts:37,44,56` | VERIFIED |
| iOS first weekday | Not read anywhere. `expo-localization` is **not installed**; it is a native module, so it needs a dev-client rebuild. Its docs: `getCalendars()[0].firstWeekday`, 1 = Sunday … 7 = Saturday, nullable; a `useCalendars()` hook re-renders on OS change | `package.json`; docs.expo.dev v57 localization | VERIFIED (absent) / VERIFIED from docs (API) |
| Category order storage | **Not stored.** The picker uses autoincrement id (built-ins, then customs). Today and Manage use first appearance in habit `sortOrder`, with "Other" last. Needs a `categories.sort_order` column plus backfill | `category-repository.ts:10`; `today-screen-helpers.ts:19-41`; backlog "Category order on Manage and Today" | VERIFIED |
| Per-habit stored colours | The legacy `habits.color/icon/category` columns exist but are **never read** (CLAUDE.md; grep finds no reads outside migrations). The habit's colour = its category's `hue` | `schema.ts` (`habits`) | VERIFIED |
| Health 25→175, Social 345→230 | Hues live in **DB rows** seeded by migration 0009, mirrored in `BUILT_IN_CATEGORIES`. Changing them needs `UPDATE categories SET hue=… WHERE built_in=1 AND name=…`. **Collisions:** 175 and 230 are already rotation slots for custom categories (`CATEGORY_ROTATION` slots 1 and 9), so an existing custom category may share Health's or Social's new hue. The rotation's 15 and 350 must go, and existing customs already on 15/350 stay red unless migrated. Tests pin the old hues (`category-rules.test.ts`, `habit-builder.ts`) | `constants.ts:16-57`; `migrations/0009_ordinary_darkhawk.sql:14-34` | VERIFIED |

### 6. "Data needs" queries (Handoff DN table) on a large log

Benchmark: 20 habits (12 daily, 4 on specific weekdays, 4 at 3× per week), 5 years, ~27–29k entries. Real services, run under Jest/babel on Node (method in §C.3). **Hermes on a phone is likely slower** (the prior audit estimated 2–5×): INFERRED.

| DN metric | Exists? | Current source | Cost measured / expected | Index / aggregate needed | Tag |
|---|---|---|---|---|---|
| Completion rate, any range (frozen and bonus excluded) | Partly: weekly/monthly/yearly summaries compute done ÷ scheduled. **Frozen days count as scheduled-not-done** in the 90-day rate (`habit-history.ts:122-131` comment), whereas V3 D11 excludes them | `services/{weekly,monthly,yearly}-summary.ts` | Month 48–73 ms; Year 1.3–2.0 s | Per-week bucketing (A9-02) | VERIFIED |
| +N pts vs previous | Yes for Month (`previousMonthWindow`); new for Week/Year | `monthly-summary.ts:322-330` | Doubles the window cost | — | VERIFIED |
| Perfect days | Month: computed in the monthly summary; Week: "best day" | `monthly-summary.ts` | Cheap per month | — | INFERRED |
| Best day / daily bars | Yes (weekly summary) | `weekly-summary.ts:112` | Cheap (one week) | — | VERIFIED |
| Per-habit month rates, bonus listed | Rates yes; "bonus not counted" listing is new (`isOffScheduleEntry` exists) | `monthly-summary.ts`, `services/off-schedule.ts` | Low | — | VERIFIED |
| Full-year map, level 0–3, all or one habit | Partly: yearly has month cells and strips; there is no per-day 365-cell level grid | `yearly-summary.ts:212-268` | 1.3–2.0 s for the year summary, dominated by per-week habits | **Pre-bucket completions by week** (A9-02) or a per-day aggregate; the SQL fetch is cheap (`entries_date_idx`) | VERIFIED |
| Year day detail (each habit's status on one date) | Yes in practice (retro-log reads all entries) | `use-retro-log-queries.ts:25-27` | Unbounded `useAllEntries` | Bound to the date (`entries` unique index covers `habit_id, date`) | VERIFIED |
| Streak, longest, 90-day rate | Computed on read, **not stored** (the mockup's "stored streaks" is wrong) | `habit-history.ts:61-131` | Daily habit 14–17 ms; **per-week habit longest streak 3.6–5.6 s**, 90-day rate 184–315 ms, heatmap 376–912 ms; current streak for all 20 habits 0.4 s, or **15.9 s** when per-week habits have never broken their streak | Pre-bucketing; optionally cache by `(habitId, lastEntryDate)` | VERIFIED |
| Slipping / improved | Yes: weekly slipping, monthly and yearly insights | `services/{monthly,yearly}-insights.ts`, `weekly-summary.ts` | Low–medium | — | VERIFIED |
| Freeze count (live) | Yes | `freezesRemainingInMonth` | Trivial | — | VERIFIED |
| Freeze log by date | Yes (`frozen_days`) | schema | Trivial; `frozen_days_date_idx` | — | VERIFIED |
| Archive/restore dates, paused ranges | Yes: `archivedAt` + `pausedRanges` ("from..to" text) | `schema.ts` | Low | — | VERIFIED |
| Quantity +1 log | **No step log** (see §4); not needed | — | — | — | VERIFIED |
| Today (streak-at-risk for every habit) | Yes | `use-today-queries.ts:118-135` | 0.2–0.45 s per render with yesterday missed; reruns on every write | Early exits (A9-01) | VERIFIED |

SQL side: all reads are live queries that refire on any table change (`enableChangeListener: true`, `client.ts`). Unbounded reads are `useAllEntries` (Today, Detail, Manage, Settings, retro-log), `useEntryNotes`, `useFrozenDays` and the habit lists. Fetching ~29k small rows is not the bottleneck (prior audit A9). The CPU goes into strategy maths. INFERRED.

### 7. To-dos and Expenses inventory

| Kind | References | Shared with habits? | Tag |
|---|---|---|---|
| Tables / migrations / repositories / services / hooks | **None** (`schema.ts` has app_settings, categories, habits, entries, frozen_days, entry_notes, reminders; migrations 0000–0010 touch only those) | — | VERIFIED |
| Routes | `src/app/(tabs)/todos.tsx`, `src/app/(tabs)/expenses.tsx`; tab entries in `src/app/(tabs)/_layout.tsx:33-50` | The tabs layout is shared | VERIFIED |
| Components | `components/ui/composite/placeholder-tab-screen.tsx` + `.test.tsx` (used only by those two routes) | No: delete | VERIFIED |
| Visual states / baselines | `scripts/visual-check/screens.mjs:959-969` (`tab-todos`, `tab-expenses`); `docs/visual-baseline/tab-todos.png`, `tab-expenses.png` | No: delete | VERIFIED |
| Maestro flows / export fields / settings / onboarding | None | — | VERIFIED |
| Tooling test fixture | `scripts/check-architecture.test.mjs:116-117` uses a fake `src/modules/todos/…` to test module isolation. Keep it (it's a fixture) or rename it to a neutral module | — | VERIFIED |
| Docs | `README.md:3`, `CLAUDE.md:3`, `ARCHITECTURE.md:9,47,58`, `docs/design/design-system.md:127`, `docs/specs/feature-spec.md:5,506` | — | VERIFIED |

**Options for existing rows:** none apply, because there are no rows. (a) leave, (b) drop and (c) export-then-drop are all no-ops. The real decision is about the **architecture promise**: `ARCHITECTURE.md` says the shell will host future modules. Dropping that promise can simplify `module-isolation` and the "modules never import each other" rule. Recommendation: keep the rules (they cost nothing) and remove only the promise text.

### 8. Navigation

| Item | Today | V3 need | Evidence | Tag |
|---|---|---|---|---|
| Expo Router | `expo-router ~57.0.24` (installed 57.0.24); typed routes and React Compiler on | — | `package.json`; `app.json:39-41` | VERIFIED |
| Tabs | `Tabs` from `"expo-router"` (deprecated in the installed types: "Use `import { Tabs } from 'expo-router/js-tabs'`"); 3 tabs: habits, todos, expenses; standard bar | 3 tabs: Today, Progress, Habits | `src/app/(tabs)/_layout.tsx:1`; `node_modules/expo-router/build/exports.d.ts:41-44` | VERIFIED |
| Floating pill | — | Needs a **custom tab bar**. `js-tabs` types a `tabBar?: (props) => ReactNode` (`build/react-navigation/bottom-tabs/types.d.ts:279`). The headless `expo-router/ui` (TabList/TabTrigger/TabSlot, documented as experimental) is the alternative. Native tabs (`unstable-native-tabs`) can't be replaced by a custom pill (docs) | docs.expo.dev router tabs / custom-tabs / native-tabs | VERIFIED (types + docs); the published tabs page doesn't document `tabBar` or the js-tabs import, so check on device |
| Detail over tabs | Detail, Weekly, Monthly, Yearly, Reminders, Manage, Settings and Categories are all pushed **inside the Habits tab's own stack** (`(tabs)/habits/_layout.tsx`). New/Edit habit are root `fullScreenModal`s | Detail pushed from any tab, with the originating tab still highlighted → **shared routes** `app/(tabs)/(today,progress,habits)/habit/[id].tsx` (docs: array group syntax, each group needs an `anchor`) | `src/app/(tabs)/habits/_layout.tsx`; `components/ui/composite/modal-form-header.tsx:26`; docs shared-routes | VERIFIED |
| Large-title collapse | None: titles are screen content; system headers mostly hidden; header buttons must come from `header-buttons.tsx` (iOS 26 guard) | A custom scroll-linked header (reanimated) is more compatible with the guard than native `headerLargeTitleEnabled` (which needs a scrollable first child and `contentInsetAdjustmentBehavior="automatic"`) | `CLAUDE.md` Guards; docs stack | INFERRED |
| Sheets | `Sheet` = native `Modal` + scrim, so it already covers any tab bar (H8); the page `ToastHost` steps aside while a sheet is open | Fits | `components/ui/composite/sheet.tsx:4,30,44` | VERIFIED |
| Toast placement | One `ToastHost` in the Habits stack layout, above the tab bar | Must move up (one per app, above the pill: 12 pt above B, 16 pt above A) | `(tabs)/habits/_layout.tsx:69` | VERIFIED |
| AX fallback to bar A, Reduce Transparency | No font-scale-dependent layout exists except `nav-menu.tsx` and `destructive-confirm-sheet.tsx` (`useWindowDimensions`); no Reduce Transparency read; `allowFontScaling` never set | New | grep | VERIFIED |

### 9. Today's selected-day state

- **Today:** Today has no selected day. Writes go through `writableDay()`: `currentDay()` at tap time, **skipped** if the render is a day behind. Undo closures capture `day`, so they always target the original date. Retro-logging lives in a separate sheet opened from Detail. `useToday()` returns a stable `Date`, refreshing at midnight and on foreground. VERIFIED: `today-screen.tsx:114-152`; `lib/today/use-today.ts`.
- **Recommendation:**
  - Put the state in a module hook, `useSelectedDay(today)`, holding `selectedKey: string | null`, where null means "follow today".
  - Keep it in TodayScreen's own React state, not Zustand. Tabs stay mounted, so it survives tab switches without leaking into Progress, which has its own range state.
  - Rollover: when null, the selection follows `useToday()` automatically (SY5). When set to a past key, it stays.
  - `writableDay()` becomes "selected past day → that date; else `currentDay()` with today's rollover guard".
  - Undo keeps capturing the date in the closure, as now. Toast copy must name the date when it isn't today.
  - Query hooks take the selected date instead of `today`, so `useTodayQueries(day)` passes it as live-query deps (rule 2).
  - Streak-at-risk only makes sense for the real today.

  INFERRED.
- **Week strip:** strip navigation (swipe to other weeks) needs the week window keyed by the selected day, not by `today`. `useTodayQueries` builds its week from `today` (`use-today-queries.ts:56-58`). VERIFIED.

## A.2 Per-ticket impact (HAB-26 … HAB-50)

Status: **exists** = behaviour present, mostly restyle · **partial** = a base exists, rules change · **new**. Paths are relative to `src/` unless stated. "Baselines" = `docs/visual-baseline/` states, by name prefix.

| Ticket | Status | Files / modules touched | What must change | Tests / baselines affected | Risk |
|---|---|---|---|---|---|
| **26** Remove to-dos/expenses | partial (tiny) | `app/(tabs)/todos.tsx`, `expenses.tsx`, `(tabs)/_layout.tsx`, `components/ui/composite/placeholder-tab-screen(.test).tsx`, `scripts/visual-check/screens.mjs`, docs | Delete the 2 routes, the component and test, 2 visual states and 2 PNGs; reword the docs. **No migration** | −1 test file; −2 baselines | Low · VERIFIED |
| **27** Nav shell | new | `app/_layout.tsx`, `app/(tabs)/**` restructure (shared routes `(today,progress,habits)`), new `components/ui/composite/tab-bar-pill.tsx`, `header-buttons.tsx`, `toast-host.tsx` placement, `e2e/*`, `scripts/visual-check/screens.mjs` routes | Custom `tabBar`; 112 pt bottom padding token; toast offset; AX → bar A; inert pill under sheets; Detail as a shared route; remove the ⋯ menu (`today-nav-menu.tsx`, `nav-menu.tsx`, `today-header.tsx` menu props, `use-today-menu-queries.ts`) | All 5 Maestro flows; every baseline (tab bar visible); `today-menu-open*` (4) deleted; `header-buttons.test.tsx` guard | **High**: deep links, back behaviour, the iOS 26 header guard · INFERRED |
| **28** Tokens and density | partial | `theme/theme.ts` (+ new `spacing`, `radius`, `elevation`, `motion` tokens), `theme/token-ratchet.guard.test.ts` + `scripts/lib/token-counts.cjs`, ~394 spacing literals | Colours mostly done (T-01–T-04 match `theme.ts:5-55`). New: spacing/radius scales, the 9-style type scale (retire 10/11/12.5 in `typeScale`, `theme.ts:57-67`), accent-tint intensity ramp (replacing `heatmapLevelColor`/`inkLevelColor`), category hues (data migration, see §A.1.5). Extend the ratchet to spacing/radius or the rule won't hold | `theme.test.ts`, `contrast.test.ts`, ~32 style-coupled tests (audit A10-08); all baselines | Medium; broad but mechanical · VERIFIED |
| **29** Core component set | partial | `components/ui/{primitives,composite}` (21 + 40 files), `modules/habits/components` (32) | Map V3-01…32 onto the existing set: e.g. `heatmap-cell`→V3-05, `completion-grid`→V3-06, `progress-bar`→V3-07, `column-bars`→V3-08, `stat-card`→V3-10, `insight-card`→V3-12, `habit-today-row`→V3-13, `category-chip`→V3-14, `category-row`→V3-15, `text-field`→V3-16, `segmented-control`→V3-17, `stepper`→V3-18, `chip`/`weekday-chip`→V3-19, `toggle`→V3-20, `checkbox`→V3-21, `button`→V3-22, `list-item`/`menu-row`→V3-23, `sheet`→V3-24, `destructive-confirm-sheet`→V3-25, `toast`→V3-26, `banner`/`archived-banner`→V3-27, `empty-state-card`/`placeholder-card`→V3-28, `unlock-card`→V3-29, `file-card`→V3-30, `icon-badge`/`habit-badge`→V3-32. **Delete candidates:** `nav-menu`, `menu-row`, `placeholder-tab-screen`, `moved-setting-pointer` (TODO), `freeze-pool-card` (→ stat/banner), `range-switcher` (→ segmented), `header-menu-button` (only the ⋯ menu uses it); `trend-row` (2 users) and `progress-row` (1 user) are absorbed or kept depending on the Progress design. New: week strip, rate ring, tab-bar pill, skeleton | Every component test touching style | Medium · INFERRED (mapping by name and doc comment; usage per file not exhaustively traced) |
| **30** Today day view + week strip | partial | `modules/habits/screens/today-screen.tsx` (568 lines), `today-screen-helpers.ts`, `hooks/use-today-queries.ts`, new `use-selected-day`, new `components/week-strip.tsx`, `retro-log-sheet` (retired as an entry point) | Progress bar replaces the ring; groups by **stored category order** (HAB-42); not-due folded row; × per week leaves Today once met; selected-day writes (§A.1.9) | `today-screen.test.tsx` (1212 lines, 9 hook mocks), `use-today-queries.test.ts`; baselines `today*` (13), `rest-day*` (3), `streak-at-risk`, `quantity-log`, `retro-log*` (2) | **High** · VERIFIED (current) / INFERRED (effort) |
| **31** Habit row and logging | partial | `components/habit-today-row.tsx`, `completion-circle.tsx`, `quantity-log-sheet.tsx` | Two tap zones already exist: name → Detail, or the at-risk sheet when at risk (`today-screen.tsx:470-474`); circle → toggle, or for quantity habits it **opens the sheet** (`habit-today-row.tsx:83-109`). V3: quantity tap = +1 with Undo (writes previous+1, Undo writes previous); count button; amber Break circle exists (VAR-06); drop "Done 07:10" or add `completed_at` | `habit-today-row.test.tsx`, `completion-circle.test.tsx`; `today*` baselines | Medium · VERIFIED (no step log) |
| **32** Today states | partial | `today-state-panel.tsx`, `today-screen.tsx` | Empty and rest-day exist (`viewState`). **"Day closed" disappears** (PR-01 is Later), so its states and tests go. Loading skeleton is new (today: neutral blank `screen-loading`) | `today-day-closed*` (2), `today-empty*`, `today-rest-day*` baselines | Medium · VERIFIED |
| **33** Streak at risk / freezes | partial | `services/habit-service.ts`, `components/streak-at-risk-sheet.tsx`, `hooks/use-streak-actions.ts`, `today-screen.tsx` | Decide SR3 (sheet at 0 freezes vs today's silent reset); "Reset streak" must persist (a per-habit, per-missed-date acknowledgement) to be undoable and to clear the dot; violet usage; copy per PR-07 | `habit-service.test.ts`, `streak-at-risk` baseline, `habit-detail-no-freezes` | Medium; **semantic** · VERIFIED |
| **34** Quantity sheet, Edit this day, habit picker | partial | `quantity-log-sheet.tsx`, `retro-log-sheet.tsx` (+schema/helpers), `habit-picker-sheet.tsx`, `repositories/entry-repository.ts` (`saveDayLog`) | QS: quick +1/+2/+3, Fill, Set exact; each change saves immediately (today: Save button). RL: today's retro-log is a draft + Save transaction; V3 saves per tap with Undo inside the sheet, a different model. The picker exists (off-schedule) and is retargeted to Year | `quantity-log-sheet.test.tsx`, `retro-log-sheet.test.tsx`, `retro-log.test.ts`; `quantity-log`, `retro-log*`, `rest-day-picker*` baselines | Medium · VERIFIED |
| **35** Progress shell + Week | partial | `screens/weekly-summary-screen.tsx`, `services/weekly-summary.ts`, new `progress-screen`, `range-switcher.tsx` | One tab with a segmented control replaces 3 pushed screens; week matrix (habits × days) is new; "too early" exists (`weekly-summary-too-early`). Rates must exclude frozen days (today's 90-day rate counts them as missed) and bonus | `weekly-summary*.test`; 6 `weekly-summary*` baselines | Medium · VERIFIED |
| **36** Progress Month | partial | `monthly-summary-screen.tsx` (424), `services/monthly-summary.ts` (418), `monthly-insights.ts` | Default month changes (current, not last complete): **confirm**; month pager; 40 pt day tap → detail card → Edit this day; accent-tint calendar replaces the ink ramp | `monthly-summary*.test` (2 files, 756 lines); 9 `monthly*` baselines | Medium · VERIFIED |
| **37** Progress Year | partial | `yearly-summary-screen.tsx` (407), `services/yearly-summary.ts` | New 365-cell heat map (3 bands), habit filter; **performance** (1.3–2.0 s today before the map) | `yearly-summary*.test`; 8 `yearly*` baselines | **High (performance)** · VERIFIED |
| **38** Insights | exists | `services/{monthly,yearly}-insights.ts`, weekly slipping | Rank and pager over existing insights; "Change frequency" deep link exists (`edit-habit/[id]?focus=frequency`, `app/edit-habit/[id].tsx:6-11`) | insight tests; `*-insights*` baselines | Low · VERIFIED |
| **39** Habits tab library | partial | `screens/manage-habits-screen.tsx`, `hooks/use-manage-habits-queries.ts`, `reorderable-list.tsx`, `swipeable-row.tsx` | Becomes a tab root; **search is new** (no search UI exists); reorder within category exists; restore with Undo exists (B9) | `manage-habits-screen.test.tsx`; 14 `manage-habits*` baselines; e2e `hab-13` | Medium · VERIFIED |
| **40** Habit Detail | exists | `habit-detail-screen.tsx` (373), `habit-detail-helpers.ts`, `habit-heatmap.tsx`, `habit-entry-row.tsx` | 5-week mini grid (today 10-week heatmap), history by date with frozen/bonus tags; banners exist (archived/restored/reset, HAB-20) | `habit-detail-screen.test.tsx` (655); 13 `habit-detail*` baselines | Medium; per-week performance · VERIFIED |
| **41** Add/Edit form | partial | `habit-form-screen.tsx` (558), `habit-form-schema.ts`, `category-picker.tsx` | Order Type→Name→Category→Goal→Frequency; **category optional** ("Other") vs today's required pick (`habit-form-schema.ts:72-77`, `NO_CATEGORY_MESSAGE`); **duplicate-name validation is new** (only categories have one: `components/category-name-schema.ts`); **discard prompt is new** (A5-14 deferred); inline reminders before save are new; icon/colour picker (F6) is new **and conflicts with the categories rule** (icon and colour come from the category, CLAUDE.md) | `habit-form-screen.test.tsx` (868); 12 `new-habit*`/`edit-habit*` baselines | **High (rules conflict)** · VERIFIED |
| **42** Categories | partial | `manage-categories-screen.tsx`, `category-repository(.web).ts`, schema + **migration** (`sort_order`, hue update) | Stored order (new column); hue change; counts incl. archived; DC6 Undo for delete of an unused category (new) | `category-repository*.test`, `category-rules.test.ts`, `migrations.safety.test.ts`; 10 category baselines | Medium (schema) · VERIFIED |
| **43** Reminders | exists | `reminders-screen.tsx`, `reminder-card.tsx`, `reminder-time-sheet.tsx` | Restyle; remove `moved-setting-pointer` (TODO); denied banner exists (`settings-system-notifications-off`) | 7 `reminders*` baselines; e2e `hab-12` | Low · VERIFIED |
| **44** Settings + export | exists | `settings-screen.tsx`, `export-sheet.tsx` (284), `use-export-actions.ts` | Push from the Habits gear; Export also from Progress; background export with toast is new (closing the sheet keeps it running); no to-do/expense fields exist | 11 `settings*`/`export*` baselines | Low–medium · VERIFIED |
| **45** Destructive confirms | exists | `delete-habit-sheet.tsx`, `destructive-confirm-sheet.tsx` | Swap primary to Archive; Cancel last; log count copy; in-sheet failure banner | `delete-habit-sheet*`, `destructive-confirm-sheet.test.tsx`; 4 `delete-confirm*` baselines | Low · VERIFIED |
| **46** First run + suggestions | partial | `first-run-screen.tsx`, `services/first-run-service.ts`, `constants.ts` (`FIRST_RUN_SUGGESTIONS`, 6 entries) | 8–10 bundled suggestions grouped by category; prefill into the form; our own notification pre-prompt (FR3) is new | first-run tests; 2 `first-run*` baselines; e2e `hab-06-01-03` | Low–medium · VERIFIED |
| **47** System states | partial | `lib/db/database-provider.tsx`, `database-error-screen.tsx`, `today-screen.tsx` | SY2 load error **inside Today** with tabs usable is new (today a query error throws to `RootErrorBoundary`, `ARCHITECTURE.md` "Live reads"); SY3 progress not possible on the sync migrator (§A.1.3); SY5 midnight banner new | `database-provider*.test`; `error-screen-*` baselines | Medium · VERIFIED |
| **48** Message catalogue | new | ~252 inline strings in screens/components (top: `export-sheet.tsx` 27, `habit-form-screen.tsx` 26, `settings-screen.tsx` 22, `today-screen.tsx` 19); 16 `showToast(` call sites in 9 files; `utils/failure-message.ts` | New `modules/habits/messages.ts` (or `messages/`); durations per tone in `store/toast-store.ts`; VoiceOver keep-until-dismissed | Many text assertions in tests | Medium; wide · VERIFIED (counts, §B.3) |
| **49** Accessibility / Dynamic Type | partial | B8 landed (touch targets, reduce motion via `utils/use-reduced-motion.ts`, toast announcements) | AX3 reflows (P6, P11, P16, F10, H7, QS4, DC7, S7) are new; Reduce Transparency is new; tab label fixed size | device checks | Medium · VERIFIED (B8 as built, audit §21) |
| **50** Baselines, e2e, docs | — | `docs/visual-baseline/` (137 PNGs, 14 MB), `e2e/` (5 flows), `scripts/visual-check/screens.mjs` (137 states, 1139 lines), `scripts/check-architecture.mjs`, CLAUDE.md, docs | Regenerate almost all; rewrite the 5 flows for 3 tabs; add V3 flows | — | Medium (effort) · INFERRED |

---

# Part B — Architecture and maintainability review

## B.1 Numbers (production code = `src/**/*.{ts,tsx}` minus tests, test-support, `__fixtures__`, test-db helpers)

| Metric | Value | Source | Tag |
|---|---|---|---|
| Production files / lines | 242 / 24,874 | AST scan | VERIFIED |
| Test files | 224 (217 Jest suites, 1,805 tests, ~20 s; 55 s with coverage) + 16 tooling tests | `make check` steps run separately | VERIFIED |
| Coverage (lines / branches) | **94.4 % / 88.4 %** overall · services 99.8/96.5 · strategies 100/100 · hooks 100/92.4 · screens 97.1/89.6 · module components 98.2/89.2 · `components/ui` 94.8/92.7 · **repositories 80.2/68.9** · `lib/db` 95.5/75.4 · `lib/file-export` 54.5/72.2 | `jest --coverage` (json-summary) | VERIFIED |
| Files > 300 lines (non-test) | 12: `habit-fixtures.ts` 839, `today-screen.tsx` 568, `habit-form-screen.tsx` 558, `monthly-summary-screen.tsx` 424, `monthly-summary.ts` 418, `yearly-summary-screen.tsx` 407, `habit-repository.ts` 405, `habit-detail-screen.tsx` 373, `habit-history.ts` 370, `habit-repository.web.ts` 352, `reminder-service.ts` 331, `entry-fixtures.ts` 311 | AST scan | VERIFIED |
| Components/screens > 200 lines | 14 (the screens above plus `export-sheet.tsx` 284, `reorderable-list.tsx` 255, `weekly-summary-screen.tsx` 246, `manage-habits-screen.tsx` 245, `list-item.tsx` 242, `reminders-screen.tsx` 226, `text-field.tsx` 206, `manage-categories-screen.tsx` 206, `category-chip.tsx` 204) | AST scan | VERIFIED |
| Functions > 50 lines | **60**; worst: `TodayScreen` 506, `HabitFormScreen` 444, `HabitDetailScreen` 278, `ExportSheet` 208, `ManageHabitsScreen` 180, `ManageCategoriesScreen` 160, `RemindersScreen` 158, `ReorderableList` 149, `useTodayQueries` 125, `SettingsScreen` 123; non-component: `buildMonthlySummary` 100, `useExportActions` 93, `reconcileScheduledReminders` 86, `buildWeeklySummary` 75, `buildHeatmapWeeks` 66 | AST scan | VERIFIED |
| `any` / non-null `!` / `as` casts | **0 / 0 / 30** | AST scan | VERIFIED |
| TODO/FIXME | 2, both `TODO(backlog)` for NEW-27 (`moved-setting-pointer.tsx:18`, `reminders-screen.tsx:181`) | grep | VERIFIED |
| Import cycles (runtime imports) | 1: `category-repository.web.ts` → `habit-repository.web.ts` → back (web twins only) | AST scan + DFS | VERIFIED |
| Dead code (knip) | 4 unused exports (`SETTLE_MS`, `notificationIdentifier`, `GARDEN_FIXTURE`, `RETRO_LOG_DAYS_AGO`), 13 unused exported types, unlisted dep `expo-clipboard` (dynamic optional import, backlog), 6 stale knip-config hints | `npx knip` | VERIFIED |
| Raw spacing/size literals (padding/margin/gap/radius/width/height/offsets, ≠ 0, outside `src/theme`) | **394**; top: `category-chip.tsx` 18, `banner.tsx` 13, `list-item.tsx` 13, `toast.tsx` 13, `today-state-panel.tsx` 13, `container.tsx` 12, `icon-badge.tsx` 12, `first-run-screen.tsx` 12. **Not covered by the token ratchet** | AST scan; `dev-tooling.md` ratchet section | VERIFIED |
| Ratchet baseline (what it does cover) | colour literals 2, shadow 5, font-size literals 25, line-height 8, weight 0 | `theme/token-ratchet.baseline.json` | VERIFIED |
| Off-scale type sizes | `typeScale` has 10, 11, 12.5 (V3 retires 10.5/11/11.5/12.5; floor 12) | `theme.ts:57-67` | VERIFIED |
| Inline UI strings (JSX text + label/title/message/body props) | **~252** in 40+ files; 16 `showToast` call sites in 9 files; no catalogue | AST scan (heuristic) | VERIFIED (heuristic count) |
| Duplicated constants/helpers | `const DATE_FORMAT = "yyyy-MM-dd"` declared in **11** files; `"yyyy-MM-dd"` appears 55 times; `lib/today/use-today.ts` has its own `DAY_KEY_FORMAT` | grep | VERIFIED |
| Dev seeds in production paths | 8 `*-fixtures.ts` files inside `repositories/` (839 + 311 + … lines), seeds wired into `use-habit-actions.ts` behind `__DEV__` | file list; `use-habit-actions.ts:11-12,114-120` | VERIFIED |

## B.2 Layer rules: enforced or convention?

| Rule (CLAUDE.md) | Enforced by | Current violations | Tag |
|---|---|---|---|
| 1 Drizzle only in repositories / `lib/db` | `check-architecture` `drizzle-placement` + Biome `noRestrictedImports` | 0 | VERIFIED |
| 2 Live-query hooks from repositories, args as deps | `live-query-placement` (placement only; **deps are not checked**) | 0 placement violations. Deps by convention: `useLiveRows(query, deps)` | VERIFIED |
| 3 Services only for composites | **Convention only** | Not exhaustively audited. `services/` mixes pure domain maths (summaries, history, insights, export formats) with orchestration (`habit-service.applyFreeze`, `export-service`, `reminder-service`). The rule's wording doesn't match the folder's real content | VERIFIED (mix) / UNKNOWN (single-call wrappers) |
| 4 `use<X>Queries` / `use<X>Actions` | `hook-naming` | 0 | VERIFIED |
| 5 Strategy per frequency | Convention (+ `frequency-strategy.ts` factory) | 0 seen | INFERRED |
| 6 Module isolation and layer order | `module-isolation`, `layer-order` | **11 allowlisted `layer-order` violations**: hooks/components importing `screens/*-helpers.ts` (`export-sheet`, `habit-entry-row`, `reminder-card`, `use-manage-habits-queries`, `use-settings-queries`, `use-today-menu-queries` ×4, `use-today-queries` ×2) | VERIFIED |
| 7 RHF + Zod; `date-fns` | `date-args` rule (`new Date(<args>)`) only | 5 allowlisted (fixtures, builders) | VERIFIED |
| 8 Colocated tests | `colocated-tests` | 2 allowlisted (`lib/db/client.ts`, `lib/dev-clock/pin-clock.ts`) | VERIFIED |
| 9 Thin routes | `thin-routes` (≤ 20 lines) | 0 | VERIFIED |
| 10 Reuse before create; tokens | Token ratchet (colour/shadow/font only) + `hex-colour` (2 allowlisted: `nav-menu.tsx`, `category-chip.tsx`) | **Spacing/radius: not enforced** (394 literals). Reuse: convention + `spec-reviewer` | VERIFIED |
| Web twin for every repository | `web-twin` + `_sameShape` | 0 | VERIFIED |

Totals: **20 allowlist entries** (`scripts/check-architecture.allowlist.json`). The check prints "34 allowlisted known violations" because some entries cover several imports. VERIFIED.

## B.3 Smells (beyond the numbers)

- **The `screens/*-helpers.ts` files are view-models in the wrong layer.** They hold presentation and domain helpers (grouping, labels, summaries). Hooks and components need them, which is where 11 of the 20 allowlist entries come from. VERIFIED.
- **God screens.** `TodayScreen` (506-line function) owns toggle, quantity, freeze, off-schedule picker, ⋯ menu, dev actions and five view states. V3 adds a selected day, a week strip, +1 logging and the at-risk flow on top. VERIFIED.
- **Two transaction styles.** `saveDayLog` uses Drizzle `db.transaction` with sync `.run()`. `deleteHabitAndHistory` and the category writes use raw `begin` … `await` … `commit` with `rollbackQuietly` (`habit-repository.ts:356-373`, `lib/db/transaction.ts`). Awaits inside a raw transaction can interleave other writes on the same connection (audit A7-03, open). VERIFIED (code) / INFERRED (interleaving).
- **Toast copy is inline and inconsistent with V3.** Examples: "Marked 'X' complete", "Used a freeze on 'X'" (`today-screen.tsx:103-226`) vs V3's "Freeze used for Thu 22 · 0 left". VERIFIED.
- **Unbounded live reads** are duplicated per screen (`useAllEntries` in Today, Detail, Manage, Settings and retro-log; `useActiveHabits` twice on Today, audit A9-04). VERIFIED.
- **Naming.** `services/` vs "domain"; `components/` (module) vs `components/ui/composite` overlap. Examples: `habit-badge` vs `icon-badge`; `menu-row` vs `list-item`; `freeze-pool-card` vs `stat-card`; `range-switcher` vs `segmented-control`. INFERRED (by name and doc comment).
- **Error handling and logging are consistent and documented** (`useAsyncAction.run`, `runSafely`, `lib/logger` with privacy rules). That's a strength. VERIFIED (`ARCHITECTURE.md` "Cross-cutting decisions").

## B.4 Tests

| Area | State | Tag |
|---|---|---|
| Unit/component | 217 suites / 1,805 tests green; 94 % lines. Weakest: repositories (80/69) and `lib/file-export` (55 %) | VERIFIED |
| Slow / flaky | Slowest suites (prior audit): habit-form 10.9 s, habit-detail 8.5 s, manage 7.2 s, today 5.7 s. `testTimeout: 15000` (`package.json`). Midnight-flake hygiene landed in B3 (fake timers) | VERIFIED (config) / not re-timed per suite |
| Screen tests drive mocked hooks | `today-screen.test.tsx` (1,212 lines) mocks the module's own hooks with hand-written shapes (audit A10-07, open). Today's V3 rewrite will rewrite most of it | VERIFIED |
| Visual-check | 137 states across 28 feature tags; 108 distinct state stems, 30 dark twins; 14 MB of PNGs. V3 invalidates ~135; 2 are deleted | VERIFIED (counts) / INFERRED (invalidation) |
| Maestro | 5 flows (HAB-06/01/03, 09/10, 11, 12, 13), none for V2. All 5 navigate through structures V3 removes (⋯ menu "Weekly summary", "Manage & archive") | VERIFIED |
| Tooling tests | 16 `node --test` tests for `check-architecture` | VERIFIED |
| Benchmarks | None in the repo. The per-week cost regressions in §A.1.6 are invisible to CI | VERIFIED |

## B.5 Tooling gaps

| Gap | Today | Proposal | Tag |
|---|---|---|---|
| **CI** | None (no `.github/`). The gate is local `pre-push` only | One GitHub Actions job running `make check` on PRs; visual-check stays manual (fonts and Chromium vary) | VERIFIED |
| Biome scope vs design exports | `biome.json` `files.includes: ["**", "!assets"]`, so `docs/mockups/v3/*.dc.html` + `support.js` now fail `make check` (134 errors) | Add `"!docs/mockups/v3/*.dc.html"`, `"!docs/mockups/v3/support.js"` (a config change, not made here) | VERIFIED |
| Spacing/radius ratchet | Not counted | Extend `token-counts.cjs` with spacing/radius once the F-04/F-05 tokens exist | VERIFIED |
| Layer rule for "helpers" | Allowlisted | Move helpers down (B.6 step 2) and shrink the allowlist | VERIFIED |
| Floating promises | No lint (Biome lacks type-aware rules; backlog A3-12) | Keep `run()`; optionally add a `tsc`-based custom check later | VERIFIED |
| Performance guard | None | A small Jest perf smoke for per-week streak/year maths with a generous ceiling (after the fix) | INFERRED |
| `knip` in the gate | Report only | Add `deadcode` to `make check` after cleaning the 4 + 13 items and the 6 config hints | VERIFIED |
| Coverage | No `collectCoverageFrom`/threshold (audit A10-12, open) | Thresholds per layer (repositories ≥ 85 %) | VERIFIED |

## B.6 Target structure and migration path

**Recommendation: keep layers, which the tooling already enforces, and add *surface* subfolders only where files pile up.** Moving to feature folders would invalidate every `check-architecture` rule and the reviewer agents for little gain in a one-module app.

```
src/
  app/                                   routes only
    _layout.tsx                          root stack: (tabs), new-habit, edit-habit/[id] (modals)
    (tabs)/_layout.tsx                   js-tabs + custom pill tabBar
    (tabs)/(today,progress,habits)/      shared routes: habit/[id], reminders/[id]
    (tabs)/today/index.tsx · progress/index.tsx · habits/{index,settings,categories}.tsx
  modules/habits/
    repositories/                        Drizzle only (+ .web twins); fixtures moved out ↓
    dev/                                 *-fixtures.ts + dev seeds (out of repositories/ and hooks)
    domain/                              pure: strategies/, streaks, summaries, insights, export formats
    services/                            orchestration only (multi-repo writes: freeze, delete, export, reminders)
    presenters/                          today/detail/summary view-model helpers (from screens/*-helpers.ts)
    hooks/                               use<X>Queries / use<X>Actions
    messages.ts                          the catalogue (HAB-48)
    components/{today,progress,library,detail,forms,sheets}/
    screens/                             one per route, thin compositions
  components/ui/{primitives,composite}   V3-xx set; replaced components deleted
  theme/                                 colour, type, spacing, radius, elevation, motion tokens
  lib/                                   unchanged (db, today, logger, notifications, file-export, …)
```

Layer order becomes: repositories / domain ← services ← presenters ← hooks ← components ← screens.

**Steps** (each is one commit of `git mv` + import rewrites, `make check` green, no behaviour change):

1. Move `*-fixtures.ts` from `repositories/` to `dev/`, and the dev seed actions out of `use-habit-actions.ts`. `web-twin` and `drizzle-placement` stay green: fixtures don't import Drizzle (verify).
2. Move `screens/*-helpers.ts` to `presenters/`. Teach `layer-order` the new layer. **Remove the 11 allowlist entries.**
3. Split `services/`: move pure files to `domain/`, keeping orchestration in `services/`. Update rule 3's wording to match.
4. Add one `DATE_KEY` helper (`lib/today` or `utils/day-key.ts`) and replace the 11 `DATE_FORMAT` copies.
5. Create `messages.ts` before any V3 screen work, so new copy lands there (HAB-48 first).
6. Add `components/<surface>/` subfolders as V3 surfaces are built (not up front).
7. Update `ARCHITECTURE.md`, CLAUDE.md rules 3 and 6, and `check-architecture.mjs` with its tests in the same commits.

This is the prior audit's B4 (`docs/audits/audit.md` §4, §16), narrowed. B4 hasn't landed: `src/modules/habits/` still has only `components hooks repositories screens services strategies test-support` (VERIFIED).

## B.7 Docs gaps

| Doc | State | Outline | Tag |
|---|---|---|---|
| `ARCHITECTURE.md` | Good. Out of date on the shell promise (To-dos/Expenses), the folder tree, and navigation | Update the tree (B.6), the navigation section (pill, shared routes, modals, sheets), drop the module-shell promise, add the Today selected-day rule | VERIFIED |
| `docs/roadmap.md` | Says "V3: Not planned" | Add V3 batches | VERIFIED |
| `docs/design/design-system-v3.md` | Referenced `design-system-v2.md`, which no longer exists (merged into `design-system.md`, CLAUDE.md). **Fixed** in the V3 docs commit; nothing else in `docs/` (outside the dated audit) points at it | F-05 radius-xs/s/m values still say "see master" | VERIFIED |
| `docs/specs/feature-spec-v3.md` | HAB-50 says "update `docs/specs/feature-spec.md` index"; there is no index there (the docs index is `README.md` "Where to read more") | Point HAB-50 at README | VERIFIED |
| ADRs | Only a 2-line decision log in `ARCHITECTURE.md` | `docs/decisions/`, one page each (context, decision, consequences): **001 Drizzle + live queries via `useLiveRows`** (why not React Query; refire-on-any-change cost); **002 FKs off on device** (A7-04; orphan risks; integrity tests); **003 `run()` never rejects** (error toast, `execute` for inline-error forms); **004 Token ratchet** (counts only go down; scope); **005 V3 navigation** (custom pill on js-tabs, shared routes, modals vs sheets); **006 Week start** (iOS first weekday vs Monday; the per-week history consequence); **007 Freeze pool** (fixed 2/month, not earned) | VERIFIED (absence) |
| CONTRIBUTING | None (README + CLAUDE.md cover commands) | Short: branch/commit/PR rules, `make check`, visual-check, how to add a migration, the `/implement-feature` flow | VERIFIED |
| Folder READMEs | `e2e/README.md` and now `docs/mockups/v3/README.md` | Add one-paragraph READMEs to `src/modules/habits/` (layers + where things go) and `scripts/` (what each script does) | VERIFIED |

## B.8 Ranked findings

| # | Finding | Evidence | Rank |
|---|---|---|---|
| 1 | Per-week maths O(n) per day: seconds on Year/Detail with real history | §A.1.6 benchmark; `per-week-frequency.ts:33-70` | **Before V3** (Progress depends on it) |
| 2 | Week-start change alters per-week semantics + needs `expo-localization` | `constants.ts:92`; CLAUDE.md Guards | **Before V3** (decision + Strategy change in its own ticket) |
| 3 | Biome fails on the committed mockup export | §Phase 1 / `biome.json` | **Before V3** (one line) |
| 4 | Helpers in `screens/` → 11 layer-order exceptions | allowlist | **Before V3** (B.6 step 2) |
| 5 | No message catalogue; ~252 inline strings | AST scan | **Before V3** (create the module; migrate as touched) |
| 6 | No spacing/radius tokens; 394 literals, not ratcheted | AST scan | **Before V3** (tokens + ratchet); migrate during V3 |
| 7 | Freeze rules conflict with V3 (SR3 at 0, persisted reset, PR-11) | §A.1.1 | **Before V3** (decisions) |
| 8 | Today god screen (506-line function) | AST scan | **During V3** (split when the day view is built) |
| 9 | `HabitFormScreen` 444 lines + category/icon rule conflict in F6 | AST scan; CLAUDE.md categories | **During V3** |
| 10 | Two transaction styles; raw begin/await/commit | `habit-repository.ts:356-373`; `entry-repository.ts:135` | **During V3** (when touching delete/categories) |
| 11 | Hand-written hook mocks in screen tests | `today-screen.test.tsx` | **During V3** (rewrite with the screens) |
| 12 | No CI | no `.github/` | **During V3** (cheap, early) |
| 13 | Dev fixtures in `repositories/` and hooks | file list | **During V3** (B.6 step 1) |
| 14 | `DATE_FORMAT` ×11 | grep | **During V3** |
| 15 | knip leftovers (4 exports, 13 types, config hints) | knip | Later |
| 16 | Repository branch coverage 69 % | coverage | Later |
| 17 | Web-twin import cycle (category ↔ habit web repos) | AST scan | Later |
| 18 | ADRs, CONTRIBUTING, folder READMEs | §B.7 | During V3 (ADR 005/006/007 before their batches) |

---

# Part C — Plan

## C.1 Batches

Each batch: `make check` green → visual-check light/dark on touched screens → `spec-reviewer` (+ `migration-reviewer` when there's schema) → backlog and "As built" notes. Nothing is committed unless you ask.

| Batch | Scope | Structural clean-up included | Files expected to change | Tests to add | Baselines that change | Risk |
|---|---|---|---|---|---|---|
| **V3-0 Foundations** | HAB-26, HAB-28 (tokens, type scale, intensity ramp, ratchet), HAB-29 (component consolidation, no screen redesign yet), HAB-48 catalogue skeleton, category hue + `sort_order` **migration** (HAB-42 data part), per-week **pre-bucketing** fix (no semantic change) | B.6 steps 1–5; Biome ignore for mockups; CI job; ADRs 001–004 | `theme/*`, `components/ui/**`, `modules/habits/{dev,presenters,domain,messages.ts}`, `strategies/per-week-frequency.ts` (perf only), `lib/db/schema.ts` + new migration, `(tabs)/_layout.tsx` (2 tabs gone), `scripts/check-architecture.*`, `scripts/lib/token-counts.cjs` | Migration safety with child rows (hue update, sort_order backfill); per-week perf smoke; strategy equivalence test (old vs bucketed, random histories); token tests | Nearly all (tokens) | Medium |
| **V3-1 Navigation shell** | HAB-27 | Shared routes; toast host moved to the shell; ⋯ menu deleted; ADR 005 | `src/app/**` (restructure), `components/ui/composite/{tab-bar-pill,header…}.tsx`, `today-header.tsx`, delete `nav-menu`/`today-nav-menu`/`use-today-menu-queries` | Tab-bar component tests (states, AX → bar A, inert under sheet); route-level test that Detail keeps the originating tab; rewrite the 5 Maestro flows | All (pill + bottom padding) | **High** |
| **V3-2 Today** | HAB-30, 31, 32, 33, 34 (quantity sheet + Edit this day), 48 (Today copy), **week-start change if decided (ADR 006)** | Split `TodayScreen` into a day-view container + sections; `useSelectedDay`; remove the retro-log entry from Detail later | `screens/today-screen.tsx`, `hooks/use-today-queries.ts`, new `use-selected-day.ts`, `components/today/*`, `quantity-log-sheet.tsx`, `retro-log-sheet.tsx`→Edit this day, `streak-at-risk-sheet.tsx`, `services/habit-service.ts` (reset persistence / PR-11), possibly a migration (reset acknowledgements) | Selected-day rollover (fake timers across midnight, both cases); Undo targets the original date from a past day; +1/Undo on quantity; PR-11 transaction; at-risk with 0 freezes per decision; screen tests on the in-memory db instead of hook mocks | `today*`, `rest-day*`, `streak-at-risk`, `quantity-log`, `retro-log*` | **High** |
| **V3-3 Progress** | HAB-35, 36, 37, 38 | `services/*-summary.ts` → `domain/`; one Progress screen replaces 3 | `screens/{weekly,monthly,yearly}-summary-screen.tsx` → `screens/progress-screen.tsx` + `components/progress/*`, `domain/*-summary.ts` (frozen excluded from rates) | Rate rules (frozen excluded, bonus never counted); year map levels; month default per decision; perf smoke for a 5-year year map | `weekly-summary*`, `monthly*`, `yearly*` (23) → new Progress states | Medium–high (perf) |
| **V3-4 Habits tab and forms** | HAB-39, 40, 41, 42 (UI), 43, 44, 45 | Split `HabitFormScreen`; one transaction style for delete/category writes | `manage-habits-screen.tsx` → library, `habit-detail-screen.tsx`, `habit-form-screen.tsx` + schema, `manage-categories-screen.tsx`, `reminders-screen.tsx` (remove NEW-27 pointer), `settings-screen.tsx`, `export-sheet.tsx`, `delete-habit-sheet.tsx` | Search; reorder within category; duplicate habit name; discard prompt; category optional → Other; DC1 focus order; DC6 Undo | `manage-habits*`, `habit-detail*`, `new-habit*`, `edit-habit*`, category, `reminders*`, `settings*`, `export*`, `delete-confirm*` | Medium |
| **V3-5 First run and system states** | HAB-46, 47 | — | `first-run-screen.tsx`, `constants.ts` (suggestions), `database-provider.tsx`, Today load error | Suggestions prefill; SY2 inside Today; SY5 banner | `first-run*`, `error-screen*` | Low–medium |
| **V3-6 A11y, baselines, e2e, docs** | HAB-49, 50 | ADRs, CONTRIBUTING, folder READMEs, roadmap | `docs/**`, `e2e/**`, `scripts/visual-check/screens.mjs` | New Maestro flows: log + undo on Today, past-day logging, Progress switch, delete → archive instead | Final regeneration | Low |

**Manual phone checklist (after each batch, light and dark, standard and AX3 text):**

- **V3-0:** app upgrades in place from your current DB: habits, history, freezes and reminders intact; Health and Social now teal/blue; categories in the same order; Detail and Year for a per-week habit open without a visible stall; no To-dos/Expenses tabs.
- **V3-1:** three tabs; pill floats with content scrolling under it; last row's circle clear of the pill; Detail from each tab keeps that tab highlighted and Back returns there; a sheet covers the pill and tabs don't switch; New/Edit open as modals; AX3 shows the full-width bar; iOS 26 header buttons look right; Reduce Transparency gives a solid pill.
- **V3-2:**
  - Log, un-log and Undo on today. Quantity: tap = +1, Undo, long-press, count button.
  - Pick yesterday on the strip, log, Undo; the toast names the date.
  - Leave the app open across midnight, with today selected and with a past day selected.
  - Miss a day: at-risk dot → sheet → freeze → Undo, and the freeze count restored; Reset → Undo.
  - Rest day; empty state; 3× per week habit leaves once met; first weekday per the decision; VoiceOver on a row (two targets).
- **V3-3:** Week/Month/Year switch; tap a day header → Edit this day; Month day tap → detail card; Year month label → Month; habit filter; numbers match what you logged; frozen days not counted as missed; Year on your real data opens quickly.
- **V3-4:** search active and archived; restore from search; reorder within a category; add with a duplicate name; leave the form with edits → discard prompt; categories reorder reflected on Today; reminders add/remove/undo; notifications denied banner; export from Settings and from Progress; delete → Archive instead; delete permanently.
- **V3-5:** fresh install → first run → suggestion → prefilled form → notification pre-prompt; force a load error (dev) → banner in Today and other tabs usable.
- **V3-6:** VoiceOver pass on each tab; Dynamic Type AX1–AX5; Reduce Motion (check draw static; no skeleton shimmer).

## C.2 Decisions you need to make

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | **To-dos/expenses data** | (a) leave, (b) drop, (c) export-then-drop | **Nothing to decide on data**: no tables exist. Decide only whether to drop the "future modules" promise from the docs. I'd drop the text and keep the isolation rules |
| 2 | **Freeze rule (PR-07)** | Keep the fixed 2/month shared pool / invent earning | **Keep the existing pool** and let copy state it plainly ("2 a month, shared by all habits, they don't roll over"). It's true today, so the PR-07 fallback isn't needed |
| 3 | **Freezes at 0 (SR3)** | V1 silent reset / V3 one-button sheet | V3 sheet: it explains what happened. It needs a stored "acknowledged" record so it doesn't reappear (see 4) |
| 4 | **"Reset streak" persistence** | Write nothing (today) / store an acknowledgement per habit + missed date | Store it (small table or `app_settings` key). Without it, V3's "undoable reset" and clearing the amber dot can't work |
| 5 | **PR-11 (logging a frozen day returns the freeze)** | Build / read-only fallback | **Build**: one transaction in a service, small and testable |
| 6 | **PR-08 counts** | "N left" only / used + "saved" | Show "used this month" (derivable). Define "saved" or drop it |
| 7 | **Delete flow** | Current (Keep primary + Archive card) / V3 DC1 (Archive-instead primary, Cancel) | Adopt DC1. It's single-confirm like today, so there's no lock to preserve |
| 8 | **Migration atomicity / SY3** | Indeterminate progress / custom stepwise migrator | Keep the atomic Drizzle migrator and ship an **indeterminate** SY3; PR-12 copy is true as is. Optionally a `.db.bak` copy before migrating (A7-08) |
| 9 | **Week start (D9)** | iOS first weekday / keep Monday | Choose knowingly: it **re-scores past weeks for × per week habits** (streaks and rates can change) and adds a native module. If you keep it, do it as its own ticket in V3-2 with a before/after diff of streaks on your real DB. Otherwise keep Monday and amend D9 |
| 10 | **Month default** | Current month (V3) / last complete month (V2) | Current month with the pager (the spec's proposal); confirm |
| 11 | **"Done 07:10" time** | Drop it / add `completed_at` | Drop it for V3 (spec fallback); `created_at` is first-insert time |
| 12 | **Category optional + icon/colour picker (F6)** | Per V3 / per CLAUDE.md categories rule | CLAUDE.md forbids per-habit icon and colour. Either drop F6's picker (category supplies both) or reverse the categories decision. I'd drop F6's picker |
| 13 | **Rotation hue collisions** | Accept / remap custom categories on 175/230/15/350 | Remap in the same migration and drop 15/350 from the rotation |
| 14 | **Rates exclude frozen days** | V3 D11 / current (frozen counted as scheduled-not-done in the 90-day rate) | Adopt D11 and update the HAB-09 text and tests (V2-beats-V1 style note) |

## C.3 What I could not verify, and why

- **Device behaviour** (UNKNOWN): Hermes timings (benchmarks ran under Jest/babel on Node 24, not Hermes), the actual `PRAGMA foreign_keys` value on a phone, iOS 26 header and pill rendering, VoiceOver and Dynamic Type, notification permission states. No simulator or device here.
- **`js-tabs` `tabBar` support at runtime** (INFERRED): it's in the installed v57 types (`types.d.ts:279`) and `Tabs` from `expo-router` is marked deprecated there. But the published docs page (fetched 2026-10-24) still imports from `'expo-router'` and doesn't document `tabBar`. Build a spike first.
- **Shared routes and SDK 57** (INFERRED): the docs page is current but unversioned. Its native-tabs page mentions SDK 58 paths, so the router docs may run ahead of 57.
- **SY3 progress impossibility** (INFERRED): based on reading `drizzle-orm/expo-sqlite/migrator.js` and the sync dialect; not run with a slow migration.
- **Rule 3 (single-call service wrappers)** (UNKNOWN): not audited file by file.
- **Visual-check and e2e** were **not run** for this assessment (they need the web dev server and Maestro). Baseline invalidation counts are by reasoning.
- **Component mapping V3-xx → existing files** (INFERRED): by name, doc comment and spec "Was" column, not by tracing every usage.
- **Inline-string count** is a heuristic: JSX text plus a fixed set of copy props and toast fields. Treat ~252 as an order of magnitude.

**Method notes:**
- Benchmark: a throwaway Jest file in the session scratchpad. It imported the real services with `jest --rootDir=<repo> --roots=<scratchpad>`; no repo files were added. Seeded RNG; 80 % daily logging; per-week habits at 80 % and 50 % daily logging (two runs).
- Metrics: a TypeScript-compiler-API scan of `src/`.
- Coverage: `jest --coverage` written to the scratchpad.
- Dead code: `npx knip`.
