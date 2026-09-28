---
title: Habits — Feature Spec
status: draft
version: 1.0
domain: Habits (1 of 3 — Habits · To-dos · Expenses)
tags: [spec, habits, v1, personal-app]
---

# Habits — Feature Spec

> [!info] How to use this file
> Features are ordered by **build sequence**, not by importance — each one only needs what came before it. Build straight down the list: get Feature 01 fully working end to end before starting 02. Every feature has an **Acceptance criteria** checklist at the end — check items off as you implement them in Claude Code, so this file doubles as your build tracker.

**Scope:** V1, iOS, single local user, no accounts, no cloud sync.
**Replaces:** InnerGrow Habit Tracker (the app currently being used).
**Not yet decided:** technical architecture, stack, storage engine — this document is product/behavior only. Nothing here should be read as a data model or schema; that's a separate step once every feature below is locked.

---

## Table of contents

1. [[#01 — Create a habit]]
2. [[#02 — Frequency and scheduling]]
3. [[#03 — Today view and completion]]
4. [[#04 — Break-habit framing]]
5. [[#05 — Day-level states (empty, rest day, day closed)]]
6. [[#06 — First run]]
7. [[#07 — Quantity-based habits]]
8. [[#08 — Streaks and freezes]]
9. [[#09 — Habit detail and history]]
10. [[#10 — Retroactive logging and notes]]
11. [[#11 — Weekly summary]]
12. [[#12 — Reminders]]
13. [[#13 — Reorder, archive and delete]]
14. [[#Out of scope for V1 (backlog)]]

---

## 01 — Create a habit

**Depends on:** nothing — this is the first feature to build.

### User story
As me, I want to set up a habit in under 20 seconds — its name, whether I'm building it or quitting it, and how it looks — so the app never gets in the way of actually starting.

### Behavior
A single form, reachable from an "Add habit" button. Fields, in order:

| Field | Type | Required? | Rule |
|---|---|---|---|
| Name | short text | Yes | 1–40 characters |
| Icon | pick one of a fixed set (8 icons) | Yes | defaults to a generic dot icon |
| Color | pick one of a fixed set (6 colors) | Yes | defaults to the first color not already used by another active habit |
| Category | short text | No | free text, auto-suggests values you've typed before; left blank = "Anytime" |
| Direction | Build / Break toggle | Yes | defaults to **Build** |
| Target type | Simple check / Quantity toggle | Yes | defaults to **Simple check** (Quantity is detailed in Feature 07 — for this feature, just build the toggle and the "off" state) |

Save button is disabled until Name has at least 1 character. No confirmation dialog on save — it saves and returns to the previous screen immediately.

### Business rules
- **Direction cannot be changed after the habit is created.** Editing a habit shows Direction as read-only with a short note explaining why (changing it later would make past history nonsensical — a "build" streak and a "break" streak mean opposite things).
- Two habits are allowed to have the same name. This is a personal app for one person, not a shared list — don't block on it.
- A habit is **not** assigned a frequency in this feature. Feature 02 adds that field to this same form; build this one first so there's something to attach frequency to.

### States
| State | Trigger | Behavior |
|---|---|---|
| Create | Tap "Add habit" | Blank form opens, Save disabled |
| Edit | Tap an existing habit → Edit | Same form, pre-filled, Direction locked |
| Validation error | Tap Save with empty Name | Inline red text under the Name field: "Give this habit a name." Save stays disabled — no toast, no alert |

### Edge cases
- Emoji or special characters in Name: allowed, no filtering.
- Leading/trailing whitespace in Name: trimmed silently on save.
- User backs out mid-creation (swipe away / cancel): discarded, nothing saved, no "are you sure" prompt (nothing was committed yet).

### Acceptance criteria
- [ ] Add-habit form with Name, Icon, Color, Category, Direction, Target-type-toggle (Quantity fields can be stubbed/hidden for now)
- [ ] Save disabled until Name is non-empty
- [ ] New habit appears in the habit list immediately after save
- [ ] Editing a habit pre-fills the form and locks Direction
- [ ] Direction lock shows an explanatory note, not just a disabled control with no context

---

## 02 — Frequency and scheduling

**Depends on:** 01

### User story
As me, I want a habit like "gym" to only ask for attention on Monday/Wednesday/Friday, not nag me every single day.

### Behavior
Adds a **Frequency** field to the Create/Edit form from Feature 01, with three modes:

| Mode | What you pick | Counts as "due today" when… |
|---|---|---|
| **Daily** | nothing extra | every day, no exceptions |
| **Specific weekdays** | multi-select Mon–Sun | today's weekday is one of the selected days |
| **X per week** | a number, 1–7 | every day, *until* that many completions happen that week — then it stops appearing for the rest of that week |

A "Weekdays" quick-select button pre-fills Mon–Fri into the Specific-weekdays picker as a shortcut. It is not its own mode — after tapping it, the five days are just individually selected and can be adjusted like any other Specific-weekdays selection.

### Business rules
- The week runs **Monday to Sunday**. This must match the Weekly Summary feature's week window exactly (Feature 11) — don't let the two be implemented against different week starts.
- Changing a habit's frequency **does not touch past logs.** Only future scheduling changes. If you go from Daily to Mon/Wed/Fri, everything logged before the change stays exactly as logged.

### Edge cases
- An "X per week" habit hits its target on day 3: it disappears from the Today view for days 4–7 of that week, then reappears the following Monday regardless of how it was going.
- Editing a habit's frequency on the same day it's already been logged: today's already-saved log entry is untouched even if the new frequency wouldn't have scheduled the habit for today.

### Acceptance criteria
- [ ] Frequency field added to Create/Edit form with all 3 modes
- [ ] "Weekdays" shortcut pre-fills but doesn't lock Mon–Fri
- [ ] A function/query exists that, given a date, returns "is this habit due today" correctly for all 3 modes
- [ ] X-per-week correctly stops counting a habit as due once its weekly count is met, and resets on Monday

---

## 03 — Today view and completion

**Depends on:** 01, 02

### User story
As me, opening the app in the morning, I want to see exactly what's due today, grouped the way my day actually flows, and check things off in one tap.

### Behavior
The main screen. Shows:
- A date header ("Today", with the full date underneath)
- One overall progress bar + fraction ("2 of 6 complete — 33%")
- Habits due today (per Feature 02's logic), **grouped by Category** (Feature 01's field) — each group shown as its own card with its own mini-count (e.g. "Morning 2/3")
- Habits with no category fall into a group labeled **"Anytime"**, shown last

Tapping a habit row's check control toggles it done/undone **instantly** — no confirmation, no animation delay longer than ~200ms. Tapping the habit's name/label (not the check control) opens Habit Detail (Feature 09 — stub this navigation now, build the destination screen later).

### Business rules
- Un-checking a completed habit on the same day is always allowed and immediately decrements the progress bar. No "are you sure."
- Group order on screen follows the order categories were first created in, not alphabetical — matches how the person naturally organized their own day.
- Within a group, habits follow the manual sort order from Feature 13 once that exists; until then, creation order is fine.

### States
| State | Trigger | Behavior |
|---|---|---|
| Habits due | ≥1 habit scheduled today | Grouped list as described above |
| Nothing due at all | Covered separately — see Feature 05 | — |

### Edge cases
- More than ~10 habits due in one day: each category group scrolls independently rather than the whole page growing without bound. (Design constraint — verify visually at high habit counts, don't just assume it'll be fine.)
- A quantity-type habit appears in this list before Feature 07 is built: for now, treat it as a simple check (tapping toggles done/undone); Feature 07 replaces that tap behavior with the quantity sheet.
- A Break-direction habit appears in this list before Feature 04 is built: for now, render it as a plain Build-style row — filled check style, no resistance framing/copy; Feature 04 replaces the visual and copy treatment for Break habits.

### Acceptance criteria
- [ ] Today screen renders only habits due today per Feature 02's logic
- [ ] Habits grouped by category, "Anytime" group last
- [ ] Overall progress bar reflects live completion count
- [ ] Tap-to-toggle works instantly with no confirmation
- [ ] Un-checking works and updates the progress bar
- [ ] Tapping a habit's name navigates toward the (not-yet-built) detail screen without crashing

---

## 04 — Break-habit framing

**Depends on:** 03

### User story
As me, tracking "no phone in bed," I want checking it off to obviously mean I *resisted* the habit, not that I *did* it — the exact opposite of every other row on the same screen.

### Behavior
This is a **visual and copy variant** of the Today row for any habit whose Direction is Break (set back in Feature 01):
- Check control uses an **outline style**, not the filled style used for Build habits
- Completion label reads as resistance, e.g. "Stayed off phone", never in "did the thing" phrasing like "Phone ✓"
- Everywhere else this habit's completion is referenced (progress bar count, weekly summary, streak count), "completed" always means "resisted," consistently

### Business rules
- This is a **hard rule, not a copy suggestion.** A Build-habit row and a Break-habit row must never look interchangeable on the same screen — if you can't tell which is which without reading carefully, it's wrong.
- Streak counting for a Break habit counts **consecutive days resisted**, same mechanism as a Build habit's "consecutive days done," just relabeled.

### Edge cases
- A Break habit with a Quantity target (e.g. "limit screen time to under 30 min"): out of scope for V1 — Break habits are Simple-check only in V1. Note this explicitly in the Add-habit form (Quantity toggle should be disabled/hidden when Direction = Break).
- If Quantity was already selected and the person then switches Direction to Break, the form resets Target type back to Simple check automatically (not just disables the control) — the two must never disagree silently.

### Acceptance criteria
- [ ] Break-habit rows use outline check style
- [ ] Break-habit completion copy reads as resistance, distinct per habit name (not a single generic string)
- [ ] Quantity target option is unavailable when Direction = Break
- [ ] Visually distinguishable from Build habits at a glance, verified by looking at a Today screen with both types present

---

## 05 — Day-level states (empty, rest day, day closed)

**Depends on:** 03

### User story
Three specific "nothing to do" situations exist, and they are not the same thing — a spec that collapses them into one generic empty screen is under-specified.

### Behavior
| State | When it shows | What it says |
|---|---|---|
| **No habits yet** | Zero habits have ever been created | "Nothing to track yet." + prominent Add-habit button |
| **Rest day** | At least one habit exists, but none are due today (per Feature 02) | "Nothing scheduled for [weekday]. Streaks stay intact." + a secondary, low-emphasis "Log something anyway" option that opens the Add-habit flow or lets an existing habit be logged off-schedule |
| **Day closed** | Every habit due today has been completed | Celebratory tone, e.g. "All six done." + a preview of tomorrow's due habits with their times + an **Undo** affordance for whichever habit was checked off last |

### Business rules
- Rest day **never** touches streak or freeze logic (Feature 08) — it's a fundamentally different state from "missed a scheduled day."
- "Log something anyway" on a rest day does not count toward that habit's normal schedule or streak — it's an off-schedule bonus log, kept in history but not required.
- Day-closed's Undo only ever affects the single most recent action — it is not a multi-step undo history.

### Edge cases
- Zero habits AND it happens to be a day with nothing scheduled (impossible to distinguish from "no habits yet" by schedule alone): "No habits yet" always wins — check habit count first, before checking today's schedule.
- Un-completing the last habit while on the Day-closed screen: immediately falls back to the normal Today view with the progress bar reflecting the change.

### Acceptance criteria
- [ ] All three states are visually and textually distinct (put them side by side and confirm no one could confuse them)
- [ ] "No habits yet" takes priority when both conditions could apply
- [ ] Rest day's off-schedule log does not affect streak math
- [ ] Day-closed shows tomorrow's preview correctly, including habits with no reminder time set
- [ ] Undo reverses exactly the last action and only that one

---

## 06 — First run

**Depends on:** 01, 05

### User story
As me, on the very first time I open the app with zero habits ever created, I want a couple of good defaults to pick from instead of a blank screen, so I don't have to think of habits to track before I've even seen how the app works.

### Behavior
Shown **instead of** the normal "No habits yet" empty state (Feature 05) only on a genuine first launch — never again after that, even if every habit is later deleted. A fixed list of 6 suggested habits, each a selectable row (icon, color dot, name, subtitle showing category or "Break habit" where relevant):

| Suggestion | Direction | Pre-selected? |
|---|---|---|
| Glass of water | Build | Yes |
| Walk 20 minutes | Build | Yes |
| Read before bed | Build | No |
| Lights out by 23:00 | Break | No |
| Stretch | Build | No |
| Three lines journal | Build | No |

Primary button reads **"Add N habits"**, N updating live as rows are toggled. Secondary **"Start from scratch"** text link beneath it.

### Business rules
- **Shown once per install, gated on a persisted flag** — not just "zero habits exist," since deleting all habits later must show Feature 05's empty state, not this screen again.
- Tapping a suggestion row toggles its checkbox; no limit on how many can be selected.
- Tapping "Add N habits" creates one real habit per selected suggestion (via the same create-habit path as Feature 01), using each suggestion's fixed name/icon/color/direction, and a default **Daily** frequency (Feature 02 already exists by this point in the build order).
- Tapping "Start from scratch" creates nothing and dismisses straight to Feature 05's normal empty state.
- Either path sets the persisted "seen first run" flag so this screen never shows again.

### States
| State | Trigger | Behavior |
|---|---|---|
| Default | First-ever app open, zero habits | Glass of water + Walk 20 minutes pre-checked, others unchecked |
| All deselected | User unchecks both defaults | Button reads "Add habits", disabled |

### Edge cases
- App is force-quit mid-First-Run before tapping either button: flag not yet set, screen shows again next open (nothing was committed).

### Acceptance criteria
- [ ] Shown only on a genuine first launch with zero habits, never again after
- [ ] 6 suggestions shown with correct pre-selected defaults
- [ ] "Add N habits" label updates live and creates real habits with default Daily frequency
- [ ] "Start from scratch" dismisses to Feature 05's empty state without creating anything
- [ ] Persisted flag prevents recurrence even after all habits are later deleted

---

## 07 — Quantity-based habits

**Depends on:** 03

### User story
As me, tracking water intake or reading pages, I want to log a running amount through the day, not just a single yes/no.

### Behavior
For any habit with Target type = Quantity (set in Feature 01, with Amount + Unit fields, e.g. "8 glasses"):
- Tapping its Today row opens a bottom sheet instead of toggling directly
- Sheet shows: current value, a stepper (−/+), a progress bar against the target, and quick-add chips generated from the unit (e.g. "+1", "+2", "Full 8")
- The habit is automatically marked complete on Today once its value reaches the target — no separate "done" tap needed
- Value can be pushed past 100% of target (over-logging is allowed, not capped)

### Business rules
- If the value is manually lowered back below target after being complete, the habit **reverts to incomplete** on Today and the progress bar/streak-at-risk state (Feature 08) responds exactly as if it had never been completed that day.
- The stepper cannot go below 0.
- Unit is free text set at habit-creation time (Feature 01) and is not editable per-log — it's a property of the habit, not of each entry.

### Edge cases
- Unit with no natural "whole number" meaning (e.g. "hours" logged as 1.5): steppers can still work in whole units; fractional entry is not required for V1 — round to the nearest step.
- Two quantity habits with the same unit name ("glasses"): no conflict, units are just display labels per habit.

### Acceptance criteria
- [ ] Tapping a Quantity habit's row opens the log sheet instead of toggling
- [ ] Stepper, progress bar, and quick-add chips all functional
- [ ] Reaching target auto-marks the habit complete on Today
- [ ] Lowering value below target un-marks it as complete
- [ ] Over-logging past 100% is allowed and displayed correctly (not clipped at 100%)

---

## 08 — Streaks and freezes

**Depends on:** 03

### User story
As me, I don't want one busy day to erase a 40-day streak — but I also don't want an unlimited excuse machine that makes streaks meaningless.

### Behavior
Every habit tracks a **current streak** (consecutive scheduled days completed) shown wherever the habit is referenced. When a habit was scheduled yesterday and wasn't completed, the next time that habit is opened it shows a **"streak at risk"** prompt with two choices:
- **Use a freeze** — the missed day is marked "frozen," the streak continues uninterrupted
- **Reset and start today** — streak goes back to 0, today counts as day 1 if completed

### Business rules
- Freezes come from a **single shared pool of 2 per calendar month**, shared across *every* habit — not 2 freezes per habit. Using one on any habit's missed day draws from that same pool.
- The pool resets to 2 on the 1st of each month, regardless of how many were used the month before (unused freezes do not roll over).
- If the pool is at 0 when a day is missed, there is **no prompt at all** — the streak resets silently, since there's nothing to offer. Don't show a dead-end dialog with no usable options.
- If two different habits are both at-risk on the same day and only 1 freeze remains, whichever is opened first can claim it; the other only gets the reset option. This is intentional — no reservation system needed.
- Rest days (Feature 05) and off-schedule days never trigger streak-at-risk — only a day the habit was actually scheduled for and missed.

### Edge cases
- Editing history retroactively (Feature 10) so that a previously-missed day becomes logged: streak recalculates forward from that date rather than just incrementing a stored counter.
- A frozen day should visually read as distinct from a completed day in any history view (Feature 09's heatmap) — don't render a freeze as if it were a real completion.

### Acceptance criteria
- [ ] Streak count increments correctly for consecutive completed scheduled days
- [ ] Missed scheduled day with freezes available triggers the at-risk prompt
- [ ] Freeze pool is shared across all habits, resets monthly, does not roll over
- [ ] Missed day with 0 freezes available resets the streak with no prompt shown
- [ ] Frozen days are visually distinguishable from completed days wherever history is shown

---

## 09 — Habit detail and history

**Depends on:** 03, 08

### User story
As me, tapping into one habit, I want to see its whole story at a glance — current streak, long-run consistency, and a visual sense of how steady I've actually been.

### Behavior
Reached by tapping a habit's name from Today (Feature 03). Shows, top to bottom:
- Current streak (days) and longest streak achieved
- Completion rate over the last 90 days (e.g. "87% — 78 of 90 logged")
- A 10-week heatmap, one cell per scheduled day, shaded by completion (unscheduled days are visually blank, not counted against the rate)
- A reverse-chronological list of recent log entries, each showing its date, value, and note if one was added (notes come from Feature 10)

### Business rules
- The 90-day completion rate is calculated only against **scheduled** days for that habit — a habit scheduled 3x/week isn't penalized for the 4 days a week it was never due.
- Heatmap cells are tappable, and tapping one is the entry point into Feature 10 (retroactive logging) — build that navigation hook now even if Feature 10 isn't built yet.

### Edge cases
- A brand-new habit with less than 90 days of history: percentage is calculated against however many scheduled days have actually occurred so far, not artificially padded to 90.
- A habit with zero logs yet: heatmap renders empty/blank rather than erroring, streak shows 0.

### Acceptance criteria
- [ ] Detail screen shows current streak, longest streak, and 90-day rate correctly
- [ ] 90-day rate only counts scheduled days as the denominator
- [ ] 10-week heatmap renders with distinct states for: completed, missed, frozen, not-scheduled
- [ ] Recent entries list shows correct dates/values in reverse chronological order
- [ ] Tapping a heatmap cell is wired up as a navigation hook for Feature 10

---

## 10 — Retroactive logging and notes

**Depends on:** 09

### User story
As me, if I forget to log yesterday, I want to fix it later without that day just being a permanent, unchangeable failure.

### Behavior
Tapping any **past** day on the heatmap (Feature 09) opens a log sheet for that specific date: the habit's value can be set/adjusted (check toggle or quantity, matching its type), and an optional free-text **note** can be attached. Future dates are not tappable — no logging ahead of time.

### Business rules
- Editing a past day **recalculates the streak forward from that date** — don't just patch the streak counter directly, since one retroactive change can affect every day after it.
- The note field has no hard character limit, but the input should visually cap around 280 characters — it's a short note, not a journal entry. (If this needs enforcing precisely, cap at 280 and stop accepting input rather than truncating on save.)
- A log entry created this way is otherwise identical to one logged the normal way on Today — no visual "this was backfilled" marker is required.

### Edge cases
- Retroactively un-completing a day that had already contributed to a now-claimed freeze (Feature 08): out of scope to unwind automatically for V1 — this is a rare enough case that manual correction (re-adjusting the streak by re-logging forward) is acceptable.
- Adding a note to a day with no value changes (just adding commentary to an already-completed day): allowed, value stays as-is, note is simply attached.

### Acceptance criteria
- [ ] Tapping a past heatmap day opens an editable log sheet for that date
- [ ] Future days are not tappable
- [ ] Saving a change recalculates the streak forward from the edited date
- [ ] Note field accepts and persists free text, soft-capped around 280 characters
- [ ] Editing a past day's value updates the heatmap and 90-day rate immediately

---

## 11 — Weekly summary

**Depends on:** 03, 08

### User story
As me, once a week, I want one honest screen telling me what's working and what's slipping — not just per-habit streak numbers in isolation.

### Behavior
A dedicated screen, Monday–Sunday window (must match Feature 02's week definition exactly), showing:
- Total completed vs. scheduled across all habits ("34 of 42 scheduled")
- Best day of the week (most habits completed)
- A per-habit completion bar, sorted worst-to-best
- One flagged insight card for the single worst-performing habit that week (e.g. "Mobility is slipping — two of seven days. Try moving it before the run instead of after.") with a direct link into that habit's Edit screen (Feature 02) to reschedule it

### Business rules
- A habit needs **at least 3 scheduled days** in the current week before it's eligible for the "slipping" insight — a brand-new habit with 1 day of data shouldn't get flagged.
- If every habit hit 100% that week, the insight card is replaced with a plain congratulatory line — it is not simply hidden, the space stays populated.
- Only one insight card is shown at a time, for the single worst habit — this is not a list of every underperforming habit.

### Edge cases
- A habit archived (Feature 13) partway through the week: still counts for the days it was active, excluded from the days after archiving.
- Exactly two habits tied for worst performance: either may be chosen; no need for a tie-breaking rule beyond picking one deterministically (e.g. first by creation order).

### Acceptance criteria
- [ ] Week window is Monday–Sunday, matching Feature 02 exactly
- [ ] Totals, best day, and per-habit bars all calculate correctly against real data
- [ ] Insight card only appears for habits with ≥3 scheduled days that week
- [ ] Perfect week shows a congratulatory line instead of an insight card
- [ ] Insight card's link opens that habit's Edit screen

---

## 12 — Reminders

**Depends on:** 01

### User story
As me, I want a nudge at the right time on the right days, without wading through alarm-style settings to get there.

### Behavior
Per habit, reachable from its detail or edit screen: a list of reminder times (up to 4 per habit), each independently:
- Has its own time (HH:MM)
- Has its **own weekday selection** — not shared with any other reminder time on the same habit
- Can be toggled on/off individually

Additionally, one separate, single, app-wide-per-habit **"Evening review"** toggle: one time, fires every day it's on, nudging for anything left unlogged that day across all habits — not scoped to weekdays.

### Business rules
- **Each reminder time owns its own day selection — there is no shared "repeat on" row across multiple times.** A shared day-picker across several times is not how this should behave.
- All of a habit's reminders can be off while the habit itself stays fully active and visible on Today — reminders are purely a notification layer, never a gate on whether a habit "counts."
- If the OS-level notification permission is denied, the Reminders UI stays fully usable and editable (so settings aren't lost), but shows a persistent inline notice such as "Turn on notifications in Settings to receive these" rather than silently doing nothing.

### Edge cases
- A reminder time that lands on a day the habit isn't even scheduled for (per Feature 02): allowed to exist, but should visually flag as pointless (e.g. a small warning) rather than silently firing a notification for a habit that isn't due.
- Adding a 5th reminder time: blocked at 4, with a message explaining the cap rather than a silent failure.

### Acceptance criteria
- [ ] Up to 4 independent reminder times per habit, each with its own weekday set and toggle
- [ ] Evening review toggle is separate, single time, no weekday picker, fires daily when on
- [ ] Notification permission denied state shows a persistent, non-blocking notice
- [ ] Reminder configuration has zero effect on whether a habit appears/counts on Today
- [ ] Adding a reminder for a day the habit isn't scheduled shows a visual warning

---

## 13 — Reorder, archive and delete

**Depends on:** 01

### User story
As me, when a habit stops being relevant, I want it out of my daily view without losing the record that I once did it for 41 days straight.

### Behavior
A "Manage habits" screen, reachable from the habit list:
- **Reorder** — drag handles, free reordering; this order is what Feature 03's Today view respects within each category group
- **Archive** — one tap, removes the habit from Today and all active lists; archived habits appear in a separate "Archived" section on this same screen with a "Restore" action
- **Delete** — **only available from the habit's own Detail screen** (Feature 09), never from this list. Requires a confirmation step. This is the only unrecoverable, destructive action in the entire Habits module.

### Business rules
- Archiving preserves **every** past log, note, and streak value exactly as it was — archiving is non-destructive by definition. Restoring brings a habit back exactly as it was, including its streak, as if it had just been paused.
- An archived habit does not count toward the Weekly Summary (Feature 11) or the Today view for any day after its archive date, but its historical days remain in its own detail history.
- Deleting is intentionally buried one level deeper (habit detail, not the management list) and gated by a confirmation — this friction is deliberate, not an oversight to smooth out later.

### Edge cases
- Archiving a habit mid-streak: the streak value is frozen at whatever it was, and resumes from that value if restored (it does not reset to 0 just for being archived).
- Archiving or deleting a habit that has reminders (Feature 12): must cancel every scheduled OS notification for that habit (`cancelRemindersWithPrefix(habitNotificationPrefix(id))`, via `lib/notifications`) as part of the same operation — a stray notification firing for an archived/deleted habit is a user-facing bug. **Delete** must also remove the habit's `reminders` rows: the table's foreign key to `habits` doesn't cascade (`ON DELETE no action`), so either delete them explicitly in the same operation or add a cascading migration — otherwise the delete leaves orphaned rows (or fails outright if SQLite foreign-key enforcement is on). **Archive** keeps the rows (archiving is non-destructive), and restoring re-syncs them (`syncHabitReminders`) so they fire again exactly as configured.
- Reordering habits across different categories: not supported in V1 — drag-to-reorder only works within the same category group. Moving a habit to a different category is done via Edit (Feature 01), not by dragging.

### Acceptance criteria
- [ ] Drag-to-reorder works within a category and persists
- [ ] Archive removes a habit from Today/Weekly Summary but keeps it restorable with full history intact
- [ ] Restore brings back the exact prior state, including streak
- [ ] Delete is only reachable from Habit Detail, not from the Manage screen, and requires confirmation
- [ ] Archiving mid-streak preserves the streak value rather than resetting it

---

## Out of scope for V1 (backlog)

Named explicitly so "should we add X" gets answered by pointing here instead of re-opening scope mid-build.

- **Cloud sync** across devices (would need an account system — real cost, not needed for one phone)
- **Apple Health integration** (steps, water, sleep auto-fill)
- **Social / group habits** — not relevant to a solo app
- **Location-based reminders** — high complexity, low payoff for this use case
- **Home / lock-screen widgets** — good idea, treat as a separate build effort after V1 ships
- **Custom reminder sounds** — cosmetic, not core to the loop
- **Quantity-type Break habits** (e.g. "limit screen time") — noted in Feature 04, deliberately deferred
- **A merged "Today" view across Habits / To-dos / Expenses** — revisit once all three modules exist independently; do not build cross-module coupling into this module's data or navigation now
- **One proper entry point on Today for the secondary screens** — the mockups only show the destination screens for Weekly Summary (11), Reminders (12) and Manage & Archive (13), never the navigation to reach them. V1 uses temporary ghost buttons on Today (the same pattern as the interim "Add habit"), which means 3–4 ad hoc buttons stacked there once HAB-13 ships. V2: design (mockup first) and build a single header icon or menu on Today that reaches all three, and remove the temporary buttons.
