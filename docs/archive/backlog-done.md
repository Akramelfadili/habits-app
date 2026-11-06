# Backlog archive — done and stale entries

Moved verbatim from `docs/backlog.md` (batch 8). History only: **never read by default**. Find an item with `grep -n '<ID or words>'`. Entries keep their original section; **Done** shipped (with its "As built" note), **Stale** is obsolete, superseded or a duplicate of an entry that stayed.

## Where things stand (end of V3-6)

### Done

- **Dev buttons on Today (A1-06)** — chore/remove-dev-controls. Removed, not relabelled: the four buttons (Clear all habits, Seed streak-at-risk habit, Seed habit with history, Reset First Run), `useTodayDevActions`, `TodayDevButtons`, `dev/dev-seeds.ts`, the `useHabitActions` clear and seed actions, `useFirstRunActions.resetFirstRun`, and the repository helpers only they used (`deleteAllHabits`, `createHabitAt`, `deleteSetting`, native and web), with their tests. Four hook tests that backdated habits now use `backdateHabit` in `src/lib/db/test-db.ts` (test-only). The web and device-validation fixtures in `dev/`, the `habitsapp://dev-state` hook and the other `__DEV__` code (clock pin, text size, logger) stay. Guard: `check-architecture` rule `no-dev-in-ui` fails if hooks, components, screens, presenters or routes import `dev/`, or if the removed helper names or a `(dev)` label appear in production code. The old entry below ("in a release build") is history. Original text: (`today-screen.tsx`). The ghost "Add habit" link is gone (audit B9: a header `+` replaces it; the empty state keeps its primary button). The dev buttons are gated on `__DEV__`; they need a "Developer" label, and the seed code should move out of production hooks (audit A1-06).
- **Add habit: Save bar over the last field (device)** — UI fix batch, step 6. Not reproducible on the web: the Save bar is in the column under the scroller (not an overlay), and the new `form-new-errors-end` / `-ax` visual-check states scroll to the end and *fail the capture* if the last field ends under it (it clears it at 393 × 640 and at AX3). Suspected device cause fixed: when errors or the reason make the bar taller the scroller shrinks, and a form resting at its end kept its offset, leaving the last field under the bar until the next scroll; the form now follows the end (`scrollToEnd`, no animation) when the bar grows while it rests there. No extra bottom inset was added: the bar itself is the inset, so one would only add blank space. Needs the phone to confirm. **Back affordance:** Detail, Settings, Reminders, a Year month and Categories show a back button whenever they are pushed (`headerBackOptions`: nothing only when there is nothing to go back to, i.e. the simulator captures that open them directly); the root modals carry Cancel / Close. Pinned in `navigation.test.tsx`.
- **Progress sticky header and the Year insight** — UI fix batch, step 8. (1) The two lines above and below the range switcher were the inline bar's own bottom hairline plus the pinned block's hairline, with the switcher touching the bar; and Export, a 44 pt pill inside the 44 pt bar, touched its top and bottom edges. Now: the bar draws no hairline on Progress (`CollapsedHeaderBar hairline={false}`), the pinned block carries the only one, it has 8 pt of air above the control (`PINNED_PADDING_TOP`), and Export is a `compact` pill (36 pt drawn, 4 pt slop above and below keep the 44 pt target; documented in the touch-target guard). New states `progress-{week,month,year}-sticky` measure all of it and fail the capture otherwise. (2) The Year insight ran off the right edge because, before the pager was measured, its pages were `width: "100%"` inside a horizontal scroller, which has no width to take, so the text stayed on one line; until measured the first card now sits in the pager's own column, and the card's text column has `minWidth: 0`. Not reproduced on the web at any size (the new `progress-year-insight` / `-ax` states check the wrap and pass), so the fix is from the cause above; look for it on the phone on Year when it first opens. Harness note (fixed in step 11): states on a lazily bundled route were captured blank with Metro's own `app/….tsx` bar showing, as large identical diffs; the harness now waits for that bar and the "Bundling…" fallback to go before capturing.
- **Today's "(dev)" buttons in a release build** — UI fix batch, step 10. They were already gated: each button renders only when its action exists, and every action (`clearAllHabits`, both seeds, `resetFirstRun`) is `__DEV__ ? … : undefined`, the same flag as the other dev code (`deleteSetting`, `deleteAllHabits` refuse outside it, the web clock pin and text-size override check it); `__DEV__` is false in a Release build, so Metro strips them. What was missing was a test across the whole wiring: `today-dev-buttons.production.test.tsx` renders the real hooks and buttons (list and empty state) with `__DEV__` false and fails if any "(dev)" label shows (removing the gate on Clear all was checked to fail it), and fails if a "(dev)" button label is written outside `today-dev-buttons.tsx`. They are visible in Expo Go, which is a development build.
- **Spec review of the batch (step 11 follow-up):** fixed — `ToastRouteWatcher` no longer dismisses a toast on navigation with a screen reader on (HAB-48: kept until dismissed), its bookkeeping and the quantity sheet's `onClosed` ref moved out of render, `MoveButton`'s fallback glyph takes a text style, design-system entries for `MoveButton`, `SettingsPage`, `NotificationsOffBanner`, the compact pill and the bar/pin props. Left as is: `ToastHost` animates on the JS thread (`useNativeDriver: false`, like the week strip) — switch if it janks on the phone; the Back titles "Settings" / "Habits" / "Year" stay literals in the stack layout, as before.
- **Toast animation and dismissal** — fixed in the UI fix batch, step 2: one `ToastHost` path for every toast (the catalogue in `messages.ts`, `runSafely` errors, Undo toasts, sheet toasts): fade + 12 pt rise in over 200 ms, 200 ms exit, 150 ms crossfade under Reduce Motion, a newer toast swaps in at once, tap or swipe dismisses, a toast up longer than 600 ms goes when the screen changes (`ToastRouteWatcher`; a toast raised by the navigating action survives). Info and success now hold **3 s** (was 4 s, the owner asked for shorter); Undo stays 5 s, warning 6 s. Not verified without a device: the feel of the timing.
- ~~After Skip on First Run, Progress and Habits are unreachable~~ — fixed in the UI fix batch (step 4): only First Run hides the bar; the Skip flake (stale "seen" flag bouncing back to the welcome) is fixed with `leftFirstRun`.
- **`--update-baseline` refuses the dev server's blank "Bundling…" page** (flat rgb 242 over 60 % of the capture). V3-6 committed three such baselines (`reminders-at-cap`, `today-empty-ax`, `-dark`) before a re-run showed them; they were recaptured and checked by eye.

### Stale

- **Break habit circle "did nothing" at 15:30 (simulator)** — UI fix batch, step 5: not a bug in the rule. The 18:00 hour (`EVENING_STARTS_AT_HOUR`) only changes the status line ("Resisting" → "Resist tonight"); the circle logs at any hour (spec: "the circle always logs") and always toasts "Resisted '…'" with Undo. Pinned with the clock at 15:30, 17:59 and 18:00 in `today-screen.test.tsx`. The simulator miss is unexplained by code: the only silent write path is `writableDay()` skipping a tap when the render's day differs from the clock's (a rollover), and a failed write toasts an error. If it recurs, check whether the row was already resisted (a tap then un-resists, with a "not resisted" toast) and whether the tap hit the name area, which opens Detail.
- **Step 11 — states and what a device must still confirm.** New visual-check states that *assert* (fail the capture) rather than only compare: `today-v3-strip-browsed` (touch-swipe back a week, choose a day, scroll: the strip is on screen at full opacity, seven labelled day buttons), `form-new-errors-end` (+ `-ax`), `progress-{week,month,year}-sticky`, `progress-year-insight` (+ `-ax`). Not capturable by a static baseline: a toast entering and leaving, a sheet mid-slide, a real drag, the collapse on a phone. **Phone checklist** — Today: slide back a week, tap a day, scroll, tap the empty area: the strip stays; the strip's dates must not peek under the small "Today" title while collapsing (still open, see above); VoiceOver reads each day as a button. Toasts: in/out feel (200 ms), Undo 5 s, info 3 s, a tap or swipe dismisses. Quantity sheet: open and close it, open Set exact value with the number pad, no sliver at the top. First Run → Skip: Today shows with the bar, Progress and Habits open, no bounce back to the welcome. Break habit circle logs at 15:30. Add habit: with errors, scroll to the end, nothing under Save. Reorder: the Move up/down buttons work; try the grip too. Progress: scroll with the switcher pinned (one hairline, Export clear); Year's insight wraps. Settings: every row opens its page and Back reads Settings.
Built on `chore/ios-simulator-validation` and merged (#36, #37); the workflow file is on the default branch and has since been run on GitHub Actions (successful `workflow_dispatch` runs on 2026-11-04). The groups below were written before that first run and have not all been refreshed from its results.

- **Bugs found on the simulator:** _none recorded yet._ Named in advance for the first run's videos: Today's day strip hiding and reappearing after a past day is chosen and the list is scrolled; toast dismissal (measure the time to hide, `scripts/device-validation/flows/toast.yaml`); the quantity sheet leaving part of itself at the top (`partial-sheet.yaml`); whether the tab bar is reachable after First Run → Skip (`first-run-skip.yaml`).
- **Device-only / not reproducible by the run:** the migration screens (`migration-running`, `error-screen-migration-failed`, `…-first-open`), `today-loading`, `today-load-error` and every state with `failWrites=1` (all simulated by the web repositories only), and states whose `interact()` needs a pointer drag, `locator.last().click()` or a key press in a field (`habits-reorder-lifted`, `edit-habit-legacy-name-edited`, the "Add category" taps…). `node scripts/device-validation/plan.mjs` prints the exact list with reasons (40 of 369 at the time of writing; 102 states open from the route alone, 227 are replayed as Maestro steps).
- **Unverified assumptions in the workflow** (fix them from the first build log): the `macos-26` label and Xcode 26 on it, `expo prebuild` accepting the injected bundle identifier, the `main.jsbundle` freshness check (modification time against the build's start), Maestro's iOS selectors (`text:` for accessibility labels, `index`, `scrollUntilVisible`) matching the translated steps, and the screenshot settle time (`SETTLE_MS`, 4.5 s) being enough for the Release app to open a state. A capture under 20 KB is retaken once and reported as blank.
- The V1/V2 spec-vs-built deviations under "Decided" and the polish items under "Open — polish and small gaps".
- Old summary builders kept as the oracle of `range-summary.parity.test.ts` (V3-3a).

## Open — product decisions and unbuilt spec rules

### Done

- ~~**Category order on Manage and Today** (HAB-19).~~ Done in V3-0b: both group by the stored `categories.sort_order` (migration 0011), so they still agree. The reorder UI is HAB-42.

### Stale

- **Manage keeps the pushed back button and the "Habits" title, with no "Done"** (HAB-19, mockups D3/E2/E3 show a modal-style "Done"). Revisit if Manage becomes a modal or a tab destination.
- **C1 omits the Last week / This week switch** (HAB-16). The Weekly mockup shows only the Week / Month / Year switcher; the V1 compact switch is kept because HAB-16's rule is that the range switcher is the only change to Weekly. Decide whether C1 means it to go.
- **Yearly shows only the current year.** No way to look at last year; January opens on a nearly empty "<year> so far". Consider defaulting to the last full year for the first weeks of January (Monthly no longer opens on the last complete month: D15, V3-3a). The new `useProgressYearQueries({ year })` already takes a year; the old Yearly screen does not.

## Open — UX and accessibility follow-ups (audit B8/B9)

### Stale

- **`?addTime=<day>` adds the reminder on arrival** (with the OS permission prompt, like "Add a time"); dismissing the time picker leaves the default-time reminder, which can be removed with Undo. If the day isn't one the habit can fall on, the new reminder falls back to every schedulable day (untested edge).

## Open — reliability follow-ups (audit B6)

### Stale

- **`expo-clipboard` is not installed yet.** "Copy diagnostics" falls back to sharing a `diagnostics.txt` file until it is: `npx expo install expo-clipboard`, then rebuild the dev client (native module).
- **No `habits.db.bak` before migrating** (A7-08). The migrator is one atomic transaction, so a failed run leaves the old schema; Retry mainly helps with transient errors. A backup would only matter for a migration that succeeds with wrong data.

## Open — tidy-ups

### Stale

- **Legacy `habits.icon/color/category` columns** are nullable and unused until a cleanup migration (HAB-24).

## Open — V3 foundations (V3-0b)

### Stale

- **V3 tokens are defined but unused** (HAB-28). `textStyles`, `space`, `radius` (+ `cellRadius`/`squareRadius`), `elevation`, `focusRing`, `minTouchTarget`, `motion`, `accent` and `pillBg` live in `src/theme/theme.ts`; no screen uses them yet. Each V3 batch moves the screens it rebuilds onto them, and deletes the retired `typeScale` sizes it no longer needs.
- **Spacing and radius literals move to tokens per batch, not in one sweep** (HAB-28, ADR 004). Baselines at V3-0b: `spacing-literals` 274, `radius-literals` 55, `off-scale-font-sizes` 56. Each V3 batch moves the screens it rebuilds onto `space` / `radius` / `textStyles`, then runs `npm run ratchet:update`. V3-6 checks what is left.

## Open — V3-3a (Progress data layer)

### Done

- The Progress tab reads the new hooks (V3-3b). The week hook takes an `anchor` date, but there is no week pager in the spec, so nothing passes one.

## Open — V3-2b (Today UI)

### Stale

- **Header buttons on web:** the `+` is drawn from two bars, not an SF Symbol, so it shows on web (the blank circles in older baselines). The gear on Habits still uses a symbol (V3-4).
- **Picker, Detail and other screens** still use their pre-V3 spacing/type where not listed in this batch; the ratchet counts fell (spacing 251 → 209, radius 53 → 38, font-size literals 23 → 17, off-scale sizes 56 → 48) and keep falling per batch.

## Open — V3-2a (Today logic)

### Stale

- **Settings exposes the pool but does not show it.** `useSettingsQueries().freezePool` (size, used this month) is ready for S4's "used this month" row (HAB-44).
- **`freezesUsedThisMonth` / `freezePool` have no reader yet** (spec review): pre-wiring for S4's "used this month" (HAB-44); delete if HAB-44 changes shape.
- **`quantity-log` is opened from the count control** in the visual check (a tap on the circle adds one now).

## Visual-check

### Done

- **`today-menu-open`, `today-empty-menu-open`, `today-menu-open-dark` and the menu states on Weekly/Monthly/Yearly were flaky** (a 74 px popover offset). Root cause and fix: see `docs/archive/audit.md` A10-10 and the B3 hardening notes in `docs/how-to/dev-tooling.md`. **Deleted in V3-1** with the ⋯ menu itself, along with `waitForMenuSettled`.
- **V3-0b (122 baselines):** the single Habits tab (HAB-26) and the new category colours (Health/Social, plus fixture customs 0011 moves off dropped hues). The web fixtures now model an upgraded device (V2 slots, then 0011's remap), and a test pins them to the SQL. Expo's dev-tools button (bottom left) can appear in a capture on the current Expo; recapture that state if it does, and never accept it into a baseline.
- Baselines re-captured over time: `retro-log` (D4), `delete-confirm*` (E7), `habit-detail-no-freezes` (D6); added `rest-day-picker*`, `rest-day-logged`, `habit-detail-bonus`, `delete-confirm-dark`, `delete-confirm-archived`.
- **V3-1 (114 baselines: 14 new, 100 updated).** The tab bar is on every screen inside the tabs, so almost everything moved; the cause per group is in the baseline commit's message. Two faults were found by the renders themselves (the pill covering First Run's primary button, Today stacking a third bottom gap) and fixed.
- **The V3-1 recapture committed ~33 blank baselines and four stale ones — one root cause (fixed in V3-2a).** The harness pinned the page clock with Playwright's `setFixedTime`, which froze React's own clock, so a lazily loaded route never revealed past its Suspense fallback ("Bundling…"): Month, Year, Manage, Detail, Settings, Categories, Reminders (and their dark and long-name twins) were captured as an empty page with the pill, and `yearly-insights` timed out waiting for text that never rendered. It went unseen because a blank capture equals a blank baseline. The harness now uses `setSystemTime` (pins the date, lets time run); 37 baselines were recaptured, each one blank or pre-V3-1 before. `manage-habits-archived-toast` is separate: react-native-web only, the archived row unmounts with a queued Swipeable update and gesture-handler's web NodeManager throws "No handler for tag N" (native ignores a missing handler) — the state now ignores that one message and dismisses the dev LogBox toast. **When reviewing a recapture, look at the image, not only the diff count.**

## Open — V3-3b (Progress UI)

### Done

- **Rate ring (V3-09): deleted.** No frame draws it — P7 shows the month's rate as a tile — so it was removed rather than kept unused (see `docs/design/design-system-v3.md`).
- **Delete candidates at the end of V3-4 (sparkline, mini month, year strip): deleted in V3-4a.**
- **Performance:** Year (5 y × 20 habits, through the real hooks) opens in ~260–300 ms cold and ~220 ms warm in Node, from 375–460 / 330–350 before the heat map and the summary shared one classification of the days (`classifyRangeDays`). On Hermes expect 2–5×; if it is felt on a device the next step is classifying once for the previous year only when "+N pts" needs it. Week fell 727 → 169 ms earlier by making `fromDayKey` read the three fields instead of `parseISO`.

### Stale

- **Maestro `hab-11` is rewritten for the new screen but was not run.**

## Open — V3-4a (Habits tab, Habit Detail, delete and archive sheets)

### Done

- **Review nits left (spec-reviewer, V3-4a):** `DetailActions` draws its own minus icon square (extend `IconBadge`); `WeekHistoryCard` repeats `Container`'s card chrome; `useHabitsQueries` does the per-habit streak pass inside the hook (the Detail hook does the same); the archive sheet has no initial focus (the spec asks for it only on Delete); `habitHistoryRows` walks back to creation when fewer than ten days qualify.
- **Resolved (V3-6, 2026-11-03):** Maestro `hab-13-12-archive-restore-delete` (then `hab-13-manage-archive-delete`) described the old Manage screen. All six flows were rewritten for the three tabs and pass.

## Open — V3-4b (Add / Edit habit form, Categories)

### Done

- **Suggestion prefill arrives as the `prefill` route param** (a JSON string, `parseHabitPrefill`) or the `prefill` prop; Browse suggestions (V3-5) pushes `/new-habit?prefill=…`.
- **`Button` gained `rowAction` / `dangerLink`** (quiet ink and danger text actions inside a row); `Rename` and `Delete` are no longer the old outlined small pills.

## Open — V3-4b step 4 (Reminders)

### Done

- **One sheet for adding and editing**: `ReminderSheet` (time wheel + days) replaced the time-only sheet; Add time opens it on 09:00 on the days the habit falls on, and nothing is written until Save (it used to write a default row first).

## Open — V3-4b step 5 (Settings)

### Done

- ~~One screen with five groups, not S1's hub with a page per row~~ — **reversed by the owner in the UI fix batch (step 9):** Settings is the S1 hub plus a page per row (Appearance, Evening review, Notifications, Freezes, About; Export stays the export sheet). The next lines describe content that moved onto those pages.
- **The evening review's time is editable** (step 7): the Time row opens the shared time wheel in a sheet with no days picker; it is stored in `habits.eveningReviewTime` and the default stays 21:30 (the spec fixes none; the frames' 21:00 is not copied). Changing it rebuilds the notifications while the review is on.
- **`SettingsGroup`, `ScopeChip` and the settings-helpers copy (appearance caption, evening footnote, diagnostics strings, export row subtitle) are deleted**; their copy lives in `settingsCopy` and the toast catalogue.

## Open — V3-4b step 6 (Export)

### Done

- **The progress bar is a real percentage** (entries written ÷ entries), as EX2 draws, not indeterminate: the serializer reports it per habit chunk. It still reads "Usually under a second" because it is.
- **The export lives in a store (`useExportStore`)**, not in the sheet: closing the sheet while it writes leaves it running, a toast ("Export ready · habits-….json") says when it is ready, and a failure while closed toasts an error; either way the next open from Settings or Progress shows where it stands. The toast has no action; the file card is behind Export data.
- **Export from Progress** opens the same sheet (Progress, Month and Settings share one store), so a running export started from one entry is seen from the others.

## Open — V3-5 (first run, suggestions, system states)

### Done

- **FR3 and FR4 were drawn without the tab bar (V3-6) — reversed in the UI fix batch (step 4)**: the empty Today now has the bar; only First Run and the FR3 question hide it.
- **The update screen only shows on an upgrade** (a read-only look at `__drizzle_migrations` against the journal, before the migrator), is up 100 ms before the migrator starts so it can be painted, and drops the splash itself. The migrator is untouched. A fresh install and an up-to-date launch show nothing.
- **Nothing guards "No habits or history are deleted" for future migrations except a test** that fails on `DELETE FROM`, `DROP COLUMN` or a `DROP TABLE` outside the migrator's own scratch tables.
- **`ErrorScreen` now has the SY4 layout everywhere** (hero title, reassurance line, optional reason banner, Try again, secondary Copy diagnostics), including the root boundary; its three fixed strings ("Try again", "Copy diagnostics" and the copy results) stay in the component because it is shared infrastructure with no catalogue.
- **Web only:** `?fixtures=today-loading`, `today-load-fails`, `migration-running`, `migration-fails`, `migration-fails-first-open` reach SY1–SY4; a page keeps the fixture scenario and `textSize` it opened with, because First Run redirects and drops the query. There is no fail-once: React retries a throwing render itself.

### Stale

- **FR2's Close has no inline error path.** If the seen flag cannot be written the Close does nothing visible (the header sits in the root layout, which has no toast host); the welcome and the suggestions list show an inline banner. A write to local SQLite failing here is far-fetched.
- **`habit-form-screen.tsx` carries the slim mode** (quick-pick logic and about eight `slim` branches) and the root layout holds the FR2 skip handler. Splitting a `SlimHabitForm` and moving the handler into a header component is deferred.

## V3-6 step 1 — touch-target audit (done)

### Done

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

### Done

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

### Done

- **V3-4a nits fixed:** `DetailActions` draws Delete's minus through `IconBadge` (new `minusColor`); `WeekHistoryCard` uses `Container variant="summary"`; `habitHistoryRows` looks back at most 366 days instead of walking to the habit's creation; the archive sheet has initial focus (its title).

- **V3-4a nit moved to "parked":** `useHabitsQueries` and the Detail hook each do the per-habit streak pass inside the hook (a shared read model is its own refactor).

- **V3-5 fixed:** FR2's Close now has an inline error path (`skipFailed` in `first-run-offer-store`; the form shows "Couldn't continue. Try again." above Save); the skip handler left the root layout for `useFirstRunSkipActions`; the quick-pick logic left `habit-form-screen` for `useQuickPickActions` and `QuickPicks`; the streak-at-risk sheet is pinned at the moment it opens (day, habit, streak and freezes), like the quantity sheet — it no longer changes or closes under the person at midnight. **What the pin does not do:** spend a freeze for a day the grace window has since closed. On "Use a freeze" the live read must still name the same missed day, otherwise nothing is written and a toast says "Too late for a freeze on Sat 3. The streak restarts with your next log."

- **V3-5 deferred again, with the reason:** splitting a `SlimHabitForm`. Five layout branches on `slim` remain in `habit-form-screen.tsx` (which sections show, and their order); a real split needs the form state, submit and leave guard moved into a `useHabitForm` hook that New, Edit and FR2 share, and that is a refactor of the most-tested screen with its own review.

## Open — V3-4b step 7–9 (copy, accessibility, final frames)

### Done

- **Focus moves to the error only where there is one to reach.** Save is dimmed while any field issue exists (its reason is its VoiceOver hint), so a failed *submit* is a failed save: focus then moves onto the error above Save. A field error that appears while typing is an `alert` read where it sits. Sheets start VoiceOver on their title (`SheetHeader`) and hold it inside (`accessibilityViewIsModal`); a finished or failed export moves focus onto the file or the error.
- **Touch targets:** every new control is 44 pt or more (RemoveButton, the reminder and Settings rows, the format control, buttons, the Banner link, the reorder handle's 28 pt + 8 hitSlop). No exception.
- **Settings dark twins were light** until the final pass (a forced `theme=light` route); fixed. S2 now draws System selected, as its note says.

### Stale

- **Time row chevron and icon squares are blank on web** (SF Symbols), so Settings' Time and Export rows show no chevron or glyph in the baselines.
- **Left for later (V3-6 / owner):** Privacy and Send feedback rows (no spec); a hub-style Settings with a page per row; the per-reminder on/off toggle (Habit Detail still says "All off" for a legacy off time); real-device checks of notifications, the share sheet and VoiceOver.

## Pruned from the device findings (batch 8, step 3)

The UI fix batch's device findings, as they stood before the prune. The fixes shipped in that batch (see HAB-30 "As built" and its siblings); what is still open stays in `docs/backlog.md` under "Open — device findings and phone checks".

### Done

- **Today's day strip** — fixed in the UI fix batch (step 1, see HAB-30 "As built"). **Still open:** on a real iPhone the strip's dates showed cut off under the small centred "Today" title during the collapse; no cause was found from the code (the strip stays below the bar until the range ends, and the bar's background is opaque by then), so it needs the phone or a decision to harden the bar (background before the title). 
- **Partial sheet at the top (quantity sheet)** — step 3 of the UI fix batch. Not reproduced from code or on the web (a still capture is right; the harness's web Modal has no slide). Found and fixed: (1) RN 0.88's `Modal` keeps drawing its *current* children while it slides out, so a sheet whose caller blanks its content on close (`draft !== null`, `usage !== null`, `habit !== null`: reminder, delete-category and first-run-reminder sheets) shrank to its chrome mid-slide; `Sheet` now keeps the content it last showed until the slide-out ends; (2) the quantity sheet was torn out of the tree the instant it closed (the parent dropped it), now it closes with the slide and is dropped after `motion.sheet.duration`. **Still to look for on the phone** if a sliver remains: `KeyboardAvoidingView behavior="padding"` inside the Modal while the number pad opens (Set exact value) or closes, which animates padding with a LayoutAnimation that can catch Today's list underneath. Sheets have no drag-down gesture (the grabber is drawn only); `partial-sheet.yaml`'s swipe does nothing by design.
- **Reorder (Habits and Categories) did not work on the phone** — UI fix batch, step 7. **Cause not found without a device.** Checked by reading: `GestureHandlerRootView` wraps the whole app (the reorder screens are tab/stack screens, not modals, so they are covered); react-native-gesture-handler 3.3.0, react-native-reanimated 4.7.1 and react-native-worklets 0.13.0 are exactly Expo SDK 58's bundled versions (`expo/bundledNativeModules.json`), and gesture-handler 3's `GestureDetector` still accepts the `Gesture.Pan()` builder we use; the drop maths (`dragTargetIndex`, `groupBounds`, `moveItem`) and the persisted `sort_order` (`reorderHabits`, `reorderCategories`) are unit-tested and correct. The drag itself runs in worklets, which Jest cannot run, so it has never been exercised by a test. Suspects for the phone: the list's own `ScrollView` pan competing with the grip's pan (the grip has no `blocksExternalGesture`, and the list does not lock scrolling while dragging), the grip's 28 pt size, and Expo Go's worklet runtime. **So the drag is no longer the only way:** every row in reorder mode now has visible Move up / Move down buttons (`MoveButton`, 44 pt, disabled at the ends of the group, labelled "Move Meditate up") as the primary mechanism, the grip stays for dragging and the VoiceOver Move up / Move down actions are unchanged. If the drag never works on the phone, drop the grip.
