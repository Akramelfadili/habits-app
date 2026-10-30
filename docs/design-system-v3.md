---
title: Habits — Design System & Screen Reference (V3)
status: final for V3 mockups
tags: [design-system, ui, habits, v3]
---

# Habits — Design System & Screen Reference — V3

> [!info] What this file is for
> Transcription of the finished V3 mockup (`docs/mockups/v3/Habits V3.dc.html`, sections 00–02 Foundations/Components/Nav). **V3 replaces V1 and V2 values wherever this file gives one**; anything not mentioned here is unchanged from `docs/design-system.md` (which already includes V2). IDs: F-xx foundations, V3-xx components, T-xx token changes ("was → now"). Contrast ratios in the mockup are computed live from the hex values; if a value here is in doubt, the master file wins.

## Principles

- One purpose, one system: habits only, three tabs.
- **One accent** (ink on paper). Colour has one meaning each: accent = completion intensity and selection; **amber** = Break habits and warnings only; **violet** = freezes only; **red/danger** = destructive actions and errors only; **category hue** = identity, only inside icon squares and 8 pt dots (never text, fills, borders, chip fills or toasts).
- Meaning is never colour alone: every non-intensity state also differs in shape (dashed, outlined, dot, notch) or words.
- Minimum text 12 pt. Every tappable element has a 44 × 44 pt hit area even when the visual is smaller (documented exceptions: Week matrix cells 24 pt, Year cells 16 pt — not tappable).
- Density: only padding and gaps are tight; type sizes and 44 pt targets never shrink (T-18).

> [!warning] Spec wins over the mockup
> Decisions after the code assessment (see `feature-spec-v3.md`): weeks start Monday (T-29 is **not applied**; T15 is Later); no per-habit icon/colour picker (category supplies both); no completion time in row status lines; SY3 is indeterminate. Where this file and the spec disagree, the spec wins.

## F-01 Colour tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| bg | #F4F3F1 | #1A1A1C | Screen background |
| card | #FFFFFF | #242427 | Cards, tab bar, sheet fields |
| inner | #EFEEEC | #2E2E32 | Inset fields, pressed rows, neutral icon squares, segmented track |
| track | #DEDDDA | #3A3A3E | Progress track, missed cell, ring track (decorative) |
| border | #E2E1DE | #343438 | Hairlines, dividers (decorative) |
| text | #1A1A19 | #EDEDEA | Primary text, today ring |
| sub | #5E5E5C | #A5A5A2 | Secondary text, sublines, system glyphs |
| faint | #6C6C69 (was #6E6E6B) | #9A9A97 | Eyebrows, meta, axis labels, inactive tab (bar A) |
| outline | #898987 (was rgba(0,0,0,.18)) | #777778 (was rgba(255,255,255,.22)) | Unchecked circle/checkbox, off toggle, empty cell outline; 3:1 |
| accent | = text ink* | = text ink* | The one accent: fills, selection, focus ring, intensity |
| onAccent | white* | bg ink* | Text and glyphs on accent |
| warnInk | #966408 (was #9A6708) | #E8A93A | Break habits, warnings, at-risk |
| warnTint | #FDF0D5 | #3A2A0E | Break resisted fill, warning banner/icon square |
| danger | #C9372F | #E56059 (was #D9544D) | Destructive actions and errors only |
| frozenBg | #EDE8F8 | #262036 | Frozen day, freeze token |
| frozenInk | #7A5AC4 | #A98FE0 | Frozen border, freeze count; **text on frozenBg uses text ink** (light frozenInk on frozenBg is 4.28:1, T-15) |
| toast | (see master) | #35353A | Toast surface; toastInk on it ≥ 10:1 |

\* accent/onAccent values are derived from the mockup's contrast figures (accent vs card 17.42:1 light / 13.20:1 dark); confirm against the master file when building tokens.

Rules: text ≥ 4.5:1, non-text UI ≥ 3:1. An error is never colour alone: danger ink + "!" glyph + words.

## F-02 Completion intensity and categories

Intensity = accent mixed into track at **0 / 28 / 58 / 100 %**:

| Level | Meaning |
|---|---|
| 0 (0 %) | Missed / nothing |
| L1 (28 %) | 1–49 % of target |
| L2 (58 %) | 50–99 % |
| L3 (100 %) | Complete |

- Partial levels (L1, L2) carry a **22 % corner notch** (T-24); partial vs missed is below 3:1 on lightness alone, so shape is the second signal.
- Frozen: violet, always dashed. Streak reset: amber outline. Bonus/off-schedule: accent dot. Before start / future: dashed / hairline. Nothing logged yet: outline (deliberately different from missed = filled track).
- Never a habit or category hue in heat maps (T-05, retires V2 NEW-16 per-habit hue).

**Categories:** V2 table unchanged except **Health 25 → 175** and **Social 345 → 230** (T-16, no red). Custom-category rotation drops hues 15 and 350 — and, as built, also 175 and 230 (now Health's and Social's), leaving six slots (`design-system.md`). "Other" stays hue-less (neutral). Category appears as a **32 pt icon square** on rows (was 38) and an 8 pt dot in dense grids — never a row fill. Selected category chip uses the accent fill (was its category fill).

## F-03 Type scale

SF Pro, built-in. Nine styles, two weights (400/500; 600 only for the selected tab and today's weekday letter). Numbers use tabular figures. Percentages are whole numbers. Retired sizes: 10.5 · 11 · 11.5 · 12.5.

| Style | Size / line · weight | Use | AX3 |
|---|---|---|---|
| display | 32 / 38 · 500 | Screen title | 52 |
| stat | 26 / 30 · 500 | Stat value, ring value | 48 |
| title | 20 / 26 · 500 | Sheet title, empty-state title, stepper value | 43 |
| body-lg | 17 / 22 · 400 | Field value | 40 |
| body | 16 / 21 · 400 | Row name, buttons, list label | 38 |
| callout | 15 / 20 · 400 | Week strip day, list value, insight title (500) | 36 |
| subhead | 14 / 19 · 500 | Card header, chip, segmented, links | 34→36 (T-30) |
| footnote | 13 / 18 · 400 | Sublines, body copy, group header (500) | 33→36 |
| caption | 12 / 16 · 500 | Eyebrow (caps), axis, tab label, counter | 32; **tab label fixed** |

React Native `allowFontScaling` on everywhere except the tab bar label. AX3 sizes follow the iOS text-style ramp (08.6a).

## F-04 Spacing (new; code had none)

Name = value × 25.

| Token | pt | Use |
|---|---|---|
| space-050 | 2 | Name ↔ subline |
| space-100 | 4 | Segmented inset |
| space-150 | 6 | Group header ↔ card (was 8), legend gaps |
| space-200 | 8 | Chip gaps, button icon gap, stat tile grid |
| space-250 | 10 | Row vertical padding (60 pt rows) |
| space-300 | 12 | Gap between cards (was 16), icon ↔ text, tile padding |
| space-350 | 14 | Row horizontal padding, card and insight padding (was 16) |
| space-400 | 16 | AX sizes only: card padding and gaps |
| space-500 | 20 | Screen gutter, gap between groups (was 22) |
| space-600 | 24 | Section gap |
| space-800 | 32 | Empty-state stack, sheet bottom inset |

Density (T-18): habit row **60 pt flat with hairlines** (was 56 + 6 inset), icon square 38 → 32, no inset inside row cards. AX sizes restore 16 pt padding and 72 pt rows.

## F-05 Radius

| Token | Value | Use |
|---|---|---|
| radius-xs | (see master) | Skeleton lines, glyph corners |
| radius-s | (see master) | Checkbox, toast action, inline tags |
| radius-m | (see master) | Lifted row, inset fields |
| radius-l | 20 | Every card, banner, field (form cards 18 → 20, T-09) |
| radius-xl | 28 | Sheet top corners |
| radius-pill | 999 | Buttons, chips, segmented, toggle, toast, circles |
| rule · cell | floor(size ÷ 3) | Completion cells: 12→4, 16→5, 24→8, 40→13 |
| rule · square | round(size × 0.31) | Icon squares: 28→9, 32→10, 56→17 |

## F-06 Elevation, focus, touch

Flat by default: a card is a surface step plus a hairline, never a shadow. Shadows only for things that float: lifted row (E2), toast (E3), pill. E0 screen · E1 card · E2 lifted · E3 toast · E4 sheet (bg + scrim, top radius 28). In dark, height reads as a lighter surface.
**Focus ring** (T-13): 2 pt gap in the surface colour + 2 pt accent, follows the element's radius.

## F-07 Motion

Motion confirms an action; it never decorates. With Reduce Motion nothing moves or scales; Undo timings do not change.

| Name | Spec | Reduce Motion |
|---|---|---|
| press | 100 ms ease-out, scale 92–98 % | No scale; 70 % opacity flash |
| state | 200 ms ease (circle fill, chip, toggle, segmented) | 150 ms crossfade |
| fill | 450 ms cubic-bezier(.22,1,.36,1) (bar, ring, pie) | Jumps to value |
| day-switch | 160 ms, crossfade + 12 pt slide | Crossfade only |
| sheet / push | iOS spring ≈ 340 ms / iOS default | System crossfade |
| toast | 240 in / 180 out, rise 12 pt + fade | Fade only |
| reorder | Lift scale 1.02 + E2 shadow | Shadow only |
| header collapse | scroll-linked, no duration: title scale 1 → .88 and opacity 1 → 0 over 0–60 % of the range, bar name and buttons 50–100 %, bar background and hairline 70–100 %; settles on the nearer end when scrolling stops inside it (`useCollapsingHeader`) | No interpolation, no settle; 150 ms crossfade at 50 % |
| celebrate | 600 ms once, check draws | Static check |
| skeleton | 1.2 s loop, only after 300 ms | Static |

## F-08 Iconography

One geometric set from rings, squares, bars, lines; 2 pt stroke at 38 pt, scaled with the square; one colour per glyph; system glyphs in sub ink (text when active). No emoji, no illustrations. Tab icons: Today = ring with check (T-17), Progress = rising bars, Habits = list. Settings = 8-tooth gear (T-19). Others: Add, Export, Reorder, Remove, Warning, Info, Archive, Paused, File, Calendar, Error, Freeze.

## F-09 Token changes (summary)

T-01 faint light · T-02 warnInk light · T-03 danger dark · T-04 ringOff → outline · T-05 intensity = accent tints · T-06 toggle off track/knob · T-07 caption floor 12 · T-08 subline 13 · T-09 form card radius 20 · T-10 cell sizes → 12/16/24/40 (30 stays for freeze token) · T-11 touch targets (weekday chip 44, inline stepper 44, circle visual 28) · T-12 sparkline bar 6 × 24 · T-13 focus · T-14 spacing/radius tokens · T-15 frozenInk usage · T-16 category hues no red · T-17 Today icon · T-18 density · T-19 gear · T-20/21 tab bar B baseline · T-22 quantity tap = +1 · T-23 pill inactive label = sub · T-24 partial notch · T-25 pill safe zone 112 · T-26 year taps = month labels · T-27 count button 28 pt pill (44 hit) · T-28 insight pager · T-29 week start follows iOS (**not applied: Monday fixed in V3**) · T-30 AX3 sizes on iOS ramp.

## Components (V3-xx)

"Was" shows the V1/V2 IDs each replaces (CL.1). Replaced components are deleted, not kept alongside.

| ID | Component | Was | Notes |
|---|---|---|---|
| V3-01 | Tab bar · 3 tabs | V1-17 | **A** solid: card + top hairline, 56 + 34 inset, content stops space-600 above, toasts 16 above. **B (baseline)** floating pill: 16 side insets, 56 tall, 9 above home indicator, card 88 % light / 94 % dark + blur, hairline, soft shadow; Reduce Transparency → solid. Active = filled capsule + text ink + 600. Bottom padding 112 pt, toasts 12 above, sheets cover it. AX → A. Inert during migration. |
| V3-02 | Header + header button | V1-20 chrome | [back] · eyebrow caption caps · display title · ≤ 2 trailing 44 pt circle buttons (card + hairline); title 2 lines then truncate |
| V3-03 | Week strip | new | 7 days, iOS first weekday, today ringed, selected filled accent, dot only when all due done, future faint inert, swipe for weeks |
| V3-04 | Completion circle | V1-06 + VAR-06 | Build = filled accent; Break = amber outline, resisted = amber check on warnTint; quantity partial = pie fill; 28 pt visual, 44 hit |
| V3-05 | Completion cell + legend | NEW-16 + VAR-09 | Square, read-only, radius floor(size/3), accent tints, notch for partial |
| V3-06 | Completion grid | NEW-07 | Week matrix (24 pt), Month calendar (40 pt with day number), year heat map (16 pt, 3 bands × 4 months), per-habit mini month (16 pt), compact year strip (12 × 24), AX3 list fallback |
| V3-07 | Progress bar | V1-11 | 6 pt track, count left, whole-number % right |
| V3-08 | Column bar · sparkline | NEW-17/08/09 | Sparkline 6 × 24; chart 12 columns × 96, radius min(w/2, 6) |
| V3-09 | Rate ring | new | **Not built: P7 uses a stat tile for the month's rate (V3-3b).** Spec was: whole-number %, solid accent, 10 pt stroke; once per Month overview. The ring was built, found to have no frame, and deleted; the "Was" mapping stays in CL.1 |
| V3-10 | Stat card | VAR-14 + NEW-20 | Padding 12, 2 pt between label/value/sub, no min height; no icons; AX 1-up |
| V3-11 | Chart card | NEW-32/31/21 | Shared container |
| V3-12 | Insight card | VAR-04 | Tones warning/positive/neutral; pager dots; body never tappable, only its link |
| V3-13 | Habit row | V1-25 + VAR-11 | 60 pt, 32 pt icon square, status line, count button for quantity, circle trailing; name area opens Detail (13a = density spec) |
| V3-14 | Category chip | NEW-28 | Selected = accent fill |
| V3-15 | Category row | NEW-29 | Counts include archived |
| V3-16 | Text field | V1-13 + VAR-12 + NEW-23/24 | Counter from 80 %, error state, helper |
| V3-17 | Segmented control | V1-08 + VAR-01 | 40 tall visual, 48 hit |
| V3-18 | Stepper | V1-12 + VAR-07 | 44 pt buttons |
| V3-19 | Chip · weekday chip | V1-09 | 44 pt |
| V3-20 | Toggle | V1-07 | Off track outline; knob onAccent; whole row toggles |
| V3-21 | Checkbox | new | |
| V3-22 | Buttons | V1-03/04/05 + VAR-13 | Primary, secondary, destructive, disabled-with-reason, compact (44 hit). **Built:** destructive is the outlined red pill and `variant="compact"` the 36 pt inset pill (V3-4a); secondary is still the hairline pill, not the 3:1 outline, and `link` is secondary ink (V3-6) |
| V3-23 | List item | V1-14 + VAR-05/08 | |
| V3-24 | Sheet | V1-15 + VAR-03 | Grabber, title, Close (swipe = Close); confirm sheets drop Close and end with Cancel |
| V3-25 | Destructive confirm | NEW-12 + V1-16 | Archive-first variant, move-preview variant. **Built (V3-4a):** `DestructiveConfirmSheet` — safe action first and focused, outlined red pill, hint, Cancel last, in-sheet error banner, busy state; Archive's one-tap sheet (DC5) is its own, lighter sheet |
| V3-26 | Toast | V1-18 | Tones; Undo right; 5 s Undo / 4 s success+info / 6 s warning / errors until Retry or swipe |
| V3-27 | Inline banner | V1-19 + NEW-13 | States that last |
| V3-28 | Empty state | V1-21 | |
| V3-29 | Unlock card | NEW-11 | Progress toward 7 days of logs |
| V3-30 | File card | NEW-06 | |
| V3-31 | Log row | NEW-22 | **Later** (PR-02); do not build |
| V3-32 | Icon square | VAR-02 | |

## Screen structure quick map

Frame groups (details in `feature-spec-v3.md`): **Today** T1–T15 · **Progress** P1–P17 · **Habits tab** H1–H10 · **Detail** D1–D8 · **Add/Edit** F1–F10 · **Categories** C1–C6 · **Reminders** R1–R5 · **Settings** S1–S7 · **Sheets** DC, QS, RL, HP, SR · **Toasts/banners** TC · **Export** EX · **Suggestions** BS · **First run** FR · **System states** SY · Accessibility 08.x · Change log CL.1–CL.3 · Data needs DN · Open decisions OD · Self-critique SC.

## Notes for whoever builds from this file

- Do not invent values: spacing, radius, elevation, focus and motion tokens are new — add them as real tokens and let the ratchet enforce them.
- "Other" has no hue (V2 rule stands). Category hues never appear as text or fills.
- **V3-09 rate ring: not built** — no frame draws it (P7 shows the rate as a tile); built and deleted in V3-3b, see `docs/backlog.md`.
- Built-in V2 deltas (cell 18/6/5, stat card 14/10/26, chart padding 16) are superseded by T-10, T-14, T-18 above.
- Everything marked **Later** in the mockup is out of V3; do not build its frames.
