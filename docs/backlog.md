# Backlog

Deferred work and deviations from the specs, recorded while building so they aren't lost. Append new entries under the ticket; never silently drop a deviation. Code markers use `TODO(backlog)`.

Status key: **Open** = something to decide or build · **Decided** = a deliberate deviation, recorded for the reviewers · **Done** = kept only for history.

## Where things stand (end of V3-6)

Everything below this section is the detailed record by ticket. This is what is still open, grouped.

### Bugs to fix next (the owner's fix batch)

- **Today's day strip** — fixed in the UI fix batch (step 1, see HAB-30 "As built"). **Still open:** on a real iPhone the strip's dates showed cut off under the small centred "Today" title during the collapse; no cause was found from the code (the strip stays below the bar until the range ends, and the bar's background is opaque by then), so it needs the phone or a decision to harden the bar (background before the title). 
- **Settings rebuilt to the frames (UI fix batch, step 9) — deliberate differences:** (a) **Freezes has two stat cards (Left, Used), no Saved:** S4's "streaks saved this year" needs the freeze-log query of PR-08 — *needs PR-08 data*; no placeholder is drawn. (b) **No Auto-use freezes row (S4) and no iCloud/Backup rows (S1, S5):** all are "Later – not in V3". (c) **No Privacy or Send feedback rows (S6):** there is no URL or mailbox. (d) **Export is the existing sheet,** opened from the hub's "Export data · JSON, CSV ›" row; S5 as a page is not built. (e) **Rows are the shared 60 pt `ListItem`** (T-18 density), not the frames' ≈ 54 pt: one row height everywhere beats a Settings-only one. (f) **The hub's Evening review value is the stored time when the review is on and "Off" when it is off** (S1 draws 21:00 only); the default stays 21:30, not the frames' 21:00. (g) **The Monday footnote keeps "Weeks start on Monday…"** (D9), not S2's "first weekday set in iOS". (h) **Notifications has an allowed state S1/SY6 do not draw** (state in words and an Open Settings row). (i) SF Symbols (the row icons, the banner's bell, the chevrons) are blank on web, so the web baselines show empty icon squares.
- **Partial sheet at the top (quantity sheet)** — step 3 of the UI fix batch. Not reproduced from code or on the web (a still capture is right; the harness's web Modal has no slide). Found and fixed: (1) RN 0.88's `Modal` keeps drawing its *current* children while it slides out, so a sheet whose caller blanks its content on close (`draft !== null`, `usage !== null`, `habit !== null`: reminder, delete-category and first-run-reminder sheets) shrank to its chrome mid-slide; `Sheet` now keeps the content it last showed until the slide-out ends; (2) the quantity sheet was torn out of the tree the instant it closed (the parent dropped it), now it closes with the slide and is dropped after `motion.sheet.duration`. **Still to look for on the phone** if a sliver remains: `KeyboardAvoidingView behavior="padding"` inside the Modal while the number pad opens (Set exact value) or closes, which animates padding with a LayoutAnimation that can catch Today's list underneath. Sheets have no drag-down gesture (the grabber is drawn only); `partial-sheet.yaml`'s swipe does nothing by design.
- **Break habit circle "did nothing" at 15:30 (simulator)** — UI fix batch, step 5: not a bug in the rule. The 18:00 hour (`EVENING_STARTS_AT_HOUR`) only changes the status line ("Resisting" → "Resist tonight"); the circle logs at any hour (spec: "the circle always logs") and always toasts "Resisted '…'" with Undo. Pinned with the clock at 15:30, 17:59 and 18:00 in `today-screen.test.tsx`. The simulator miss is unexplained by code: the only silent write path is `writableDay()` skipping a tap when the render's day differs from the clock's (a rollover), and a failed write toasts an error. If it recurs, check whether the row was already resisted (a tap then un-resists, with a "not resisted" toast) and whether the tap hit the name area, which opens Detail.
- **Add habit: Save bar over the last field (device)** — UI fix batch, step 6. Not reproducible on the web: the Save bar is in the column under the scroller (not an overlay), and the new `form-new-errors-end` / `-ax` visual-check states scroll to the end and *fail the capture* if the last field ends under it (it clears it at 393 × 640 and at AX3). Suspected device cause fixed: when errors or the reason make the bar taller the scroller shrinks, and a form resting at its end kept its offset, leaving the last field under the bar until the next scroll; the form now follows the end (`scrollToEnd`, no animation) when the bar grows while it rests there. No extra bottom inset was added: the bar itself is the inset, so one would only add blank space. Needs the phone to confirm. **Back affordance:** Detail, Settings, Reminders, a Year month and Categories show a back button whenever they are pushed (`headerBackOptions`: nothing only when there is nothing to go back to, i.e. the simulator captures that open them directly); the root modals carry Cancel / Close. Pinned in `navigation.test.tsx`.
- **Reorder (Habits and Categories) did not work on the phone** — UI fix batch, step 7. **Cause not found without a device.** Checked by reading: `GestureHandlerRootView` wraps the whole app (the reorder screens are tab/stack screens, not modals, so they are covered); react-native-gesture-handler 3.3.0, react-native-reanimated 4.7.1 and react-native-worklets 0.13.0 are exactly Expo SDK 58's bundled versions (`expo/bundledNativeModules.json`), and gesture-handler 3's `GestureDetector` still accepts the `Gesture.Pan()` builder we use; the drop maths (`dragTargetIndex`, `groupBounds`, `moveItem`) and the persisted `sort_order` (`reorderHabits`, `reorderCategories`) are unit-tested and correct. The drag itself runs in worklets, which Jest cannot run, so it has never been exercised by a test. Suspects for the phone: the list's own `ScrollView` pan competing with the grip's pan (the grip has no `blocksExternalGesture`, and the list does not lock scrolling while dragging), the grip's 28 pt size, and Expo Go's worklet runtime. **So the drag is no longer the only way:** every row in reorder mode now has visible Move up / Move down buttons (`MoveButton`, 44 pt, disabled at the ends of the group, labelled "Move Meditate up") as the primary mechanism, the grip stays for dragging and the VoiceOver Move up / Move down actions are unchanged. If the drag never works on the phone, drop the grip.
- **Progress sticky header and the Year insight** — UI fix batch, step 8. (1) The two lines above and below the range switcher were the inline bar's own bottom hairline plus the pinned block's hairline, with the switcher touching the bar; and Export, a 44 pt pill inside the 44 pt bar, touched its top and bottom edges. Now: the bar draws no hairline on Progress (`CollapsedHeaderBar hairline={false}`), the pinned block carries the only one, it has 8 pt of air above the control (`PINNED_PADDING_TOP`), and Export is a `compact` pill (36 pt drawn, 4 pt slop above and below keep the 44 pt target; documented in the touch-target guard). New states `progress-{week,month,year}-sticky` measure all of it and fail the capture otherwise. (2) The Year insight ran off the right edge because, before the pager was measured, its pages were `width: "100%"` inside a horizontal scroller, which has no width to take, so the text stayed on one line; until measured the first card now sits in the pager's own column, and the card's text column has `minWidth: 0`. Not reproduced on the web at any size (the new `progress-year-insight` / `-ax` states check the wrap and pass), so the fix is from the cause above; look for it on the phone on Year when it first opens. Harness note (fixed in step 11): states on a lazily bundled route were captured blank with Metro's own `app/….tsx` bar showing, as large identical diffs; the harness now waits for that bar and the "Bundling…" fallback to go before capturing.
- **Today's "(dev)" buttons in a release build** — UI fix batch, step 10. They were already gated: each button renders only when its action exists, and every action (`clearAllHabits`, both seeds, `resetFirstRun`) is `__DEV__ ? … : undefined`, the same flag as the other dev code (`deleteSetting`, `deleteAllHabits` refuse outside it, the web clock pin and text-size override check it); `__DEV__` is false in a Release build, so Metro strips them. What was missing was a test across the whole wiring: `today-dev-buttons.production.test.tsx` renders the real hooks and buttons (list and empty state) with `__DEV__` false and fails if any "(dev)" label shows (removing the gate on Clear all was checked to fail it), and fails if a "(dev)" button label is written outside `today-dev-buttons.tsx`. They are visible in Expo Go, which is a development build.
- **Step 11 — states and what a device must still confirm.** New visual-check states that *assert* (fail the capture) rather than only compare: `today-v3-strip-browsed` (touch-swipe back a week, choose a day, scroll: the strip is on screen at full opacity, seven labelled day buttons), `form-new-errors-end` (+ `-ax`), `progress-{week,month,year}-sticky`, `progress-year-insight` (+ `-ax`). Not capturable by a static baseline: a toast entering and leaving, a sheet mid-slide, a real drag, the collapse on a phone. **Phone checklist** — Today: slide back a week, tap a day, scroll, tap the empty area: the strip stays; the strip's dates must not peek under the small "Today" title while collapsing (still open, see above); VoiceOver reads each day as a button. Toasts: in/out feel (200 ms), Undo 5 s, info 3 s, a tap or swipe dismisses. Quantity sheet: open and close it, open Set exact value with the number pad, no sliver at the top. First Run → Skip: Today shows with the bar, Progress and Habits open, no bounce back to the welcome. Break habit circle logs at 15:30. Add habit: with errors, scroll to the end, nothing under Save. Reorder: the Move up/down buttons work; try the grip too. Progress: scroll with the switcher pinned (one hairline, Export clear); Year's insight wraps. Settings: every row opens its page and Back reads Settings.
- **Toast animation and dismissal** — fixed in the UI fix batch, step 2: one `ToastHost` path for every toast (the catalogue in `messages.ts`, `runSafely` errors, Undo toasts, sheet toasts): fade + 12 pt rise in over 200 ms, 200 ms exit, 150 ms crossfade under Reduce Motion, a newer toast swaps in at once, tap or swipe dismisses, a toast up longer than 600 ms goes when the screen changes (`ToastRouteWatcher`; a toast raised by the navigating action survives). Info and success now hold **3 s** (was 4 s, the owner asked for shorter); Undo stays 5 s, warning 6 s. Not verified without a device: the feel of the timing.
- ~~After Skip on First Run, Progress and Habits are unreachable~~ — fixed in the UI fix batch (step 4): only First Run hides the bar; the Skip flake (stale "seen" flag bouncing back to the welcome) is fixed with `leftFirstRun`.
- **Collapsing header: the large title's buttons scale to 88 % while it fades** (38.7 pt while they can still be hit); hide them from touches once past the first third.
- **Perf tests fail on a loaded or slower machine** (`year-map.perf.test.ts`, 1000–1200 ms budgets; `use-progress-queries.perf.slow.test.tsx`): they pass alone and with `--maxWorkers=2`, and failed in a full parallel run by as little as 9 ms (1009 vs 1000) after the machine slowed down. Give them relative budgets or move `year-map.perf` to `*.slow.test.ts`. `make check` can therefore need a re-run on a busy box.

- **`--update-baseline` refuses the dev server's blank "Bundling…" page** (flat rgb 242 over 60 % of the capture). V3-6 committed three such baselines (`reminders-at-cap`, `today-empty-ax`, `-dark`) before a re-run showed them; they were recaptured and checked by eye.

### Device validation (iOS Simulator run, ADR 007)

Built on `chore/ios-simulator-validation`; **the workflow has not been run yet** — the session that wrote it had no Mac, no `gh` and no GitHub token, and `workflow_dispatch` only fires for a workflow file on the default branch, so it needs merging (or a temporary `push` trigger on the branch) before its first run. Nothing below is an observed device problem yet; the first run fills the three groups in.

- **Bugs found on the simulator:** _none recorded yet._ Named in advance for the first run's videos: Today's day strip hiding and reappearing after a past day is chosen and the list is scrolled; toast dismissal (measure the time to hide, `scripts/device-validation/flows/toast.yaml`); the quantity sheet leaving part of itself at the top (`partial-sheet.yaml`); whether the tab bar is reachable after First Run → Skip (`first-run-skip.yaml`).
- **Differences from the web baselines (expected, not bugs):** SF Symbols and SF Pro; the real tab-bar pill and glass; the simulator is one size (393 × 852, iPhone 16) so the states with their own web `viewport` (small phone with the keyboard up, 393 × 640 scrolled states) differ; AX captures use `accessibility-extra-extra-extra-large` (AX5) while the web harness scales to AX3; notification states show the simulator's real permission, not the faked "denied"; export uses the real share sheet.
- **Device-only / not reproducible by the run:** the migration screens (`migration-running`, `error-screen-migration-failed`, `…-first-open`), `today-loading`, `today-load-error` and every state with `failWrites=1` (all simulated by the web repositories only), and states whose `interact()` needs a pointer drag, `locator.last().click()` or a key press in a field (`habits-reorder-lifted`, `edit-habit-legacy-name-edited`, the "Add category" taps…). `node scripts/device-validation/plan.mjs` prints the exact list with reasons (40 of 369 at the time of writing; 102 states open from the route alone, 227 are replayed as Maestro steps).
- **Unverified assumptions in the workflow** (fix them from the first build log): the `macos-26` label and Xcode 26 on it, `expo prebuild` accepting the injected bundle identifier, the `main.jsbundle` freshness check (modification time against the build's start), Maestro's iOS selectors (`text:` for accessibility labels, `index`, `scrollUntilVisible`) matching the translated steps, and the screenshot settle time (`SETTLE_MS`, 4.5 s) being enough for the Release app to open a state. A capture under 20 KB is retaken once and reported as blank.
- **Day-per-state relaunch is slow by design** (about 8 s a state, so a shard is 15–40 min). If it matters, batch static states per launch with `habitsapp://dev-state` and Maestro's `openLink`.

### Release prerequisites (before anyone but the owner uses it)

- **Back up the database before migrating** (A7-08): a migration that succeeds with wrong data cannot be undone; copy `habits.db` to `habits.db.bak` first and say so on the update screen (SY3/SY4 promise nothing about a backup today).
- **Import from the JSON export** (HAB-15 exports; nothing reads it back). Without it a lost phone loses the history. The file carries `version: 1`, categories (name, built-in, order) and each habit's reminders.
- **Legacy column drop (B11):** `habits.icon/color/category` are nullable and unused; a cleanup migration (with `migration-reviewer`) removes them, after the backup above exists.
- **`PRAGMA foreign_key_check` in dev builds** and the four orphan risks listed under "reliability follow-ups" (A7-04): foreign keys stay off on device by decision (ADR 002).
- **`expo-clipboard`**: `npx expo install expo-clipboard` and a dev-client rebuild, so "Copy diagnostics" copies instead of sharing a file.
- **Device-only checks, none of which the web build can show** (phone checklist in the V3-6 report): VoiceOver landing and reading order on every screen, the Magic Tap for a toast's Undo, Dynamic Type at AX1–AX5 (web only emulates AX3), Reduce Motion / Reduce Transparency / Increase Contrast on the pill, a reminder actually firing and not firing (`e2e/README.md`, manual checks 1–7), the share sheet for the export file, drag-to-reorder and swipe-to-archive, the splash → First Run hand-off and the update screen's first paint, the release build's promise-rejection tracking, Hermes timings for Year, the midnight rollover with the phone clock moved, the SF Symbols the web build cannot draw.

### Parked (decided or Later, no date)

- Week-level freeze for × per week habits (own ADR); auto-use freezes; the Settings hub with a page per row; Privacy and Send feedback rows; the per-reminder on/off toggle; iCloud backup row.
- `SlimHabitForm` split behind a shared `useHabitForm` hook; the per-habit streak read model shared by `useHabitsQueries` and the Detail hook; one V3-02 `Header` component for Today / Habits / Progress.
- Skeleton shimmer (it pulses); week-start-follows-iOS (D9, own ADR); logs on disk (A3-10); a lazy db client so an unopenable database shows the error screen.
- The V1/V2 spec-vs-built deviations under "Decided" and the polish items under "Open — polish and small gaps".
- Old summary builders kept as the oracle of `range-summary.parity.test.ts` (V3-3a).

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
- `useQuantitySheetActions.close()` closes even if the last write failed (the sheet shows what is really saved and the error toast stays); the quantity sheet now waits for its slide-out (`motion.sheet.duration`) before the parent drops it (UI fix batch, step 3).

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

- ~~One screen with five groups, not S1's hub with a page per row~~ — **reversed by the owner in the UI fix batch (step 9):** Settings is the S1 hub plus a page per row (Appearance, Evening review, Notifications, Freezes, About; Export stays the export sheet). The next lines describe content that moved onto those pages.
- **Theme is three radio rows** (Light, Dark, System with "Follows iOS"; the old "· now dark" was dropped to match S2), as S2 draws, not the old segmented control.
- **The evening review's time is editable** (step 7): the Time row opens the shared time wheel in a sheet with no days picker; it is stored in `habits.eveningReviewTime` and the default stays 21:30 (the spec fixes none; the frames' 21:00 is not copied). Changing it rebuilds the notifications while the review is on.
- **"Sent only on days with open habits" is built as: only on the weekdays some active habit can be due** (`eveningReviewDays`). It is re-aimed after a habit is created, rescheduled, archived, restored or deleted, and by the launch reconcile. It cannot know at fire time whether today's habits are already done (a local notification has no logic); "closing the day" stays Later.
- **SY6 is the Notifications page** (UI fix batch): one banner with Open Settings at the top, then Affected rows ("4 times on 3 habits", the evening review's time or Off — the latter opens the Evening review page) and "Times stay editable…". The Reminders row is information (there is no all-reminders screen to open, so no R5 link). Allowed or not asked yet, the page shows the state and an Open Settings row (not drawn).
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
- **FR3 and FR4 were drawn without the tab bar (V3-6) — reversed in the UI fix batch (step 4)**: the empty Today now has the bar; only First Run and the FR3 question hide it.
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
- **FR2's Close has no inline error path.** If the seen flag cannot be written the Close does nothing visible (the header sits in the root layout, which has no toast host); the welcome and the suggestions list show an inline banner. A write to local SQLite failing here is far-fetched.
- **`habit-form-screen.tsx` carries the slim mode** (quick-pick logic and about eight `slim` branches) and the root layout holds the FR2 skip handler. Splitting a `SlimHabitForm` and moving the handler into a header component is deferred.
- **Skeleton pulses (opacity), not a shimmer** (08.5 says shimmer); static with Reduce Motion.
- **Suggestions' VoiceOver wording is ours** ("Name, subtitle" with the hint "Opens Add habit with this filled in."; Added in the label): 08.3 has no row for them.
- **SY3 is drawn before the saved Appearance can be read** (it lives in the database that is migrating), so a dark-preference user on a light system sees it light. Device check.
- **`useRolloverQueries` reads the closed day's week on every Today mount**, even with no notice; skipping it until one exists is deferred.
- **Test-only exports knip lists** (new): `suggestionSubtitle`.

## V3-6 step 1 — touch-target audit (done)

How: `VC_AUDIT=1 npm run visual-check` writes each state's rendered pressables to `.visual-checks/audit/` (291 states, 3 900+ targets); everything under 44 pt was grouped by role and label and checked against its `hitSlop` in code (react-native-web ignores `hitSlop`, so a web rect under 44 is only a finding when no slop makes up the difference). The static twin is `src/components/ui/touch-targets.guard.test.ts`: every `<Pressable>`/`Touchable*` in the app must prove 44 × 44 pt from its style and `hitSlop`, or carry a reasoned entry in its exceptions map; a stale entry also fails.

**Fixed** (each was a real 41 pt or narrower hit area):
- Embedded `ListItem` rows (the Reminders rows, "Set exact value", the off-schedule picker rows, the frequency rows): 41 pt high → `minHeight` 44.
- Today row name area in the stacked accessibility layout: 32–41 pt → `minHeight` 44.
- Year map month labels: 44 pt high but 23–33 pt wide → `minWidth` 44 (months start at least 72 pt apart, so no overlap).

**Passes through `hitSlop` (web draws them smaller)**: Month and one-habit/AX3 week day cells (40 pt + 2 pt), compact Restore (36 + 4), small buttons (32 + 8: Dismiss, Restore on Delete's archived card), the reorder handle (28 + 8), Checkbox, Stepper −/+, the tab-bar items.

**Documented exceptions (still under 44 pt)**
- **Week matrix day headers: 44 pt high, 28 pt wide** (cell pitch, P1). Unchanged.
- **Week matrix cells (24 pt) and Year cells (16 pt):** not tappable (08.2).
- **Large-title header buttons while the title collapses**: the title block, including the `+`, gear and Export, scales to 88 % over the first 60 % of the scroll range, so they are 38.7 pt for the moment they are fading out. At rest they are 44 pt and the inline bar's own buttons take over at full size.
- **Adjustable containers** (Stepper value, Insight pager, the daily-target and times-per-week values) report role `slider` to VoiceOver; they are not tap targets, their buttons are separate and 44 pt.
- **Sheet scrim:** a full-screen close target.
- **Not covered by the guard**: a tap handler that is not a `Pressable` (none exist: a syntax-tree scan found no `onPress` on a Text, View or Image) and `GestureDetector` surfaces (swipe rows, the reorder drag).
- **The Checkbox's 44 pt box with a −10 margin** (reviewer-flagged earlier) still reaches into its host row; device-check on Android.
- **AX3 stacked range list overlays the content** (P11) instead of pushing it down; unchanged.

## V3-6 step 2 — accessibility and Dynamic Type (done)

**How Dynamic Type was checked.** react-native-web has no Dynamic Type, so `?textSize=ax` only switched layouts and the screens had never been seen with AX3 *type*. The visual-check harness now scales every text element to the 08.6a AX3 sizes for a state whose route says `textSize=ax` (display 32 → 52, stat 26 → 48, title 20 → 43, body-lg 17 → 40, body 16 → 38, callout 15 → 36, subhead 14 → 36, footnote 13 → 33, caption 12 → 32; the tab-bar labels, the week matrix's day letters and the cells' numbers stay fixed, the inline bar and header pills cap at 1.3x, as the app does) and `VC_AUDIT=1` reports text that is truncated or clipped by its box. 102 AX states (51 screens, light and dark): the 13 that existed plus 38 new.

**Screens and sheets checked at AX3, light and dark:** Today (populated, empty, rest day, at risk, all done, rollover banner, skeleton, load error), Progress (Week, Month, Year, the habit filter sheet, Edit this day from a week block), Habits (library, search, archived, reorder), Habit Detail (stats, history, archived), Add / Edit habit (empty, with errors), First Run (welcome, slim form, Browse suggestions, the FR3 question), Categories (list, rename, delete in use, New category sheet), Reminders (list, the reminder sheet, notifications off), Settings (and its notifications-off state), the quantity sheet (stepper, exact value), the streak-at-risk sheet, Edit this day from Detail, the off-schedule picker, archive and delete confirms (both), Export (choose, ready, failed), the update screen and its failure, the discard alert, the tab bar (bar A) and toasts. Not at AX: the dev-only Today buttons; Progress Month's day card (it is reached through the Year map's month list at AX, drawn by `progress-month-ax`).

**Found and fixed**
- **Toasts clipped at two lines** ("Couldn't update this habit. Try …"): at AX the message wraps in full and the action drops below it, on a 20 pt card (08.6).
- **"1 not due today · Upper body" (Today's fold row) was one line** and cut: wraps at AX.
- **Alert (FR3, F9) was 270 pt wide at AX** and its primary button's label overflowed the pill: the card takes the screen width less 16 pt insets and buttons use a 20 pt radius at AX ("labels wrap inside; button grows; radius 20").
- **Buttons at AX** have radius 20 and centred, wrapping labels everywhere.
- **Week blocks (AX Week): the row total "2 / 3" broke into three lines**: the name wraps before the total does.
- **Inline bar and header pills** (Progress's Export, Detail's Edit, Categories' Done) grew past the 44 pt bar and covered the title: they hold at 1.3x Dynamic Type (`barMaxFontMultiplier`), as iOS's own bars hold theirs. The large title and its stacked buttons still scale fully.
- **Week strip's "Change day" pill**: vertical padding and a 20 pt radius for its wrapped label.
- **Route-entry focus (08.4):** the screen reader now starts on the title of Detail, Settings, Reminders and Categories (a pushed screen's default focus); a sheet's focus was already on its title (`SheetHeader`) and the archive sheet now starts there too; the streak-at-risk sheet starts on Use a freeze (08.3).
- **Re-tapping the selected tab** scrolls its screen to the top and puts the screen reader on the title (08.4; was "does nothing", decided here). It does not pop a pushed screen.
- **Selected chips draw a check** before the label (08.7 asks for a check on chips; the fill alone was the only signal).

**Colour is never the only signal (08.7), audited per row:** done (check + status text + VoiceOver "done"), partial (corner notch, pie, "5 of 8"), missed ("Missed" in history), Break (amber + "Break" tag, resistance copy), at risk (text "Missed Thursday · 1 freeze left"), frozen (dashed border, "Frozen", legend), reset (notice text), bonus (dot + "Bonus" tag), before start / future (dashed / hairline), error (`!` symbol, error copy, focus), selected (check on chips, weight on tabs, check in the segmented control, VoiceOver "selected"), category (name always shown), slipping ("slipping" in status). **Exception:** the weekday chips (M T W T F S S) show selection by fill (ink) against a ring only, with VoiceOver "checked"; a check would not fit a 44 pt circle with a letter.

**Reduce Motion — every animation and what it does instead**

| Animation | Default | Reduce Motion |
|---|---|---|
| Completion circle press | scale 92 % | opacity only, no scale |
| Fill (progress bar, column chart bars, ring) | 450 ms ease | jumps to the value |
| Indeterminate bar (export, update screen) | a segment sweeps | the segment sits still |
| Week strip day switch | 160 ms slide + fade | crossfade only |
| Today list (rows reflow, the progress bar enters and leaves) | 200 ms layout transition, fade | no layout animation; 150 ms crossfade |
| Collapsing header (Today, Progress, Habits) | scroll-linked shrink and fade, settles on the nearer end | no interpolation and no settling scroll; 150 ms crossfade past the middle |
| Sheets | slide | fade |
| Alert dialog | fade | fade (unchanged) |
| All done check | draws left to right, 600 ms | drawn, static |
| Skeleton | pulse (opacity) | static blocks |
| Tab bar press and the selected capsule | 98 % scale, capsule fade | 70 % opacity flash, 150 ms crossfade |
| Insight pager paging | animated scroll | no animation |
| Reorder drop | settles over the settle duration | 0 ms (the lift is a shadow, never a scale) |
| Re-tap scrolls to top | animated | no animation |
| Screen pushes and modals | iOS spring | iOS's own system crossfade |
| Toast | **no animation is built** (appears and goes) | n/a; 08.5's rise + fade is in the toast fix batch |

**Not verified without a device (all of 08.3/08.4's dynamic parts):** that VoiceOver lands where the code asks (the focus API is mocked in tests), reading order inside each screen, the Magic Tap for a toast's Undo, Full Keyboard Access, Switch Control, Large Content Viewer on the tab bar, the real AX1–AX5 type sizes (web emulates AX3), the pill's Reduce Transparency and Increase Contrast modes, Reduce Motion on the animations above.

**Left as they are:** the **skeleton pulses** (opacity) where 08.5 says shimmer; the **collapsing header's buttons** are 38.7 pt while the title scrolls away (see step 1); **SF Symbols render blank on web**, so AX frames show some squares without glyphs.

## V3-6 step 3 — earlier batches' small items (done)

- **V3-4a nits fixed:** `DetailActions` draws Delete's minus through `IconBadge` (new `minusColor`); `WeekHistoryCard` uses `Container variant="summary"`; `habitHistoryRows` looks back at most 366 days instead of walking to the habit's creation; the archive sheet has initial focus (its title).
- **V3-4a nit moved to "parked":** `useHabitsQueries` and the Detail hook each do the per-habit streak pass inside the hook (a shared read model is its own refactor).
- **V3-5 fixed:** FR2's Close now has an inline error path (`skipFailed` in `first-run-offer-store`; the form shows "Couldn't continue. Try again." above Save); the skip handler left the root layout for `useFirstRunSkipActions`; the quick-pick logic left `habit-form-screen` for `useQuickPickActions` and `QuickPicks`; the streak-at-risk sheet is pinned at the moment it opens (day, habit, streak and freezes), like the quantity sheet — it no longer changes or closes under the person at midnight. **What the pin does not do:** spend a freeze for a day the grace window has since closed. On "Use a freeze" the live read must still name the same missed day, otherwise nothing is written and a toast says "Too late for a freeze on Sat 3. The streak restarts with your next log."
- **V3-5 deferred again, with the reason:** splitting a `SlimHabitForm`. Five layout branches on `slim` remain in `habit-form-screen.tsx` (which sections show, and their order); a real split needs the form state, submit and leave guard moved into a `useHabitForm` hook that New, Edit and FR2 share, and that is a refactor of the most-tested screen with its own review.

## Open — V3-4b step 7–9 (copy, accessibility, final frames)

- **Focus moves to the error only where there is one to reach.** Save is dimmed while any field issue exists (its reason is its VoiceOver hint), so a failed *submit* is a failed save: focus then moves onto the error above Save. A field error that appears while typing is an `alert` read where it sits. Sheets start VoiceOver on their title (`SheetHeader`) and hold it inside (`accessibilityViewIsModal`); a finished or failed export moves focus onto the file or the error.
- **Verified by test, not on a device:** labels, roles, hints, selected and checked state, and that the focus call is made (the focus API is mocked). Whether iOS lands on the right element, the reading order and Reduce Motion behaviour are device checks (see the phone checklist in the V3-4b report).
- **Touch targets:** every new control is 44 pt or more (RemoveButton, the reminder and Settings rows, the format control, buttons, the Banner link, the reorder handle's 28 pt + 8 hitSlop). No exception.
- **Time row chevron and icon squares are blank on web** (SF Symbols), so Settings' Time and Export rows show no chevron or glyph in the baselines.
- **Settings dark twins were light** until the final pass (a forced `theme=light` route); fixed. S2 now draws System selected, as its note says.
- **Test-only exports that knip still lists** (new since V3-4a): `useExportStore`, `refreshEveningReview` (also used inside its own file), `ReminderWithConflicts` — tests import them.
- **Check on a device:** every `SheetHeader` now starts VoiceOver on its title, including the sheets with a text field (New category, Quantity log); the focus may compete with the field's keyboard.
- **Left for later (V3-6 / owner):** Privacy and Send feedback rows (no spec); a hub-style Settings with a page per row; the per-reminder on/off toggle (Habit Detail still says "All off" for a legacy off time); real-device checks of notifications, the share sheet and VoiceOver.
