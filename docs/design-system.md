---
title: Habits — Design System & Screen Reference
status: final for V1 and V2
tags: [design-system, ui, habits, v1, v2]
---

# Habits — Design System & Screen Reference

One reference for every token, component state and screen structure, transcribed from the finished mockups (V1 and V2, light and dark). V1 and V2 are merged: where V2 changed something, the merged text carries the V2 value (the V1-only values are gone). Component and variant IDs (`NEW-xx`, `VAR-xx`, `V1-xx`) are kept exactly as the specs and code comments cite them.

## Source of truth

The machine-readable mockup sources (`design-reference/Habit System.dc.html`, `Habit Flow.dc.html`, `HabitFlowV2.dc.html`, `habit-components.js`) **live outside this repository** and are not available to build from. The in-repo reference is the PNG set in `docs/mockups/` (named by ticket and frame, e.g. `hab-25-f3a.png`) together with this file. If a value here is in doubt, check the mockup PNG, then the token in `src/theme`. Exact design values could not be re-verified against the `.dc.html` sources from within the repo.

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
| Stat | 30 | Big numerals — streak counts, percentages, week totals. Stat *cards* use a 26 value (`VAR-14`, see Deltas) |
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

**Icon square — accents:** the six habit-accent color swatches (V2: a habit's icon and colour now come from its category — see Categories; the picker itself, `V1-27`, is gone), each shown as a small rounded square/circle, selectable.

**Semantic tokens (visual):** small swatches for Warning (amber) and Danger (red) shown distinctly separated in hue — not both reading as "red family."

**Progress bar:** overall completion bar (Today view) and per-habit bars (Weekly Summary), with a distinct visual treatment for the flagged "slipping" habit (uses `warning` color).

**Heatmap cell** (`NEW-16`, shared definition — cell radius is `floor(size ÷ 3)` at every size; Detail uses 18px / radius 6 / gap 5): states — empty/not-scheduled (blank), missed (light), completed (mid-to-dark blue, intensity can vary), **frozen** (its own distinct treatment, not confusable with missed or completed) — legend always shown alongside any heatmap.

**Stepper:** −/+ control with center numeral, used in Quantity logging.

**Text field:** default, focused/filled, and **error** states (red outline + inline error copy, e.g. "Give this habit a name") — this is the field-level validation pattern for Feature 01.

**List item variants:** default (with subtitle), pressed, completed (checkmark, dimmed), navigable (chevron), reorder (drag handle, used in Manage & Archive), archived (dimmed + "Restore" action).

**Container:** generic card, inset panel, sheet (bottom sheet chrome for Quantity Log / Retro Log).

**Stat card** (`VAR-14`, one size everywhere: 14px padding / 10px label / 26px value): large-numeral tiles (streak, 90-day %, week totals) — one variant uses the `warning` background tint for a flagged number (e.g. "2" freezes, or a slipping stat).

**Tab bar item:** Habits / To-dos / Expenses, active/inactive states. Habits is the only implemented tab for V1; the other two render as inactive placeholders.

**Feedback (toast/banner):** a completion toast with inline Undo ("Marked 'Upper body' complete — Undo"), and a persistent warning banner style (used for notification-permission-denied, and for reminder/schedule conflicts).

## Categories — colors and shapes

Ten built-in categories, fixed order, each a `(name, icon shape, hue)` triple:

| Name | Shape | Hue |
|---|---|---|
| Health | plus | 25 |
| Fitness | bars | 150 |
| Mindfulness | diamond | 300 |
| Productivity | square | 255 |
| Learning | lines | 75 |
| Finance | grid | 110 |
| Social | half | 345 |
| Home | archive | 45 |
| Creativity | dot | 200 |
| Other | ring | **null** |

**"Other" has no hue** — it's the one built-in that renders neutral (uses `sub`/`inner`, the same monochrome tokens as app chrome), not a colored accent. This is deliberate, not an oversight: Other is a catch-all, not an identity category, so it doesn't get a place in the color system. Any habit reassigned to Other on category deletion (see below) picks up this neutral treatment immediately.

Custom categories draw from a fixed 10-slot rotation, assigned in order as categories are created — **not** user-chosen:

| Slot | Shape | Hue |
|---|---|---|
| 1 | diamond | 175 |
| 2 | ring | 330 |
| 3 | square | 95 |
| 4 | bars | 220 |
| 5 | dot | 15 |
| 6 | plus | 265 |
| 7 | half | 130 |
| 8 | lines | 350 |
| 9 | grid | 230 |
| 10 | archive | 290 |

Both built-in and rotation hues follow the same `tint(hue)`/`ink(hue)` OKLCH formula defined above for habit accents (Color tokens) — categories are not a separate color system, they're the same formula applied to a longer, fixed hue list.

## Component library additions (V2)

Full inventory lives in `habit-components.js` (outside this repo, see Source of truth). Highlights that change how existing UI should be built going forward — not just new screens:

**Consolidations (replace what V1 drew separately):**
- `NEW-07` Completion grid — one component, three layouts (Detail weeks×days 18px, Month calendar 16px + weekday header, Year strip 11px inline ×12). Replaces three separate drawings, including the old `NEW-10` Year strip (retired into this).
- `NEW-17` Column bar — one component, two contexts (Sparkline 18px, Chart 96px fill). Replaces the old `NEW-18` Month bar (retired into this) and unifies the per-habit trend line with monthly/yearly chart bars.
- `NEW-16` Completion cell — radius now `floor(size ÷ 3)` at every size (11/12/16/18/30px). V1's own heatmap cell drew 22px/radius 7; the shared size is 18/6 — **this is a real visual change to existing V1 screens** (Detail, Weekly), not just new V2 ones. See Deltas below.
- `VAR-14` Stat card — one size everywhere (14px padding / 10px label / 26px value). V1 had two: Detail (16/10/28) and Weekly (18/11/30). Both collapse to the one shared size.
- `VAR-09` Heatmap legend — swatches 12px/radius 4, down from V1's 14px/radius 5.

**New atoms/composites specific to V2 features:**
- `NEW-28` Category chip — icon + label in the category's own color. States: unselected (outline), selected (filled + check), locked (built-in, tinted, no interaction), add (dashed), preview (auto-assigned, shown live in the add-category sheet), truncated label.
- `NEW-29` Category row — one row in Manage Categories: chip, live habit count (includes archived), Rename/Delete for custom, "Built-in" tag + no actions for built-ins.
- `NEW-23` Character counter / `NEW-24` Field helper — shared between the habit-name field and the category-name field; appears only from 80% of the relevant limit (26/32 for habits, 16/20 for categories).
- `NEW-32` Chart card — shared container for every chart/list: header, body, optional legend/caption, 16px padding (down from V1's 18px — another real delta to existing screens).
- `NEW-33` Destructive confirm sheet — one sheet for every permanent delete, with a "with archive action" state that is V1's Delete-confirm layout, and a "with move preview" state new to category deletion.
- `NEW-01`/`NEW-02`/`NEW-14` Header menu button / menu / menu row — the new `⋯` entry point itself.

**Kept deliberately separate (looked mergeable, aren't):**
- `V1-06` Completion circle (tappable, round) vs. `NEW-16` Completion cell (read-only data, square) — the shape itself signals tappability; merging would remove that signal.
- `V1-11` Progress bar (fraction of one target) vs. `NEW-17` Column bar (a series meant for comparison) — same visual idea, different implied affordance.
- `NEW-28` Category chip vs. `V1-09` Chip — category chips fill with their *own* color; V1 chips fill with the accent color. Merging would recolor every frequency/weekday chip in the app.
- `VAR-04` Insight card (body never tappable, only its link) vs. `NEW-25` Action card (whole card is the button) — merging would break the "no hidden tap" rule everywhere insight cards appear.

**Retired (old name → where it lives now):**
`NEW-10` Year strip → `NEW-07`. `NEW-18` Month bar → `NEW-17`. V1 Heatmap cell → `NEW-16`. V1 Legend → `VAR-09`. V1's two stat-card sizes → `VAR-14`. V1's "Per habit" Weekly row → `NEW-21` (gains a 28px badge, row gap 16→12). `V1-27` Icon & colour picker → removed outright by `NEW-28`/`F1`, no replacement needed since category now supplies both.

### IDs cited by code but not itemised in the mockup transcription

These exist in the (external) `habit-components.js` inventory; the meaning below is taken from where the code uses them.

| ID | What it is | Built as |
|---|---|---|
| `VAR-02` | Small icon badge, 22px inline — the category picker's header | `IconBadge` `small` |
| `NEW-15` | Key–value row: label left, value right ("Last export · Never", the export confirm's counts) | `primitives/key-value-row.tsx` |
| `NEW-22` | Compact logged row on the rest-day screen (HAB-18, D2) | `off-schedule-row.tsx` |
| `NEW-30` | Chart axis labels under each column (month initials) | `composite/column-bars.tsx` |
| `VAR-15` | Monthly freeze-pool card: the pool as 30px swatches | `composite/freeze-pool-card.tsx` |

## Deltas — frames redrawn when the shared definition won (already applied above)

These are the concrete visual changes to *existing V1 screens*, caused by V2's consolidation, not new V2 content. The V1 sections above already carry the new values; this list is what a reviewer should treat as intentional, not as a regression, on Detail, Weekly Summary and Streak-reset:

- **Detail (V1-03), Streak-reset (V1-18), New-habit-variant Detail (V1-21):** heatmap cells 22px/radius 7/gap 6 → 18/6/5; legend swatches 14/radius 5 → 12/radius 4; stat cards 16/10/28 → 14/10/26; chart-card padding 18 → 16.
- **Weekly Summary (V1-10), Perfect Week (V1-19):** per-habit rows gain the 28px habit badge, row gap 16 → 12; stat cards 18/11/30 → 14/10/26; insight-card padding 18 → 16/18; chart-card padding 18 → 16.
- **Delete confirm (V1-15):** the old layout drew "Archive instead" as a card *and* a separate button. HAB-23 (`E7`) removed the duplicate: the habit delete sheet is `NEW-33 · with archive action`, and the interim "V1 layout" state is retired — there is one delete-sheet implementation.

None of these are behavior changes — same data, same logic, smaller/cleaner chrome. Treat them as a design-token bump on existing screens, not a new feature.

## Screens — V1 (HAB-01…13)

Where V2 changes a screen, the V2 section below wins. Each entry: layout structure, and where the primary action sits.

**Onboarding (HAB-06):** Vertical list of suggested habits, each a selectable row (color dot, name, subtitle, checkmark trailing). Primary CTA pinned bottom ("Add N habits"), secondary "Start from scratch" text link beneath it.

**Empty state (HAB-05):** Centered icon, headline, one-line support text, single primary CTA below — no other chrome.

**New / Edit habit (HAB-01, HAB-02, HAB-04, HAB-07):** Scrollable form, grouped into cards: Name (text field, `VAR-12` with counter/helper — HAB-22) → Category (`NEW-28` chip picker, HAB-24; supplies icon and colour, replacing the V1 Icon & Color picker and the free-text Category field) → Direction (segmented control + explanatory caption, locked in Edit mode) → Frequency (chip row + conditional weekday-circle picker) → Target type (segmented control, Quantity reveals Amount/Unit fields). Primary "Save habit" pinned bottom; "Cancel"/"Done" in the header.

**Today (HAB-02, HAB-03, HAB-04):** Date header → overall progress bar → category-grouped cards, each a section header with a mini-count, then rows. Build-habit rows: filled circle trailing. Break-habit rows: outline circle trailing (dashed neutral when empty, solid ink ring when resisted — amber is reserved for the future at-risk state, not used here), resistance-framed subtitle copy. Tapping a row's circle toggles instantly; tapping the label opens Habit Detail.

**Quantity log (HAB-07):** Bottom sheet over a dimmed Today background — habit name/target header, large stepper, progress bar, quick-add chip row, primary "Save X of Y" pinned bottom.

**Rest day / Day closed / Empty (HAB-05):** All three share the centered-icon-plus-message layout from Empty State, differentiated by icon, headline, and whether a secondary action ("Log something anyway") or a preview list (tomorrow's habits, Day Closed) appears beneath.

**Streak at risk (HAB-08):** Bottom sheet, habit context header (dimmed background), "You missed yesterday" headline, freeze-count stat row, primary "Use a freeze" then secondary "Reset and start today" beneath it — safe/default option always visually dominant.

**Weekly summary (HAB-11):** Two stat tiles side by side (Completed, Best day) → per-habit progress bar list, sorted worst-to-best → one insight card at the bottom (either the "slipping" warning-toned card with a Reschedule link, or the perfect-week congratulatory variant, same slot).

**Habit detail (HAB-09):** Header row (icon, name, subtitle) → three stat tiles (streak, longest/90-day comparator, rate) → heatmap card with legend → "Recent entries" list, reverse chronological. New-habit variant: stat tiles show zero/dash, heatmap renders as empty/dotted placeholders, entries list shows a prompt instead of items.

**Retro log (HAB-10):** Bottom sheet triggered from tapping a heatmap cell — date header, list of that day's habits with their toggles/values, an optional note field at the bottom, primary "Save changes" pinned bottom.

**Reminders (HAB-12):** List of independent time rows, each showing its time, its own inline weekday-chip row, and a toggle — plus a conflict warning banner inline under any time that doesn't match the habit's schedule. Below the list: "Add a time" (disabled + explanatory caption once 4/4 reached), then the notification-permission banner if applicable — the banner sits directly under "Add a time", as in the Reminders mockup. (V1's "Evening review" row was removed in HAB-21; it lives only in Settings.)

**Manage & Archive (HAB-13):** Active habits list with drag handles, grouped above an "Archived" section (dimmed rows + "Restore" text action). No destructive action lives here.

**Delete confirmation (HAB-13):** Bottom sheet — warning-tinted icon, "Delete '[habit]'?" headline, consequence copy, an "Archive instead" option surfaced *above* the primary action, primary black "Keep habit" button, with "Delete permanently" demoted to a small red text link beneath everything else. This ordering (safe option dominant, destructive option smallest) is a deliberate, load-bearing decision — not to be "simplified" back to a filled red button later.

## Screens — V2 (HAB-14…25)

Each entry: layout structure and the components it's built from (IDs from `habit-components.js`), via the frame's own `USES` entry.

**Today — nav entry point (HAB-14):** Same four Today states as V1, now all carrying `NEW-01` (⋯ button) in the title row. Menu (`NEW-02`) is an anchored popover: `NEW-14` rows for Week/Month/Year/Manage/Settings, each with a live-context subline. Empty-state menu keeps the same five rows but with summaries as `NEW-14 · disabled with reason` rather than hidden.

**Settings (HAB-15):** `NEW-04` grouped settings cards — Appearance (`NEW-03`, `VAR-01` 3-up), Evening review (`VAR-03` with `NEW-26` scope chip), Export row. Settings also carries a plain Categories row (no mockup, a proposal). Appearance is a real app-wide theme (dark tokens in `theme.ts` are live). Export flow is a stacked sheet (`NEW-05`) through confirm → progress (`V1-11` determinate) → ready (`NEW-06` file card, share/save actions) → failed (`V1-19` warning notice).

**Summaries — Week/Month/Year (HAB-16, HAB-17):** Shared chrome: `VAR-01` 3-up range switcher, `VAR-14` stat tiles, `NEW-32` chart card. Week reuses V1's per-habit rows as `NEW-21 · progress slot`. Month adds `NEW-07 · month calendar` + `NEW-21 · sparkline slot` (`NEW-08`+`NEW-20`). Year adds `NEW-09` month-by-month chart + `NEW-21 · strip slot` (`NEW-07 · year strip`). Insights at both scales are `VAR-04` cards, ranked, max three, tone-coded (warning/positive/neutral). Too-early states (`NEW-11`) still render the partial grid/chart rather than a locked wall.

**Logging — off-schedule & retro (HAB-18):** Habit picker (`NEW-12`) with `NEW-19` rows (check or quantity). Retro-log sheet pins the origin habit (`VAR-06 · origin`) ahead of `VAR-07` inline steppers for quantity rows.

**Manage & archive (HAB-19):** `V1-20` category group headers, `VAR-05` drag rows scoped to their own card when lifted. Empty variants: no-active (`V1-21`) and nothing-archived (`V1-22 · placeholder`).
Built as: `EmptyStateCard` and `PlaceholderCard` (`components/ui/composite/`) for the two empty variants; `Container` gained `lifted` (ink outline with padding compensated, so rows don't shift) and `dashed` (transparent card, dashed hairline); `SectionHeader` (`size="group"`) gained `tag` for the "Reordering within <category>" note while a row is held.

**Detail — archived/restored/reset (HAB-20):** `NEW-13` banner (default/dismissed states) for archived/restored. `NEW-16 · paused` for the archived date range; `NEW-16 · streak reset` + `VAR-09` carrying the live freeze count for the reset case.

**Reminders (HAB-21):** Unchanged `V1-23`/`V1-07`/`V1-22` list, minus the evening-review row, plus `NEW-27` (temporary pointer to Settings).

**New habit — name polish (HAB-22):** `VAR-12` text field with `NEW-23` counter and `NEW-24` helper, `VAR-13` disabled-with-reason button — the same trio reused by categories.

**Delete sheet (HAB-23):** `NEW-33 · with archive action`, with `NEW-25` making the archive card itself the button. `NEW-33` already exists from HAB-25 (`destructive-confirm-sheet.tsx`) — HAB-23 moves `DeleteHabitSheet` onto it rather than adding a second sheet.

**Categories — pick & add (HAB-24):** `NEW-28` chip grid inside `V1-16` sheet chrome; add-category sheet stacks a second `V1-16` over it with `VAR-12` + live `NEW-28 · preview`.

**Categories — manage & delete (HAB-25):** `NEW-29` rows (`NEW-28 · locked` for built-ins, unselected-chip style for custom). Delete sheets are `NEW-33 · plain` (unused) or `NEW-33 · with move preview` (in use, shows `NEW-28` old → `NEW-28 · locked` Other).

> [!note] HAB-25 implementation notes
> - **Inline rename has no mockup.** F3a–F3c and F4a/F4b don't draw it. The built state (visual-check `rename-category-editing` / `rename-category-duplicate`) is a **proposal**: the row is replaced in place by the `VAR-12` name field (add-category rules: counter from 16/20, paste trimmed, case/space-insensitive duplicate check including built-ins, own name in a different case allowed), with Cancel / Save text actions under it. Replace it if a mockup is drawn.
> - Built: `NEW-29` → `components/ui/composite/category-row.tsx`; `NEW-33` → `components/ui/composite/destructive-confirm-sheet.tsx` (plain + with-preview states; the copy/preview area scrolls so a long affected-habit list is never truncated). `NEW-28` gained `locked` and a `compact` list-row size.
> - **Done in HAB-23:** `DeleteHabitSheet` is a thin wrapper over `DestructiveConfirmSheet`'s "with archive action" state; `NEW-25` → `components/ui/composite/action-card.tsx` (whole card is one button, chevron, pressed/disabled). Confirm and the action latch on the first tap until their handler settles, so a double tap can't fire twice.
> - Entry point: Settings → Categories (HAB-15; a plain navigable row with no mockup — a proposal, back reads "Settings"). The temporary row on Manage habits has been removed.

## Notes for whoever builds from this file

- If a new screen or state is needed that isn't listed here, match its structure to the closest analog above rather than inventing a new pattern.
- The Delete Confirmation hierarchy and the Build/Break visual distinction are both the result of specific usability fixes made during design review — don't regress either for the sake of "consistency" with a generic pattern.
- Component states listed as existing in the library (e.g. Button Destructive's filled-red variant) but not used on any real screen should stay unused unless a genuinely new context calls for them.
- The Deltas are real, if small, visual changes to Detail, Weekly Summary and Streak reset — intentional, not regressions.
- "Other" having no hue is load-bearing, not a placeholder — don't give it a color later "for consistency." It's the deliberate exception that keeps Other feeling like a catch-all rather than an identity category.
- The custom-category rotation: the spec says the Nth custom category gets the Nth slot; the built rule (`category-rules.ts`) picks the slot with the fewest existing customs, ties to the lowest slot. See the backlog for this deviation.
