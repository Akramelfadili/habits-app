# Habit Tracker — V2 Feature Spec

Continues `docs/feature-spec.md` (HAB-01–HAB-13, V1). Same format: each ticket names the screens/frames it covers from `HabitFlowV2.dc.html`, the rules that govern it, and the edge cases a plan must account for before `/implement-feature` runs. Mockup frame IDs (A1, F2b, etc.) refer to that file; component IDs (NEW-07, VAR-14, etc.) refer to `habit-components.js`.

Numbering continues from V1: **HAB-14 → HAB-25**.

---

## HAB-14 — Navigation entry point
**Frames:** A1–A6
**Replaces:** the temporary "Weekly summary" / "Manage habits" buttons on Today.

**Rules**
- A single `⋯` button sits in the Today title row, in the same position across all four Today states (populated, empty, rest day, day closed).
- Tapping it opens a popover menu: Week / Month / Year summaries, Manage & archive, Settings — in that order (frequency-first: summaries used daily, management occasionally, settings rarely).
- Each menu row carries live context (e.g. last export date under Settings, archived count under Manage) so the menu doubles as a glance, not just navigation.
- Closing: tap the scrim or `⋯` again. No swipe-to-dismiss requirement beyond standard sheet/popover behavior.

**Edge cases**
- Empty state (no habits yet): `⋯` stays reachable — Settings must be usable before the first habit exists. Summary rows are present but disabled, each with an inline reason, rather than hidden — so the menu's shape never shifts once data exists.
- Rest day: "Log something anyway" now opens the habit picker (HAB-18 / D1), not the New Habit form — this is a V1 behavior change, not new UI.
- Day closed: tomorrow's rows in the menu/summary context show each habit's own reminder badge; a habit with no reminder shows no trailing time at all (no dash, no "none" placeholder).

**Out of scope:** the summary screens themselves (HAB-16, HAB-17), Manage itself (HAB-19), Settings itself (HAB-15).

**As built (HAB-14), deviations until the dependencies land**
- ~~Settings is a temporary deviation~~ — **resolved by HAB-15:** the Settings row is enabled and navigates, in every Today state including the empty one, so "Settings must be usable before the first habit exists" is now met. Its subline reads "Last export: <date>" after the first export, otherwise "Appearance, evening review, export". Month is live since HAB-16 (a live subline, or "Unlocks <date>" under a month of history); Year (HAB-17) is still "Coming soon" once habits exist, marked `TODO(HAB-17)` in `today-nav-menu.tsx` and `use-today-menu-queries.ts`.
- **Rest day's "Log something anyway" still opens New Habit.** The spec wants the HAB-18 habit picker (D1); it is marked `TODO(HAB-18)` in `today-screen.tsx` and flips when HAB-18 is built.
- The weekly row's subline reuses the Weekly screen's hook and shows the week it opens on; tomorrow rows show the earliest *enabled* reminder that fires on tomorrow's weekday.

---

## HAB-15 — Settings & local data export
**Frames:** B1–B6
**New screen.**

**Rules**
- Appearance: Light / Dark / System, reflected immediately. If System, the caption reports what it currently resolves to on this device.
- Evening review toggle now lives here (moved from per-habit Reminders — see HAB-21) because it applies globally, not per habit. Scope is shown explicitly via a chip/caption ("All habits").
- Export: confirm → in-progress (determinate, ~1s, sheet does not navigate away) → success (offers "Share file…" via iOS share sheet, or "Save to Files") → or failure.
- Archived habits are included in the export by default; the confirm step states this.
- Settings shows "Last export: <date>" after a successful export, "Today" if same-day.

**Edge cases**
- iOS notifications off at the OS level: the evening-review toggle stays visible and on, but a notice explains why nothing will actually arrive — don't silently disable it.
- Export failure: state why, what's needed, and confirm nothing changed. "Try again" reuses the same export options (doesn't reset to confirm-from-scratch).
- Cancel during progress: discards the partial file; no partial file left on disk.

**Depends on:** HAB-14 (entry point).

**As built (HAB-15)**
- **Appearance is app-wide, not just on Settings.** The choice (`app.themePreference` in `app_settings`: light / dark / system) is held in a small store (`theme-preference-store.ts`) that `useTheme()` reads; an explicit Light/Dark always beats the OS scheme, System follows it. On every change and at startup it also calls `Appearance.setColorScheme` — this RN version's name for "follow the OS" is `'unspecified'` (the web docs say `'auto'`) — so the keyboard, status bar and system sheets follow the choice. `app.json`'s `userInterfaceStyle` is `automatic`. The root layout holds the splash until the stored choice is applied, so a dark-mode cold start shows no light frame (the splash image's own background colour is unchanged).
- **Categories row (proposal, no mockup).** B1 has no Categories row, but HAB-25 expects Manage Categories to live under Settings. Settings carries a plain navigable "Categories" row (own "Habits" group, "Rename or delete your own") and the temporary row on Manage habits is removed. Manage Categories' back button now reads "Settings". Mockup needed if the placement should change.
- **Evening review** is the same setting and the same toggle logic (`toggleEveningReview`: permission prompt, then schedule) as the per-habit Reminders screen, which keeps its copy until HAB-21 removes it. iOS notifications off: toggle stays on, a neutral notice (with "Open iOS Settings →") sits under the footnote, as in B2.
- **Export layout** — one file, both formats:
  - *CSV* (UTF-8 with a byte-order mark so Numbers/Excel read accents; RFC 4180 quoting; CRLF). One header row, then per habit: a `habit` row (id, name, **category name**, direction, target type/amount/unit, frequency such as `weekdays:Mon|Wed|Fri` or `per-week:3`, status active/archived, created_on, archived_on, **current_streak**, **longest_streak**) — present even when the habit has no logs — followed by its `entry` rows (date, value for quantity habits, completed true/false), `note` rows (date, note) and `frozen_day` rows (date). Child rows repeat `habit_id` and `habit_name`; inapplicable columns are empty. Columns: `record_type, habit_id, habit_name, category, direction, target_type, target_amount, target_unit, frequency, status, created_on, archived_on, current_streak, longest_streak, date, value, completed, note`.
  - *JSON*: `{ version: 1, exportedOn, habits: [ { …same habit fields, currentStreak, longestStreak, entries: [{date, value, completed}], notes: [{date, note}], frozenDays: [date] } ] }`.
  - The confirm sheet's counts come from the same model as the file: "Entries" = logged days (what "Export N entries" quotes) and notes; "Range" = first to last recorded day (logs, notes, freezes); the archived toggle (on by default) changes all of them. Streaks are as of the export day.
- **Writing:** serialized habit by habit (drives the determinate bar), written to a scratch `.partial` in the cache's `exports/` folder, then renamed to `habits-YYYY-MM-DD.<ext>` on success. Cancel or failure deletes the scratch file; "Last export" is written only after the file is in place. Earlier exports are cleared at the start of the next one. Failure shows storage ("needs about N KB free") or a generic reason, plus "Nothing was changed"; Try again reuses the same options.
- **Share / Save to Files:** "Share file…" opens the iOS share sheet. "Save to Files" uses the SDK's `Directory.pickDirectoryAsync` (a folder picker, since SDK 57 has no save-file dialog) and copies the export into the chosen folder. **Needs a real-device check** — if the folder picker or copy misbehaves on iOS, fall back to the share sheet's own "Save to Files" action and record the deviation here.
- **Deviations from the mockups:** the progress button shows "Preparing file…" disabled rather than with a spinner; sheet cards use the inset surface instead of white-on-grey; the ready/failed icons are rounded squares (IconBadge), not circles.

---

## HAB-16 — Summaries: range switcher + Monthly
**Frames:** C1, C2, C3, C6
**Reworks:** the existing Weekly Summary (V1 HAB-11).

**Rules**
- A range switcher (Week / Month / Year) is added under the Weekly Summary's title — this is the only change to the Weekly screen itself. Reaching it via the nav menu still defaults to Week.
- Monthly adds: totals, a daily completion calendar (`NEW-07` composite, month-calendar layout; frozen days visually marked), and a per-habit weekly-trend row with a delta vs. the previous month (`NEW-20`).
- Insights (scrolled section, C3): ranked, **maximum three**, in this priority: slipping (actionable → Edit habit, scrolled to Frequency), improved (informational, not tappable — no action is invented for something that's working), pattern-with-single-cause (actionable → that habit's Reminders screen, HAB-21, with "Add a time" open and the relevant day pre-selected).
- The "Reschedule habit → Edit habit, scrolled to Frequency" action from the Weekly screen is the house precedent: every later insight action in V2 follows this same destination convention (open a real screen already in the app, never a bespoke one).
- Monthly defaults to the **last complete month**, not the current (partial) one.

**Edge cases**
- Under one month of history (C6, "too early"): state when it unlocks and why, show progress toward that, and still render the partial calendar — don't hide the whole screen behind a locked wall.
- Insight gate order matters (carried over from the V1 audit fix): check (1) too-early, (2) perfect/nothing-to-fix, (3) slipping — never declare "nothing to fix" before confirming there's enough scheduled history to judge.
- A pattern insight only gets an action when **one single habit** explains most of the pattern; a pattern with no single cause is informational only (see HAB-17 for the year-scale equivalent).

**Depends on:** HAB-14.

---

## HAB-17 — Summaries: Yearly
**Frames:** C4, C5, C7

**Rules**
- Month-by-month completion strip, one row per habit (`NEW-07` year-strip layout, 12 cells). Months before the user started the habit are shown **dashed**, not hidden — the full 12 slots always render so the shape of the year is visible from day one.
- Insights (C5): only **"never stuck"** has an action — Edit habit, with Archive placed at the foot of that screen (year-scale slipping means "change what it is, or retire it," a stronger action than the month-scale "reschedule"). Best-month, "stuck," and seasonal-pattern insights are all read-only — no invented tap target.
- Year-scale insights require at least **three months** of history before they're computed, even though the 12-cell strip itself renders immediately.

**Edge cases**
- Under three months of history (C7): all 12 slots still render (dashed for pre-history), but insights wait and the screen says so plainly rather than showing a locked overlay over the whole thing.

**Depends on:** HAB-14, HAB-16 (shares the range switcher and the Monthly screen's "too early" pattern).

---

## HAB-18 — Logging mechanics: off-schedule log & retro-log pinning
**Frames:** D1, D2, D4
**Replaces:** rest-day "Log something anyway" opening the New Habit form (a V1 gap); extends the retro-log sheet.

**Rules**
- D1: "Log something anyway" on a rest day opens a **habit picker** (reuses `NEW-12`), not New Habit. Lists existing habits only. Quantity habits hand off into the existing Quantity-log sheet; **break habits are excluded** from this picker (you can't off-schedule-log a "don't do X" habit).
- D2: after logging, the sheet closes, a toast appears with Undo ("Read logged · off-schedule"), and the rest-day screen's state now lists what was logged.
- Off-schedule logs render with the Completion cell's dedicated off-schedule state (`NEW-16`, "bonus dot") and **never affect streak calculation** — they're informational, not schedule fulfillment.
- D4 (retro log, reached from Detail's heatmap): the habit that was tapped to open the sheet is **pinned first**, in a visually selected card, ahead of the other habits in the list. Unchecked rows stay full-strength styling (not dimmed/disabled — an unlogged day is a normal state, not a disabled one). Quantity habits use the inline stepper (`VAR-07`) directly in the row — no separate checkbox control for them.

**Edge cases**
- Habit picker is empty of eligible habits (e.g. user has break-only habits): show the "nothing eligible" picker state rather than an empty list with no explanation.
- Undo after an off-schedule log: must remove exactly that log entry, no streak side effects to reverse since none were applied.

**Depends on:** HAB-14.

---

## HAB-19 — Manage & archive rework
**Frames:** D3, E2, E3
**Reworks:** V1 Manage & archive.

**Rules**
- Category headers on Manage match Today's grouping (ties into HAB-24 — categories are now the grouping key everywhere, not an incidental label).
- Drag-to-reorder is **scoped to its own category**: the lifted row's card is outlined, and it can only be dropped within that same category's section — cross-category drag is not a reorder, it's a recategorize, and that's not what this gesture does.
- E2 (no active habits — everything archived): category sections disappear entirely, since there's nothing to reorder. Shows an empty-state card explaining why Today is empty, with "Add habit," and keeps "Restore" one tap away below.
- E3 (nothing archived yet): the Archived section keeps its header (doesn't disappear) and shows a dashed placeholder explaining where archiving happens — discoverable before first use, not an empty gap.

**Edge cases**
- A category with zero habits in it (possible once categories are a managed set with more built-ins than habits in use): does the header still show? Spec intent from the mockup is categories only appear as Manage headers when they have at least one habit — confirm this against F3's "habit count" convention before building (resolve as: empty categories don't get a Manage section, consistent with how Today already groups).

**Depends on:** HAB-14, HAB-24 (categories).

**As built (HAB-19)**
- **Grouping:** one card per category with a `SectionHeader` (name + habit count), in Today's order — both call `groupHabitsByCategory`, so they can't drift. A category with no active habit has no section (archiving the last habit in one removes it live). One `ReorderableList` with a `renderGroup` wrapper; drag stays scoped to its category by `groupOf`. While a row is held, its card gets an ink outline (`Container lifted`) and its header the tag "Reordering within <category>"; both clear on release. VoiceOver "Move up / Move down" actions are kept (they stop at the card's edge).
- **E2 / E3 / zero habits:** no active habits → `EmptyStateCard` ("No active habits", Add habit → New Habit), no category cards and no footnote, Archived below. Its copy depends on whether anything is archived: "Everything is archived…" vs "You haven't added a habit yet…". Nothing archived → the Archived header stays (no count) over a dashed `PlaceholderCard`. With no habits at all both show (no mockup for the combination).
- **Copy:** footnote is the mockup's ("Order is set per category and matches Today…"); archived rows read "Archived 2 Sep · 41 logs kept" ("· no logs" for a habit with none).
- **Deviations:** title "Habits" on the pushed screen, no "Done" — see `docs/v3-backlog.md`. The Jest suite can't drive the drag gesture (gesture handlers don't register under the mock), so the lifted outline/tag is covered by the `manage-habits-dragging` visual-check state, not a unit test.
- The temporary Categories row stays removed (Settings → Categories, HAB-15).

---

## HAB-20 — Detail: archived, restored, streak reset
**Frames:** D5, D6, E1
**Reworks:** V1 Detail.

**Rules**
- D5 (archived): banner states the archive date, keeps Restore at the top. Days accrued after archiving read as **paused**, not missed — archiving must not retroactively damage the streak display. Reminders row reads "Paused while archived," no toggle shown.
- E1 (restored): Restore is **instant, no confirmation** — it's fully reversible, so a confirm step would be friction without safety benefit. Banner collapses in place (user stays on Detail, no navigation). Toast: "<Habit> is back on Today" with Undo. Reminders switch back to their prior schedule and resume **at the next scheduled occurrence**, not immediately. The paused days during the archive period remain read as paused historically; the streak itself starts counting fresh from the next completed log after restore, not retroactively, don't invent a spent streak across the archived gap.
- D6 (streak reset, no freezes left): a passive explanatory line appears **only in the month the reset happened** — it's a historical note, not a permanent badge. The legend's frozen-swatch now also carries the live count ("0 freezes left"). The missed day that caused the reset is visually outlined in the grid.

**Edge cases**
- Undo on the restore toast: must re-archive the habit exactly as it was (same archive date/banner state), not just toggle a boolean.
- A habit archived and restored multiple times: each restore should resume reminders cleanly without stacking duplicate scheduled notifications from a prior restore.

**Depends on:** HAB-19 (archive is driven from Manage).

---

## HAB-21 — Reminders: evening-review removal
**Frames:** E4
**Reworks:** V1 per-habit Reminders.

**Rules**
- The evening-review toggle is **removed entirely** from the per-habit Reminders screen — it now lives only in Settings (HAB-15), since it's global, not per-habit.
- A temporary footnote + link ("moved to Settings") appears below the per-habit reminder list, for people who look for it where it used to be. This is explicitly marked in the mockup as **temporary, remove in a later release** — flag this in code with a comment/TODO tied to a V2.1+ cleanup, not left permanently.

**Edge cases:** none beyond the removal itself; this is a pure subtraction plus one migration-friction affordance.

**Depends on:** HAB-15 (the setting must exist there before it can be removed from here).

---

## HAB-22 — New habit: empty & near-limit polish
**Frames:** E5, E6
**Reworks:** V1 New habit form.

**Rules**
- E5 (no name yet): field is focused on open, with an example as placeholder (not a filled default value). Save stays disabled; the line above Save explains why (reused `NEW-24` field-helper pattern). No character counter shown at this state.
- E6 (near limit): the counter (`NEW-23`) appears only from **80% of the limit** (26 of 32 characters) onward — not shown below that threshold, to avoid cluttering the field during normal typing. At the hard limit (32) it turns amber and further typing stops; **pasted text is trimmed to fit** rather than rejected outright. Once a valid name exists, Save enables and the helper line disappears.

**Edge cases**
- Pasting text that's already over the limit: trim silently to 32 characters, still show the near/at-limit counter state after trimming.
- This same name-field pattern (`VAR-12`, built from `NEW-23` + `NEW-24`) is shared with the category name field (HAB-24) — implement it once, reuse in both.

**Depends on:** none (habit name field is foundational), but shares its atom with HAB-24.

---

## HAB-23 — Delete sheet consolidation
**Frames:** E7
**Reworks:** V1 Delete confirmation.

**Rules**
- The "Archive instead" option becomes a single tappable card (`NEW-25`, whole card is the button, with a trailing chevron) rather than a card plus a separate secondary button underneath it — V1 had both, which was a duplicate affordance for the same action.
- Resulting sheet has exactly two destructive-adjacent paths: "Keep habit" (dismiss), "Archive instead" (the card), and "Delete permanently" (destructive text button). No third redundant control.

**Edge cases:** none beyond the layout consolidation — no behavior change to archive or delete themselves.

**Implementation note (from HAB-25):** the shared `NEW-33` sheet already exists as `components/ui/composite/destructive-confirm-sheet.tsx`. This ticket must rebuild `DeleteHabitSheet` on top of it (its "with archive action" state), not draw a second delete sheet.

**Depends on:** none.

---

## HAB-24 — Categories: pick & add
**Frames:** F1a, F1b, F1c, F2a, F2b, F2c, F2d
**Replaces:** the free-text Category field in New/Edit habit.

**Rules**
- Category is now a **managed set**: ten fixed built-ins (Health, Fitness, Mindfulness, Productivity, Learning, Finance, Social, Home, Creativity, Other) always present, in a fixed order, plus the user's own custom categories in creation order, with a "+ Add category" chip always last.
- Picking a category chip **assigns its icon and color to the habit automatically** — the separate icon/color picker from V1 is removed entirely. A habit always has exactly one category; tapping the already-selected chip is a no-op.
- No category selected blocks Save, the same way an empty name does. If **both** name and category are missing, the name's blocking reason takes priority in the helper text (don't show both reasons at once).
- Add-category sheet (F2) asks for a **name only** — icon and color are auto-assigned from a fixed rotation, previewed live under the field as the user types, so what they see previewing is exactly what gets created. This was an explicit simplification over letting users pick icon/color themselves, to avoid decision fatigue and an extra UI surface.
- Name-field rules mirror the habit-name field exactly: counter from 80% of a 20-character limit (16/20), amber + stop at the limit, paste trimmed to fit.
- Duplicate-name checking is **case-insensitive, trims surrounding whitespace, and includes the built-in names** — "health" or " Health " both collide with the built-in "Health." Shows the same inline-error pattern as habit names, naming the clash and pointing at the existing chip; the live preview hides while a duplicate is shown, since nothing will be created.
- After a successful add, the sheet closes back to the picker with the new chip **auto-selected** in its creation-order slot — no toast; the selected/filled chip state is itself the confirmation.
- Long scroll (F1c): the whole sheet scrolls as one unit (title + Save stay pinned), not just the chip grid independently — a hairline divider appears above Save once content is scrolled under the header.

**Edge cases**
- Long custom category names truncate with an ellipsis inside the 2-up grid layout rather than wrapping or overflowing.
- The rotation used for auto-assigned icon/color must pick the **next pair not already visible on screen** — i.e., avoid handing two visually-adjacent custom categories the same or near-identical color.

**Data migration (important, flag before implementation):** V1 habits almost certainly have a free-text `category` string field already populated from whatever users typed. This ticket needs a migration step: for each distinct existing string value, either map it to a built-in by name match (case-insensitive) or create it as a new custom category, then backfill each habit to the corresponding `categoryId`. This is a schema change (`category: string` → `categoryId: FK`), not just a UI change — plan it as its own migration script/step before the picker UI ships, and cover it with a dedicated test (existing fixtures with assorted category strings → correct post-migration assignment).

**Depends on:** none functionally, but should land before HAB-19 (Manage's category grouping) and before any habit-creation-flow work assumes the new field shape.

---

## HAB-25 — Categories: manage & delete
**Frames:** F3a, F3b, F3c, F4a, F4b
**New screen**, reached from Settings → Categories.

**Rules**
- Built-ins are **locked**: shown first, tinted chip style, a quiet "Built-in" tag, habit count, no Rename/Delete affordance at all.
- Custom categories: outline chip style, Rename (inline, same field rules as the add-category sheet in HAB-24) and Delete. A category with zero habits says "Not used."
- Habit counts **include archived habits**, because deleting the category reassigns those too — don't undercount by only looking at active habits.
- Order for custom categories is creation order, matching the picker in HAB-24 — consistent ordering across both screens.
- Delete, not used (F4a): plain confirm, no mention of reassignment since nothing else is affected.
- Delete, in use (F4b): names the exact habit count, shows the move explicitly ("Music → Other") with the affected habits listed, and the destructive button's own label repeats the consequence. **There is no "move habits first" intermediate step** — deletion always auto-reassigns to Other in the same action; this was an explicit choice (simpler, one less screen) over blocking deletion until manually reassigned.
- Reassigned habits take Other's icon and color immediately — no transitional or "orphaned" visual state.

**Edge cases**
- Deleting a custom category that's also pinned/relied on elsewhere in the UI (none currently exists — categories don't gate anything beyond Manage grouping and the New/Edit habit picker) — confirm no other screen holds a stale reference to a deleted `categoryId` before marking this done.
  - **Confirmed (HAB-25 implementation):** no stale `categoryId` reference can exist. Today, Habit Detail, Manage and Weekly Summary resolve each habit's category live from the categories table by id (with Other as the fallback for an unknown id), so a delete or rename shows immediately. Reminders and notifications never read the category. The only place a category id is held is the New/Edit habit form's selected category, and that form is a separate modal route that can't be open while Manage Categories is deleting.
- Renaming a custom category to match an existing built-in or another custom category's name: same duplicate-check rules as creation (HAB-24) apply here too.

**Depends on:** HAB-24 (the category model itself must exist first).

---

## Build order suggestion

Categories (HAB-24, HAB-25) touches the data model and several other screens' grouping logic, so building it early reduces rework:

1. HAB-24, HAB-25 (categories — data model + both screens)
2. HAB-14 (nav entry point — low risk, unblocks reaching everything else via the menu)
3. HAB-15 (settings & export)
4. HAB-19 (manage rework — now has real categories to group by)
5. HAB-16, HAB-17 (summaries)
6. HAB-18, HAB-20, HAB-21, HAB-22, HAB-23 (remaining fixes/polish — independent of each other, can interleave in any order)
