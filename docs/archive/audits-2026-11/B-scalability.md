# B — Scalability and V4 readiness (audit 2026-11)

Read-only audit of schema, indexes, queries, live-query fan-out, list rendering, startup, bundle, new-module path, and sync readiness. Perf numbers are estimates from code complexity (no Hermes run; the existing `year-map.perf.test.ts` is Node-only and its budgets are 300-2500 ms for 20 habits x 5 years, ~29k entries).
Counts: High 3, Med 5, Low 4 (12 findings). Biggest risk: the data model cannot sync as is (integer ids, hard deletes, no per-row timestamps). Biggest runtime risk: every Today/Habits/Detail render re-derives streaks from the whole log.

## Findings

### B-01 — Integer autoincrement ids on every table block multi-device merge
- Severity: High
- Effort: L
- Evidence: src/lib/db/schema.ts:22 (categories), :43 (habits), :111 (entries), :136 (frozen_days), :158 (entry_notes), :180 (reminders): all `integer("id").primaryKey({ autoIncrement: true })`; child tables reference parents by integer FK (schema.ts:113-115 etc.). Built-in categories are seeded by migration with autoincrement ids (schema.ts:20-24 comment: "built-ins first ... for free").
- Why it matters: two devices (or a restore plus a new install) both create habit id 7 / entry id 100 for different things. A merge cannot match rows, and the export JSON (`domain/export-json.ts`) also leaks local ids as identity. Order-by-id is also relied on for category order.
- Fix: add a `uuid` text column (UUIDv7 or ULID) to every table, backfill in a migration, make the uuid the sync identity and keep integer ids local; give built-in categories fixed well-known uuids; reference parents by uuid in the sync/export layer.
- Needs: migration approval, design decision

### B-02 — Deletes are physical: no tombstones, so a delete cannot propagate
- Severity: High
- Effort: M
- Evidence: src/modules/habits/repositories/entry-repository.ts:121-123 (un-check = `db.delete(entries)`), :136-138 (quantity <= 0 deletes); src/modules/habits/repositories/habit-repository.ts:336-341 (`deleteHabitAndHistory` deletes five tables); `frozen_days` release at entry-repository.ts:82-87. Only `habits.archivedAt` (schema.ts:79) is a soft state.
- Why it matters: with a second replica an un-check looks identical to "never synced"; the other device re-creates the entry. The app's core signal ("presence of a row is the completion", schema.ts:98-101) makes this worse: deleting is a normal action, not an exception.
- Fix: add `deletedAt` (or an operation log) to entries, frozen_days, entry_notes, reminders, categories, habits; reads filter `deletedAt is null`; a periodic purge removes old tombstones. Alternative: keep rows hard-deleted locally but append to a `change_log` table (entity uuid, op, ts).
- Needs: migration approval, design decision

### B-03 — Most tables have no `updatedAt`; no conflict rule exists
- Severity: High
- Effort: M
- Evidence: src/lib/db/schema.ts: `updatedAt` exists only on habits (:96) and entry_notes (:167). entries (:107-123) has only `createdAt`, yet `writeQuantity` upserts `value` in place (entry-repository.ts:141-146) with no timestamp change; categories (:39 createdAt only, renames/reorders edit it), reminders (:197), frozen_days (:145), app_settings (:13-16) none.
- Why it matters: last-write-wins needs a per-row clock; today an edited quantity, renamed category, toggled reminder or reordered `sortOrder` leaves no trace of when. `sortOrder` (schema.ts:34, :86) is permuted among rows (habit-repository.ts:280-290), i.e. a multi-row write that conflicts badly under LWW.
- Fix: add `updatedAt` (ms precision, see B-05) to every mutable table and set it in every repository write; decide per entity: entries/frozen_days = set-union with tombstones, habits/categories = field-level or row LWW, sortOrder = fractional index or re-derive.
- Needs: migration approval, design decision

### B-04 — Today re-derives all streaks from the full log on every render, un-memoised
- Severity: Med
- Effort: M
- Evidence: src/modules/habits/hooks/use-today-queries.ts:76-77 (`useAllEntries()` + `useFrozenDays()`), :118-124 regroups every entry by habit on each call, :135-140 `getStreakAtRisk` per due habit, :155-172 `calculateCurrentStreak` per due habit (plus a second per frozen-yesterday habit); no `useMemo` in the file (grep: none). Compare use-habits-queries.ts which memoises. `completionsOf` in src/modules/habits/domain/streaks.ts:55-62 filters + `fromDayKey`s every entry of the habit per call; `streakFrom` walks day by day with `toDayKey` (date-fns `format`) at :84-95.
- Why it matters: estimate for 20 habits x 5 years: ~29k entries regrouped, ~1.5k entries parsed per habit x 2-3 passes = ~60-90k `fromDayKey` plus up to ~1.8k-step walks per habit with `format` calls: tens of ms on Node, plausibly 100-400 ms on Hermes (unmeasured), on every tick, every re-render (e.g. selected-day change) and every write that touches entries/frozen_days. Backlog only lists Week's streak tile (see backlog: "Week's streak tile reads the whole log") and ADR 001 accepts "the cost is in what callers compute"; new evidence is the un-memoised Today path and the per-render regroup. React Compiler may memoise it (backlog line 77: compiler memoisation of new hooks "not verified").
- Fix: wrap the grouping and streak maps in `useMemo` keyed on [habits, allEntries, frozenDays, today, selectedKey]; longer term compute streak in SQL / cache `(habitId, lastEntryDate)` as the backlog suggests; bound the streak query (entries since last gap).
- Needs: none

### B-05 — Timestamps are second-precision UTC epochs; day keys are device-local with no zone recorded
- Severity: Med
- Effort: M
- Evidence: schema.ts uses `integer(..., { mode: "timestamp" })` throughout (e.g. :95-96, :117, :124) which Drizzle stores as seconds; `toDayKey` formats in local time (src/utils/day-key.ts:12-14); streak floor uses `toDayKey(habit.createdAt)` (domain/streaks.ts:78-80); `pausedRanges`, `entries.date`, `frozen_days.date` are plain local strings (schema.ts:92, :113-ish); `hour/minute` of reminders "local time" (schema.ts:~188).
- Why it matters: entry dates are timezone-safe within one device ("a timezone can't shift which day a completion lands on") but a sync merge across zones, or after travel, has no record of the zone a key was written in; `createdAt` seconds can collide as LWW tie-breakers (two quick toggles), and the habit floor shifts if the same instant is rendered in another zone.
- Fix: decision doc: keep day keys as zone-less calendar days (recommended, matches ADR), store `tzOffset`/IANA zone on habits and entries at write time for audit, move conflict clocks to ms (or a hybrid logical clock), keep `createdAt` only for display.
- Needs: design decision, migration approval

### B-06 — Parent/child integrity depends on app code with foreign keys off
- Severity: Med
- Effort: M
- Evidence: schema.ts `.references(...)` at :52, :113 etc. exist but ADR 002 keeps FKs off on device; `deleteHabitAndHistory` manually deletes children (habit-repository.ts:336-341). See backlog: "Orphan risks with foreign keys off (A7-04 ...)" - already tracked.
- Why it matters (new angle only): a sync apply step will insert children before parents or after a remote delete; with FKs off, orphans are silent. Tracked in backlog for local use, but sync makes (2) "a write for a habit deleted meanwhile" a routine case, not a race.
- Fix: before sync, add a dev/startup `foreign_key_check` (backlog suggests it), and make the sync applier order inserts parent-first and drop child rows whose parent tombstone is newer.
- Needs: design decision

### B-07 — Several live queries share one table and refire together after every write
- Severity: Med
- Effort: M
- Evidence: src/modules/habits/hooks/use-today-queries.ts:75-77 (a week range, all entries, all frozen days on one screen); use-progress-week-queries.ts:45-48 (range + all, twice); use-habit-detail-queries.ts:64-66 and use-retro-log-queries.ts:36-38 (all entries, notes, frozen); src/modules/habits/repositories/entry-repository.ts:28-42, :77-82 (each hook is its own `useLiveRows` subscription, new array each refire). ADR 001 admits "duplicate subscriptions per screen cost CPU after every write (A9-04)".
- Why it matters: an expo-router tab navigator keeps visited tabs mounted, so after visiting Today, Habits and Progress a single tick re-runs ~6-10 SQL queries, two of them unbounded (~29k rows mapped via `data.map(rowToEntry)`, entry-repository.ts:41, :81) and then every derived structure. I did not verify tab laziness/unmount behaviour in code (src/app/(tabs)/_layout.tsx not read in depth), so the multiplier is an estimate.
- Fix: one shared `useAllEntries` store (zustand or a single subscription provider) with per-habit selector; aggregate in SQL (`group by habit_id`, `max(date)`, counts); pass `freezeOnBlur`/unmount inactive tabs if Progress is heavy.
- Needs: none

### B-08 — Year/Progress maths are fine in Node but the Hermes cost is unmeasured
- Severity: Med
- Effort: S
- Evidence: src/modules/habits/domain/year-map.perf.test.ts:1-10, :122-203 (budgets 300-2500 ms; "Set PERF_REPORT=1"); backlog line 77 "Hermes timings (Node numbers only)" and line 183 (perf tests flaky under load) - tracked. use-progress-year-queries.ts:37-38 reads only one year plus the prior year, then `classifyRangeDays` once and shares it (lines ~58-70): that design is sound, ~2 x 7k rows for the heavy habits.
- Why it matters: budgets of up to 2.5 s for stress cases are the only guard; Hermes is typically several times slower than V8 on date-fns-heavy loops. No evidence of a device number exists.
- Fix: run the perf suite with PERF_REPORT=1 on a release build via the device-validation flow once and record numbers in the backlog; keep the year-bounded design.
- Needs: phone test

### B-09 — `useLiveRows` serialises deps on every render
- Severity: Low
- Effort: S
- Evidence: src/lib/db/use-live-rows.ts:38 `JSON.stringify(deps)` on every call and :36 builds a new `[...deps]` array; each repository builds a new Drizzle query object on each render (entry-repository.ts:29-37).
- Why it matters: negligible per call (deps are 0-2 strings) but there are ~10-15 `useLiveRows` calls per screen; allocation of query builders per render adds up on low-end devices. Not a correctness issue.
- Fix: only compute `key` when `resetOnDepsChange` is true; memoise the query builder with the same deps.
- Needs: none

### B-10 — Habit detail slices the whole log per open, plus notes for all habits
- Severity: Low
- Effort: S
- Evidence: src/modules/habits/hooks/use-habit-detail-queries.ts:64-66, :75 (`allEntries.filter(...)`), :77-79 (frozen filter), :100-103 (`notes.filter`), `useEntryNotes` is unbounded and un-memoised (entry-repository.ts:194-199: `data.map(rowToEntryNote)` runs every render). The History list itself is capped at ten rows (detail-history.tsx comment), so rendering is cheap.
- Why it matters: one habit's detail loads ~29k entries to show ~1.5k; a minor cost, noted for the same reason as B-04.
- Fix: per-habit queries (`where habit_id = ?`, served by the unique index `entries_habit_date_unique`), and `useMemo` on `useEntryNotes`.
- Needs: none

### B-11 — No FlatList anywhere; lists are ScrollView + map
- Severity: Low
- Effort: M
- Evidence: grep for FlatList/SectionList/FlashList in src returns no matches; src/modules/habits/screens/today-screen.tsx:204 and habits-screen.tsx:168 use `Animated.ScrollView`; progress-month-screen.tsx:61 `ScrollView`.
- Why it matters: with 20-100 habits and grouped sections this is fine and keeps drag-to-reorder simple. It becomes a problem only if a screen lists log rows (a future "all logs" view, import preview, sync conflict list). Not a problem today.
- Fix: no change now; use `FlashList`/`FlatList` for any new list that scales with entries, not habits.
- Needs: none

### B-12 — No "how to add a module" doc or template; module isolation is enforced but undocumented as a recipe
- Severity: Low
- Effort: S
- Evidence: ARCHITECTURE.md:114 ("A concept a second module would need is promoted deliberately into lib/ or components/ui/"); src/modules/habits/README.md describes layers only; scripts/check-architecture.mjs:105, :146, :194, :250 generalise over `src/modules/<name>/`, but :404-414 hard-code habits paths for the starter profile; routes are wired through one shared route group `src/app/(tabs)/(today,progress,habits)/` and `src/app/_layout.tsx` imports habits hooks directly (lines 15-20, 59-60); `lib/` still carries habit-shaped bits (`dev-clock`, `today`).
- Why it matters: the layers are strong and enforced, but adding module 2 means editing the root layout (startup actions, theme gate), the tab group and a `.web.ts` twin for every repository, with no checklist. DB schema is a single `src/lib/db/schema.ts` so module 2 tables land in the shared file and shared migration chain.
- Fix: add `docs/how-to/new-module.md` (folder skeleton, repository + .web twin, startup registration, route files, architecture allowlist entries, schema section per module); consider a `modules/index` registry for startup actions and tabs.
- Needs: design decision

## Sync readiness

What exists: a clean repository seam (ADR 001: swapping the data layer touches `repositories/` only), day keys that are zone-less calendar days, a JSON export with `version`/`schema`, `habits.updatedAt`, `archivedAt` soft state, a one-transaction migration runner. What is missing:

| Need | Today | Change |
|---|---|---|
| Stable ids | integer autoincrement on all 6 tables (B-01) | uuid column per table, backfill migration, built-ins with fixed uuids, export by uuid |
| Per-row clock | `updatedAt` only on habits and entry_notes (B-03) | `updatedAt` (ms) on all mutable tables, set in every repo write |
| Deletes | hard delete everywhere (B-02) | `deletedAt` tombstones or `change_log` table; purge job |
| Conflict rules | none written | per-entity: entries/frozen days = union + tombstone; habits/categories/reminders = row LWW by updatedAt; sortOrder = fractional index; app_settings per-device vs synced split |
| Time zones | seconds-precision epochs, local day keys, no zone stored (B-05) | keep day keys zone-less, store zone/offset at write, ms or hybrid clock |
| Integrity | FKs off (ADR 002), orphan risks in backlog (B-06) | parent-first apply, foreign_key_check, tombstone-aware child cleanup |
| Scoping | no `userId`/account; `app_settings` is a flat key-value (schema.ts:13) | add `account_id` or keep local db per account; classify settings keys as device vs account |
| Quantity entries | `entries.value` is an overwritten integer (entry-repository.ts:141) | LWW per (habit, date) with updatedAt is enough; no counters/CRDT needed |
| Dedupe | unique (habit_id, date) already on entries/frozen_days/entry_notes | keep as the natural key for merge; a uuid is still needed for tombstones |
| Backup/restore | JSON export exists, import missing (HAB-15, in backlog) | import by uuid is the first sync-shaped feature; do uuids before building it |

Recommended order: (1) one migration adding uuid + updatedAt + deletedAt to all tables (needs migration-reviewer, FK-ON test, defer_foreign_keys rebuild), (2) route all writes through repositories that set them, (3) JSON export/import v2 keyed by uuid, (4) only then the transport. Do it before JSON import ships, otherwise the import format needs a second version.

## Other checks, no finding

- Indexes: entries `unique(habit_id,date)` + `entries_date_idx`, frozen_days same pair (schema.ts:123-127, :147-150), reminders `reminders_habit_idx` cover the range queries and per-habit lookups. `habits` has no index on `category_id` or `archived_at` but holds tens of rows; `entry_notes` has only the unique composite (fine for per-habit, a full scan for date ranges, only read whole today).
- N+1: none found in repositories; `toHabit` loads the category set per single-habit read (habit-repository.ts:101-114), a small single-habit path. Reads use two live subscriptions (habits + categories) joined in memory by design (comment at habit-repository.ts:119-124).
- Startup path before first paint: open DB (sync) -> `planMigrations` -> optional update screen -> `useMigrations` -> ThemeGate loads one app_settings row, then the splash hides. Reminder reconcile runs after, in an effect (`use-startup-actions.ts`), not on the critical path. `useDrizzleStudio` is called with null in release (`database-provider.tsx:~97`). Nothing heavy blocks first paint except a migration run (12 migrations, small tables). OK.
- Bundle: 27 runtime dependencies. `expo-drizzle-studio-plugin` is a runtime dependency used only in `__DEV__` (the import at the top of database-provider.tsx stays in the bundle; low cost), `react-native-web`/`react-dom` are needed only for the web fixture build, `expo-clipboard` is tracked. No chart library, no moment/lodash; `date-fns` v4 is imported by name (tree-shakeable). Rough estimate: app JS is modest (Hermes bytecode, likely 2-4 MB); not measured, no export build run.
- React Compiler: enabled (`app.json` experiments.reactCompiler true); zero `"use no memo"` opt-outs. Hooks still use explicit `useMemo` in several places (progress, habits).

## Not checked

- No Hermes/device timing, no real bundle size (no `expo export`), no run of the perf tests (read-only rules; the Node budgets are in the test files).
- Tab lazy/unmount behaviour of the custom pill tab bar (ADR 006) only skimmed, so the B-07 multiplier is an estimate.
- Web twins (`*.web.ts`) not audited for scalability (in-memory fixtures).

## Strengths

- Repository seam is real: Drizzle appears only in `repositories/`, every file has a web twin, so a sync or remote data layer swaps behind stable hooks (ADR 001).
- Day keys as zone-less "yyyy-MM-dd" strings plus unique (habit, date) constraints give a natural merge key and make timezone bugs rare; `fromDayKey` avoids slow `parseISO` in hot loops.
- Year/range maths classify each day once and share it between heat map and summary, read only the requested year, and have an explicit 20-habit x 5-year perf test with a completion-index to avoid quadratic per-week scans.
- Startup is lean: single atomic migration transaction, update screen painted before migration, reminder reconcile off the critical path, dev-only code kept out of release by `__DEV__` require.
- Layer rules are enforced by `check-architecture`, so a second module can be added without cross-imports; the architecture checks already generalise over `src/modules/<name>/`.
