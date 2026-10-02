# V3 backlog

Deviations and follow-ups recorded while building V2, so they aren't lost.

## HAB-19 — Manage & archive rework

- **Chrome deviation.** The mockups (D3/E2/E3) show a "Habits" title with a "Done" button. The built screen stays a *pushed* screen from the Today ⋯ menu: it keeps the back button ("Today") and uses the title "Habits" in the body, with no "Done". Revisit if Manage becomes a modal or a tab destination.
- **Category order is an open alternative.** Manage and Today both use `groupHabitsByCategory` — categories in order of first appearance among habits in manual order, "Other" last — so the two always agree. Ordering by the managed category order instead (ten built-ins in fixed order, then custom ones in creation order, as Manage Categories and the picker show them) would be more predictable but must change on Today in the same release, otherwise "matches Today" in the Manage footnote stops being true.
- **Archived-row subtitle.** A habit with no history reads "Archived 2 Sep · no logs" (shortened from "nothing logged", which wrapped beside Restore at phone width); "N logs kept" follows the mockup.

## Visual-check: `today-menu-open` is flaky

- **Symptom:** `npm run visual-check -- today-menu-open` alternates between "same" and "changed — 144149 px differ (10.76%)" on identical code (seen on a clean stash and with HAB-19 applied). `today-empty-menu-open` and `today-menu-open-dark` showed the same intermittent diff in one full run.
- **Difference:** in the failing render the popover sits 74px lower than the baseline's (its top edge lands just under the title row instead of overlapping the progress card).
- **Suspects:** the popover measures its anchor (the ⋯ button) before layout has settled, or the harness screenshots before layout finishes. Look at the anchor-measurement path in `nav-menu.tsx` / `today-nav-menu.tsx` and add a wait for layout (or re-measure on layout) in the `interact` step in `scripts/visual-check/screens.mjs`.
- **Status:** baseline deliberately untouched by HAB-19; fix separately.
