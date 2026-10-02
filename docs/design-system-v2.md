---
title: Habits — Design System & Screen Reference (V2 addendum)
status: final for V2 mockups
tags: [design-system, ui, habits, v2]
---

# Habits — Design System & Screen Reference — V2 addendum

> [!info] What this file is for
> Same purpose as `design-system.md` (V1): a verbatim transcription of the finished V2 mockup, read alongside the V1 file rather than replacing it. Source: `HabitFlowV2.dc.html` and `habit-components.js` (the single module both V1 and V2 flow files import for their component definitions). Every value below is copied from those files, not eyeballed. This file only covers what V2 *adds or changes*; anything not mentioned here (tokens, type scale, V1 components) is unchanged from `design-system.md`.

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

Both built-in and rotation hues follow the same `tint(hue)`/`ink(hue)` OKLCH formula already defined in `design-system.md` for habit accents — categories are not a separate color system, they're the same formula applied to a longer, fixed hue list.

## Component library additions (V2)

Full inventory lives in `habit-components.js` (tiers: composite, atom, variant, reused), imported by both V1 and V2 flow files so "used in" is computed from real frame references rather than hand-maintained. Highlights that change how existing UI should be built going forward — not just new screens:

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

## Deltas — frames redrawn when the shared definition won

These are concrete visual changes to *existing V1 screens*, caused by V2's consolidation, not new V2 content. Flag these explicitly to whoever builds V2 — they'll touch Detail, Weekly Summary, and Streak-reset code even though those tickets were "done" in V1:

- **Detail (V1-03), Streak-reset (V1-18), New-habit-variant Detail (V1-21):** heatmap cells 22px/radius 7/gap 6 → 18/6/5; legend swatches 14/radius 5 → 12/radius 4; stat cards 16/10/28 → 14/10/26; chart-card padding 18 → 16.
- **Weekly Summary (V1-10), Perfect Week (V1-19):** per-habit rows gain the 28px habit badge, row gap 16 → 12; stat cards 18/11/30 → 14/10/26; insight-card padding 18 → 16/18; chart-card padding 18 → 16.
- **Delete confirm (V1-15):** the old layout drew "Archive instead" as a card *and* a separate button — this is now the `NEW-33` "V1 layout" state specifically so V2's `E7` can remove the duplicate.

None of these are behavior changes — same data, same logic, smaller/cleaner chrome. Treat them as a design-token bump on existing screens, not a new feature.

## Screen-by-screen structure (V2, mapped to HAB-14–HAB-25)

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
> - **HAB-23 must move `DeleteHabitSheet` onto `DestructiveConfirmSheet`** (as its "with archive action" state) — it's still its own V1 layout until then, so the app briefly has two delete-sheet implementations.
> - Entry point: Settings → Categories (HAB-15; a plain navigable row with no mockup — a proposal, back reads "Settings"). The temporary row on Manage habits has been removed.

## Notes for whoever builds from this file

- The Deltas section above is not optional polish — it's a real, if small, visual change to three already-shipped V1 screens (Detail, Weekly Summary, Streak reset). Scope it into whichever ticket touches those screens next rather than treating V2 as purely additive.
- "Other" having no hue is load-bearing, not a placeholder — don't give it a color later "for consistency." It's the deliberate exception that keeps Other feeling like a catch-all rather than an identity category.
- The custom-category rotation is positional (slot 1, 2, 3…), not random — the Nth custom category always gets the Nth rotation entry, so behavior is deterministic and testable.
- If any value here is in doubt, the source of truth is `habit-components.js` and `HabitFlowV2.dc.html` (in the repo, same as the V1 `.dc.html` files) — this document is the readable transcription, not the other way around.
