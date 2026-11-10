# Backlog

Open work and the deviations reviewers must not re-flag. Append new entries under their group; never silently drop a deviation. Code markers use `TODO(backlog)`.
Status key: **Open** = something to decide or build · **Decided** = a deliberate deviation, recorded for the reviewers.
Shipped and obsolete entries (with their "As built" notes) live in `docs/archive/backlog-done.md` — never read by default; find an item there with `grep -n <ID>`.

## Decided — deviations the reviewers should not re-flag

### HAB-16 — Monthly
- Slipping body omits C3's second sentence ("The drop started when Easy run moved to evenings") — a cause across habits isn't derivable. Insight thresholds are one named block in `domain/monthly-insights.ts`.
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
- **Maestro cannot tap an active row on Manage** (it is wrapped in `SwipeableRow`; the web driver's single-jump tap never reaches it). `hab-13-12-archive-restore-delete` opens those habits from Today instead. Archived rows are plain and tap fine.
- **Settings pushed from Reminders keeps the tab name as its Back label** (V3-1 spec review): `reminders-screen.tsx` pushes `/settings`, whose Back says "Today"/"Habits", not "Reminders". Relabel from the screen as `reminders/[id]` does, or use a bare chevron.
- **Header circle buttons draw their glyph with `SymbolView`**, which renders nothing on web, so the `+` and gear are blank circles in every baseline. Add a View-drawn fallback or web twin before trusting those corners.
- **ADR numbering:** `docs/archive/assessment-v3.md` sketched this as ADR 005; it is filed as **006** at the owner's request, and 005 is left free.

## Open — device findings and phone checks

- **Today's day strip: dates peek under the compact header (device).** On a real iPhone the strip's dates showed cut off under the small centred "Today" title while the large title collapsed. No cause found from the code (the strip stays below the bar until the range ends, and the bar's background is opaque by then). Needs the phone, or a decision to harden the bar (background before the title).
- **Quantity sheet: number-pad sliver (device).** If a sliver of the sheet is left at the top when Set exact value opens or closes the number pad, suspect `KeyboardAvoidingView behavior="padding"` inside the Modal: its LayoutAnimation can catch Today's list underneath. Sheets have no drag-down gesture (the grabber is drawn only).
- **Reorder grip drag (Habits and Categories).** The drag did not work on the phone and the cause is not found without a device. Suspects: the list's own `ScrollView` pan competing with the grip's pan (no `blocksExternalGesture`, scrolling is not locked while dragging), the grip's 28 pt size, Expo Go's worklet runtime. The Move up / Move down buttons (`MoveButton`, 44 pt) are the primary path and the VoiceOver actions are unchanged. If the drag still fails on a dev-client build, drop the grip.
- **Collapsing header: the large title's buttons scale to 88 % while it fades** (38.7 pt while they can still be hit); hide them from touches once past the first third.
- **Not verified on a device or in the browser**: Hermes timings (Node numbers only), the visual-check fixtures for `monthly-too-early` / `weekly-summary*` (the gate numbers they show changed), and React Compiler memoisation of the new hooks (explicit `useMemo` is used).
- **Device checks:** the update screen's first paint before the migrator blocks the thread, the splash-to-first-run hand-off, VoiceOver focus on each First Run heading and on Allow reminders, the iOS prompt after FR3, Reduce Motion on the skeleton and bar, and the rollover with the phone clock moved.
- **Verified by test, not on a device:** labels, roles, hints, selected and checked state, and that the focus call is made (the focus API is mocked). Whether iOS lands on the right element, the reading order and Reduce Motion behaviour are device checks (see the phone checklist in the V3-4b report).
- **Check on a device:** every `SheetHeader` now starts VoiceOver on its title, including the sheets with a text field (New category, Quantity log); the focus may compete with the field's keyboard.

_Resolved items of this group: `docs/archive/backlog-done.md`._

## Release prerequisites

- **Import from the JSON export** (HAB-15 exports; nothing in the app reads it back). Without it a lost phone loses the history. The format is ready: version 2 is lossless (`docs/how-to/export-format.md`) and a test-only reader already rebuilds a clean database from it (`src/modules/habits/test-support/export-v2-reader.ts`, with its round-trip test). The importer should start from that reader and add what it leaves out: remapping the local ids, merging with data already on the phone, reading version 1 files (partial: no pauses, category look or order), and a confirm screen. Notifications must be rescheduled after an import.
- **Legacy column drop (B11):** `habits.icon/color/category` are nullable and unused; a cleanup migration (with `migration-reviewer`) removes them. A backup is taken before every upgrade now (ADR 010).
- **`PRAGMA foreign_key_check` in dev builds** and the three orphan risks listed under "Open — reliability" (A7-04): foreign keys stay off on device by decision (ADR 002).
- **Delete all data** (audit C-04/C-05, part B): no in-app way to erase everything. It has to clear the database, `logs.db`, scheduled notifications, the `backups` folder and any `habits.corrupt-*` set-aside files, and ADR 002 and this file still mention a removed `deleteAllHabits`. (The `Caches/exports` part of C-04 is done: the folder is cleared at every launch and a file is deleted once shared.)
- **Export is not encrypted and Share goes to any app** (audit E-06, the part not built): by design the person chooses where the file goes; "Include notes" is the only control. Revisit if a password-protected backup is wanted.
- **EX1 gains an Include notes row** (owner decision, audit E-06): the mockup's choice screen has only the format, the explain line and the button. The row is a `ToggleRow` between the explain line and the button.
- **After a share, the export sheet returns to the choice screen** (data safety part B, deviation from EX3): the file is deleted when the share sheet closes, so the file card with a second Share file would have nothing to send. The mockup keeps the card; if the owner prefers it, the alternative is to keep the file until Done and delete it then.
- **No in-app restore or list of backups** (follows A7-08): restoring a pre-upgrade backup or a set-aside file is a manual container edit (`docs/how-to/backups-and-recovery.md`). Set-aside files and backups are never cleaned up automatically.
- **`expo-clipboard`**: `npx expo install expo-clipboard` and a dev-client rebuild, so "Copy diagnostics" copies instead of sharing a file.
- **Apple account steps (release config, audit F-01/F-02 remainder):** nothing past `eas.json` can be done without an Apple Developer membership and an Expo login: register the App ID, `eas login` and `eas init` (then add `extra.eas.projectId` to `app.config.ts`), the App Store Connect record and its `ascAppId` in `eas.json`, signing through EAS, screenshots, review notes. The ordered list and commands are in `docs/how-to/release.md`; the first builds also settle the privacy-manifest check below.
- **Icon and splash artwork (audit F-05, the part left):** the iOS icon bundle is still the Expo template (`assets/expo.icon`), `assets/images/icon.png` is 1024 px RGBA and the App Store needs a flat one without alpha, and the splash image is the template glyph (the dark splash background is done; its image is the same file). Needs the design.
- **Verify the merged privacy manifest at the first EAS build** (privacy pack, audit E-04/F-03): `ios.privacyManifests` has no accessed-API entries on purpose. Follow the checklist in `docs/how-to/app-store-privacy.md`: read the merged `PrivacyInfo.xcprivacy`, add entries only for categories App Store Connect reports missing, set the policy URL there.
- **Enable GitHub Pages (owner step, privacy pack):** Settings > Pages > Source: GitHub Actions, then run the `pages` workflow once and open `https://akramelfadili.github.io/habits-app/privacy.html`. Until then the About row opens a 404.
- **Encryption declaration is not needed (audit E-06, second half):** the app adds no encryption of its own, and the export is not encrypted; the `ITSAppUsesNonExemptEncryption` entry is tracked under "App Store identity leftovers" above.
- **Phone checks for the privacy pack (not done; steps now in `docs/how-to/release.md` § "Device checklist before real data or the first TestFlight"):** the Hide habit names switch on a device, the lock-screen title with it on ("Habit reminder") and off (the habit name), a reminder that was scheduled before the update showing the generic title after one launch, and the About row opening the page in Safari.
- **Device-only checks, none of which the web build can show** (phone checklist in the V3-6 report): VoiceOver landing and reading order on every screen, the Magic Tap for a toast's Undo, Dynamic Type at AX1–AX5 (web only emulates AX3), Reduce Motion / Reduce Transparency / Increase Contrast on the pill, a reminder actually firing and not firing (`e2e/README.md`, manual checks 1–7), the share sheet for the export file, drag-to-reorder and swipe-to-archive, the splash → First Run hand-off and the update screen's first paint, the release build's promise-rejection tracking, Hermes timings for Year, the midnight rollover with the phone clock moved, the SF Symbols the web build cannot draw.

_Resolved items of this group: `docs/archive/backlog-done.md`._

## Open — reliability

- **No floating-promise lint** (A3-12): Biome needs type-aware linting for it. `DestructiveConfirmSheet` now logs a rejecting handler and shows the generic error toast, but callers should still go through `run()`.
- **A reminder that saved but failed to schedule is only logged** (`reminders.saved_but_not_scheduled`, kept in the on-device log).** `syncAfterWrite` keeps the add/edit successful (the row changed); the next launch's reconcile reschedules it. Consider a quiet "Reminders may not fire — open Reminders" notice.
- **Orphan risks with foreign keys off** (A7-04; decision: keep them off, see `migrations.safety.test.ts` and `habit-repository.integrity.test.ts`). `deleteHabitAndHistory` and `deleteCategory` are covered and leave none. Still open: (1) a write for a habit that was deleted meanwhile (a stale Undo, a retro-log sheet left open) inserts a child row with no parent; (2) `deleteCategory` reads "Other" and moves habits across awaits (A7-03), so a `createHabit` landing in between can leave a habit on the deleted category (`resolveHabitCategory` falls back to Other when reading); (3) a stale `categoryId` in `createHabit`. (The dev-only `deleteAllHabits` was removed in #48.) A dev-build startup `PRAGMA foreign_key_check` would surface them.
- **Reconcile only runs when permission is already granted at launch.** Granting it later in iOS Settings leaves drift until the next launch.
- **Two overlapping `syncHabitReminders` for one habit can interleave** (rapid reminder edits): each treats the other's new set as "old". The last write wins in the database and the next launch reconciles, but serialising per habit would be cleaner.
- **A second visible `Sheet` would mount a second top `ToastHost`** (two toasts); unlikely today, fix by rendering it only in the top-most sheet.
- **Release promise-rejection tracking is untested on a device.** React Native only enables Hermes' tracker in development; `installGlobalHandlers` enables it in release with `HermesInternal.enablePromiseRejectionTracker`, which could not be run here.
- **Still in B9:** Undo for Manage restore / freeze / reminder remove (A5-06), toast wording drift (A5-07), `numberOfLines` on toasts (A5-08), the New/Edit habit "Loading…" text for a deleted habit's edit link.
- **Concurrent writes outside `runInTransaction`.** The serialised helper only orders callers that use it; a plain `db` write issued while one of its transactions is open still joins that transaction on the one connection. Same hazard as before (audit A7-03); `habit-repository`'s raw blocks should move onto the helper.

_Resolved items of this group: `docs/archive/backlog-done.md`._

## Open — product decisions and unbuilt spec rules

- **Edit habit has Archive but no Delete** (HAB-23). Mockup E7 is labelled "from Edit habit · delete", but the only way to delete is "Delete habit" on Habit Detail. Archive was added at the foot of Edit habit (audit B9; HAB-17's rule) and deliberately only Archive — Delete stays one step further away. Decide whether Edit habit should also get a Delete entry.
- **Category order: picker and the Categories screen still list by creation** (HAB-42). Only Today and the Habits tab group by the stored `sort_order`; decide with the reorder UI whether the picker and C1 follow it too. Other is forced last in groups even though a new custom is stored after it (max + 1); the reorder UI decides whether Other can move.
- **Quantity sheet maximum:** 9999 (the existing cap), the mockup's helper says 99. Decide whether 99 is intended.
- **"Resist tonight" uses 18:00** (`EVENING_STARTS_AT_HOUR` in `constants.ts`, its only place). The spec gives no hour; confirm or change it there.
- **"Best streak" on Week/Year can name an archived habit** (the fixture's archived run shows 223 days on Year); the data layer counts archived habits' history for longest runs. Decide whether Progress should limit it to active habits.
- **Which day a week row opens (HAB-34, D1).** The spec says the whole week row is one 44 pt target that opens Edit this day, but a day sheet needs a day. It opens the latest day of that week that is due and unlogged (missed, reset, or today still open), else the latest day that can be edited; a week before the habit started or still ahead is not a button. Decide whether the sheet should instead let the person pick the day inside it.

_Resolved items of this group: `docs/archive/backlog-done.md`._

## Open — UX and accessibility

- **Left out of B8/B9** (reasons in `docs/archive/audit.md` §21): A5-14 discard prompt (product call), A5-21 placeholder tabs (product call), A5-10 Back-label derivation (touches the stack layout), A6-04 Today row double stop and at-risk in the label, A6-07 time wheel label, A6-08 decorative icons, A6-11 heatmap-cell focus, A6-14 reorder handle actions, A6-15 sheet scrim/focus management. Un-doable without a device pass: A6-12's Dynamic Type sizes beyond the scroll fallbacks added.
- **Touch-target exceptions** (reviewer-flagged): the Checkbox's 44 pt box uses a −10 margin that reaches into its host row's padding (device-check on Android, where a child outside its parent's bounds may not receive touches); Stepper −/+ (6), compact/small Buttons (8), the reorder handle keep a hitSlop; none were adjacent-target regressions introduced here, but they are not yet 44 pt by footprint.
- **Archive on Edit habit discards unsaved form edits** without a prompt (A5-14, deferred). `restoreReminder` stamps a new `createdAt` (id, time, days and on/off are preserved).
- **Edit this day's "Freeze returned" toast has no Undo** (spec review): the draft-and-Save sheet saves in one go; Today's logging has the exact Undo. HAB-34 moves Edit this day to per-tap saves with Undo.

_Resolved items of this group: `docs/archive/backlog-done.md`._

## Open — polish and small gaps

- **The partial quantity pie** on Today (a habit logged below target) keeps its `border`-toned track; only unchecked outlines moved to the 3:1 `outline` token. Revisit with the next Today visual pass.
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
- **Wording**: "Best day: All · every day full" (`weekly-summary-helpers.ts`); Manage shows "N logs kept" where the UX audit (Sep 2026, deleted; see `git log -- docs/audits/ux-audit-2026-09.md`) asked for "days logged".
- **Light `toastBtn` is 0.14 alpha; the master file says 0.16** (F-01). Not changed in V3-0b because it would move every toast baseline; fix with the V3-26 toast.
- **Fill transitions are not animated**: the circle's 200 ms state fill and the pie sweep (V3-04, F-07) change instantly; the progress bar's 450 ms fill, the strip's day switch and the all-done check are animated. Press is a 92 % scale (opacity with Reduce Motion), without the 100 ms ease.
- **T2 empty state: the icon square** is `inner`-coloured, the frame draws a white card square with a hairline (V3-6 polish).
- **SR1 pool pips** are solid lavender squares; the frame draws violet (frozen) squares (V3-6 polish).
- **The Archived row's icon square is the inset neutral, dimmed with the row**, so on a white card it is close to invisible in light mode; the frame draws a visible grey square. Revisit with the V3-6 polish (a `dimmed` that keeps the icon at full opacity).
- **`EmptyState`'s icon square is `inner`**, as T2 (see V3-2b); H3 and H6 draw a white square with a hairline.

_Resolved items of this group: `docs/archive/backlog-done.md`._

## Open — Progress data layer (V3-3a)

- **Interpretations to confirm** (the mockup is ambiguous; `docs/progress-data.md` lists them): "7 days of logs" = 7 distinct logged calendar days over all history; Week's *best streak* is the highest current streak among active habits while Month and Year show the longest run inside the range; row totals "n/target" count the habit's due days in the whole week, future included; *slipping* is "≥ 25 points down on the previous range with enough due days" for Week and Year and Monthly's weekly trend for Month; *improved* is "≥ 10 points up".
- **Old summary code kept (V3-3b retired the screens, not the builders)** — still the oracle of `range-summary.parity.test.ts` and imported for shared constants by `range-summary.ts`, `progress-grid.ts` and `year-map.ts`; delete the dead builders with the parity tests once V3-3b is accepted: `buildWeeklySummary`'s count-based `bestDay` and `too-early` insight, `buildCalendar` in `buildMonthlySummary`, Monthly's weekday `pattern` insight (PR-03 is Later and the new ranker never surfaces it), `yearUnlock` (3 months; still decides "year-scale insights need 3 months"), `yearlyInsightsFor`'s stuck / never-stuck / seasonal cards. Monthly's `perfectDays` stopped counting frozen days as perfect in V3-3a (D14; listed in `docs/progress-data.md`); it still counts an open today with some habits done as perfect; the new day grid does not (a day with a habit still open is not a verdict).
- **Week's streak tile reads the whole log** (`useAllEntries` + `useFrozenDays`) because the streak reaches back past the week. Everything else is range-bounded. If it shows up in a profile: cache by `(habitId, lastEntryDate)`.

_Resolved items of this group: `docs/archive/backlog-done.md`._

## Open — tidy-ups

- **`toggleEveningReview` lives in `use-reminder-actions.ts`** though Settings is its only home (`useSettingsActions` composes it). Move it next to Settings' hook. `setEveningReview` in `reminder-service.ts` and the evening-review notification are untouched.
- **The Today menu computes the full monthly summary only for the subline.** Consider a lighter selector (Yearly's row already uses one).
- **`PATTERN_CAUSE_SHARE = 0.25` is weaker than the spec's "explains most of the pattern".** Kept to match C3's "a third" copy; revisit with real data.
- **Frozen days on the Monthly calendar hide that day's completions** (a freeze marks the whole day). Revisit after real use.
- **`no-freezes` fixture** draws a mostly grey grid; it is tuned for HAB-08's sheet, not Detail's layout.
- **Not yet tokenised** (HAB-28, land with the components that need them): the accent-tint intensity ramp (T-05, replaces `heatmapLevelColor`/`inkLevelColor`), the density pass (T-18), the gear icon (T-19), and the pill's Reduce Transparency / Increase Contrast modes (V3-01, HAB-49).
- **27 `"yyyy-MM-dd"` format literals remain outside `utils/day-key.ts`** (V3-0a added `DAY_KEY_FORMAT` / `toDayKey`). Production: `domain/export-csv.ts`, `export-json.ts`, `off-schedule.ts`, `yearly-summary.ts` (2), `strategies/frequency-strategy.ts`, `hooks/use-retro-log-queries.ts`, `screens/habit-detail-screen.tsx`; the rest are web twins and `dev/` fixtures (`entry-repository.web.ts` 5, `entry-fixtures.ts` and friends). Move each to `toDayKey` when its file is touched; a later `check-architecture` rule can then forbid the literal.
- **`fastDayKey`** in `domain/day-status.ts` repeats `toDayKey`'s format without date-fns' formatter (formatting dominated a five-year grid); a test pins the equivalence. Fold it into `utils/day-key.ts` if `toDayKey` is ever allowed to stop throwing on an invalid date.
- `useWeekStripQueries` also returns the week-moving callbacks (named `…Queries` for the hook rule); a `useWeekStripState` split would remove the explanation.
- Habit Detail's "Habit not found" / "No entries yet" strings still sit in the screen (pre-V3, moved with Detail's batch).
- `useQuantitySheetActions.close()` closes even if the last write failed (the sheet shows what is really saved and the error toast stays); the quantity sheet now waits for its slide-out (`motion.sheet.duration`) before the parent drops it (UI fix batch, step 3).
- **Scenarios left in the web fixtures:** `manage-archive` still backs Today's long-list state and `manage-all-archived` the all-archived Habits state; `habit-detail`, `habit-detail-new`, `habit-detail-bonus`, `habit-detail-archived` and `no-freezes` are no longer used by a visual-check state (dev seeds still read `habit-detail`). `manage-nothing-archived` was removed.
- **`useRolloverQueries` reads the closed day's week on every Today mount**, even with no notice; skipping it until one exists is deferred.
- **Test-only exports knip lists** (new): `suggestionSubtitle`.
- **Test-only exports that knip still lists** (new since V3-4a): `useExportStore`, `refreshEveningReview` (also used inside its own file), `ReminderWithConflicts` — tests import them.
- **Strategies and dev fixtures still build weeks with date-fns directly** (A-01 follow-up): `strategies/per-week-frequency.ts` (bare `endOfWeek`, compared as an instant), `strategies/completion-index.ts` (`startOfWeek` bucket keys) and `dev/{habits-v3,entry}-fixtures.ts` use `WEEK_STARTS_ON` but not `utils/week-window.ts`. Left so Strategy semantics cannot move; switching them is safe only with the per-week equivalence test (`per-week-frequency.equivalence.slow.test.ts`) run with each `JEST_TZ` zone (`make test-tz` does not run slow tests).

_Resolved items of this group: `docs/archive/backlog-done.md`._

## Open — tooling and tests

- **Perf tests fail on a loaded or slower machine** (`year-map.perf.test.ts`, 1000–1200 ms budgets; `use-progress-queries.perf.slow.test.tsx`): they pass alone and with `--maxWorkers=2`, and failed in a full parallel run by as little as 9 ms (1009 vs 1000) after the machine slowed down. Give them relative budgets or move `year-map.perf` to `*.slow.test.ts`. `make check` can therefore need a re-run on a busy box. The same happens to wall-clock assertions outside the perf files: `src/lib/dev-clock/shift-clock.test.ts` (1000 ms budget) failed once at 1252 ms in a full run with that file taking 38 s. _Batch 19:_ the cause on this box was oversubscription, and `package.json` now caps Jest at 50% of the cores (4 here), which finished the suite in about 51 s instead of 94 s and passed every full Jest run of the batch that was read (seven, perf files included). The budgets themselves are unchanged and still absolute, so the entry stays open for a slower machine; the proper fix (relative budgets) was not made.
- **Day-per-state relaunch is slow by design** (about 8 s a state, so a shard is 15–40 min). If it matters, batch static states per launch with `habitsapp://dev-state` and Maestro's `openLink`.
- **The console guard misses warnings logged at import time.** `installConsoleGuard()` (`src/test-support/console.ts`) swaps `console.error` / `console.warn` in `beforeEach`, so a warning printed while a test file's imports load (or in a `beforeAll`) is not recorded and does not fail anything. Fix by installing the recorder at setup time and reporting what was logged before the first test.
- **Jest: "A worker process has failed to exit gracefully" is unexplained** (batch 9). It appeared on `make check` runs with 8 workers while other processes loaded the 8 GB machine (load average 10–20), and not on every run. Tried: `jest --detectOpenHandles` over the whole suite (in band: reports nothing), and the suite plus each `src/` directory with `-w 2` (the message never appeared). So there is no single leaking test to fix; it looks like a worker that is slow to tear down under load (sqlite test databases, Reanimated timers). Mitigations in place: fake timers in the Progress and ScreenHeader tests, the console/act guard, and `--maxWorkers=2` for pre-push. If it comes back with `-w 2`, bisect by file with `--detectOpenHandles` per file. _Batch 19, measured:_ the message did **not** appear in three full runs at `--maxWorkers=2` (nor in the baseline JSON run), and **did** appear on some full runs at the default 7 workers and at the capped 4 (so it is not only load, and a 4-worker run is not clean). `--detectOpenHandles` in band on the five slowest files (`navigation`, `habit-form-screen`, `today-screen.db`, `dev-state-repository`, `toggle-row`) reported nothing. Bisected by directory at 4 workers, none reproduced it: `repositories`, `lib`, `services`, `screens + components + navigation`, and `src/components + src/app + hooks + presenters + domain`. A cause is still not found; the likeliest candidates remain a sqlite test database or a Reanimated timer in a heavy screen test being torn down late. Next step if it matters: run the full suite at 4 workers with `--logHeapUsage` and a per-file `afterAll` that logs `process._getActiveHandles()`, or bisect the screens directory file by file. Harmless to the result: every run that printed it was green. The 54 s `toggle-row.test.tsx` in the audit was not reproducible: it takes 0.2 s.
- **The harness is flaky on this machine under parallel load** (two pages at a time): Metro answers some async route chunks with a 500, leaving a half-rendered capture, and `locator.click` sometimes exceeds 30 s on a page that is actually fine. Re-running a state on its own gives an identical, clean capture. A blank-render detector (`.visual-checks/blankscan.mjs`, gitignored, compares a capture's dominant-colour share with its baseline's) catches the half-rendered ones — worth keeping in the script if this persists. _Batch 19:_ not touched (it concerns the visual-check harness, not Jest); the Jest worker cap does not affect it.
- **Mutation testing is parked** (audit G-06, decided in batch 19: not now). Coverage is 99–100% in `domain/` and `strategies/`, but assertion strength is unmeasured. When it is picked up: run Stryker by hand, never in `make check`, with `mutate` limited to `strategies/*.ts` and `domain/{streaks,completion-rate,day-status,week-strip,year-map,freeze*}.ts`, the Jest runner scoped to those files' tests, a target of 85% killed, and the survivors recorded here. The property tests added in batch 19 already kill the one mutant tried by hand (`<` to `<=` in the per-week "owed" rule); that is anecdote, not a score. Strategy semantics must not change, so a survivor is a missing assertion, never a reason to edit a rule.
- **Three e2e flows are unverified** (batch 19, G-04): `e2e/hab-08-33-freeze-missed-day.yaml`, `e2e/hab-24-42-custom-category.yaml`, `e2e/hab-15-44-export-json.yaml`. Written without a Maestro run; the flow lint (`scripts/device-validation/flows.test.mjs`) proves their words exist in the app, not that they pass. Run them at the final simulator pass (`npm run e2e`, and the simulator workflow picks them up by itself), fix what the run shows, drop the "UNVERIFIED" header in each file and the marker in `docs/how-to/e2e.md`. Two selectors are the likeliest to need a change: the second "Add category" (index 1, the sheet's button) and `id: "Name"` in the add sheet.
- **The flow lint hand-parses the flows** (batch 19): `yaml` is only a transitive dependency, so `flows.test.mjs` checks the flows' fixed shape with regular expressions instead of parsing YAML. If a flow needs a shape it rejects (a `runFlow` block, a multi-line value), add `yaml` as a dev dependency and parse properly.
- **Tests still building days from UTC strings** (chore/dates-zones): 19 `new Date("yyyy-MM-dd")` / `…T00:00:00Z` calls in 12 files still pass in Los Angeles because they never land near a day boundary. Convert them when touched (`docs/how-to/dev-tooling.md` § "Time zones in tests"); `test-support/habit-builder.ts`'s `BUILDER_DATE` is one (31 Dec 2025 in Los Angeles, harmless for now).
- **GitHub settings the repo files cannot switch on** (audit 2026-11 D-03, D-04, D-06): Dependabot alerts and security updates, private vulnerability reporting (`SECURITY.md` points to it), a master ruleset requiring `check` and `gitleaks`. CodeQL (`.github/workflows/codeql.yml`) has not run yet; check its first PR run.
- **Visual-check flakes seen (pass when run alone):** `habit-detail-history(-dark)`, `habit-detail-long-names` and `progress-week-ax-dark` differed once each in a full run — scroll states under load.

_Resolved items of this group: `docs/archive/backlog-done.md`._

## Parked (decided or Later, no date)

- Week-level freeze for × per week habits (own ADR); auto-use freezes; the Settings hub with a page per row; the Send feedback row (the Privacy row is built); the per-reminder on/off toggle; iCloud backup row.
- `SlimHabitForm` split behind a shared `useHabitForm` hook; the per-habit streak read model shared by `useHabitsQueries` and the Detail hook; one V3-02 `Header` component for Today / Habits / Progress.
- Skeleton shimmer (it pulses); week-start-follows-iOS (D9, own ADR).
- **V4 sync** (ADR 009): parked, no schema work now. When it starts: export v2 first, backup before migrating, then one uuid + `updatedAt` + `deletedAt` migration with `migration-reviewer`.
- **Week-level freeze for × per week habits (Later).** They are never at risk by day (HAB-33). A week that ends below its target still breaks the streak with no prompt; covering it needs a freeze that spans the week (a Sunday-only freeze that the per-week strategy reads as covering it, or a week-level row) — a streak-semantics change with its own ADR.

_Resolved items of this group: `docs/archive/backlog-done.md`._

## Data safety, part A: deviations

- **Preview variant uses the dev bundle id**, not the production one (ADR 010): a preview build over the real app would replace it and share its data. It has its own name ("Habits Preview"), so it replaces the dev client, not the real app.
- **A failed backup does not block the update.** The brief allowed it; the migrator is atomic, so the backup guards only against a migration that succeeds with wrong data.
- **"Fresh" also requires no untracked tables.** A database with tables but no migration record is `unreadable`, not a first install; a hand-made or `drizzle-kit push` database would be refused (nothing in the app creates one).
- **Phone checks for this batch are not done** (the web build cannot show them): the new dev client opening empty, the update backup being written, a real unopenable file and the set-aside flow, the newer-data screen. Steps are in the batch 15 report.

## Privacy pack: deviations

- **The Hide habit names switch is also shown when notifications are off** (SY6 draws neither state): the choice applies the moment they are allowed, so it sits below the banner and the Affected group.
- **About is two groups,** not one card: Version and Copy diagnostics with the note under them, then Privacy policy. The note is a `FieldHelper` under the first card, so it reads as belonging to Copy diagnostics.
- **Two visual-check states were added:** `settings-notifications-ax(-dark)` and `settings-about-ax(-dark)` (AX3). The Hide habit names row is below the fold in the existing `settings-notifications-off-ax` capture, so that baseline did not change.
- **The policy names the developer by the git user name** (`akram_elfadili`, a handle) and the contact is the GitHub issues page, so no personal email is in the repo. Change both in `site/privacy.html` if a real name is wanted.
- **Pages workflow actions are pinned to the newest tags** (`configure-pages` v6.0.0, `upload-pages-artifact` v5.0.0, `deploy-pages` v5.0.1), resolved with `git ls-remote`; the workflow itself has not run.

## Release config: deviations

- **The dark splash background is a copy of the theme token,** not an import: Expo loads `app.config.ts` on its own and its loader cannot import TypeScript from `src/` (`Cannot find module './src/theme/theme'`). `DARK_SPLASH_BACKGROUND` in `app.config.ts` carries the value and `app.config.test.ts` fails if it differs from `surfaceColors.dark.bg`.
- **`make release-check` is not part of `make check` or `make check-ci`:** it runs a full production export (about 40 s warm). It has its own CI job, `release-bundle`.
- **The device-validation flag is passed as an empty string, not unset,** by the release check: Expo would fill an unset variable from a developer's `.env.local`, and an empty value is read as off.
- **The size baseline can only be lowered by the script;** growth up to 10 % passes, more needs a reviewed hand edit of `scripts/bundle-size.baseline.json`. It was first set to 6,763,855 bytes with the dev-state loader still inside, and lowered to 6,708,275 when the loader was removed.
- **Hermes timings cannot come from the perf suite:** Jest runs on Node. The device checklist in `docs/how-to/release.md` times the Year view by hand; a Hermes harness stays open under "Not verified on a device".
- **`eas.json` has no `submit` block yet** (no `ascAppId` until the App Store Connect record exists); the config test allows it to be added.

## Deliberate V3 deviations (built on purpose, not to re-flag)

Same rule as "Decided" above, for the V3 batches: each is a deliberate difference from a frame or the spec (the spec wins where they disagree) unless an Open group above says otherwise.

### UI fix batch and device validation

- **Settings rebuilt to the frames (UI fix batch, step 9) — deliberate differences:** (a) **Freezes has two stat cards (Left, Used), no Saved:** S4's "streaks saved this year" needs the freeze-log query of PR-08 — *needs PR-08 data*; no placeholder is drawn. (b) **No Auto-use freezes row (S4) and no iCloud/Backup rows (S1, S5):** all are "Later – not in V3". (c) **No Send feedback row (S6):** there is no mailbox (the Privacy row was built later, in the privacy pack). (d) **Export is the existing sheet,** opened from the hub's "Export data · JSON, CSV ›" row; S5 as a page is not built. (e) **Rows are the shared 60 pt `ListItem`** (T-18 density), not the frames' ≈ 54 pt: one row height everywhere beats a Settings-only one. (f) **The hub's Evening review value is the stored time when the review is on and "Off" when it is off** (S1 draws 21:00 only); the default stays 21:30, not the frames' 21:00. (g) **The Monday footnote keeps "Weeks start on Monday…"** (D9), not S2's "first weekday set in iOS". (h) **Notifications has an allowed state S1/SY6 do not draw** (state in words and an Open Settings row). (i) SF Symbols (the row icons, the banner's bell, the chevrons) are blank on web, so the web baselines show empty icon squares.
- **Differences from the web baselines (expected, not bugs):** SF Symbols and SF Pro; the real tab-bar pill and glass; the simulator is one size (393 × 852, iPhone 16) so the states with their own web `viewport` (small phone with the keyboard up, 393 × 640 scrolled states) differ; AX captures use `accessibility-extra-extra-extra-large` (AX5) while the web harness scales to AX3; notification states show the simulator's real permission, not the faked "denied"; export uses the real share sheet.
### UX and accessibility follow-ups (audit B8/B9)

- **Undo is not offered for** reordering in Manage (the drag is its own reverse), the Retro-log Save (a deliberate sheet; reopen to change) and Delete habit / category (confirm-only by spec, HAB-13/25).
- **Date style:** full months (`d MMMM`) in sentences and headings, short months (`d MMM`) in subtitles and compact ranges; ranges always use a spaced en dash (`formatDateRange`). Weekday runs stay unspaced ("Mon–Fri"). Reminder times stay 24-hour while the native time wheel follows the device (device check).
- **Spelling is British** ("colour", "summarise"); the `Color` words in code identifiers are untouched.
### V3 foundations (V3-0b)

- **Today's group order is now the stored order, not first appearance among the day's due habits** (HAB-42). Identical whenever each category's first active habit is due; otherwise a group can sit higher than it used to.
- **`domain/export-json.ts` imports `lib/diagnostics/app-info`** to stamp the build number into the file: the one accepted exception to "`domain/` is pure" (static facts, no I/O; `ARCHITECTURE.md` layer 4). Revisit if `domain/` gets a lint rule: pass the build in from the export service instead.
### V3-3a (Progress data layer)

- **Insight tone `positive`** is the spec's word; `InsightCard`'s prop is `success`. `presenters/progress-presenter.ts` maps one to the other.
- **Frozen-and-partial day**: a quantity day logged below target on a frozen date reads `frozen` (excused), as Monthly always did; Detail's heatmap shows the log. A *completed* frozen day reads `done` and PR-11 returns the freeze.
### V3-2b (Today UI)

- **Edit this day: entry points.** Only Habit Detail's heatmap opens it. Progress (Week day header, Month detail card) comes with V3-3; the "whole week row is one 44 pt target" on Detail with the Detail batch. The Note field is not in RL1/RL2 and is kept only when the sheet is opened from a habit.
- **SR2** is not drawn in the V3 render text I could read; SR1 and SR3 are built. TC1–TC2 (toast catalogue) are covered by the toasts on T4, T7 and RL2.
### V3-2a (Today logic)

- **`useSelectedDay` is `useSelectedDayQueries`.** `check-architecture`'s hook-naming rule requires `use<X>Queries|Actions`; the spec's name would have needed an allowlist entry, which may only shrink. It returns the day and its one write (`selectDay`, `showToday`).
- **A freeze is returned only by a log that completes the day.** A quantity amount below the target leaves the freeze (the day is still missed); un-logging a day later does not re-spend it. The returned freeze's Undo restores it with its original `created_at`.
- **Freeze-pool month is the *missed* day's month** (as before, now documented): a freeze used on 1 Oct for 30 Sep counts against September, and logging 30 Sep returns it to September's pool. The Today pool readout uses today's month, so on the 1st it can differ from the grace day's month by design.
- **A quantity habit with no target** (not creatable today) completes nothing in `saveQuantity`, so its save is silent; `isEntryComplete` already treats it as never complete.
### V3-3b (Progress UI)

- **Month, one habit (P10): tiles are Completion / Longest / Freezes used**, not the mockup's Streak (current streak is not in the month data; Week's tile reads the whole log, Month's does not). Add `streakHistory` to the month hook for a single habit if the current streak is wanted.
- **Week day headers are 44 pt high but 28 pt wide** (the cell pitch): a 44 pt-wide target would overlap its neighbour. The mockup asks for 44.
- **Month calendar: VoiceOver reads day by day** ("Wednesday 14 October, 100 percent", each a button), not per week row as 08.3 words it: every day is the entry to its detail card.
- **One-habit and AX3 week blocks: the 40 pt day cells are buttons** that open Edit this day (hint "Edit this day"); the spec only gives the matrix's day headers that role, and those blocks have no headers. Days that have not happened offer nothing.
- **The AX3 range list overlays the content** instead of pushing it down (P11): the pinned layer is one element and its slot keeps its closed height.
- **Year, one habit (P15): the chip is always shown** (as "All habits"), though P12 draws none; with exactly one habit and no archived habit there is nothing to pick and it is hidden. The Year filter applies to Year only; Month opened from a filtered Year shows all habits.
- **Year too-early and nothing-logged gates are global** (all-history log counts), so a habit filtered to one with no logs shows a ready year of empty cells.
- **The per-habit rates list includes an archived habit that had days in the range** (never in insights, D11).
- **Export is "unavailable" with no habits or no logs** (tap = toast); the mockup draws only the no-habits case disabled.
- **P1 week matrix order follows creation order** (the mockup lists Read second); the fixtures create all six on one day, so ids decide.
### V3-4a (Habits tab, Habit Detail, delete and archive sheets)

- **History has no "See all" (D2).** The frame draws a "See all" link; the spec lists none. History shows the latest ten days that say something (done, partial, missed, frozen, bonus, or a day with a note). A longer list needs its own screen.
- **"+N pts" on the 90-day rate (D1).** The frame draws it; the spec only says "90-day rate". Built as the rate minus the rate over the 90 days before it, only for a habit older than 90 days whose earlier window has at least 7 due days; otherwise the tile says "N of M days" (Break: "resisted"). A rate under 7 due days reads "—, after 7 days" (D3).
- **Stat tile VoiceOver reads "Streak: 9, in a row"**, not 08.3's "Streak, 9 in a row": `StatCard` (V3-10) joins label and value with a colon for every screen. Change it there if the wording matters.
- **Library row subtitles name a streak only for a daily Build habit** (H1 draws "Daily · 13-day streak" and nothing for the per-week, weekday and Break rows). The mockup's data is not consistent with any wider rule.
- **Group order follows the stored category order** (HAB-42), not the frame's: the fixtures' categories happen to match H1, but a person's own order wins.
- **Habits header buttons stay in the collapsed inline bar** (F-07 says the bar carries "name and buttons"; H5's crop draws the bar without them). The gear and + are reachable at any scroll.
- **Restore is `Button variant="compact"`** (V3-22's 36 pt pill on the inset surface). Other small buttons (`size="small"`: Categories' Rename and Delete, the category picker's Add) are still the old outlined pill until V3-4b moves them. Secondary buttons are still hairline-outlined, not the 3:1 outline V3-22 draws (Cancel on DC1, Keep habit); V3-6.
- **"Add “Yoga” as a habit" and other `link` buttons are secondary ink**, V3-22's link is ink; the variant is shared with First Run's "Start from scratch" (V3-4b/V3-6).
- **After a delete, Detail pops to wherever it was opened from** (Today, Progress or Habits) with "<Habit> deleted"; DC3 says "pops Detail to Habits" because it is drawn from Habits. Popping to another tab would switch tabs under the person.
- **DC5's body is DC5's** ("…restore it any time from Habits › Archived."), not H8's shorter line.
- **Categories' Back says "Habits" when opened from the Habits tab** (`/categories?from=habits`) and "Settings" otherwise; the Categories screen itself is V3-4b.
- **The Habits tab with every habit archived** (not drawn) shows "No active habits" with Add habit and the Archived section below.
### V3-4b (Add / Edit habit form, Categories)

- **Frequency has three options — Daily, Specific days, × per week — not the mockup's four.** F1–F10 draw a "Weekdays" chip; HAB-41 lists three and the old "Weekdays shortcut" is gone. Mon–Fri is two taps on the weekday chips. (Spec wins; owner's decision.)
- **No icon / colour row (F2, F6).** The category supplies both; the mockup's "Icon and colour · tap to change" row and the F6 pickers are not built (spec wins).
- **All categories show in the form, not five (F1, F2).** The frames truncate to five chips for brevity; every category is a chip, then "New category". F6 draws the full set.
- **A picked category clears with a second tap**, since the category is optional; no habit is ever saved without one (it goes to Other).
- **The duplicate-name check includes archived habits** (case- and space-insensitive), so a restore never leaves two habits with one name.
- **Reminders are queued on New habit only.** Edit habit has no Reminders section: its reminders are the Reminders screen's (HAB-43, step 4). The queued times are written after the habit; if one fails, the habit stays and a warning toast says so.
- **The "Discard changes?" prompt is drawn in-app (`AlertDialog`), not the system alert**, so web and the Maestro flows see it too. It follows the frame: Keep editing bold first, Discard in danger red, a scrim tap does nothing.
- **The header button says "Close"** (was "Cancel") on both modals, as the frames do.
- **Unit error appears once the unit has been left**; until then Save says "Add a unit to save" and the issue count does not include it.
- **Type is locked in Edit** with "Build and Break can’t be switched after saving." (the frame F9 draws it enabled; direction is fixed at creation, HAB-01).
- **The live example uses `min(5, target − 1)`** ("5 of 8 glasses"; "1 of 1" for a target of 1).
- **Categories: Reorder is always offered, even with no custom category (C6 draws none).** The built-ins reorder too and Other stays last and fixed, so hiding it would lock the built-in order. Deliberate spec-wins difference from the frame (owner's decision).
- **Reorder lists every category but Other**, custom and built-in mixed (C2), and the note says "Other stays last." Other keeps the highest `sort_order`; a category added later takes max + 1 and groups still force Other to the end.
- **Rename has Done only, no Cancel** (C3 draws none; owner's decision): an unchanged name leaves edit mode without writing, an empty or duplicate name blocks Done. The duplicate message sits under the field inside the row, not under the card as the frame draws it.
- **Delete in use (C5) has no Close.** The frame draws one; V3-25 says confirm sheets end with Cancel. The preview lists each habit with "Outdoors → Other" instead of the frame's single line. A category in use is not undoable (its habits moved); the toast says how many moved. Deleting an unused one is one tap with a 5 s Undo that restores the same row in the same place (`restoreCategory`).
- **Count lines** read "2 habits · 1 archived", "1 archived" (no active habits left) or "Not used" (none at all); archived habits always count.
- **The Categories screen draws its own large title** (eyebrow, title, Reorder / +), under the native Back ("Habits" or "Settings"); it does not collapse (Habits' collapsing header is still its own).
### V3-4b step 4 (Reminders)

- **The per-reminder on/off toggle is gone** (R2 draws none; HAB-43 lists times, days, remove, edit). A reminder stored as off before V3 shows "Off" on its row and editing it turns it back on. Habit Detail's summary still reads "All off" for such a habit.
- **`?addTime=<day>` (R4, the insight deep link) is removed**, not built: no V3 insight links to it. The service's `onlyDays` argument became the sheet's full draft (time and days).
- **Unscheduled days** (days the habit is never due on) are a warning banner per time under the list, not inside an expandable card; such days are still never scheduled.
- **The + is hidden at four times** (the note says why) instead of a disabled button.
### V3-4b step 5 (Settings)

- **Theme is three radio rows** (Light, Dark, System with "Follows iOS"; the old "· now dark" was dropped to match S2), as S2 draws, not the old segmented control.
- **"Sent only on days with open habits" is built as: only on the weekdays some active habit can be due** (`eveningReviewDays`). It is re-aimed after a habit is created, rescheduled, archived, restored or deleted, and by the launch reconcile. It cannot know at fire time whether today's habits are already done (a local notification has no logic); "closing the day" stays Later.
- **SY6 is the Notifications page** (UI fix batch): one banner with Open Settings at the top, then Affected rows ("4 times on 3 habits", the evening review's time or Off — the latter opens the Evening review page) and "Times stay editable…". The Reminders row is information (there is no all-reminders screen to open, so no R5 link). Allowed or not asked yet, the page shows the state and an Open Settings row (not drawn).
- **Streaks shows "Left this month 1 of 2" and "Used this month" from the freeze query**, with the rule and how to use one in words. S4's "Saved … streaks this year" is dropped (PR-08) and Auto-use freezes is Later.
- **Not built, by decision or because they are Later:** iCloud backup row, Privacy and Send feedback rows (S6, no spec), the old Categories row (the Habits tab owns it), Last export, Database schema.
### V3-4b step 6 (Export)

- **One sheet with four states of one export** (choose → writing → ready | failed), replacing the confirm sheet with its counts, the archived toggle, the "Export ready" screen and "Cancel export". Archived habits are always included; the Save to Files button is gone (EX3 draws Share file and Done), so `saveFileToFolder` and `isPickerCancellation` were deleted from `lib/file-export` (step 8); "Save to Files" is the share sheet's own action.
- **JSON is the default format** (the frame's); the file gained `categories` (name, built-in, order) and each habit's `reminders` (time, days, on/off). Layout `version` stays 1 (additive). CSV is unchanged (one row per log).
- **The failure reason is the frame's copy** ("Not enough storage on this iPhone. Nothing was changed — free up space, then retry."); the size needed is no longer quoted, and Copy diagnostics is no longer offered from the failure (it is in Settings › About).
### V3-5 (first run, suggestions, system states)

- **Numbering:** `feature-spec-v3.md` files first run and suggestions under HAB-46 and the system states under HAB-47 (HAB-45 is Destructive confirms); the task brief called first run HAB-45.
- **Skip for now (FR1, BS1 from First Run) is not drawn.** Added so every First Run screen has a way to an empty Today; FR2's Close is the same skip. The suggestions list from First Run therefore carries it under the groups.
- **FR2's frequency row has three options, not four** (Daily, Specific days, × per week), as in the form (V3-4b). Its footnote reads "Category and reminders can wait", not "Category, icon and reminders": a habit's icon is its category's, so there is no icon to postpone.
- **Quick picks and suggestions carry their category and target.** Picking "Drink water" on FR2 saves it in Health as 8 glasses a day (FR3 draws that); editing the name drops both. "No social media" is Productivity (SY5 draws it there) and "No phone in bed" Health (no frame says).
- **First Run gate:** no habits (archived included) and the `habits.seenFirstRun` flag unset. The flag is written when a first habit is saved, on any skip, and once for an install that already has habits, so deleting every habit never brings First Run back. The gate renders the tabs while it is still loading, so the skeleton has its bar; a fresh install may therefore show the pill for a frame before the redirect (device check).
- **Browse suggestions is only offered from empty states** (Today T2/FR4, Habits H6) and First Run, as drawn. Once there are habits there is no entry to it; a row or a header action is not drawn, so none was invented.
- **After saving from a suggestion outside First Run the form returns to the list**, which shows the habit as Added; there is no "Habit saved" toast (the form is a modal with no toast host).
- **Added = same name, case and surrounding spaces ignored, archived included** (the form's duplicate rule).
- **SY3 is indeterminate and SY4 names no step.** The migrator is one synchronous run with no progress, so the frames' "Step 2 of 3 · moving 1,284 logs · 64%" and "Stopped at step 2 of 3" are not built. "Nothing was changed" and "as they were" are true (one transaction; `migrations.rollback.test.ts` forces a failure after the last statement and checks schema and rows). "Nothing is deleted" became "No habits or history are deleted" after the migration review (0009 merges and trims free-text category names). No backup is promised or made.
- **SY2 catches a failed read inside Today only** (`LoadErrorBoundary`); every other tab still falls through to the root boundary. Today's header uses the clock, not the database, so it stays real.
- **SY5 covers the quantity sheet, not the streak-at-risk sheet.** An open quantity sheet keeps its day, amount and half-typed value and names the date; the at-risk sheet is recomputed against the new day and may close or change. It follows a live read; pinning it would let a freeze be spent after its grace window.
- **The rollover banner sits under the header and above the week strip** (SY5 draws no strip). It reads "nothing due" instead of "of 0" when the closed day had nothing due.
- **Skeleton pulses (opacity), not a shimmer** (08.5 says shimmer); static with Reduce Motion.
- **Suggestions' VoiceOver wording is ours** ("Name, subtitle" with the hint "Opens Add habit with this filled in."; Added in the label): 08.3 has no row for them.
- **SY3 is drawn before the saved Appearance can be read** (it lives in the database that is migrating), so a dark-preference user on a light system sees it light. Device check.
