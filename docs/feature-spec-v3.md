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
- **At-risk row (T4/SR1):** the at-risk sheet opens from the row's name area / status line, not from the circle. The circle always logs.
- **Edit this day keeps a Note field** when it is opened from Habit Detail (RL1/RL2 draw none): without it a day's note could no longer be written. Opened from anywhere else there is no note.
- **"Log a different habit" stays under the rest-day list** (T3 draws no such link): it keeps the off-schedule picker reachable, and the picker is part of HAB-34.
- **The quantity cap stays 9999** (the existing `MAX_QUANTITY_VALUE`); QS2's helper reads "up to 9999", not the mockup's 99.
- **"Browse suggestions" (T2) was hidden until HAB-46**; it is built (V3-5) and shown in the empty Today and Habits states.
- **× per week habits are never at risk by day** (HAB-33, T1/T6): the mockup draws no per-week habit at risk, and a one-date freeze cannot cover a week; a week-level freeze is Later.
- **Frames that show tab bar A** are drawn for brevity; build bar B (floating pill) everywhere.
- **P10 (Month, one habit) tiles are Completion / Longest / Freezes used**, not Completion / Streak / Longest: the current streak is not in the month data (V3-3b).
- **P12 (Year) always shows the habit chip** ("All habits" when unfiltered), unless exactly one habit exists; the mockup draws the chip only once a habit is chosen (P15).
- **The per-habit rates list (P8) includes an archived habit that had days in the range**; insights never name one (D11).
- **The AX3 stacked range list overlays the content** instead of pushing it down (P11); known, revisit in V3-6.
- **Only First Run hides the tab bar** (owner's decision, UI fix batch; reverses V3-6's "FR3 and FR4 without the bar"): FR1–FR3 (and Browse suggestions opened from First Run, root routes outside the tabs; FR3's question is a modal over Today) have none. The empty Today after Skip, or whenever there are no habits, is an ordinary tab root with the bar, and Progress and Habits open with no habits.
- **Re-tapping the selected tab scrolls to the top and focuses the title** (08.4); it does not pop a pushed screen.
- **Week day headers are 44 pt high and 28 pt wide** (P1): the cell pitch is 28 pt, so a 44 pt-wide target would overlap its neighbours. A touch-target exception, on the V3-6 audit list in `docs/backlog.md`.

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

> **As built (V3-0b):** the 2 routes, their tab entries, `placeholder-tab-screen` + test, the `tab-todos` / `tab-expenses` visual states and PNGs are gone; the tabs layout keeps only Habits until HAB-27. README, CLAUDE.md, `architecture.md`, `design-system.md` and `feature-spec.md` reworded (no future-modules promise; module-isolation rule kept). The fake `src/modules/todos/…` fixture in `check-architecture.test.mjs` is kept as-is: it only exercises the module-isolation rule.


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

> **As built (V3-1):** the spike passed 17/17 on SDK 58 and became **ADR 006** (`docs/decisions/006-navigation.md`), which carries the detail. The approach above is what shipped: one shared stack `src/app/(tabs)/(today,progress,habits)/`, each tab a group with its own `unstable_settings` anchor (Today = `index`, Progress = `week`, Habits = `manage`), so Detail, Reminders, Settings and Categories open inside the tab they came from and Back returns to it; Add/Edit habit stay root modals. The pill is `components/ui/composite/tab-bar-pill.tsx`, absolutely positioned (no layout height), with `TAB_BAR_BOTTOM_PADDING` = 112 on every scrolling screen in the tabs and one shell-level `ToastHost` 12 pt above it. Sheets cover it, dim it and make it inert. At AX1+ it becomes bar A (16 pt toast offset). The `⋯` menu is gone: Weekly/Monthly/Yearly → the Progress tab, Manage → the Habits tab, Settings → the gear in the Habits header; the menu's live sublines went with it. Icons are drawn from Views, not SF Symbols, which render as nothing on web.
>
> **Not in this batch** (see `docs/backlog.md` → HAB-27): **V3-02's collapsing large title** (built for Today in V3-3a; Progress and Habits adopt it with their own batches) and its eyebrows — the three tab roots keep the existing Today, weekly-summary and Manage screens unchanged, and the header lands with each screen's own rebuild in V3-2…V3-4. Only V3-02's 44 pt header buttons shipped.
>
> **Deviations:** the pill's 22 pt is measured from the **screen edge**, not above the safe-area inset — that is what the mockup draws (home indicator at 8 + 5, pill at 22 = "9 above home indicator") and the only reading under which T-25's 112 = 56 + 22 + 22 + 12 and T14's "toast bottom 90" decompose. At AX sizes bar A reuses the same 112, leaving 22 pt of clearance rather than space-600. A cold deep link with no group lands on the first tab (Today), so the "deep link restores the originating tab" edge case holds for in-app pushes only. `expo-blur` was added for the pill's material. A dev-only `?textSize=ax` exists because react-native-web never reports a real `fontScale`.

---

## HAB-28 — Design tokens and density
**Frames:** F-01–F-09, T-01–T-22

**Rules**
- One token set: colour (F-01), intensity + category palette (F-02, one accent intensity ramp, T-05), type scale (F-03; four off-scale sizes retired, nothing below 12 pt), spacing (F-04), radius (F-05), elevation and focus (F-06), motion (F-07), iconography (F-08, gear for Settings T-19).
- Density pass T-18: habit row ≈ 60 pt, icon square 32. No new hard-coded values: the token ratchet must stay green.
- Health and Social category hues move off red (T-16): hues 175 and 230.

**Check against code:** existing token files and the token ratchet script; which V2 delta values (cell 18/6/5, stat card 14/10/26, chart-card padding 16) are already applied.

> **As built (V3-0b, tokens only, additive):** `src/theme/theme.ts` adds `textStyles` (the nine F-03 styles under new names, next to the old `typeScale`) + `textStylesAx3`, `space` (F-04, keyed value × 25: `space[350]` = 14), `radius` (F-05: xs 4 · s 8 · m 14 · l 20 · xl 28 · pill 999, values from the master file) with `cellRadius()` / `squareRadius()`, `elevation` (F-06 lifted / toast / pill as `boxShadow`, per scheme, also on `useTheme().elevation`), `focusRing` + `focusRingShadow()` (T-13), `minTouchTarget` (44) and `motion` (F-07, durations + bezier tuples, toast hold times). AX3 sizes for subhead and footnote are 36 (T-30), not the mockup's 34 / 33. The only missing F-01 colour was `accent` (= ink), plus the pill fill `pillBg`; `outline`, `onAccent`, `warnTint`, the frozen pair and `toast`/`toastInk` already shipped, and danger stays `dangerBg`. Contrast tests cover onAccent/accent, accent and focus ring vs surfaces, toastInk/toast (≥ 10:1), frozenInk and ink on frozenBg, the frozen border and the warning glyph. **No screen uses them yet**; each V3 batch migrates its own screens (backlog). Not in this batch: the accent-tint intensity ramp (T-05, replaces `heatmapLevelColor`/`inkLevelColor`), the density pass (T-18) and the gear icon (T-19) — they land with the components that need them (backlog, "V3 foundations").

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

> **As built (V3-2a, logic only):** the selected day is `useSelectedDayQueries` (named for the hook-naming rule), day-keyed queries and writes, Undo capturing the date, toasts naming the date; **no week strip, bar or eyebrow yet** (V3-2b), so the app never selects a past day itself. Not-due, not-yet-started and paused habits are not listed for a past day.

> **As built (V3-2b):** the strip (`WeekStrip`, `useWeekStripQueries`) shows the week of the selected day until swiped (swipe or Next/Previous at AX sizes; never a wholly future week); today ringed, selected filled, the dot only when something was due and all of it done, future days faint and inert; 160 ms crossfade + 12 pt slide (crossfade only with Reduce Motion). While a past day is selected the eyebrow carries its date and a `PastDayBar` reads "Logging for Wed 21 Oct · Show today". One `ProgressBar` ("1 of 5 done", whole-number %), category groups as flat cards with "0 of 2", the dashed fold row ("1 not due today · Upper body" · Show; two names then "+N"). The large title collapses into a solid inline bar (superseded in V3-3a, see its As built note). The app starts on today; **nothing but the strip selects another day**.

> **As built (V3-3a, Today scroll):** tapping a day never moved the strip, the scroll offset or the title (measured on web and pinned by tests); what moved was the list — the "Logging for …" bar mounted instantly and pushed it down 64 pt, and the inline bar (then at 64 pt) covered the strip's day letters. The bar now fades in and the list glides over the 200 ms state timing (Reduce Motion: 150 ms crossfade, no glide). The collapse is scroll-linked on the UI thread (`useCollapsingHeader` + `CollapsedHeaderBar`, `components/ui/composite/collapsing-header.tsx`): the range is where the week strip's top edge meets the bar's bottom edge (measured from the header, 32 pt at normal text size); the title shrinks (scale 1 → 0.88) and fades over the first 60 % of it, the bar's name and + arrive from 50 %, its background and hairline from 70 %; scrolling that stops inside the range settles on the nearer end; with Reduce Motion there is no interpolation and no settling, only a 150 ms crossfade at the middle. **The week strip scrolls with the content** (T5 shows it gone from the compact bar, not pinned). The bar carries the **+** as a 44 pt `HeaderCircleButton` (the iOS 26 guard); T5 draws it smaller. Not yet: Progress and Habits headers.

> **As built (UI fix batch, step 1):** the strip keeps no browsing state: it **always shows the week of the selected day** (today by default). A swipe (or VoiceOver's Previous / Next week action) selects the same weekday a week away, never later than today, so the "Logging for …" bar says where logs go; selecting today or "Show today" returns to the current week. Owner decision: this replaces V3-2b's "week shown until swiped". Cause of the blank ~230 pt strip: choosing a day while browsing changed the selection and the week offset in two renders, which restarted the week fade and then stopped it at opacity 0; the offset, the direction state and the effect that reset them are gone, and the fade always ends at 1. Every day is now its own VoiceOver button ("Wednesday 21 October, today, 3 of 5 done", selected state, hint "Shows this day's habits"); the container is no longer one adjustable element (iOS exposed only the selected day). The scroll-linked collapse is kept.

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

> **As built (V3-2a):** a tap on a quantity circle writes `previous + 1` ("Drink water +1 · 3 of 8 glasses", date named off today) with an Undo that writes the amount captured at tap time; long-press on the circle and a stand-in count control ("3/8") open the sheet. The row's two tap zones, the visible count button, the at-risk dot and status line, and the all-done card are V3-2b.

> **As built (V3-2b):** the row is `HabitRow` (60 pt, hairlines between rows, icon square 32); the **name area opens Detail and the circle always logs**; at-risk rows open the streak sheet from the name area (the decision recorded under "Spec wins over the mockup"). Status line: the streak ("13-day streak"), the amount ("5 of 8 glasses"), "3× per week · 1 done", Break: "Resisting · 4 days strong" / "Resisted today · 5 days strong", at risk (amber) "Missed Thursday · 1 freeze left" ("… · no freezes left" at zero), frozen (violet) "Thu frozen · streak kept at 13". No completion time anywhere. The count button is a 28 pt pill in a 44 pt hit area. The all-done card draws its check (revealed left to right, 600 ms, once; static with Reduce Motion). "Resist tonight" (+ the streak) replaces "Resisting" for an open Break habit on the real today from 18:00 (`EVENING_STARTS_AT_HOUR`; the spec gives no hour). A plain daily check with no streak yet shows no status line.

**Implementation notes:** there is no step log (one entry per habit per day holds the total). +1 writes `previous + 1`; Undo writes `previous` captured at tap time (as the quantity sheet does today). `entries.created_at` is first-insert time, so no time is shown.

---

## HAB-32 — Today: states
**Frames:** T2, T3, T5, T8, T13

**Rules**
- **Empty (T2):** header and + only; week strip and progress hidden; one primary action "Add habit" and a link to suggestions (HAB-46). Shown only after data has loaded (no flash).
- **Rest day (T3):** "Nothing is due today, so every streak is safe. Anything you log counts as a bonus." Not-due habits reachable via dashed circles; a × per week habit that met its target shows "back Monday".
- **Loading:** header and date are real immediately; skeleton rows appear after 300 ms; static with Reduce Motion (HAB-47).

> **As built (V3-2b):** the empty state hides the strip and progress (`EmptyState`, V3-28) and offers "Add habit"; **"Browse suggestions" was not shown** until the suggestions screen (HAB-46) existed (superseded by V3-5), because there is nowhere to send it. The rest day (T3) is a state: why nothing is due, then "Not due today · Bonus logs" with the not-due habits on dashed circles (a met × per week habit shows done and "back Monday"). The old "Log something anyway" picker stays reachable below the list as "Log a different habit" (an addition to the frame, kept because the picker is part of HAB-34). **Loading skeleton: built in V3-5 (SY1).**

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

- **× per week habits are never at risk by day** (decided after V3-2b): they have no scheduled day to miss, so they never show the amber dot, the "Missed <day>" status or the at-risk sheet (the gate is in `getStreakAtRisk`; their streak maths is unchanged). A week-level freeze — covering a week that ended below its target — is **Later**.

**Edge cases:** only yesterday is in the window; Undo restores the freeze count and at-risk state exactly; the at-risk dot clears when the grace window ends.

> **As built (V3-2a):** SR3 is the one-button "Got it" sheet ("No freezes left this month … Your longest streak is kept"), opened from the row's name area like SR1; SR1 is "Keep your <habit> streak?" with **Use a freeze** / **Not now** (writes nothing); toasts "Freeze used for Thu 22 · 0 left" and, PR-11, "Freeze returned for Thu 22 · 1 left" (a log that completes a frozen day deletes the freeze in the same transaction; Undo restores entry and freeze); `freezesUsedInMonth` is exposed through `useSettingsQueries().freezePool`. **Day closed is removed** (HAB-32 lists only empty, rest day and loading; PR-01 is Later).

**Data:** `frozen_days` (habit, date, created_at) already records each use; the pool counts rows by missed date within the month.

---

## HAB-34 — Quantity sheet, Edit this day, habit picker
**Frames:** QS0–QS4, RL1–RL3, HP1, HP2, P13

**Rules**
- **Quantity sheet (QS1):** stepper with 44 pt buttons, quick +1/+2/+3, Fill to target, Set exact value (QS2: number pad, "Set to 6" logs the difference). Each change saves immediately; closing shows one toast with Undo. (Today's quantity sheet has a Save button: model change.) At target (QS3) Fill is disabled; extra amounts still count.
- **Edit this day (RL1/RL2):** one sheet for any past day, from Week (tap day header), Month (tap day → detail card → Edit this day), Year (via Month), Detail mini-grid (whole week row is one 44 pt target). Lists every habit due that day with its circle; quantity rows open the quantity sheet for that date. Before-start and paused days are not listed. After a change the toast appears inside the sheet above Done, names the date, offers Undo. (Today's retro-log is a draft + Save transaction; V3 saves per tap with Undo: model change in `retro-log-sheet` and `saveDayLog` usage.)
- Future days: not editable ("Can't log ahead — pick today or an earlier day").
- **Habit picker (HP1/HP2):** from the habit chip on Year: All habits, active habits, archived habits; single choice, sheet closes on tap.

> **As built (V3-2b):** *Quantity sheet* — stepper (44 pt), quick +1/+2/+3 and "Fill to N" (disabled at the target), "Set exact value" (number pad, "Set to 6" writes the amount, i.e. logs the difference), every change saved at once, one toast on close whose Undo restores the amount from before the sheet opened; at the target "of 8 glasses · done" and Done. The "up to" limit reads the real maximum (9999), not the mockup's 99. *Edit this day* (`EditDaySheet`) replaces the retro-log sheet: rows are the Today `HabitRow`, a tap saves at once, the toast sits inside the sheet above Done ("Read 20 min logged for Wed 21", Undo), quantity rows open the quantity sheet for that date, a frozen day is a violet circle and logging it returns the freeze. It is opened from Habit Detail's heatmap (the only entry that exists until Progress is rebuilt) and keeps the day's note for the habit it was opened from, saved when the sheet closes (the frames draw no note; it stays so notes remain writable). The off-schedule picker keeps its behaviour on V3 tokens; its Year-chip retarget (HP1/HP2) is a later batch.

**Edge cases:** frozen day in RL3 (PR-11 fallback = read-only); quantity edit on a past day targets that date and Undo too.

> **As built (V3-3b):** Edit this day opens from Progress too (Week day header, Month day card) with no origin habit — `useRetroLogQueries(null, date)` — so it has no note field. The Year chip's picker is `HabitFilterSheet` ("Show habit").

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

> **As built (V3-3b):** `screens/progress-screen.tsx` is the one Progress tab root (route `progress`, anchor of the Progress group). The large title collapses into the inline bar (`useCollapsingHeader`), and the Week / Month / Year control is **one element pinned under the bar** (`PinnedBelowBar`); at AX sizes it collapses to the selected range and a tap opens a stacked list (`SegmentedControl axLayout="collapse"`). Header: eyebrow ("Week of 19 October"), title, Export pill; Export opens the export sheet, or — with no habits or no logs — reads disabled and toasts why. Week: three tiles (Completion, Best streak, Best day; one habit: Completion, Streak, Freezes), the insight pager, the matrix card with its legend, then Week summary (daily bars, perfect days, freezes used, bonus logs). Matrix cells are 24 pt and not tappable; each day header is a 44 pt-high button opening Edit this day (not for days that have not happened); a row is one VoiceOver stop ("Drink water, 3 of 7. Monday, done. …"), partial always with its %. One habit (exactly one exists) or AX3: blocks of seven 40 pt cells with the date, each its own stop ("Wed, done") and a button. Too early (P2): unlock card in place of tiles and insights, matrix stays, "Started Wed 21 Oct · Mon–Tue before start". No habits (P3), nothing logged (P4: outlined cells, link to Today). Deviations are in `docs/backlog.md` → V3-3b.

**Performance prerequisite:** the per-week streak/heatmap/year maths is O(n) per day and takes seconds on 5 years of data; the **pre-bucketing fix lands in V3-0a before Progress** (no semantic change, with an old-vs-new equivalence test).

> **As built (V3-3a, data layer only — screens are V3-3b):** `useProgressWeekQueries` returns the matrix (`WeekMatrix`: a status per cell, row totals "n/target"), the stats (rate, +N pts, best streak, best day with the daily bars, perfect days, ranked per-habit rows, bonus and freezes listed) and up to three insights, in one of four distinct views: `no-habits` (P3), `nothing-logged` (P4, cells read `nothing-logged`, not `missed`), `too-early` (P2: fewer than 7 distinct logged days, with days remaining and a progress fraction; the matrix still renders) and `ready`. One-habit variant: `habitId`. The rate is one rule everywhere (`domain/completion-rate.ts`). See `docs/progress-data.md` for the interpretations (7 logged days, best streak, row totals).

---

## HAB-36 — Progress: Month
**Frames:** P7–P11, P13

**Rules**
- Month calendar of completion intensity (accent tints, day number); partial days carry a corner notch; frozen violet; today ringed; future hairline; before start dashed. Overall rate, perfect days, best streak.
- Per-habit rates (P8): ranked by rate, slipping last with amber bar; Break habit tagged "Break"; frozen days excluded; bonus logs listed as "not counted".
- Tap a 40 pt day → rings it and shows a detail card with each habit's state and "Edit this day".
- Defaults to the **current month** (D15; the V2 "last complete month" rule is retired). Other months open from Year. Too early (P9): unlock card, calendar shows logged days, earlier days dashed. One habit (P10): binary calendar.

> **As built (V3-3a):** `useProgressMonthQueries({ month, habitId })` (current month by default; Monthly's old screen follows suit and now unlocks after 7 logged days, not 30 days of history) returns the calendar (`MonthCalendar`: level 0–3, notch for L1/L2, `perfect`, frozen and open-today statuses) and the summary; `useDayDetailQueries(date, habitId)` gives the day card (each habit's state, done ÷ due, `editable` false for the future) from that date's week only.

---

> **As built (V3-3b):** the calendar is 40 pt day cells with their number (accent tints, a 22 % notch on partial days, frozen violet dashed, today and the tapped day ringed, future hairline, before-start dashed) under a Monday-first axis; a day is a button that rings it and shows its detail card ("4 of 5 done · 80%", each habit's state in words, "Edit this day" unless the day has not happened). Tiles: Completion (+N pts vs the previous month), Perfect days ("of N so far"), Best streak; then the insight pager, the calendar with Less → More and "N freezes left" and a note ("22 Oct frozen · 24–31 still ahead"), then per-habit rates (ranked, slipping last on the amber bar, the Break tag, frozen and bonus named). Month from the range switcher is the current month, in place (D15). A Year month label pushes that month as its own route (`/month/2026-07-01`) inside the Progress stack: Back and the iOS swipe-back return to Year with its filter and scroll kept.

## HAB-37 — Progress: Year
**Frames:** P12, P14–P16

**Rules**
- GitHub-style year heat map: three 4-month bands, 16 pt cells, month labels, Less → More legend (partial levels notched), frozen violet. **Month labels (44 pt) are the only tap targets** and open that Month; day detail lives in Month (P13). Back returns to Year.
- Habit chip filters the map to one habit (HP1/HP2); binary cells.
- Too early (P14): unlock card plus only the current band. AX3 and VoiceOver: month list with bars and whole-number % (P16).
- Best month insight ("September was your best month").

**Check against code:** per-day completion level 0–3 for a full year, all habits or one — query cost.

> **As built (V3-3a):** `useProgressYearQueries({ year, habitId })` returns `YearMap`: 365 day cells (level 0–3, frozen, today), 12 month tiles in three bands, `bestMonth`, and `monthList` (month, whole-number %, bar 0–1) for the VoiceOver / AX3 fallback. One build is ~40 ms for a year of 20 habits (Node), ~80 ms with the previous year for "+N pts"; `domain/year-map.perf.test.ts` keeps a ceiling on it.

---

> **As built (V3-3b):** the year is three bands of four months, a column per week and a row per weekday (Mon on top), 16 pt cells (the gap drops from 2 pt to 1 pt when a band has 19 weeks so it still fits), month labels ("Jan ›") the only buttons (44 pt high through hitSlop) and the cells hidden from VoiceOver. Tiles: Completion since the first log, Best streak, Best month (one habit: Completion, Longest, Freezes used). The habit chip (always shown unless only one habit exists) opens "Show habit" — All habits, the active habits, then the archived ones — and closes on a choice. VoiceOver and AX sizes get the month list (bar + whole-number %, each a button). Too early shows the unlock card and only the current band.

## HAB-38 — Insights
**Frames:** P1, P5, P7, P10, P12 · **Component:** V3-12

**Rules**
- One insight card on screen with a pager (dots) for up to three, ranked: slipping → improved → pattern-with-single-cause → nothing to fix. Tones: warning (amber), positive, neutral.
- Slipping: action "Change frequency" → Edit habit scrolled to Frequency. Improved and "nothing to fix" are not tappable. Gate order: too-early → perfect/nothing to fix → slipping.
- Weekday-pattern insight is **Later** (PR-03); do not build.
- Year-scale insights need ≥ 3 months of history (V2 rule kept).

> **As built (V3-3a):** `domain/progress-insights.ts` ranks slipping → improved → nothing to fix (cap 3). A slipping card carries the action `{ type: "edit-habit", habitId, focus: "frequency" }`; the others `null`. Tones `warning` / `positive` / `neutral` (V3-3b maps `positive` to `InsightCard`'s `success`). Gate order: too-early (no insights) → perfect (only "nothing to fix") → slipping. "Nothing to fix" follows the improved cards whenever nothing is slipping. Year adds a best-month card (improved class). The weekday-pattern insight is not built (PR-03).

---

> **As built (V3-3b):** the pager is `InsightPager` over `InsightCard` (icon square, title, body, an inline link; padding 14, radius 20): one card with dots for up to three, each read "Insight 1 of 3" and adjustable; only a slipping card's "Change frequency ›" is a target and opens Edit habit scrolled to Frequency. Wording is in `progressCopy`; "is up N days" uses the done-day difference, falling back to points.

## HAB-39 — Habits tab: library
**Frames:** H1–H7 · **Components:** V3-13, V3-23

**Rules**
- Header "Habits" with gear (→ Settings) and + (→ Add habit). Search field. Active habits grouped by category with a count; **Reorder** in the Active header; Archived collapsed (expand in place); then Categories entry.
- Search (H2/H3) matches active and archived, results split by status; archived results can be restored in place. No results: says what was searched and offers "Add <name>" (opens Add habit with the name filled).
- Reorder (H4): handles + Done; a lifted row stays inside its category (cross-category change is Edit).
- Archived (H5): Restore is instant with Undo toast "<Habit> is back on Today"; copy explains fresh streak and paused days.
- Empty (H6): Add habit + suggestions; Categories stays reachable.

**Check against code:** existing Manage & archive screen (HAB-19) is replaced; reuse the reorder-within-category logic.

> **As built (V3-4a):** *Habits tab* — route `manage` renders `HabitsScreen`. Header: counts as the eyebrow ("7 active · 2 archived", "No habits", "Reorder · drag within a category"), gear and + (Done while reordering), collapsing into the inline bar (which keeps the buttons). Search matches names, case- and accent-folded, across active and archived; results split by status, archived ones have Restore; no results says what was searched and offers "Add “Yoga” as a habit" (`/new-habit?name=Yoga`). Rows: icon square, name, "Daily · 8 glasses" / "3× per week" / "Tue, Thu" / "Break · daily", with "13-day streak" only on a daily Build habit; VoiceOver actions Reorder and Archive. Reorder keeps a lifted row in its category (VoiceOver Move up / Move down on the grip). Archived is collapsed ("Show"/"Hide"), Restore is instant ("<Habit> is back on Today", Undo restores the archive date and pauses) and a line explains the fresh streak. Categories row (count) at the end, its Back reads Habits. H6 hid "Browse suggestions" until HAB-46 (superseded by V3-5). Deviations: `docs/backlog.md`, "V3-4a".

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

> **As built (V3-4a):** title row (eyebrow, name, Edit pill); archived banner with Restore (D4) or "Restored today" for the day of a restore (D5); tiles Streak / Longest / 90-day rate ("+4 pts" against the 90 days before, only for a habit older than 90 days whose earlier window has 7 due days; Break habits say "resisted"; under 7 due days "after 7 days"), and in the month of a streak reset the third tile is the amber Freezes tile (D6); "Last 5 weeks" on `CompletionRows` with a legend of only the states drawn; each week row is one 44 pt button reading the whole week and opening Edit this day for the latest due-and-unlogged day that week, else the latest editable day; paused days are hatched; Reminders row ("07:00 · Tue, Thu", "None", "Paused"); History lists the latest ten days that are done, partial, missed, frozen, bonus ("Done · off-schedule, not counted", Bonus tag) or carry a note, newest first, no times and no "See all"; Archive and Delete last, each behind a sheet. A repeated archive/restore cycle leaves one notification per reminder (`habit-lifecycle-service.cycles.test.ts`).

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

> **As built (V3-0b, data part only; no reorder UI yet):** migration **0011** adds `categories.sort_order` (NOT NULL, default 0) and in the same transaction: Health → 175, Social → 230; the custom rotation drops **15, 350 and also 175, 230** (owner's decision: otherwise the next custom lands on Health's hue), leaving 6 slots (ring 330, square 95, bars 220, plus 265, half 130, archive 290); every custom on a dropped hue moves to a **whole new slot** (shape + hue, owner's decision), in id order, each taking the slot `nextCategoryAppearance` would pick; `sort_order` is backfilled 1…n from first appearance among **active** habits in manual order, then categories only archived habits use, then unused ones by id, Other last. The repository reads in `sort_order` (ties by id) and a new category takes max + 1 (same statement); the web twin starts its fixtures in the order 0011 would store. `groupHabitsByCategory(habits, categories)` (Today, Manage) follows the stored order and still forces Other last, since a new custom is stored after it. The picker and Manage Categories keep creation (id) order via `inCreationOrder`. Today used first appearance among the **due** habits, so on a day the earliest habit of a category isn't due, its group can now sit higher than before; Manage is identical. **Not reversible:** the old Health/Social hues and the remapped customs' old looks are overwritten; a downgraded build would read the new colours and ignore `sort_order` (drizzle skips journal entries it doesn't know).

---

## HAB-43 — Reminders
**Frames:** R1–R3, R5 · Extends HAB-21

**Rules**
- List of 24-hour times, each with its own weekdays; remove on the left (instant, Undo toast "Reminder at 18:30 removed"); tap to edit; Add time sheet (default 09:00).
- Notifications denied (R5): warning banner "Reminders won't arrive until you allow them in iOS Settings" + Open Settings; times stay editable.
- Insight deep link (R4) is **Later**.

> **As built (V3-4b):** the screen is `ScreenHeader` (eyebrow = habit name + schedule), one flat card of `ReminderRow`s (`RemoveButton` on the left, tap = edit sheet, "Off" shown for a legacy disabled time), and one `ReminderSheet` for add and edit (the same sheet the habit form uses). The per-reminder on/off toggle is gone: remove is the way to stop one. The cap (4) shows as a banner and the footer hint. Archive and restore rebuild the habit's notifications without duplicates (tested). Denied permission shows the amber `Banner` with Open Settings. Deviations and loose ends: `docs/backlog.md` (V3-4b).

---

## HAB-44 — Settings and export
**Frames:** S1–S7, EX1–EX4, SY6

**Rules**
- Pushed from the Habits gear. Groups: Appearance (Light/Dark/System; "Weeks start on Monday" and text size are explained, not configurable), Reminders (evening review toggle + time; notifications-off notice), Streaks (freeze count and how to use one — PR-07 resolved: 2 a month, shared, no roll-over), Data (Export; backup is Later), About (version, Copy diagnostics → toast).
- Evening review: existing reminder only (nudge if anything is still open, sent only on days with open habits). Closing the day is Later.
- Export (EX1–EX4): JSON or CSV → progress with file name (closing the sheet keeps it running; toast when ready) → file card (size, counts, Share file) → error banner with reason, Retry, "Nothing was changed". Same flow from Progress › Export. Archived habits included; to-dos/expenses removed (HAB-26).
- SY6: when iOS permission is off, one banner summarising what is affected ("4 times on 3 habits") with Open Settings.

> **As built (V3-4b):** Settings is **one scrolling screen** with five flat cards (Appearance, Reminders, Streaks, Data, About), not a hub with a page per frame; the frames S2–S6 and SY6 are its sections. The evening-review time is **editable** from its row (the shared time wheel in a sheet without days; stored as `habits.eveningReviewTime`; the default stays 21:30, the spec fixing none — the frames' 21:00 is not copied). The time is stored first; if the reschedule then fails it is logged and the launch reconcile moves the notifications, with no toast. The evening review is scheduled only on weekdays an active habit can be due. Export is one sheet backed by a store (`useExportStore`), so closing it keeps the export running and a toast reports the result when no sheet is open; the JSON now carries reminders and categories; the file card shows size and counts. Version reads "x.y (build)". Deviations: `docs/backlog.md` (V3-4b, steps 5 and 6).

---

## HAB-45 — Destructive confirms
**Frames:** DC1–DC7 · Replaces HAB-23

**Rules**
- **Delete habit (DC1):** names what is lost ("Deletes Read 20 min and its 214 logs"), offers **Archive instead** first (default focus), then **Delete permanently**; no Close, Cancel ends it. Deleting (DC3) disables Cancel; success pops Detail to Habits with a toast (no Undo). Failure (DC4): banner inside the sheet "Nothing was changed. Try again."
- **Archive (DC5):** one tap, Archive habit (primary) / Cancel; afterwards Detail pops and the toast offers Undo.
- Delete category: HAB-42.

> **As built (V3-4a):** `DestructiveConfirmSheet` (V3-25) is shared with Delete category: Archive instead is a navigable row that takes the screen reader's focus when the sheet has settled (`useInitialFocus`), Delete permanently an outlined red pill with "One tap deletes. This can’t be undone." (read as its hint at accessibility sizes), Cancel last; the scrim and swipe-down are Cancel until the delete runs. DC3: "Deleting…", Cancel disabled, no dismissal; success pops Detail to where it was opened from with "<Habit> deleted" and no Undo. DC4: an alert banner ("Couldn’t delete / Nothing was changed. Try again.") and Delete stays available; `deleteHabitAndHistory` is one `runInTransaction`. DC5: `ArchiveHabitSheet`, Archive habit / Cancel; afterwards Detail pops and "<Habit> archived" offers Undo.

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

> **As built (V3-5):** *Gate:* First Run replaces the tabs (route `/first-run`, outside `(tabs)`, so no pill) only while the database has no habits, archived included, and `habits.seenFirstRun` is unset; the flag is written on a first save, on any skip and once for an install that already has habits. FR1 welcome (Skip for now is an addition); FR2 is the New habit form in `slim` mode (name, five quick picks that also carry category and target, Type, Frequency) whose Close skips to Today; FR3 is an `AlertDialog` in its `offer` layout over Today (after our question Allow reminders raises the iOS prompt and then adds the default 09:00 reminder, Not now does nothing); FR4 is the empty Today. *Suggestions:* `suggestions.ts` holds the nine; `/suggestions` is a root modal (`?firstRun=1` from First Run), rows from `groupSuggestions` (Break habits last), Added by the form's duplicate rule; a tap pushes `/new-habit?prefill=…`. Entry points: FR1, Today's and Habits' empty states. Deviations: `docs/backlog.md`, "V3-5".

> **As built (UI fix batch, step 4):** the `landing` flag is gone; the tabs layout hides the bar only while the FR3 question is open. Skip no longer flakes: the tabs' gate reads the "seen" flag from a live query that lags the write, so for a moment after `markFirstRunSeen` the gate still said "first-run" and the tabs redirected straight back to the welcome (the empty Today was only sometimes on screen). `leaveFirstRun` now sets `leftFirstRun` first, the layout does not redirect while it is set, and clears it once the gate reads "done".

---

## HAB-47 — System states
**Frames:** SY1–SY6, TC3

**Rules**
- Loading (SY1), load error inside Today with Try again + Copy diagnostics, tabs still usable (SY2), migration in progress before the tabs, indeterminate (SY3), migration failed (SY4), midnight rollover banner (SY5), notifications denied (SY6).
- Banners carry states that last (notifications off, archived, export failed, new day); toasts carry events.
- Migration promises are true (one transaction); SY3 is indeterminate.

> **As built (V3-5):** SY1 `TodaySkeleton` after `motion.skeleton.delay` (300 ms), pulsing on the 1.2 s loop and still with Reduce Motion, one "Loading your habits" stop; SY2 `LoadErrorBoundary` around Today with `TodayLoadError`; SY3/SY4 in `DatabaseProvider` (copy handed in as `migrationCopy`): `MigrationScreen` (indeterminate, only on an upgrade, painted 100 ms before the migrator starts) and `ErrorScreen` with a reason banner ("Update didn't finish", "Nothing was changed", Try again, Copy diagnostics); SY5 `TodayRolloverBanner` from `useRolloverQueries` with `useToday(clock)` injectable. SY6 was built in V3-4b. Deviations: `docs/backlog.md`, "V3-5".

---

## HAB-48 — Message catalogue
**Frames:** TC1–TC3 and the catalogue table (06 Messages)

**Rules:** all toasts, banners and inline messages come from one catalogue module; copy per the mockup table. Durations: Undo 5 s, success/info 3 s (owner shortened it from 4 s, UI fix batch), warning 6 s, errors until Retry or swipe. Placement: 16 pt above bar A, 12 pt above pill B; inside a sheet above its last button; never over Undo. VoiceOver announces every toast and keeps it until dismissed.

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
