# Backlog

Deferred work and deviations from the specs, recorded while building so they aren't lost. Append new entries under the ticket; never silently drop a deviation. Code markers use `TODO(backlog)`.

Status key: **Open** = something to decide or build · **Decided** = a deliberate deviation, recorded for the reviewers · **Done** = kept only for history.

## Open — product decisions and unbuilt spec rules

- **Edit habit has Archive but no Delete** (HAB-23). Mockup E7 is labelled "from Edit habit · delete", but the only way to delete is "Delete habit" on Habit Detail. Archive was added at the foot of Edit habit (audit B9; HAB-17's rule) and deliberately only Archive — Delete stays one step further away. Decide whether Edit habit should also get a Delete entry.
- ~~**Category order on Manage and Today** (HAB-19).~~ Done in V3-0b: both group by the stored `categories.sort_order` (migration 0011), so they still agree. The reorder UI is HAB-42.
- **Manage keeps the pushed back button and the "Habits" title, with no "Done"** (HAB-19, mockups D3/E2/E3 show a modal-style "Done"). Revisit if Manage becomes a modal or a tab destination.
- **C1 omits the Last week / This week switch** (HAB-16). The Weekly mockup shows only the Week / Month / Year switcher; the V1 compact switch is kept because HAB-16's rule is that the range switcher is the only change to Weekly. Decide whether C1 means it to go.
- **Yearly shows only the current year.** No way to look at last year; January opens on a nearly empty "<year> so far". Consider defaulting to the last full year for the first weeks of January, as Monthly opens on the last complete month.
- **Dev buttons on Today** (`today-screen.tsx`). The ghost "Add habit" link is gone (audit B9: a header `+` replaces it; the empty state keeps its primary button). The dev buttons are gated on `__DEV__`; they need a "Developer" label, and the seed code should move out of production hooks (audit A1-06).

## Open — UX and accessibility follow-ups (audit B8/B9)

- **Left out of B8/B9** (reasons in `docs/audits/audit.md` §21): A5-14 discard prompt (product call), A5-21 placeholder tabs (product call), A5-10 Back-label derivation (touches the stack layout), A6-04 Today row double stop and at-risk in the label, A6-07 time wheel label, A6-08 decorative icons, A6-11 heatmap-cell focus, A6-14 reorder handle actions, A6-15 sheet scrim/focus management. Un-doable without a device pass: A6-12's Dynamic Type sizes beyond the scroll fallbacks added.
- **Undo is not offered for** reordering in Manage (the drag is its own reverse), the Retro-log Save (a deliberate sheet; reopen to change) and Delete habit / category (confirm-only by spec, HAB-13/25).
- **Touch-target exceptions** (reviewer-flagged): the Checkbox's 44 pt box uses a −10 margin that reaches into its host row's padding (device-check on Android, where a child outside its parent's bounds may not receive touches); Stepper −/+ (6), compact/small Buttons (8), the reorder handle and `MovedSettingPointer` keep a hitSlop; none were adjacent-target regressions introduced here, but they are not yet 44 pt by footprint.
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

- **Remove NEW-27 and its pointer on Reminders.** `MovedSettingPointer` (`components/ui/composite/moved-setting-pointer.tsx`, its test, and its use in `reminders-screen.tsx`) is temporary, tagged `TODO(backlog): remove`. Mockup E4: "for V2.0 only — remove in a later release." Removing it also removes the "Settings back reads 'Today' when opened from Reminders" quirk.
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

## Open — V3-2b (Today UI)

- **Browse suggestions link not shown** (T2): HAB-46's suggestions screen does not exist. `TodayEmptyState` takes `onBrowseSuggestions` and shows the link when given one.
- **Loading skeleton** (HAB-32): rows after 300 ms, static with Reduce Motion — not built; Today shows a neutral blank while loading.
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

- **V3-02's collapsing large title is not built.** HAB-27 asks for "a large title that collapses into a solid inline bar on scroll (T5)", an eyebrow on each tab root and 2-line-then-truncate. The three tab roots still draw their existing static titles, because V3-1 deliberately did not redesign screen contents — Today, Progress and Habits are rebuilt in V3-2, V3-3 and V3-4, and the header belongs with them. Only the 44 pt header buttons part of V3-02 landed. **Build it with each screen's own batch**, or as one component in HAB-29.
- **One header component.** `today-header.tsx` and `habits-header.tsx` each build their own title row. They should become one V3-02 `Header` (eyebrow, title, ≤ 2 trailing buttons) — fold that into HAB-29 or the first batch that touches both.
- **Re-tapping the selected tab does nothing.** The pill copies the stock contract (`tabPress` then navigate only when not focused). iOS normally pops that tab to its root. Not in the spec; decide in V3-6.
- **A cold deep link with no group lands on the first tab.** `/week` opens the weekly summary inside *Today*, not Progress — shared routes have no tab to restore on a cold start (measured; in-app navigation is unaffected). HAB-27's edge case "deep link / back from Detail restores the originating tab" is therefore only met for in-app pushes. If real deep links are added, give them group-qualified hrefs.
- **Bar A's clearance is 22 pt, not space-600.** Both bars share the one 112 pt bottom padding, so at AX sizes content stops `112 − 56 − inset` above bar A — 22 pt on a notched iPhone against the 24 the mockup draws. Forking the constant was not worth 2 pt; revisit in HAB-49.
- **`AX_FONT_SCALE = 1.5`** is a judgement call: iOS's standard sizes stop at 1.35 (xxxLarge) and AX1 is 1.65, so the threshold sits in the gap. If a device reports something unexpected, this is the knob.
- **`PILL_BLUR_INTENSITY = 50`** approximates the mockup's "20 pt blur": expo-blur's 1–100 `intensity` is not a radius. Needs an eye on a device.
- **`?textSize=ax`** (`src/lib/dev-text-size/`) exists only because react-native-web hardcodes `fontScale: 1`, so the AX layouts can be driven on web at all. Delete it if that ever changes.
- **First run shows the tab bar.** `TodayScreen` renders `FirstRunScreen` inside the Today tab, so the pill floats over it; HAB-46 says first launch has no tabs. Until V3-5 takes them away, First Run's footer pays `TAB_BAR_BOTTOM_PADDING` so the pill cannot cover "Add N habits" — it did, and the button was unreachable.
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

- `today-screen.tsx` owns the scroll-collapse state and inline bar; extract `components/today/today-inline-bar.tsx` when the screen next grows.
- `useWeekStripQueries` also returns the week-moving callbacks (named `…Queries` for the hook rule); a `useWeekStripState` split would remove the explanation.
- Habit Detail's "Habit not found" / "No entries yet" strings still sit in the screen (pre-V3, moved with Detail's batch).
- `useQuantitySheetActions.close()` closes even if the last write failed (the sheet shows what is really saved and the error toast stays); the quantity sheet unmounts without a slide-out because the parent drops it.
