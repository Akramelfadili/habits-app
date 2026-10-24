# Habit Tracker — V3 Feature Spec

V3 turns the app into a **habits-only** app (no to-dos, no expenses) and reworks navigation, Today, Progress and habit management. Continues `docs/feature-spec.md` (HAB-01–13) and `docs/feature-spec-v2.md` (HAB-14–25). Numbering continues: **HAB-26 → HAB-50**.

**Source of truth for visuals:** `docs/mockups/v3/Habits V3.dc.html` (master; the other eight `Habits V3 - *.dc.html` files are the same design opened on one section). Frame IDs below (T1, P7, H4, DC1, SR3, …) refer to that file; component IDs (V3-13) and token IDs (F-04, T-18) too. Read `docs/design-system-v3.md` for values.

**How to read a ticket:** Frames · Rules · Edge cases · **Check against code** (things the mockup assumes that must be verified before planning; the architecture assessment resolves them) · Depends on.

## Spec wins over the mockup

The decisions below were made after the code assessment (`docs/assessment-v3.md`). Where the mockup disagrees, **this spec wins**. Known differences:
- **T15 / S2 (week starts Sunday, "follows iOS"):** not in V3. Weeks start Monday. T15 is a Later frame.
- **"Done 07:10" in row status lines (T1, T5, T8 etc.):** not built; the status line shows the streak only ("13-day streak").
- **F6 icon and colour pickers:** not built. The category supplies icon and colour (existing rule).
- **SY3 determinate progress bar:** built as an indeterminate indicator (the migrator is synchronous).
- **SR1 "Reset streak" button:** becomes "Not now" (see HAB-33). Undo applies to the freeze only.
- **Frames that show tab bar A** are drawn for brevity; build bar B (floating pill) everywhere.

## Standing decisions (apply to every ticket)

| # | Decision |
|---|---|
| D1 | Habits only. To-dos and expenses are removed from navigation, code, and (decision needed, see HAB-26) data. |
| D2 | Three tabs: **Today, Progress, Habits**. Floating pill tab bar ("bar B") is the baseline everywhere. No ⋯ menu. |
| D3 | Settings opens from the gear in the Habits header. Add habit from the + in the Today and Habits headers. |
| D4 | Detail is pushed from any tab. Add/Edit habit is a modal form. Everything else short-lived is a sheet. |
| D5 | One accent. Colour has one meaning each: violet = freeze, amber = Break habits and warnings, red = danger only, category hue = identity. No red category hues. |
| D6 | Quantity habits: tapping the circle adds +1 (with Undo toast). The count button ("5/8") or long-press on the circle opens the quantity sheet. |
| D7 | Delete = single confirm per DC1: **Archive instead** is the primary/default-focus action, then Delete permanently, then Cancel. The log count is named. Failure shows an in-sheet banner. Two-step lock is Later. |
| D8 | Break habits keep the daily tick (resisted = ticked). Language is "resisting / resisted / slipped", never "failed". |
| D9 | **Weeks start on Monday** (as today). Following the iOS first weekday would re-score past × per week history and needs a native module; it is Later, as its own ticket with an ADR. Settings says "Weeks start on Monday." |
| D10 | Suggestions: bundle 8–10 ready-made habits locally. |
| D11 | Off-schedule ("bonus") logs never affect streaks or rates. Frozen days are excluded from rates. Paused (archived) days are never missed. |
| D13 | Freezes: a fixed shared pool of **2 per calendar month** for all habits; resets on the 1st, nothing rolls over. Used manually only (no auto-use). Copy may state this plainly. |
| D14 | Rates exclude frozen days (the current 90-day rate counts them as missed: change it and its tests). |
| D15 | Month view defaults to the **current month**; other months open from Year (month labels). |
| D12 | Messages: toasts report events, banners describe lasting states. One toast at a time. Copy names the habit, date or count; never "Success!" or "Oops". |

## Out of scope for V3 ("Later – not in V3")

Evening review that closes the day (PR-01, T9 frame) · Today's log with times (PR-02, T11) · weekday-pattern insight (PR-03, R4 deep link) · share-as-image from Progress · iCloud backup · auto-use freezes · two-step delete lock (PR-10, DC2) · iPad, widgets, Watch, notification content, localisation beyond 24-hour time. Their frames stay in the mockup, labelled; do not build them.

## Resolved proposals

| ID | Proposal | Decision |
|---|---|---|
| PR-07 | Freeze earning rule | Resolved: fixed pool of 2 per month shared by all habits, no rollover (D13). Copy states it. |
| PR-08 | Used/saved counts | Show "used this month" (derived from `frozen_days`). "Saved" is dropped. |
| PR-11 | Logging a frozen day returns the freeze | **Build**: one transaction in a service (delete the `frozen_days` row, write the entry); the toast says the freeze was returned. |
| PR-12 | Atomic migration | Resolved: already atomic (one transaction). SY4 copy is true. SY3 is indeterminate. |
| PR-13 | Count-fill row style | Not built; label "1/3" only. |

---|---|---|
| PR-07 | Freeze earning rule | Copy never states how freezes are earned; show live count only |
| PR-08 | Used/saved freeze counts (needs a freeze log with date + habit) | Only "N left" |
| PR-11 | Logging a frozen day returns the freeze (RL3) | Frozen days read-only in Edit this day |
| PR-12 | Atomic migration (SY3/SY4) | SY4 copy: "Some data may need repair. Copy diagnostics for support." |
| PR-13 | Optional count-fill row style | Label "1/3" only |

---

## HAB-26 — Remove to-dos and expenses
**Frames:** CL.2 (Removed)

**Rules**
- Remove the To-dos and Expenses tabs, routes, screens, hooks, repositories, services, tests, Maestro flows and visual baselines.
- No leftover navigation, settings, export or onboarding mention of either.

**Notes (verified by the assessment)**
- There is **no data**: the two tabs are placeholder routes sharing `placeholder-tab-screen`. No tables, migrations, repositories, flows or export fields exist. No migration needed.
- Delete the 2 routes, the placeholder component and its test, the 2 visual states and 2 baseline PNGs; update README, CLAUDE.md, `docs/architecture.md`, `docs/design-system.md`, `docs/feature-spec.md`.
- Remove the "future modules" promise from the docs; **keep** the module-isolation rules. Keep or rename the fake `todos` fixture in `check-architecture.test.mjs`.


---

## HAB-27 — Navigation shell: 3 tabs, floating pill
**Frames:** T1, T13, T14, P17, H8–H10 · **Components:** V3-01, V3-02

**Rules**
- Tabs: Today, Progress, Habits. Bar B: floating pill, 56 pt tall, 22 pt bottom inset, items ≥ 48 pt tall, hit area extends to the pill edge. Content scrolls under it.
- Bottom padding of every scrolling tab = 112 pt (pill 56 + inset 22 + 22 clearance + 12 safe zone) so the last row's circle never sits under the pill (T13).
- Toasts sit 12 pt above the pill (T14); above bar A they sit 16 pt above.
- Sheets cover the pill; scrim dims it; it is inert until the sheet closes (H8). No tab switching mid-decision.
- Detail is pushed from any tab; the tab bar shows which tab it came from (D4).
- At accessibility text sizes (AX1+) the pill falls back to full-width bar A (H10).
- Header (V3-02): large title that collapses into a solid inline bar on scroll (T5). Header buttons are 44 × 44.

**Edge cases:** tab label does not scale with Dynamic Type (iOS behaviour); deep link / back from Detail restores the originating tab; Reduce Transparency uses a solid pill (see HAB-49).

**Approach (from the assessment):** `js-tabs` with a custom `tabBar` for the pill; expo-router **shared routes** `(today,progress,habits)` so Detail is pushed inside the originating tab; sheets are native `Modal`s and already cover the bar; one `ToastHost` at the shell level. **A short throwaway spike comes first** (custom tabBar on SDK 57 + shared routes + iOS 26 header guard) because the docs and installed types disagree.

---

## HAB-28 — Design tokens and density
**Frames:** F-01–F-09, T-01–T-22

**Rules**
- One token set: colour (F-01), intensity + category palette (F-02, one accent intensity ramp, T-05), type scale (F-03; four off-scale sizes retired, nothing below 12 pt), spacing (F-04), radius (F-05), elevation and focus (F-06), motion (F-07), iconography (F-08, gear for Settings T-19).
- Density pass T-18: habit row ≈ 60 pt, icon square 32. No new hard-coded values: the token ratchet must stay green.
- Health and Social category hues move off red (T-16): hues 175 and 230.

**Check against code:** existing token files and the token ratchet script; which V2 delta values (cell 18/6/5, stat card 14/10/26, chart-card padding 16) are already applied.

---

## HAB-29 — Core component set
**Frames:** CL.1 (mapping table V3-01 → V3-32)

**Rules**
- Build or consolidate to the V3 set: Tab bar, Header, Week strip, Completion circle, Completion cell + legend, Completion grid (3 layouts), Progress bar, Column bar/sparkline, Rate ring, Stat card, Chart card, Insight card, Habit row, Category chip/row, Text field, Segmented control, Stepper, Chip, Toggle, Checkbox, Buttons, List item, Sheet, Destructive confirm, Toast, Inline banner, Empty state, Unlock card, File card, Icon square.
- "Was" column in CL.1 says which V1/V2 component each replaces. Reuse before create; delete replaced components.
- Interactive components have default, pressed, disabled and focus states (F-06).

**Check against code:** existing components for each V3-xx; list exact merge/delete candidates.

---

## HAB-30 — Today: day view and week strip
**Frames:** T1, T10, T15 · **Components:** V3-03, V3-07, V3-13

**Rules**
- Today is a **day view**; the week strip under the title chooses the day. Today is selected by default.
- Strip: current week (Monday first, D9), today ringed/filled, dot under days with any log, selected-day state, future days inert. Swipe the strip to go to other weeks.
- While a past day is selected: eyebrow shows the date, a bar reads "Logging for Wed 21 Oct · Show today"; all logs go to that date; toasts name the date and Undo targets that date (T10). This replaces V1's "Log a past day" link.
- One progress bar ("1 of 5 done · 20%") replaces the ring; partial quantity does not count as done.
- Groups are cards by category with a per-group count ("0 of 2"), in category order (HAB-42). Not-due habits fold into one quiet dashed row ("1 not due today · Upper body · Show").
- × per week habits: status "3× per week · 1 done"; once met they leave Today until the new week.

**Edge cases**
- Midnight rollover while a past day is selected: selection stays on that date; if today was selected, Today moves to the new day (HAB-47, SY5).
- A sheet open across midnight keeps its date and says so in its title.
- Selecting a day before a habit's start: that habit is not listed. Archived (paused) days: not listed.
- Logging beyond the current week: swipe the strip, or use Progress › Edit this day.

**Implementation notes:** selected-day state lives in a module hook `useSelectedDay(today)` (`null` = follow today) in TodayScreen's own state, not a global store. Writes go to the selected past date, else today with the existing rollover guard. Undo captures the date in its closure (existing rule). Query hooks take the selected date as live-query deps. Streak-at-risk applies only to the real today. The week window is keyed by the selected day.

---

## HAB-31 — Today: habit row and logging
**Frames:** T1, T3–T8 · **Components:** V3-13, V3-04, V3-26

**Rules**
- Two tap zones per row: **circle = log** (44 × 44 hit area), **name area = open Detail** (≥ 60 × 250). A mis-tap on the name never logs.
- Row content: badge/icon square, name, status line (e.g. "13-day streak" or "5 of 8 glasses"; **no completion time**), trailing circle. A visible count button for quantity habits.
- Check habits: tap circle toggles done; Undo toast.
- **Quantity habits (D6):** tap circle = +1 with Undo toast ("Drink water +1 · 3 of 8 glasses"); pie fill shows progress; tap the count button or long-press the circle opens the quantity sheet (HAB-34). Above target the circle is full and extra amounts still count.
- **Break habits:** amber outline circle; copy "Resisting · 4 days strong", "Resisted today", "Resist tonight"; never red, never "failed".
- **At risk:** amber dot on the circle and status "Missed Thursday · 1 freeze left"; tapping the circle opens the streak-at-risk sheet (HAB-33).
- **All done (T8):** quiet card at the top with a check that draws once (600 ms; static with Reduce Motion). No confetti or banner.

**Edge cases:** 5 s Undo window; a new toast replaces the old one; an Undo of +1 removes exactly that entry; off-schedule logs (T3 rest day) are tagged "bonus", never affect streaks.

**Implementation notes:** there is no step log (one entry per habit per day holds the total). +1 writes `previous + 1`; Undo writes `previous` captured at tap time (as the quantity sheet does today). `entries.created_at` is first-insert time, so no time is shown.

---

## HAB-32 — Today: states
**Frames:** T2, T3, T5, T8, T13

**Rules**
- **Empty (T2):** header and + only; week strip and progress hidden; one primary action "Add habit" and a link to suggestions (HAB-46). Shown only after data has loaded (no flash).
- **Rest day (T3):** "Nothing is due today, so every streak is safe. Anything you log counts as a bonus." Not-due habits reachable via dashed circles; a × per week habit that met its target shows "back Monday".
- **Loading:** header and date are real immediately; skeleton rows appear after 300 ms; static with Reduce Motion (HAB-47).

---

## HAB-33 — Streak at risk and freezes
**Frames:** T6, T7, SR1–SR3, S4

**Rules**
- Pool: **2 freezes per calendar month, shared by all habits**, resets on the 1st, no rollover, manual use only (D13). Grace window is yesterday only.
- A missed scheduled day with a live streak puts the habit at risk (amber dot, status "Missed Thursday · 1 freeze left").
- Sheet SR1 "Keep your <habit> streak?": plain copy, live freeze count, **Use a freeze** (primary) or **Not now** (closes the sheet; nothing is written; the streak restarts with the next log once the grace window passes). Undo (5 s) applies to the freeze only.
- After a freeze: status "Thu frozen · streak kept at 13" in violet; toast "Freeze used for Thu 22 · 0 left" with Undo targeting Thu 22 (T7).
- **No freezes left (SR3):** tapping the at-risk circle opens a one-button sheet explaining it; copy says the longest streak is kept. (Today the streak resets silently: behaviour change.)
- Violet = freeze everywhere. Settings (S4) states the rule plainly and shows "used this month".
- **PR-11:** logging a frozen day in Edit this day returns the freeze (one transaction) and the toast says so.

**Edge cases:** only yesterday is in the window; Undo restores the freeze count and at-risk state exactly; the at-risk dot clears when the grace window ends.

**Data:** `frozen_days` (habit, date, created_at) already records each use; the pool counts rows by missed date within the month.

---

## HAB-34 — Quantity sheet, Edit this day, habit picker
**Frames:** QS0–QS4, RL1–RL3, HP1, HP2, P13

**Rules**
- **Quantity sheet (QS1):** stepper with 44 pt buttons, quick +1/+2/+3, Fill to target, Set exact value (QS2: number pad, "Set to 6" logs the difference). Each change saves immediately; closing shows one toast with Undo. (Today's quantity sheet has a Save button: model change.) At target (QS3) Fill is disabled; extra amounts still count.
- **Edit this day (RL1/RL2):** one sheet for any past day, from Week (tap day header), Month (tap day → detail card → Edit this day), Year (via Month), Detail mini-grid (whole week row is one 44 pt target). Lists every habit due that day with its circle; quantity rows open the quantity sheet for that date. Before-start and paused days are not listed. After a change the toast appears inside the sheet above Done, names the date, offers Undo. (Today's retro-log is a draft + Save transaction; V3 saves per tap with Undo: model change in `retro-log-sheet` and `saveDayLog` usage.)
- Future days: not editable ("Can't log ahead — pick today or an earlier day").
- **Habit picker (HP1/HP2):** from the habit chip on Year: All habits, active habits, archived habits; single choice, sheet closes on tap.

**Edge cases:** frozen day in RL3 (PR-11 fallback = read-only); quantity edit on a past day targets that date and Undo too.

---

## HAB-35 — Progress: shell and Week
**Frames:** P1–P6, P17 · **Components:** V3-17, V3-10, V3-12, V3-06

**Rules**
- Header "Progress" with **Export** (runs the existing JSON/CSV export, same as Settings). Segmented Week / Month / Year pinned under the header; scrolled frames show only the compact pinned bar.
- Order: three stat tiles (completion %, best streak, best day), one insight card with pager (HAB-38), the week matrix, daily bars, summary.
- **Week matrix:** habits × days; row total ("3/7"); cells use the shared completion cell: done, partial (corner notch), missed (filled track), frozen (violet, dashed), bonus dot (off-schedule), not-due, before start (dashed), nothing logged yet (outline), future (hairline). Break habit: resisted days count as done. Week matrix cells are **not** tappable (24 pt, below 44 by design); the day header (44) opens Edit this day.
- Rates are whole numbers, exclude frozen days (D14), never count bonus logs. Week "Best day" = max done ÷ due per day.
- **Too early (P2):** fewer than 7 days of logs → unlock card with progress replaces stats and insights; the partial matrix still renders.
- **No habits (P3):** empty state, Export disabled (tap explains why in a toast). **Habits but nothing logged (P4):** outlined cells, not "missed".
- **One habit (P5):** the matrix becomes one card with seven 40 pt day cells.

**Edge cases:** AX3 collapses matrix to one block per habit and the switcher to a stacked list (P6, P11).

**Performance prerequisite:** the per-week streak/heatmap/year maths is O(n) per day and takes seconds on 5 years of data; the **pre-bucketing fix lands in V3-0a before Progress** (no semantic change, with an old-vs-new equivalence test).

---

## HAB-36 — Progress: Month
**Frames:** P7–P11, P13

**Rules**
- Month calendar of completion intensity (accent tints, day number); partial days carry a corner notch; frozen violet; today ringed; future hairline; before start dashed. Overall rate, perfect days, best streak.
- Per-habit rates (P8): ranked by rate, slipping last with amber bar; Break habit tagged "Break"; frozen days excluded; bonus logs listed as "not counted".
- Tap a 40 pt day → rings it and shows a detail card with each habit's state and "Edit this day".
- Defaults to the **current month** (D15; the V2 "last complete month" rule is retired). Other months open from Year. Too early (P9): unlock card, calendar shows logged days, earlier days dashed. One habit (P10): binary calendar.

---

## HAB-37 — Progress: Year
**Frames:** P12, P14–P16

**Rules**
- GitHub-style year heat map: three 4-month bands, 16 pt cells, month labels, Less → More legend (partial levels notched), frozen violet. **Month labels (44 pt) are the only tap targets** and open that Month; day detail lives in Month (P13). Back returns to Year.
- Habit chip filters the map to one habit (HP1/HP2); binary cells.
- Too early (P14): unlock card plus only the current band. AX3 and VoiceOver: month list with bars and whole-number % (P16).
- Best month insight ("September was your best month").

**Check against code:** per-day completion level 0–3 for a full year, all habits or one — query cost.

---

## HAB-38 — Insights
**Frames:** P1, P5, P7, P10, P12 · **Component:** V3-12

**Rules**
- One insight card on screen with a pager (dots) for up to three, ranked: slipping → improved → pattern-with-single-cause → nothing to fix. Tones: warning (amber), positive, neutral.
- Slipping: action "Change frequency" → Edit habit scrolled to Frequency. Improved and "nothing to fix" are not tappable. Gate order: too-early → perfect/nothing to fix → slipping.
- Weekday-pattern insight is **Later** (PR-03); do not build.
- Year-scale insights need ≥ 3 months of history (V2 rule kept).

---

## HAB-39 — Habits tab: library
**Frames:** H1–H7 · **Components:** V3-13, V3-23

**Rules**
- Header "Habits" with gear (→ Settings) and + (→ Add habit). Search field. Active habits grouped by category with a count; **Reorder** in the Active header; Archived collapsed (expand in place); then Categories entry.
- Search (H2/H3) matches active and archived, results split by status; archived results can be restored in place. No results: says what was searched and offers "Add <name>" (opens Add habit with the name filled).
- Reorder (H4): handles + Done; a lifted row stays inside its category (cross-category change is Edit).
- Archived (H5): Restore is instant with Undo toast "<Habit> is back on Today"; copy explains fresh streak and paused days.
- Empty (H6): Add habit + suggestions; Categories stays reachable.

**Check against code:** existing Manage & archive screen (HAB-19) is replaced; reuse the reorder-within-category logic.

---

## HAB-40 — Habit Detail
**Frames:** D1–D8, H8 · Extends HAB-20

**Rules**
- Top: streak, longest streak, 90-day rate; last 5 weeks mini-grid with legend (bonus, frozen); reminders summary; Edit in header. History by date below (done, missed, frozen, bonus tagged "not counted"); Archive and Delete last. **No times in history** (per-entry timestamps may not exist).
- New habit (D3): stats explain when they start; grid shows "before start". No logs: "Tick it on Today to start."
- Archived (D4): banner with archive date + Restore; paused days hatched, never missed; reminders paused.
- Restored (D5): Restore instant, no confirm; one-time banner: streak starts fresh, paused days stay paused; Undo toast re-archives with the same archive date.
- Streak reset (D6): reset day outlined amber; notice only in the month it happened ("Streak reset on Wed 14 Oct — no freezes were left"); freeze tile amber.
- Break habits (D7): resistance copy throughout.

**Edge cases:** repeated archive/restore must not stack duplicate reminder notifications; reminders resume at the next scheduled occurrence.

---

## HAB-41 — Add / Edit habit form
**Frames:** F1–F10 · Replaces V1 Add habit + V2 form

**Rules**
- Modal form, Save pinned at the bottom (disabled with the reason beneath). Order: Type (Build/Break), Name, Category, Goal, Frequency. **Only the name is required**; category optional ("habits without one go to Other").
- Category chip picker. **Icon and colour come from the category; there is no per-habit icon/colour picker** (existing rule; F6 pickers are not built). Category colours have no red (T-16).
- Goal: Check, or Quantity (daily target stepper + unit, live example "Shown after the number: 5 of 8 glasses"). Break habits are yes/no; Quantity disabled with a reason (F5).
- Frequency: Daily, Specific days (weekday chips, 44 pt), × per week (states the iOS-weekday rule and "leaves Today once met", F4).
- Reminders can be added before saving (inline list, Add time → time sheet).
- New in V3 (not in code today): duplicate-name validation, the discard prompt, optional category (→ Other), inline reminders before save.
- Validation inline (F8): duplicate name ("You already have a habit called Read 20 min. Choose another name."), no days picked; Save names how many issues remain. Name counter from 80% of 32; paste trimmed.
- Unsaved changes (F9): closing with edits → "Discard changes?" alert; Keep editing primary, Discard destructive.
- Suggestion prefill (BS2): fields filled, banner says where from; nothing saves until Save.
- AX (F10): segmented controls stack, chips wrap, Save full width.

---

## HAB-42 — Categories
**Frames:** C1–C6, DC6 · Extends HAB-24, HAB-25

**Rules**
- Reached from Habits › Categories. Ten built-ins locked (tag + counts incl. archived), custom categories with Rename (inline, case-insensitive duplicate check including built-ins) and Delete. Counts include archived habits.
- Reorder sets group order on Today and Habits (new in V3; **needs a stored order**).
- Add category sheet (C4): name only; preview chip with auto-assigned icon + colour (next unused in rotation).
- Delete in use (C5): names the habits and "moves to Other — its history and streak are kept"; not in use (DC6): single destructive button, Undo toast 5 s.
- No custom categories (C6): "Add a category" row teaches the feature.
- Hue change: Health 175, Social 230 (T-16); update V2 category palette tests.

**Data (one migration, tested with child rows):** add `categories.sort_order`, backfilled from today's effective order (first appearance in habit order, Other last); set Health hue 175 and Social hue 230; remap any custom category already on 175, 230, 15 or 350; drop 15 and 350 from the rotation constants; update tests that pin old hues. A habit's colour is its category's hue (legacy `habits.color/icon/category` columns are unused).

---

## HAB-43 — Reminders
**Frames:** R1–R3, R5 · Extends HAB-21

**Rules**
- List of 24-hour times, each with its own weekdays; remove on the left (instant, Undo toast "Reminder at 18:30 removed"); tap to edit; Add time sheet (default 09:00).
- Notifications denied (R5): warning banner "Reminders won't arrive until you allow them in iOS Settings" + Open Settings; times stay editable.
- Insight deep link (R4) is **Later**.

---

## HAB-44 — Settings and export
**Frames:** S1–S7, EX1–EX4, SY6

**Rules**
- Pushed from the Habits gear. Groups: Appearance (Light/Dark/System; "Weeks start on Monday" and text size are explained, not configurable), Reminders (evening review toggle + time; notifications-off notice), Streaks (freeze count and how to use one — **copy pending PR-07**), Data (Export; backup is Later), About (version, Copy diagnostics → toast).
- Evening review: existing reminder only (nudge if anything is still open, sent only on days with open habits). Closing the day is Later.
- Export (EX1–EX4): JSON or CSV → progress with file name (closing the sheet keeps it running; toast when ready) → file card (size, counts, Share file) → error banner with reason, Retry, "Nothing was changed". Same flow from Progress › Export. Archived habits included; to-dos/expenses removed (HAB-26).
- SY6: when iOS permission is off, one banner summarising what is affected ("4 times on 3 habits") with Open Settings.

---

## HAB-45 — Destructive confirms
**Frames:** DC1–DC7 · Replaces HAB-23

**Rules**
- **Delete habit (DC1):** names what is lost ("Deletes Read 20 min and its 214 logs"), offers **Archive instead** first (default focus), then **Delete permanently**; no Close, Cancel ends it. Deleting (DC3) disables Cancel; success pops Detail to Habits with a toast (no Undo). Failure (DC4): banner inside the sheet "Nothing was changed. Try again."
- **Archive (DC5):** one tap, Archive habit (primary) / Cancel; afterwards Detail pops and the toast offers Undo.
- Delete category: HAB-42.

**Change vs today:** today's sheet is single-confirm with Keep as primary and an Archive card; V3 makes Archive-instead the default-focus primary, ends with Cancel, names the log count, and shows failure as an in-sheet banner (DC4).

---

## HAB-46 — First run and suggestions
**Frames:** FR1–FR4, BS1, BS2

**Rules**
- First launch (no tabs): one line about the app, the three things it does, **Add your first habit** and **Browse suggestions** (FR1).
- Slim first-habit form (FR2): name, quick picks, type, frequency; everything else can wait.
- After the first save, our own notification pre-prompt (FR3, 09:00 default): Allow reminders → iOS prompt; Not now → asks again only when a reminder is added.
- Skipped: Today empty state (FR4).
- Suggestions (BS1): 8–10 bundled local habits grouped by category (9 shown); tap opens Add habit prefilled (BS2).

---

## HAB-47 — System states
**Frames:** SY1–SY6, TC3

**Rules**
- Loading (SY1), load error inside Today with Try again + Copy diagnostics, tabs still usable (SY2), migration in progress before the tabs, indeterminate (SY3), migration failed (SY4), midnight rollover banner (SY5), notifications denied (SY6).
- Banners carry states that last (notifications off, archived, export failed, new day); toasts carry events.
- Migration promises are true (one transaction); SY3 is indeterminate.

---

## HAB-48 — Message catalogue
**Frames:** TC1–TC3 and the catalogue table (06 Messages)

**Rules:** all toasts, banners and inline messages come from one catalogue module; copy per the mockup table. Durations: Undo 5 s, success/info 4 s, warning 6 s, errors until Retry or swipe. Placement: 16 pt above bar A, 12 pt above pill B; inside a sheet above its last button; never over Undo. VoiceOver announces every toast and keeps it until dismissed.

---

## HAB-49 — Accessibility and Dynamic Type
**Frames:** 08.1–08.8, AX3 frames (F10, H7, P6, P11, P16, QS4, DC7, S7)

**Rules**
- Touch targets ≥ 44 pt except the documented exceptions (Week matrix cells, Year cells).
- Contrast per 08.1 (all pass; partial vs missed relies on the corner notch as a second signal).
- VoiceOver labels and reading order per 08.3; focus order and error focus per 08.4.
- Reduce Motion: check draw and skeleton static; Reduce Transparency: solid pill (08.5).
- Dynamic Type: type ramp 08.6a; layouts reflow at AX3 as drawn; pill → bar A.
- Colour never alone (08.7): every state has a shape or text second signal.

---

## HAB-50 — Visual baselines, e2e and docs
**Rules:** regenerate web light/dark baselines (≈137 will change); update Maestro flows for 3 tabs; update CLAUDE.md "When you touch X, read Y" map and the architecture-check script for the new structure; update the docs index in `README.md` ("Where to read more") and `docs/roadmap.md` (V3 batches).

---

## Build order (confirmed by the assessment)

0. **Spike (throwaway):** custom `tabBar` on js-tabs + shared routes + iOS 26 header guard, before V3-1.
1. **V3-0a Structure and performance:** Biome ignore for mockups, CI job, ADRs 001–004, move dev fixtures out of `repositories/`, move `screens/*-helpers.ts` to `presenters/` and delete the 11 allowlist entries, split pure `domain/` from orchestration `services/`, one `DATE_KEY` helper, `messages.ts` skeleton, **per-week pre-bucketing perf fix** with equivalence test and perf smoke.
2. **V3-0b Foundations:** HAB-26, HAB-28, HAB-29, categories migration (HAB-42 data part), spacing/radius tokens + ratchet.
3. **V3-1 Navigation shell:** HAB-27.
4. **V3-2 Today:** HAB-30–34, 48 (Today copy). Split `TodayScreen`.
5. **V3-3 Progress:** HAB-35–38.
6. **V3-4 Habits tab and forms:** HAB-39–45.
7. **V3-5 First run and system states:** HAB-46, 47.
8. **V3-6 Accessibility, baselines, e2e, docs:** HAB-49, 50.
