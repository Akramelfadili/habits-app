# V3 backlog

Deviations and follow-ups recorded while building V2, so they aren't lost.

## HAB-19 — Manage & archive rework

- **Chrome deviation.** The mockups (D3/E2/E3) show a "Habits" title with a "Done" button. The built screen stays a *pushed* screen from the Today ⋯ menu: it keeps the back button ("Today") and uses the title "Habits" in the body, with no "Done". Revisit if Manage becomes a modal or a tab destination.
- **Category order is an open alternative.** Manage and Today both use `groupHabitsByCategory` — categories in order of first appearance among habits in manual order, "Other" last — so the two always agree. Ordering by the managed category order instead (ten built-ins in fixed order, then custom ones in creation order, as Manage Categories and the picker show them) would be more predictable but must change on Today in the same release, otherwise "matches Today" in the Manage footnote stops being true.
- **Archived-row subtitle.** A habit with no history reads "Archived 2 Sep · no logs" (shortened from "nothing logged", which wrapped beside Restore at phone width); "N logs kept" follows the mockup.

## HAB-16 — Summaries: range switcher + Monthly

- **C1 omits the Last week / This week switch.** The Weekly mockup (C1) shows only the Week / Month / Year switcher under the title; the V1 compact "Last week / This week" switch in the title row is kept (HAB-16's rule: the range switcher is the only change to Weekly). Decide whether C1 means it to go.
- **Year is disabled** in the range switcher until HAB-17.
- **Pattern action** opens the habit's Reminders screen with no sheet pre-opened — `TODO(HAB-21)`: open "Add a time" with the day (`?addTime=<day>`) pre-selected.
- **Slipping body** omits C3's second sentence ("The drop started when Easy run moved to evenings") — a cause across habits isn't derivable. Insight thresholds are one named block in `services/monthly-insights.ts`.
- **Unlock date** is first day + 30 (C6: since 4 Sep → 4 Oct), with "N of 30" counting full days before today.
- **Frozen days** leave both sides of the rate (an excused miss), so the tile can differ slightly from a "scheduled" count that includes them.
- **Detail heatmap is left-aligned inside its card.** This matches the mockup (NEW-07's detail layout is a fixed 18px grid with no stretch), so it isn't a bug — but consider centering or filling the width as polish.

## Visual-check: `today-menu-open` is flaky

- **Symptom:** `npm run visual-check -- today-menu-open` alternates between "same" and "changed — 144149 px differ (10.76%)" on identical code (seen on a clean stash and with HAB-19 applied). `today-empty-menu-open` and `today-menu-open-dark` showed the same intermittent diff in one full run.
- **Difference:** in the failing render the popover sits 74px lower than the baseline's (its top edge lands just under the title row instead of overlapping the progress card).
- **Suspects:** the popover measures its anchor (the ⋯ button) before layout has settled, or the harness screenshots before layout finishes. Look at the anchor-measurement path in `nav-menu.tsx` / `today-nav-menu.tsx` and add a wait for layout (or re-measure on layout) in the `interact` step in `scripts/visual-check/screens.mjs`.
- **Status:** baseline deliberately untouched by HAB-19; fix separately.
- **Also seen on `today-empty-menu-open`** (HAB-16): the same intermittent 74px popover offset (~9.6% of pixels) — it passed on a solo run and failed in the full run on identical code. Its baseline was deliberately not re-committed in HAB-16; investigate with the anchor-measurement fix above.
