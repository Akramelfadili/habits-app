# Backlog

Deferred work and deviations from the specs, recorded while building so they aren't lost. Append new entries under the ticket; never silently drop a deviation. Code markers use `TODO(backlog)`.

Status key: **Open** = something to decide or build · **Decided** = a deliberate deviation, recorded for the reviewers · **Done** = kept only for history.

## Open — product decisions and unbuilt spec rules

- **Monthly pattern insight should open Reminders with "Add a time" open and the day pre-selected** (HAB-16 rule, deferred; `?addTime=<day>`). The action currently opens the habit's Reminders screen with nothing pre-opened. `TODO(backlog)` in `monthly-summary-screen.tsx`. HAB-21's own rules were a removal only, so it was not built there either.
- **Archive is not at the foot of Edit habit** (HAB-17 rule). The "never stuck" card links to Edit habit as it is and reads "Edit or archive <habit> →"; the form has no Archive action (archiving lives on Detail and Manage). Add Archive to the form or retarget the card. See `yearly-summary-screen.tsx`.
- **Edit habit has no delete entry** (HAB-23). Mockup E7 is labelled "from Edit habit · delete", but the only way in is "Delete habit" on Habit Detail. HAB-23 was layout-only, so no entry was added. Decide whether Edit habit should get one.
- **Monthly insights can still name or link an archived habit**, while Yearly insights exclude archived habits (HAB-17). Make Monthly consistent: compute its insights and their action targets from active habits only, keeping archived history in the tiles, calendar and rows.
- **Category order on Manage and Today** (HAB-19). Both use `groupHabitsByCategory` — categories in order of first appearance among habits in manual order, "Other" last — so they always agree. Ordering by the managed category order instead would be more predictable but must change on Today in the same release, otherwise "matches Today" in the Manage footnote stops being true.
- **Manage keeps the pushed back button and the "Habits" title, with no "Done"** (HAB-19, mockups D3/E2/E3 show a modal-style "Done"). Revisit if Manage becomes a modal or a tab destination.
- **C1 omits the Last week / This week switch** (HAB-16). The Weekly mockup shows only the Week / Month / Year switcher; the V1 compact switch is kept because HAB-16's rule is that the range switcher is the only change to Weekly. Decide whether C1 means it to go.
- **Yearly shows only the current year.** No way to look at last year; January opens on a nearly empty "<year> so far". Consider defaulting to the last full year for the first weeks of January, as Monthly opens on the last complete month.
- **Ghost "Add habit" button and dev buttons on Today** (`today-screen.tsx`). The mockup's populated Today has no add-habit affordance; the button stays as a fallback entry point. The dev buttons are gated on `__DEV__`; they need a "Developer" label, and the seed code should move out of production hooks (audit A1-06).

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
- Early-year, empty ("Nothing to summarize yet"), "Perfect year so far" and "Nothing stands out" cards have no mockup.
- "Logged" counts completed scheduled days, not off-schedule logs.
- Fixture numbers differ from C4's tiles (948 / 80% vs 1,612 / 81%): the fixture is tuned to C5's insights.
- Insights come from active habits only; tiles, chart and strips keep archived history, so "Best: <month>" can differ from the best-month card.

### HAB-18 — Logging
- Retro log keeps "Cancel" where D4 says "Close": the sheet holds an unsaved draft (UX audit #10).
- The picker is a sheet over the rest day, not a separate screen; quantity rows show "Amount" with an SF Symbol chevron (blank on web).
- D2's time is the entry's `createdAt`; no column was added, and it doesn't move when a quantity is re-logged.
- `OffScheduleRow` opens Habit Detail on tap; its trailing check is not a toggle. Removing a bonus log is the toast's Undo, or Detail / retro log.

### HAB-19 — Manage
- Archived-row subtitle reads "Archived 2 Sep · no logs" (shortened from "nothing logged"); "N logs kept" follows the mockup.

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

## Visual-check

- **`today-menu-open`, `today-empty-menu-open`, `today-menu-open-dark` and the menu states on Weekly/Monthly/Yearly were flaky** (a 74 px popover offset). Root cause and fix: see `docs/audits/audit.md` A10-10 and the B3 hardening notes in `docs/dev-tooling.md`. Baselines recaptured after five consecutive stable full runs.
- Baselines re-captured over time: `retro-log` (D4), `delete-confirm*` (E7), `habit-detail-no-freezes` (D6); added `rest-day-picker*`, `rest-day-logged`, `habit-detail-bonus`, `delete-confirm-dark`, `delete-confirm-archived`.
