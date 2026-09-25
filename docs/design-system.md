---
title: Habits — Design System & Screen Reference
status: final for V1
tags: [design-system, ui, habits, v1]
---

# Habits — Design System & Screen Reference

> [!info] What this file is for
> A transcription of the finished Claude Design mockup (final reskin, refined monochrome, light + dark) — every token, every component state, every screen's structure. This is what Claude reads to build UI faithfully to what was actually designed, instead of re-guessing it from scratch. Every value below is copied verbatim from the mockup's own source files (`Habit System.dc.html`, `Habit Flow.dc.html` — the machine-readable exports, not a visual approximation), so these are exact, not eyeballed. Those source files themselves live in the repo, not here (see the Roadmap file); this document is the readable reference for decisions and exact values, meant for project knowledge.

## Design direction

Refined monochrome. Black, white, and grey only for all UI chrome (backgrounds, cards, buttons, nav, text, borders). Color is reserved *exclusively* for: the six habit-accent dots, and semantic tokens (Warning, Danger, Frozen). Every button, nav element, and piece of chrome — including primary CTAs — stays strictly black/white/grey in both themes.

## Color tokens

**Light mode surfaces:**

| Token | Hex | Use |
|---|---|---|
| `bg` | `#F4F3F1` | Screen background |
| `card` | `#FFFFFF` | Raised surface (cards, sheets) |
| `inner` (inset) | `#EFEEEC` | Recessed surface — input fields, inline chips |
| `accent` / `ink` (text) | `#1A1A19` | Primary text, and the "black" of all monochrome chrome (primary buttons, filled toggles, selected states) |
| `onAccent` | `#FFFFFF` | Text/icon color sitting on top of `accent` |
| `sub` | `#5E5E5C` | Secondary text |
| `faint` | `#6E6E6B` | Tertiary/disabled text — one step lighter than `sub` |
| `border` | `#E2E1DE` | Hairline borders |
| `track` | `#DEDDDA` | Toggle/progress track background, empty heatmap cell |
| `toast` | `#1A1A19` | Toast/snackbar background |
| `toastInk` | `#FFFFFF` | Toast text |
| `scrim` | `rgba(26,26,25,0.32)` | Dimming overlay behind sheets/modals |

**Dark mode surfaces** (a genuine counterpart, not a mechanical inversion):

| Token | Hex | Use |
|---|---|---|
| `bg` | `#1A1A1C` | Screen background — charcoal, not navy-tinted, not pure black |
| `card` | `#242427` | Raised surface — a distinctly *lighter* charcoal than `bg`; this is what separates layers, not shadows/borders |
| `inner` (inset) | `#2E2E32` | Recessed surface |
| `accent` / `ink` (text) | `#EDEDEA` | Primary text, and the "white" of all monochrome chrome |
| `onAccent` | `#1A1A1C` | Text/icon color sitting on top of `accent` |
| `sub` | `#A5A5A2` | Secondary text |
| `faint` | `#9A9A97` | Tertiary/disabled text |
| `border` | `#343438` | Hairline borders |
| `track` | `#3A3A3E` | Toggle/progress track background, empty heatmap cell |
| `toast` | `#35353A` | Toast/snackbar background |
| `toastInk` | `#EDEDEA` | Toast text |
| `toastBtn` | `rgba(255,255,255,0.14)` | Toast action ("Undo") pill background |
| `scrim` | `rgba(0,0,0,0.60)` | Dimming overlay behind sheets/modals |

**Semantic tokens** (the only other color in the app, beyond habit accents):

| Token | Light | Dark | Used for |
|---|---|---|---|
| `warnTint` | `#FDF0D5` | `#3A2A0E` | Warning background fill (streak-at-risk icon, slipping-habit card, conflict banners) |
| `warnInk` | `#9A6708` | `#E8A93A` | Warning foreground (icon strokes, text, "At risk" stat) |
| `dangerBg` | `#C9372F` | `#D9544D` | Danger — used for permanent/destructive actions (e.g. delete confirmation) and for inline validation errors; not used elsewhere as decoration. |
| `frozenBg` | `#EDE8F8` | `#262036` | Frozen-day background fill (heatmap frozen cell, freeze-related chrome) |
| `frozenInk` | `#7A5AC4` | `#A98FE0` | Frozen-day foreground |

**Habit accents** (identity dots only, never used as chrome) — parametric, not six arbitrary hex picks. Each accent is one hue run through a fixed OKLCH formula, so a 7th+ accent can be added later just by picking a new hue:

- Base (icon/dot fill): `oklch(0.56 0.18 <hue>)` (light) / `oklch(0.78 0.15 <hue>)` (dark) — this is the `ink(hue)` function
- Tint (soft background behind an accent icon): `oklch(0.93 0.045 <hue>)` (light) / `oklch(0.30 0.085 <hue>)` (dark) — this is the `tint(hue)` function
- Heatmap shading uses its own 3-level ramp per hue: light levels `L=[0.88, 0.76, 0.60] C=[0.05, 0.09, 0.15]`, dark levels `L=[0.40, 0.52, 0.66] C=[0.09, 0.12, 0.16]` (level 0 / not-scheduled just uses the `track` color, not a hue at all)

Confirmed hues in use: Blue `230`, Purple `300`, Orange `60`, Green `150`, Red `25`, Teal `195`. (The mockup's demo data also touches hue `0`; treat that as reserved/available for a 7th accent rather than a shipped one unless a screen actually uses it.)

## Type scale

| Token | Size | Use |
|---|---|---|
| Stat | 30 | Big numerals — streak counts, percentages, week totals |
| Screen title | 24 | "Today", "Your week", "New habit" |
| Section | 17 | Group headers ("Morning", "Per habit") |
| Row label | 15 | Habit names, list item primary text |
| Subtitle | 12.5 | Secondary line under a row label (time, target, category) |
| Caption | 11 | Smallest — timestamps, helper text, legend labels |

Weight: regular body text, medium-weight for row labels/section headers only — no more than two weights in use anywhere.

## Component library (every state)

**Button — Primary:** solid black (light) / solid white (dark) pill, full-width. States: default, pressed, disabled, loading (spinner + label). Always bottom-anchored on forms and sheets.

**Button — Secondary & Ghost:** outline or plain-text style. Used for reversible/optional actions ("Keep habit," "Add a time").

**Button — Destructive:** two forms exist — a filled red version (documented for completeness) and a **text-only red link**, which is the one actually used in context (see Delete Confirmation screen below). The filled red is never the dominant option on a real screen.

**Completion circle — Build:** filled states — empty (outline), done (filled black/white + checkmark), partial (for quantity habits, a pie-fill), disabled.

**Completion circle — Break:** outline-only states, never filled solid black like a Build habit — empty (dashed neutral ring), resisted (solid ink-color ring + ink checkmark, still unfilled), at risk (solid amber ring, no checkmark — depends on streak/freeze logic, not yet built as of HAB-04). Amber is reserved for the at-risk state only; resisted stays neutral/monochrome like the rest of the app's chrome, per the "color only for accents + semantic tokens" rule — it isn't a warning. Visually distinct from Build at a glance via the outline-vs-fill treatment.

**Toggle:** binary on/off, on/off/disabled states. Used for reminder times and settings.

**Segmented control:** 2-option exclusive picker (Build/Break, etc.), left-active/right-active states.

**Chip — filter:** Daily / Weekdays / Specific weekdays / X-per-week frequency pills, plus the "Weekdays shortcut" chip that pre-fills Mon–Fri.

**Chip — weekday:** individual day-circle (M T W T F S S), selected (filled black) / unselected (outline) states. Used both in frequency selection and per-reminder-time day pickers.

**Icon square — accents:** the six habit-accent color swatches, each shown as a small rounded square/circle, selectable.

**Semantic tokens (visual):** small swatches for Warning (amber) and Danger (red) shown distinctly separated in hue — not both reading as "red family."

**Progress bar:** overall completion bar (Today view) and per-habit bars (Weekly Summary), with a distinct visual treatment for the flagged "slipping" habit (uses `warning` color).

**Heatmap cell:** states — empty/not-scheduled (blank), missed (light), completed (mid-to-dark blue, intensity can vary), **frozen** (its own distinct treatment, not confusable with missed or completed) — legend always shown alongside any heatmap.

**Stepper:** −/+ control with center numeral, used in Quantity logging.

**Text field:** default, focused/filled, and **error** states (red outline + inline error copy, e.g. "Give this habit a name") — this is the field-level validation pattern for Feature 01.

**List item variants:** default (with subtitle), pressed, completed (checkmark, dimmed), navigable (chevron), reorder (drag handle, used in Manage & Archive), archived (dimmed + "Restore" action).

**Container:** generic card, inset panel, sheet (bottom sheet chrome for Quantity Log / Retro Log).

**Stat card:** large-numeral tiles (streak, 90-day %, week totals) — one variant uses the `warning` background tint for a flagged number (e.g. "2" freezes, or a slipping stat).

**Tab bar item:** Habits / To-dos / Expenses, active/inactive states. Habits is the only implemented tab for V1; the other two render as inactive placeholders.

**Feedback (toast/banner):** a completion toast with inline Undo ("Marked 'Upper body' complete — Undo"), and a persistent warning banner style (used for notification-permission-denied, and for reminder/schedule conflicts).

## Screen-by-screen structure (mapped to Feature Spec IDs)

Each entry: layout structure, and where the primary action sits.

**Onboarding (HAB-06):** Vertical list of suggested habits, each a selectable row (color dot, name, subtitle, checkmark trailing). Primary CTA pinned bottom ("Add N habits"), secondary "Start from scratch" text link beneath it.

**Empty state (HAB-05):** Centered icon, headline, one-line support text, single primary CTA below — no other chrome.

**New / Edit habit (HAB-01, HAB-02, HAB-04, HAB-07):** Scrollable form, grouped into cards: Name (text field) → Icon & Color (icon grid + color row) → Category (autocomplete text field) → Direction (segmented control + explanatory caption, locked in Edit mode) → Frequency (chip row + conditional weekday-circle picker) → Target type (segmented control, Quantity reveals Amount/Unit fields). Primary "Save habit" pinned bottom; "Cancel"/"Done" in the header.

**Today (HAB-02, HAB-03, HAB-04):** Date header → overall progress bar → category-grouped cards, each a section header with a mini-count, then rows. Build-habit rows: filled circle trailing. Break-habit rows: outline circle trailing (dashed neutral when empty, solid ink ring when resisted — amber is reserved for the future at-risk state, not used here), resistance-framed subtitle copy. Tapping a row's circle toggles instantly; tapping the label opens Habit Detail.

**Quantity log (HAB-07):** Bottom sheet over a dimmed Today background — habit name/target header, large stepper, progress bar, quick-add chip row, primary "Save X of Y" pinned bottom.

**Rest day / Day closed / Empty (HAB-05):** All three share the centered-icon-plus-message layout from Empty State, differentiated by icon, headline, and whether a secondary action ("Log something anyway") or a preview list (tomorrow's habits, Day Closed) appears beneath.

**Streak at risk (HAB-08):** Bottom sheet, habit context header (dimmed background), "You missed yesterday" headline, freeze-count stat row, primary "Use a freeze" then secondary "Reset and start today" beneath it — safe/default option always visually dominant.

**Weekly summary (HAB-11):** Two stat tiles side by side (Completed, Best day) → per-habit progress bar list, sorted worst-to-best → one insight card at the bottom (either the "slipping" warning-toned card with a Reschedule link, or the perfect-week congratulatory variant, same slot).

**Habit detail (HAB-09):** Header row (icon, name, subtitle) → three stat tiles (streak, longest/90-day comparator, rate) → heatmap card with legend → "Recent entries" list, reverse chronological. New-habit variant: stat tiles show zero/dash, heatmap renders as empty/dotted placeholders, entries list shows a prompt instead of items.

**Retro log (HAB-10):** Bottom sheet triggered from tapping a heatmap cell — date header, list of that day's habits with their toggles/values, an optional note field at the bottom, primary "Save changes" pinned bottom.

**Reminders (HAB-12):** List of independent time rows, each showing its time, its own inline weekday-chip row, and a toggle — plus a conflict warning banner inline under any time that doesn't match the habit's schedule. Below the list: "Add a time" (disabled + explanatory caption once 4/4 reached), then a separate "Evening review" toggle row, then the notification-permission banner if applicable.

**Manage & Archive (HAB-13):** Active habits list with drag handles, grouped above an "Archived" section (dimmed rows + "Restore" text action). No destructive action lives here.

**Delete confirmation (HAB-13):** Bottom sheet — warning-tinted icon, "Delete '[habit]'?" headline, consequence copy, an "Archive instead" option surfaced *above* the primary action, primary black "Keep habit" button, with "Delete permanently" demoted to a small red text link beneath everything else. This ordering (safe option dominant, destructive option smallest) is a deliberate, load-bearing decision — not to be "simplified" back to a filled red button later.

## Notes for whoever builds from this file

- If a new screen or state is needed that isn't listed here, match its structure to the closest analog above rather than inventing a new pattern.
- The Delete Confirmation hierarchy and the Build/Break visual distinction are both the result of specific usability fixes made during design review — don't regress either for the sake of "consistency" with a generic pattern.
- Component states listed as existing in the library (e.g. Button Destructive's filled-red variant) but not used on any real screen should stay unused unless a genuinely new context calls for them.
- If any value here is ever in doubt, the source of truth is `design-reference/Habit System.dc.html` and `design-reference/Habit Flow.dc.html` in the repo — they contain the actual token definitions this file was transcribed from, not the other way around.
