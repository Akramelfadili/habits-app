# Backlog

Deferred work and deviations from the specs, recorded while building so they aren't lost. Append new entries under the ticket; never silently drop a deviation. Code markers use `TODO(backlog)`.

Status key: **Open** = something to decide or build · **Decided** = a deliberate deviation, recorded for the reviewers · **Done** = kept only for history.

## Open — product decisions and unbuilt spec rules

- **Edit habit has Archive but no Delete** (HAB-23). Mockup E7 is labelled "from Edit habit · delete", but the only way to delete is "Delete habit" on Habit Detail. Archive was added at the foot of Edit habit (audit B9; HAB-17's rule) and deliberately only Archive — Delete stays one step further away. Decide whether Edit habit should also get a Delete entry.
- ~~**Category order on Manage and Today** (HAB-19).~~ Done in V3-0b: both group by the stored `categories.sort_order` (migration 0011), so they still agree. The reorder UI is HAB-42.
- **Manage keeps the pushed back button and the "Habits" title, with no "Done"** (HAB-19, mockups D3/E2/E3 show a modal-style "Done"). Revisit if Manage becomes a modal or a tab destination.
- **C1 omits the Last week / This week switch** (HAB-16). The Weekly mockup shows only the Week / Month / Year switcher; the V1 compact switch is kept because HAB-16's rule is that the range switcher is the only change to Weekly. Decide whether C1 means it to go.
- **Yearly shows only the current year.** No way to look at last year; January opens on a nearly empty "<year> so far". Consider defaulting to the last full year for the first weeks of January (Monthly no longer opens on the last complete month: D15, V3-3a). The new `useProgressYearQueries({ year })` already takes a year; the old Yearly screen does not.
- **Dev buttons on Today** (`today-screen.tsx`). The ghost "Add habit" link is gone (audit B9: a header `+` replaces it; the empty state keeps its primary button). The dev buttons are gated on `__DEV__`; they need a "Developer" label, and the seed code should move out of production hooks (audit A1-06).

## Open — UX and accessibility follow-ups (audit B8/B9)

- **Left out of B8/B9** (reasons in `docs/audits/audit.md` §21): A5-14 discard prompt (product call), A5-21 placeholder tabs (product call), A5-10 Back-label derivation (touches the stack layout), A6-04 Today row double stop and at-risk in the label, A6-07 time wheel label, A6-08 decorative icons, A6-11 heatmap-cell focus, A6-14 reorder handle actions, A6-15 sheet scrim/focus management. Un-doable without a device pass: A6-12's Dynamic Type sizes beyond the scroll fallbacks added.
- **Undo is not offered for** reordering in Manage (the drag is its own reverse), the Retro-log Save (a deliberate sheet; reopen to change) and Delete habit / category (confirm-only by spec, HAB-13/25).
- **Touch-target exceptions** (reviewer-flagged): the Checkbox's 44 pt box uses a −10 margin that reaches into its host row's padding (device-check on Android, where a child outside its parent's bounds may not receive touches); Stepper −/+ (6), compact/small Buttons (8), the reorder handle keep a hitSlop; none were adjacent-target regressions introduced here, but they are not yet 44 pt by footprint.
- **`?addTime=<day>` adds the reminder on arrival** (with the OS permission prompt, like "Add a time"); dismissing the time picker leaves the default-time reminder, which can be removed with Undo. If the day isn't one the habit can fall on, the new reminder falls back to every schedulable day (untested edge).
- **Archive on Edit habit discards unsaved form edits** without a prompt (A5-14, deferred). `restoreReminder` stamps a new `createdAt` (id, time, days and on/off are preserved).
- **The partial quantity pie** on Today (a habit logged below target) keeps its `border`-toned track; only unchecked outlines moved to the 3:1 `outline` token. Revisit with the next Today visual pass.
- **Date style:** full months (`d MMMM`) in sentences and headings, short months (`d MMM`) in subtitles and compact ranges; ranges always use a spaced en dash (`formatDateRange`). Weekday runs stay unspaced ("Mon–Fri"). Reminder times stay 24-hour while the native time wheel follows the device (device check).
- **Spelling is British** ("colour", "summarise"); the `Color` words in code identifiers are untouched.

## Open — reliability follow-ups (audit B6)

- **Logs are in memory only** (A3-10). Owner decision: no log file. A crash or force-quit loses the buffer, so "Copy diagnostics" only helps for the current session. If it proves too thin: a capped file (about 200 KB, one rotation) via `expo-file-system`'s `File.write(…, { append: true })`.
- **`expo-clipboard` is not installed yet.** "Copy diagnostics" falls back to sharing a `diagnostics.txt` file until it is: `npx expo install expo-clipboard`, then rebuild the dev client (native module).
- **No `habits.db.bak` before migrating** (A7-08). The migrator is one atomic transaction, so a failed run leaves the old schema; Retry mainly helps with transient errors. A backup would only matter for a migration that succeeds with wrong data.
- **No floating-promise lint** (A3-12): Biome needs type-aware linting for it. `DestructiveConfirmSheet` now logs a rejecting handler and shows the generic error toast, but callers should still go through `run()`.
- **A database that cannot be opened at all still crashes before any UI.** `lib/db/client.ts` opens it at import; the failure is now logged, then rethrown. A lazy client would let the error screen show for that case too.
- **A reminder that saved but failed to schedule is only logged.** `syncAfterWrite` keeps the add/edit successful (the row changed); the next launch's reconcile reschedules it. Consider a quiet "Reminders may not fire — open Reminders" notice.
- **Orphan risks with foreign keys off** (A7-04; decision: keep them off, see `migrations.safety.test.ts` and `habit-repository.integrity.test.ts`). `deleteHabitAndHistory` and `deleteCategory` are covered and leave none. Still open: (1) dev-only `deleteAllHabits` leaves entries/notes/freezes/reminders behind; (2) a write for a habit that was deleted meanwhile (a stale Undo, a retro-log sheet left open) inserts a child row with no parent; (3) `deleteCategory` reads "Other" and moves habits across awaits (A7-03), so a `createHabit` landing in between can leave a habit on the deleted category (`resolveHabitCategory` falls back to Other when reading); (4) a stale `categoryId` in `createHabit`. A dev-build startup `PRAGMA foreign_key_check` would surface them.
- **Reconcile only runs when permission is already granted at launch.** Granting it later in iOS Settings leaves drift until the next launch.
- **Two overlapping `syncHabitReminders` for one habit can interleave** (rapid reminder edits): each treats the other's new set as "old". The last write wins in the database and the next launch reconciles, but serialising per habit would be cleaner.
- **A second visible `Sheet` would mount a second top `ToastHost`** (two toasts); unlikely today, fix by rendering it only in the top-most sheet.
- **Release promise-rejection tracking is untested on a device.** React Native only enables Hermes' tracker in development; `installGlobalHandlers` enables it in release with `HermesInternal.enablePromiseRejectionTracker`, which could not be run here.
- **Still in B9:** Undo for Manage restore / freeze / reminder remove (A5-06), toast wording drift (A5-07), `numberOfLines` on toasts (A5-08), the New/Edit habit "Loading…" text for a deleted habit's edit link.

## Open — polish and small gaps

- **No legend entry for the bonus dot on Detail** (HAB-18). NEW-16's bonus state is a blank cell with an accent dot; the legend doesn't explain it. Add one with the next Detail polish.
- **Retro log lists a rest-day bonus entry for another habit as a normal row** (it lists habits "due that day or with a log"); it is not labelled "bonus".
- **D4's origin card is simpler than the mockup** (HAB-18): one row, no "Glasses · Target 8" sub-row, so the origin habit's target isn't shown.
- **Picker rows have no per-row frequency progress** (HAB-18): the subtitle is the weekday list or range plus the target; the mockup's "5× per week · 4 done" isn't shown.
- **Detail Reminders/Edit rows differ from D5/D6/E1** (HAB-20): the built Detail keeps HAB-12's single Reminders row (summary as subtitle, no icon) and Edit in the header, not two icon rows in one card.
- **Paused / reset cell treatments are interpretations** (HAB-20): NEW-16 · paused is dotted and empty; NEW-16 · streak reset is the missed track with an ink outline. E1's outlined restore-day cell isn't drawn.
- **"BEFORE ARCHIVE" label** is too wide for a third-width tile at 10px; `StatCard` labels shrink to fit (`adjustsFontSizeToFit`). Web truncates instead — check on device.
- **Detail heatmap is left-aligned inside its card** (matches the mockup's fixed 18px grid). Optional: centre or fill the width.
- **Inline category rename has no mockup** (HAB-25); the built state is a proposal — replace it if a mockup is drawn.
- **Settings → Categories row has no mockup** (HAB-15/24/25); a plain navigable row, proposal.
- **Legacy remaining-characters counter**: `COUNTER_THRESHOLD = 40` in `text-field.tsx` still drives the counter for non-name fields, so the 20-character unit field shows a counter from the first keystroke.
- **Wording**: "Best day: All · every day full" (`weekly-summary-helpers.ts`); Manage shows "N logs kept" where the UX audit asked for "days logged".

## Open — tidy-ups

- **`toggleEveningReview` lives in `use-reminder-actions.ts`** though Settings is its only home (`useSettingsActions` composes it). Move it next to Settings' hook. `setEveningReview` in `reminder-service.ts` and the evening-review notification are untouched.
- **The Today menu computes the full monthly summary only for the subline.** Consider a lighter selector (Yearly's row already uses one).
- **`PATTERN_CAUSE_SHARE = 0.25` is weaker than the spec's "explains most of the pattern".** Kept to match C3's "a third" copy; revisit with real data.
- **Frozen days on the Monthly calendar hide that day's completions** (a freeze marks the whole day). Revisit after real use.
- **Legacy `habits.icon/color/category` columns** are nullable and unused until a cleanup migration (HAB-24).
- **`no-freezes` fixture** draws a mostly grey grid; it is tuned for HAB-08's sheet, not Detail's layout.

## Open — V3 foundations (V3-0b)

- **V3 tokens are defined but unused** (HAB-28). `textStyles`, `space`, `radius` (+ `cellRadius`/`squareRadius`), `elevation`, `focusRing`, `minTouchTarget`, `motion`, `accent` and `pillBg` live in `src/theme/theme.ts`; no screen uses them yet. Each V3 batch moves the screens it rebuilds onto them, and deletes the retired `typeScale` sizes it no longer needs.
- **Light `toastBtn` is 0.14 alpha; the master file says 0.16** (F-01). Not changed in V3-0b because it would move every toast baseline; fix with the V3-26 toast.
- **Not yet tokenised** (HAB-28, land with the components that need them): the accent-tint intensity ramp (T-05, replaces `heatmapLevelColor`/`inkLevelColor`), the density pass (T-18), the gear icon (T-19), and the pill's Reduce Transparency / Increase Contrast modes (V3-01, HAB-49).

- **Category order: picker and Manage Categories still list by creation** (HAB-42). Only Today and Manage habits group by the stored `sort_order`; decide with the reorder UI whether the picker and C1 follow it too. Other is forced last in groups even though a new custom is stored after it (max + 1); the reorder UI decides whether Other can move.
- **Today's group order is now the stored order, not first appearance among the day's due habits** (HAB-42). Identical whenever each category's first active habit is due; otherwise a group can sit higher than it used to.

- **Spacing and radius literals move to tokens per batch, not in one sweep** (HAB-28, ADR 004). Baselines at V3-0b: `spacing-literals` 274, `radius-literals` 55, `off-scale-font-sizes` 56. Each V3 batch moves the screens it rebuilds onto `space` / `radius` / `textStyles`, then runs `npm run ratchet:update`. V3-6 checks what is left.
- **`domain/export-json.ts` imports `lib/diagnostics/app-info`** to stamp the build number into the file: the one accepted exception to "`domain/` is pure" (static facts, no I/O; `architecture.md` layer 4). Revisit if `domain/` gets a lint rule: pass the build in from the export service instead.
- **27 `"yyyy-MM-dd"` format literals remain outside `utils/day-key.ts`** (V3-0a added `DAY_KEY_FORMAT` / `toDayKey`). Production: `domain/export-csv.ts`, `export-json.ts`, `off-schedule.ts`, `yearly-summary.ts` (2), `strategies/frequency-strategy.ts`, `hooks/use-retro-log-queries.ts`, `screens/habit-detail-screen.tsx`; the rest are web twins and `dev/` fixtures (`entry-repository.web.ts` 5, `entry-fixtures.ts` and friends). Move each to `toDayKey` when its file is touched; a later `check-architecture` rule can then forbid the literal.

## Open — V3-3a (Progress data layer)

- **Interpretations to confirm** (the mockup is ambiguous; `docs/progress-data.md` lists them): "7 days of logs" = 7 distinct logged calendar days over all history; Week's *best streak* is the highest current streak among active habits while Month and Year show the longest run inside the range; row totals "n/target" count the habit's due days in the whole week, future included; *slipping* is "≥ 25 points down on the previous range with enough due days" for Week and Year and Monthly's weekly trend for Month; *improved* is "≥ 10 points up".
- **Old summary code kept (V3-3b retired the screens, not the builders)** — still the oracle of `range-summary.parity.test.ts` and imported for shared constants by `range-summary.ts`, `progress-grid.ts` and `year-map.ts`; delete the dead builders with the parity tests once V3-3b is accepted: `buildWeeklySummary`'s count-based `bestDay` and `too-early` insight, `buildCalendar` in `buildMonthlySummary`, Monthly's weekday `pattern` insight (PR-03 is Later and the new ranker never surfaces it), `yearUnlock` (3 months; still decides "year-scale insights need 3 months"), `yearlyInsightsFor`'s stuck / never-stuck / seasonal cards. Monthly's `perfectDays` stopped counting frozen days as perfect in V3-3a (D14; listed in `docs/progress-data.md`); it still counts an open today with some habits done as perfect; the new day grid does not (a day with a habit still open is not a verdict).
- **Week's streak tile reads the whole log** (`useAllEntries` + `useFrozenDays`) because the streak reaches back past the week. Everything else is range-bounded. If it shows up in a profile: cache by `(habitId, lastEntryDate)`.
- **Insight tone `positive`** is the spec's word; `InsightCard`'s prop is `success`. `presenters/progress-presenter.ts` maps one to the other.
- The Progress tab reads the new hooks (V3-3b). The week hook takes an `anchor` date, but there is no week pager in the spec, so nothing passes one.
- **`fastDayKey`** in `domain/day-status.ts` repeats `toDayKey`'s format without date-fns' formatter (formatting dominated a five-year grid); a test pins the equivalence. Fold it into `utils/day-key.ts` if `toDayKey` is ever allowed to stop throwing on an invalid date.
- **Frozen-and-partial day**: a quantity day logged below target on a frozen date reads `frozen` (excused), as Monthly always did; Detail's heatmap shows the log. A *completed* frozen day reads `done` and PR-11 returns the freeze.
- **Not verified on a device or in the browser**: Hermes timings (Node numbers only), the visual-check fixtures for `monthly-too-early` / `weekly-summary*` (the gate numbers they show changed), and React Compiler memoisation of the new hooks (explicit `useMemo` is used).

## Open — V3-2b (Today UI)

- **Fill transitions are not animated**: the circle's 200 ms state fill and the pie sweep (V3-04, F-07) change instantly; the progress bar's 450 ms fill, the strip's day switch and the all-done check are animated. Press is a 92 % scale (opacity with Reduce Motion), without the 100 ms ease.
- **Edit this day: entry points.** Only Habit Detail's heatmap opens it. Progress (Week day header, Month detail card) comes with V3-3; the "whole week row is one 44 pt target" on Detail with the Detail batch. The Note field is not in RL1/RL2 and is kept only when the sheet is opened from a habit.
- **Quantity sheet maximum:** 9999 (the existing cap), the mockup's helper says 99. Decide whether 99 is intended.
- **Header buttons on web:** the `+` is drawn from two bars, not an SF Symbol, so it shows on web (the blank circles in older baselines). The gear on Habits still uses a symbol (V3-4).
- **Picker, Detail and other screens** still use their pre-V3 spacing/type where not listed in this batch; the ratchet counts fell (spacing 251 → 209, radius 53 → 38, font-size literals 23 → 17, off-scale sizes 56 → 48) and keep falling per batch.
- **SR2** is not drawn in the V3 render text I could read; SR1 and SR3 are built. TC1–TC2 (toast catalogue) are covered by the toasts on T4, T7 and RL2.

## Open — V3-2a (Today logic)

- **`useSelectedDay` is `useSelectedDayQueries`.** `check-architecture`'s hook-naming rule requires `use<X>Queries|Actions`; the spec's name would have needed an allowlist entry, which may only shrink. It returns the day and its one write (`selectDay`, `showToday`).
- **A freeze is returned only by a log that completes the day.** A quantity amount below the target leaves the freeze (the day is still missed); un-logging a day later does not re-spend it. The returned freeze's Undo restores it with its original `created_at`.
- **Freeze-pool month is the *missed* day's month** (as before, now documented): a freeze used on 1 Oct for 30 Sep counts against September, and logging 30 Sep returns it to September's pool. The Today pool readout uses today's month, so on the 1st it can differ from the grace day's month by design.
- **Settings exposes the pool but does not show it.** `useSettingsQueries().freezePool` (size, used this month) is ready for S4's "used this month" row (HAB-44).
- **Concurrent writes outside `runInTransaction`.** The serialised helper only orders callers that use it; a plain `db` write issued while one of its transactions is open still joins that transaction on the one connection. Same hazard as before (audit A7-03); `habit-repository`'s raw blocks should move onto the helper.
- **Edit this day's "Freeze returned" toast has no Undo** (spec review): the draft-and-Save sheet saves in one go; Today's logging has the exact Undo. HAB-34 moves Edit this day to per-tap saves with Undo.
- **`freezesUsedThisMonth` / `freezePool` have no reader yet** (spec review): pre-wiring for S4's "used this month" (HAB-44); delete if HAB-44 changes shape.
- **A quantity habit with no target** (not creatable today) completes nothing in `saveQuantity`, so its save is silent; `isEntryComplete` already treats it as never complete.
- **`quantity-log` is opened from the count control** in the visual check (a tap on the circle adds one now).

## Decided — deviations the reviewers should not re-flag

### HAB-16 — Monthly
- Slipping body omits C3's second sentence ("The drop started when Easy run moved to evenings") — a cause across habits isn't derivable. Insight thresholds are one named block in `services/monthly-insights.ts`.
- Unlock date is first day + 30 (C6: since 4 Sep → 4 Oct), with "N of 30" counting full days before today.
- Frozen days leave both sides of the rate (an excused miss), so the tile can differ slightly from a "scheduled" count that includes them.
- The Year segment was disabled until HAB-17 (done).

### HAB-17 — Yearly
- C5 shows four cards, the rule is max three: the seasonal dip is lowest-ranked and only shows when fewer than three others fire.
- The month in progress is not judged ("five of six" finished months, not C5's "five of seven").
- Clauses that can't be derived are dropped ("…through two schedule changes", "Travel weeks show up as gaps"). The seasonal card is titled "Summer dip" only when every month is June–August, otherwise "Seasonal dip".
- Unlock progress is "12 of 91 days" / "from 4 December" (real calendar span); C7 shows 90 / 3 December.
- Chart bars are scaled to 100% (96px = every habit done); the mockup scales to the tallest month. Strip cells use the three heatmap levels (under 50%, 50–84%, 85%+).
- Early-year, empty ("Nothing to summarise yet"), "Perfect year so far" and "Nothing stands out" cards have no mockup.
- "Logged" counts completed scheduled days, not off-schedule logs.
- Fixture numbers differ from C4's tiles (948 / 80% vs 1,612 / 81%): the fixture is tuned to C5's insights.
- Insights come from active habits only; tiles, chart and strips keep archived history, so "Best: <month>" can differ from the best-month card.

### HAB-18 — Logging
- Retro log keeps "Cancel" where D4 says "Close": the sheet holds an unsaved draft (UX audit #10).
- The picker is a sheet over the rest day, not a separate screen; quantity rows show "Amount" with an SF Symbol chevron (blank on web).
- D2's time is the entry's `createdAt`; no column was added, and it doesn't move when a quantity is re-logged.
- `OffScheduleRow` opens Habit Detail on tap; its trailing check is not a toggle. Removing a bonus log is the toast's Undo, or Detail / retro log.

### HAB-19 — Manage
- Archived-row subtitle reads "Archived 2 Sep · 41 days logged" / "· nothing logged" — "days logged" replaced the mockup's "N logs kept" (audit B9, A5-17: one per-habit term).

### HAB-20 — Detail
- D5 "41 of 55 due" reads "N of M days" (UX audit #9 retired "due").
- The reset note only shows for the current month (Detail has no month navigation), per the spec's "only in the month it happened".
- No archived banner existed on Detail before; NEW-13 is new there. Manage's archived rows keep their own Restore.

### HAB-21 — Reminders
- The caption "Up to four times a day for this habit." is always shown; at the cap, the "4 of 4 — remove one…" message replaces it rather than stacking.
- The notifications-off notice sits between the caption and the pointer (V1's position); E4 doesn't draw that state.

### HAB-22 — Name polish
- Habit-name limit is 32 (spec V1 said 40); the counter appears from 26/32. Category names: counter from 16/20.

### HAB-24 / HAB-25 — Categories
- Custom-category slot rule: the spec says the Nth custom category gets the Nth slot; built (`category-rules.ts`) picks the slot with the fewest existing customs, ties to the lowest.
- Entry point to Manage Categories is Settings → Categories; the temporary row on Manage habits was removed.

### HAB-23 — Delete sheet
- `DeleteHabitSheet` is a thin wrapper over `DestructiveConfirmSheet`'s "with archive action" state; the whole archive card is the button.

### HAB-27 — Navigation shell (V3-1)

Deferred, each wanted by HAB-27's own rules or raised while building it:

- **V3-02's collapsing large title: built for Today only (V3-3a, `useCollapsingHeader` + `CollapsedHeaderBar` in `components/ui/composite/collapsing-header.tsx`).** Scroll-linked on the UI thread, settles on the nearer end, Reduce Motion crossfades at the middle of the range. **Progress adopted it in V3-3b; Habits still draws a static title**; adopt the hook with its own batch (V3-4) — `HabitsHeader` has not been merged with `TodayHeader` because it would restyle Habits (display title, eyebrow) ahead of its redesign.
- **One header component.** `today-header.tsx` and `habits-header.tsx` each build their own title row. They should become one V3-02 `Header` (eyebrow, title, ≤ 2 trailing buttons) — fold that into HAB-29 or the first batch that touches both.
- **Re-tapping the selected tab does nothing.** The pill copies the stock contract (`tabPress` then navigate only when not focused). iOS normally pops that tab to its root. Not in the spec; decide in V3-6.
- **A cold deep link with no group lands on the first tab.** `/week` opens the weekly summary inside *Today*, not Progress — shared routes have no tab to restore on a cold start (measured; in-app navigation is unaffected). HAB-27's edge case "deep link / back from Detail restores the originating tab" is therefore only met for in-app pushes. If real deep links are added, give them group-qualified hrefs.
- **Bar A's clearance is 22 pt, not space-600.** Both bars share the one 112 pt bottom padding, so at AX sizes content stops `112 − 56 − inset` above bar A — 22 pt on a notched iPhone against the 24 the mockup draws. Forking the constant was not worth 2 pt; revisit in HAB-49.
- **`AX_FONT_SCALE = 1.5`** is a judgement call: iOS's standard sizes stop at 1.35 (xxxLarge) and AX1 is 1.65, so the threshold sits in the gap. If a device reports something unexpected, this is the knob.
- **`PILL_BLUR_INTENSITY = 50`** approximates the mockup's "20 pt blur": expo-blur's 1–100 `intensity` is not a radius. Needs an eye on a device.
- **`?textSize=ax`** (`src/lib/dev-text-size/`) exists only because react-native-web hardcodes `fontScale: 1`, so the AX layouts can be driven on web at all. Delete it if that ever changes.
- **Maestro cannot tap an active row on Manage** (it is wrapped in `SwipeableRow`; the web driver's single-jump tap never reaches it). `hab-13`'s web branch opens those habits from Today instead. Archived rows are plain and tap fine.
- **Settings pushed from Reminders keeps the tab name as its Back label** (V3-1 spec review): `reminders-screen.tsx` pushes `/settings`, whose Back says "Today"/"Habits", not "Reminders". Relabel from the screen as `reminders/[id]` does, or use a bare chevron.
- **Header circle buttons draw their glyph with `SymbolView`**, which renders nothing on web, so the `+` and gear are blank circles in every baseline. Add a View-drawn fallback or web twin before trusting those corners.
- **ADR numbering:** `docs/assessment-v3.md` sketched this as ADR 005; it is filed as **006** at the owner's request, and 005 is left free.

## Visual-check

- **`today-menu-open`, `today-empty-menu-open`, `today-menu-open-dark` and the menu states on Weekly/Monthly/Yearly were flaky** (a 74 px popover offset). Root cause and fix: see `docs/audits/audit.md` A10-10 and the B3 hardening notes in `docs/dev-tooling.md`. **Deleted in V3-1** with the ⋯ menu itself, along with `waitForMenuSettled`.
- **V3-0b (122 baselines):** the single Habits tab (HAB-26) and the new category colours (Health/Social, plus fixture customs 0011 moves off dropped hues). The web fixtures now model an upgraded device (V2 slots, then 0011's remap), and a test pins them to the SQL. Expo's dev-tools button (bottom left) can appear in a capture on the current Expo; recapture that state if it does, and never accept it into a baseline.
- Baselines re-captured over time: `retro-log` (D4), `delete-confirm*` (E7), `habit-detail-no-freezes` (D6); added `rest-day-picker*`, `rest-day-logged`, `habit-detail-bonus`, `delete-confirm-dark`, `delete-confirm-archived`.
- **V3-1 (114 baselines: 14 new, 100 updated).** The tab bar is on every screen inside the tabs, so almost everything moved; the cause per group is in the baseline commit's message. Two faults were found by the renders themselves (the pill covering First Run's primary button, Today stacking a third bottom gap) and fixed.
- **The V3-1 recapture committed ~33 blank baselines and four stale ones — one root cause (fixed in V3-2a).** The harness pinned the page clock with Playwright's `setFixedTime`, which froze React's own clock, so a lazily loaded route never revealed past its Suspense fallback ("Bundling…"): Month, Year, Manage, Detail, Settings, Categories, Reminders (and their dark and long-name twins) were captured as an empty page with the pill, and `yearly-insights` timed out waiting for text that never rendered. It went unseen because a blank capture equals a blank baseline. The harness now uses `setSystemTime` (pins the date, lets time run); 37 baselines were recaptured, each one blank or pre-V3-1 before. `manage-habits-archived-toast` is separate: react-native-web only, the archived row unmounts with a queued Swipeable update and gesture-handler's web NodeManager throws "No handler for tag N" (native ignores a missing handler) — the state now ignores that one message and dismisses the dev LogBox toast. **When reviewing a recapture, look at the image, not only the diff count.**
- **The harness is flaky on this machine under parallel load** (two pages at a time): Metro answers some async route chunks with a 500, leaving a half-rendered capture, and `locator.click` sometimes exceeds 30 s on a page that is actually fine. Re-running a state on its own gives an identical, clean capture. A blank-render detector (`.visual-checks/blankscan.mjs`, gitignored, compares a capture's dominant-colour share with its baseline's) catches the half-rendered ones — worth keeping in the script if this persists.

## Open — V3-2b follow-ups

- **Week-level freeze for × per week habits (Later).** They are never at risk by day (HAB-33). A week that ends below its target still breaks the streak with no prompt; covering it needs a freeze that spans the week (a Sunday-only freeze that the per-week strategy reads as covering it, or a week-level row) — a streak-semantics change with its own ADR.
- **T2 empty state: the icon square** is `inner`-coloured, the frame draws a white card square with a hairline (V3-6 polish).
- **SR1 pool pips** are solid lavender squares; the frame draws violet (frozen) squares (V3-6 polish).
- **"Resist tonight" uses 18:00** (`EVENING_STARTS_AT_HOUR` in `constants.ts`, its only place). The spec gives no hour; confirm or change it there.

## Open — V3-2b review leftovers

- `useWeekStripQueries` also returns the week-moving callbacks (named `…Queries` for the hook rule); a `useWeekStripState` split would remove the explanation.
- Habit Detail's "Habit not found" / "No entries yet" strings still sit in the screen (pre-V3, moved with Detail's batch).
- `useQuantitySheetActions.close()` closes even if the last write failed (the sheet shows what is really saved and the error toast stays); the quantity sheet unmounts without a slide-out because the parent drops it.

## Open — V3-3b (Progress UI)

Deviations from the mockup / spec and what was left out; each is deliberate unless marked.

- **Rate ring (V3-09): deleted.** No frame draws it — P7 shows the month's rate as a tile — so it was removed rather than kept unused (see `docs/design-system-v3.md`).
- **Delete candidates at the end of V3-4 (sparkline, mini month, year strip): deleted in V3-4a.**
- **Month, one habit (P10): tiles are Completion / Longest / Freezes used**, not the mockup's Streak (current streak is not in the month data; Week's tile reads the whole log, Month's does not). Add `streakHistory` to the month hook for a single habit if the current streak is wanted.
- **Week day headers are 44 pt high but 28 pt wide** (the cell pitch): a 44 pt-wide target would overlap its neighbour. The mockup asks for 44.
- **Month calendar: VoiceOver reads day by day** ("Wednesday 14 October, 100 percent", each a button), not per week row as 08.3 words it: every day is the entry to its detail card.
- **One-habit and AX3 week blocks: the 40 pt day cells are buttons** that open Edit this day (hint "Edit this day"); the spec only gives the matrix's day headers that role, and those blocks have no headers. Days that have not happened offer nothing.
- **The AX3 range list overlays the content** instead of pushing it down (P11): the pinned layer is one element and its slot keeps its closed height.
- **Year, one habit (P15): the chip is always shown** (as "All habits"), though P12 draws none; with exactly one habit and no archived habit there is nothing to pick and it is hidden. The Year filter applies to Year only; Month opened from a filtered Year shows all habits.
- **Year too-early and nothing-logged gates are global** (all-history log counts), so a habit filtered to one with no logs shows a ready year of empty cells.
- **"Best streak" on Week/Year can name an archived habit** (the fixture's archived run shows 223 days on Year); the data layer counts archived habits' history for longest runs. Decide whether Progress should limit it to active habits.
- **The per-habit rates list includes an archived habit that had days in the range** (never in insights, D11).
- **Export is "unavailable" with no habits or no logs** (tap = toast); the mockup draws only the no-habits case disabled.
- **P1 week matrix order follows creation order** (the mockup lists Read second); the fixtures create all six on one day, so ids decide.
- **Performance:** Year (5 y × 20 habits, through the real hooks) opens in ~260–300 ms cold and ~220 ms warm in Node, from 375–460 / 330–350 before the heat map and the summary shared one classification of the days (`classifyRangeDays`). On Hermes expect 2–5×; if it is felt on a device the next step is classifying once for the previous year only when "+N pts" needs it. Week fell 727 → 169 ms earlier by making `fromDayKey` read the three fields instead of `parseISO`.
- **Maestro `hab-11` is rewritten for the new screen but was not run.**

## Open — V3-4a (Habits tab, Habit Detail, delete and archive sheets)

Deviations from the mockup / spec and what was left out; each is deliberate unless marked.

- **Which day a week row opens (HAB-34, D1).** The spec says the whole week row is one 44 pt target that opens Edit this day, but a day sheet needs a day. It opens the latest day of that week that is due and unlogged (missed, reset, or today still open), else the latest day that can be edited; a week before the habit started or still ahead is not a button. Decide whether the sheet should instead let the person pick the day inside it.
- **History has no "See all" (D2).** The frame draws a "See all" link; the spec lists none. History shows the latest ten days that say something (done, partial, missed, frozen, bonus, or a day with a note). A longer list needs its own screen.
- **"+N pts" on the 90-day rate (D1).** The frame draws it; the spec only says "90-day rate". Built as the rate minus the rate over the 90 days before it, only for a habit older than 90 days whose earlier window has at least 7 due days; otherwise the tile says "N of M days" (Break: "resisted"). A rate under 7 due days reads "—, after 7 days" (D3).
- **Stat tile VoiceOver reads "Streak: 9, in a row"**, not 08.3's "Streak, 9 in a row": `StatCard` (V3-10) joins label and value with a colon for every screen. Change it there if the wording matters.
- **Library row subtitles name a streak only for a daily Build habit** (H1 draws "Daily · 13-day streak" and nothing for the per-week, weekday and Break rows). The mockup's data is not consistent with any wider rule.
- **Group order follows the stored category order** (HAB-42), not the frame's: the fixtures' categories happen to match H1, but a person's own order wins.
- **Habits header buttons stay in the collapsed inline bar** (F-07 says the bar carries "name and buttons"; H5's crop draws the bar without them). The gear and + are reachable at any scroll.
- **Restore is `Button variant="compact"`** (V3-22's 36 pt pill on the inset surface). Other small buttons (`size="small"`: Categories' Rename and Delete, the category picker's Add) are still the old outlined pill until V3-4b moves them. Secondary buttons are still hairline-outlined, not the 3:1 outline V3-22 draws (Cancel on DC1, Keep habit); V3-6.
- **"Add “Yoga” as a habit" and other `link` buttons are secondary ink**, V3-22's link is ink; the variant is shared with First Run's "Start from scratch" (V3-4b/V3-6).
- **The Archived row's icon square is the inset neutral, dimmed with the row**, so on a white card it is close to invisible in light mode; the frame draws a visible grey square. Revisit with the V3-6 polish (a `dimmed` that keeps the icon at full opacity).
- **After a delete, Detail pops to wherever it was opened from** (Today, Progress or Habits) with "<Habit> deleted"; DC3 says "pops Detail to Habits" because it is drawn from Habits. Popping to another tab would switch tabs under the person.
- **DC5's body is DC5's** ("…restore it any time from Habits › Archived."), not H8's shorter line.
- **Categories' Back says "Habits" when opened from the Habits tab** (`/categories?from=habits`) and "Settings" otherwise; the Categories screen itself is V3-4b.
- **`EmptyState`'s icon square is `inner`**, as T2 (see V3-2b); H3 and H6 draw a white square with a hairline.
- **The Habits tab with every habit archived** (not drawn) shows "No active habits" with Add habit and the Archived section below.
- **Review nits left (spec-reviewer, V3-4a):** `DetailActions` draws its own minus icon square (extend `IconBadge`); `WeekHistoryCard` repeats `Container`'s card chrome; `useHabitsQueries` does the per-habit streak pass inside the hook (the Detail hook does the same); the archive sheet has no initial focus (the spec asks for it only on Delete); `habitHistoryRows` walks back to creation when fewer than ten days qualify.
- **Maestro `hab-13-manage-archive-delete` still describes the old Manage screen** and was not run (V3-6 rewrites the flows for the three tabs).
- **Scenarios left in the web fixtures:** `manage-archive` still backs Today's long-list state and `manage-all-archived` the all-archived Habits state; `habit-detail`, `habit-detail-new`, `habit-detail-bonus`, `habit-detail-archived` and `no-freezes` are no longer used by a visual-check state (dev seeds still read `habit-detail`). `manage-nothing-archived` was removed.

## Open — V3-4b (Add / Edit habit form, Categories)

Deviations from the mockup / spec and what was left out; each is deliberate unless marked. Steps 4–7 add their own entries below.

- **Frequency has three options — Daily, Specific days, × per week — not the mockup's four.** F1–F10 draw a "Weekdays" chip; HAB-41 lists three and the old "Weekdays shortcut" is gone. Mon–Fri is two taps on the weekday chips. (Spec wins; owner's decision.)
- **No icon / colour row (F2, F6).** The category supplies both; the mockup's "Icon and colour · tap to change" row and the F6 pickers are not built (spec wins).
- **All categories show in the form, not five (F1, F2).** The frames truncate to five chips for brevity; every category is a chip, then "New category". F6 draws the full set.
- **A picked category clears with a second tap**, since the category is optional; no habit is ever saved without one (it goes to Other).
- **The duplicate-name check includes archived habits** (case- and space-insensitive), so a restore never leaves two habits with one name.
- **Reminders are queued on New habit only.** Edit habit has no Reminders section: its reminders are the Reminders screen's (HAB-43, step 4). The queued times are written after the habit; if one fails, the habit stays and a warning toast says so.
- **The "Discard changes?" prompt is drawn in-app (`AlertDialog`), not the system alert**, so web and the Maestro flows see it too. It follows the frame: Keep editing bold first, Discard in danger red, a scrim tap does nothing.
- **The header button says "Close"** (was "Cancel") on both modals, as the frames do.
- **Suggestion prefill arrives as the `prefill` route param** (a JSON string, `parseHabitPrefill`) or the `prefill` prop; Browse suggestions (V3-5) pushes `/new-habit?prefill=…`.
- **Unit error appears once the unit has been left**; until then Save says "Add a unit to save" and the issue count does not include it.
- **Type is locked in Edit** with "Build and Break can’t be switched after saving." (the frame F9 draws it enabled; direction is fixed at creation, HAB-01).
- **The live example uses `min(5, target − 1)`** ("5 of 8 glasses"; "1 of 1" for a target of 1).

- **Categories: Reorder is always offered, even with no custom category (C6 draws none).** The built-ins reorder too and Other stays last and fixed, so hiding it would lock the built-in order. Deliberate spec-wins difference from the frame (owner's decision).
- **Reorder lists every category but Other**, custom and built-in mixed (C2), and the note says "Other stays last." Other keeps the highest `sort_order`; a category added later takes max + 1 and groups still force Other to the end.
- **Rename has Done only, no Cancel** (C3 draws none; owner's decision): an unchanged name leaves edit mode without writing, an empty or duplicate name blocks Done. The duplicate message sits under the field inside the row, not under the card as the frame draws it.
- **Delete in use (C5) has no Close.** The frame draws one; V3-25 says confirm sheets end with Cancel. The preview lists each habit with "Outdoors → Other" instead of the frame's single line. A category in use is not undoable (its habits moved); the toast says how many moved. Deleting an unused one is one tap with a 5 s Undo that restores the same row in the same place (`restoreCategory`).
- **Count lines** read "2 habits · 1 archived", "1 archived" (no active habits left) or "Not used" (none at all); archived habits always count.
- **`Button` gained `rowAction` / `dangerLink`** (quiet ink and danger text actions inside a row); `Rename` and `Delete` are no longer the old outlined small pills.
- **The Categories screen draws its own large title** (eyebrow, title, Reorder / +), under the native Back ("Habits" or "Settings"); it does not collapse (Habits' collapsing header is still its own).


## Open — V3-4b step 4 (Reminders)

- **The per-reminder on/off toggle is gone** (R2 draws none; HAB-43 lists times, days, remove, edit). A reminder stored as off before V3 shows "Off" on its row and editing it turns it back on. Habit Detail's summary still reads "All off" for such a habit.
- **`?addTime=<day>` (R4, the insight deep link) is removed**, not built: no V3 insight links to it. The service's `onlyDays` argument became the sheet's full draft (time and days).
- **One sheet for adding and editing**: `ReminderSheet` (time wheel + days) replaced the time-only sheet; Add time opens it on 09:00 on the days the habit falls on, and nothing is written until Save (it used to write a default row first).
- **Unscheduled days** (days the habit is never due on) are a warning banner per time under the list, not inside an expandable card; such days are still never scheduled.
- **The + is hidden at four times** (the note says why) instead of a disabled button.

## Open — V3-4b step 5 (Settings)

- **One screen with five groups, not S1's hub with a page per row.** HAB-44 lists the groups on the pushed screen; S2–S6 are drawn as separate pages (Theme, Evening review, Freezes, Export, About) and SY6 as a Notifications page. Their content is the group's content here; nothing links onward except Export data (the export sheet). Spec wins.
- **Theme is three radio rows** (Light, Dark, System with "Follows iOS · now dark"), as S2 draws, not the old segmented control.
- **The evening review's time is editable** (step 7): the Time row opens the shared time wheel in a sheet with no days picker; it is stored in `habits.eveningReviewTime` and the default stays 21:30 (the spec fixes none; the frames' 21:00 is not copied). Changing it rebuilds the notifications while the review is on.
- **"Sent only on days with open habits" is built as: only on the weekdays some active habit can be due** (`eveningReviewDays`). It is re-aimed after a habit is created, rescheduled, archived, restored or deleted, and by the launch reconcile. It cannot know at fire time whether today's habits are already done (a local notification has no logic); "closing the day" stays Later.
- **SY6's Notifications page is the Reminders group while iOS permission is off**: one banner with Open Settings, then Affected rows ("4 times on 3 habits", the evening review's time or Off) and "Times stay editable…". The rows are information, not links to R5 / S3.
- **Streaks shows "Left this month 1 of 2" and "Used this month" from the freeze query**, with the rule and how to use one in words. S4's "Saved … streaks this year" is dropped (PR-08) and Auto-use freezes is Later.
- **Not built, by decision or because they are Later:** iCloud backup row, Privacy and Send feedback rows (S6, no spec), the old Categories row (the Habits tab owns it), Last export, Database schema.
- **`SettingsGroup`, `ScopeChip` and the settings-helpers copy (appearance caption, evening footnote, diagnostics strings, export row subtitle) are deleted**; their copy lives in `settingsCopy` and the toast catalogue.

## Open — V3-4b step 6 (Export)

- **One sheet with four states of one export** (choose → writing → ready | failed), replacing the confirm sheet with its counts, the archived toggle, the "Export ready" screen and "Cancel export". Archived habits are always included; the Save to Files button is gone (EX3 draws Share file and Done), so `saveFileToFolder` and `isPickerCancellation` were deleted from `lib/file-export` (step 8); "Save to Files" is the share sheet's own action.
- **The progress bar is a real percentage** (entries written ÷ entries), as EX2 draws, not indeterminate: the serializer reports it per habit chunk. It still reads "Usually under a second" because it is.
- **The export lives in a store (`useExportStore`)**, not in the sheet: closing the sheet while it writes leaves it running, a toast ("Export ready · habits-….json") says when it is ready, and a failure while closed toasts an error; either way the next open from Settings or Progress shows where it stands. The toast has no action; the file card is behind Export data.
- **JSON is the default format** (the frame's); the file gained `categories` (name, built-in, order) and each habit's `reminders` (time, days, on/off). Layout `version` stays 1 (additive). CSV is unchanged (one row per log).
- **The failure reason is the frame's copy** ("Not enough storage on this iPhone. Nothing was changed — free up space, then retry."); the size needed is no longer quoted, and Copy diagnostics is no longer offered from the failure (it is in Settings › About).
- **Export from Progress** opens the same sheet (Progress, Month and Settings share one store), so a running export started from one entry is seen from the others.

## Open — V3-5 (first run, suggestions, system states)

Deliberate differences from the frames and what was left out. Spec wins where they disagree (D-list in `feature-spec-v3.md`).

- **Numbering:** `feature-spec-v3.md` files first run and suggestions under HAB-46 and the system states under HAB-47 (HAB-45 is Destructive confirms); the task brief called first run HAB-45.
- **FR3 and FR4 are drawn with the tab bar and built with it.** FR1 and FR2 (and Browse suggestions opened from First Run) have no tab bar; FR3 is a question over Today and FR4 is Today itself, so they are inside the tabs, as the frames draw them.
- **Skip for now (FR1, BS1 from First Run) is not drawn.** Added so every First Run screen has a way to an empty Today; FR2's Close is the same skip. The suggestions list from First Run therefore carries it under the groups.
- **FR2's frequency row has three options, not four** (Daily, Specific days, × per week), as in the form (V3-4b). Its footnote reads "Category and reminders can wait", not "Category, icon and reminders": a habit's icon is its category's, so there is no icon to postpone.
- **Quick picks and suggestions carry their category and target.** Picking "Drink water" on FR2 saves it in Health as 8 glasses a day (FR3 draws that); editing the name drops both. "No social media" is Productivity (SY5 draws it there) and "No phone in bed" Health (no frame says).
- **First Run gate:** no habits (archived included) and the `habits.seenFirstRun` flag unset. The flag is written when a first habit is saved, on any skip, and once for an install that already has habits, so deleting every habit never brings First Run back. The gate renders the tabs while it is still loading, so the skeleton has its bar; a fresh install may therefore show the pill for a frame before the redirect (device check).
- **Browse suggestions is only offered from empty states** (Today T2/FR4, Habits H6) and First Run, as drawn. Once there are habits there is no entry to it; a row or a header action is not drawn, so none was invented.
- **After saving from a suggestion outside First Run the form returns to the list**, which shows the habit as Added; there is no "Habit saved" toast (the form is a modal with no toast host).
- **Added = same name, case and surrounding spaces ignored, archived included** (the form's duplicate rule).
- **SY3 is indeterminate and SY4 names no step.** The migrator is one synchronous run with no progress, so the frames' "Step 2 of 3 · moving 1,284 logs · 64%" and "Stopped at step 2 of 3" are not built. "Nothing was changed" and "as they were" are true (one transaction; `migrations.rollback.test.ts` forces a failure after the last statement and checks schema and rows). "Nothing is deleted" became "No habits or history are deleted" after the migration review (0009 merges and trims free-text category names). No backup is promised or made.
- **The update screen only shows on an upgrade** (a read-only look at `__drizzle_migrations` against the journal, before the migrator), is up 100 ms before the migrator starts so it can be painted, and drops the splash itself. The migrator is untouched. A fresh install and an up-to-date launch show nothing.
- **Nothing guards "No habits or history are deleted" for future migrations except a test** that fails on `DELETE FROM`, `DROP COLUMN` or a `DROP TABLE` outside the migrator's own scratch tables.
- **SY2 catches a failed read inside Today only** (`LoadErrorBoundary`); every other tab still falls through to the root boundary. Today's header uses the clock, not the database, so it stays real.
- **SY5 covers the quantity sheet, not the streak-at-risk sheet.** An open quantity sheet keeps its day, amount and half-typed value and names the date; the at-risk sheet is recomputed against the new day and may close or change. It follows a live read; pinning it would let a freeze be spent after its grace window.
- **The rollover banner sits under the header and above the week strip** (SY5 draws no strip). It reads "nothing due" instead of "of 0" when the closed day had nothing due.
- **`ErrorScreen` now has the SY4 layout everywhere** (hero title, reassurance line, optional reason banner, Try again, secondary Copy diagnostics), including the root boundary; its three fixed strings ("Try again", "Copy diagnostics" and the copy results) stay in the component because it is shared infrastructure with no catalogue.
- **Web only:** `?fixtures=today-loading`, `today-load-fails`, `migration-running`, `migration-fails`, `migration-fails-first-open` reach SY1–SY4; a page keeps the fixture scenario and `textSize` it opened with, because First Run redirects and drops the query. There is no fail-once: React retries a throwing render itself.
- **Visual-check flakes seen (pass when run alone):** `habit-detail-history(-dark)`, `habit-detail-long-names` and `progress-week-ax-dark` differed once each in a full run — scroll states under load.
- **Device checks:** the update screen's first paint before the migrator blocks the thread, the splash-to-first-run hand-off, VoiceOver focus on each First Run heading and on Allow reminders, the iOS prompt after FR3, Reduce Motion on the skeleton and bar, and the rollover with the phone clock moved.
- **Test-only exports knip lists** (new): `suggestionSubtitle`.

## V3-6 audit list (touch targets and known layout exceptions)

Collected for the accessibility and baselines batch (HAB-49, HAB-50); each is deliberate where it stands.

- **Week matrix day headers: 44 pt high, 28 pt wide** (Progress, P1). Documented under "Spec wins over the mockup" in `feature-spec-v3.md`.
- **Week matrix cells (24 pt), Year cells (16 pt):** below 44 by design, not tappable (08.2).
- **Year month labels: 44 pt high through hitSlop**, so the hit areas of labels in the band above overlap the last row of cells (not tappable) and the 12 pt gap.
- **AX3 stacked range list overlays the content** (P11) instead of pushing it down.
- **One-habit and AX3 week blocks: 40 pt cells with a 2 pt hitSlop** (44 pt in effect), buttons that open Edit this day.

## Open — V3-4b step 7–9 (copy, accessibility, final frames)

- **Focus moves to the error only where there is one to reach.** Save is dimmed while any field issue exists (its reason is its VoiceOver hint), so a failed *submit* is a failed save: focus then moves onto the error above Save. A field error that appears while typing is an `alert` read where it sits. Sheets start VoiceOver on their title (`SheetHeader`) and hold it inside (`accessibilityViewIsModal`); a finished or failed export moves focus onto the file or the error.
- **Verified by test, not on a device:** labels, roles, hints, selected and checked state, and that the focus call is made (the focus API is mocked). Whether iOS lands on the right element, the reading order and Reduce Motion behaviour are device checks (see the phone checklist in the V3-4b report).
- **Touch targets:** every new control is 44 pt or more (RemoveButton, the reminder and Settings rows, the format control, buttons, the Banner link, the reorder handle's 28 pt + 8 hitSlop). No exception.
- **Time row chevron and icon squares are blank on web** (SF Symbols), so Settings' Time and Export rows show no chevron or glyph in the baselines.
- **Settings dark twins were light** until the final pass (a forced `theme=light` route); fixed. S2 now draws System selected, as its note says.
- **Test-only exports that knip still lists** (new since V3-4a): `useExportStore`, `refreshEveningReview` (also used inside its own file), `ReminderWithConflicts` — tests import them.
- **Check on a device:** every `SheetHeader` now starts VoiceOver on its title, including the sheets with a text field (New category, Quantity log); the focus may compete with the field's keyboard.
- **Left for later (V3-6 / owner):** Privacy and Send feedback rows (no spec); a hub-style Settings with a page per row; the per-reminder on/off toggle (Habit Detail still says "All off" for a legacy off time); real-device checks of notifications, the share sheet and VoiceOver.
