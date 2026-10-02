# V3 backlog

Deviations and follow-ups recorded while building V2, so they aren't lost.

## HAB-19 — Manage & archive rework

- **Chrome deviation.** The mockups (D3/E2/E3) show a "Habits" title with a "Done" button. The built screen stays a *pushed* screen from the Today ⋯ menu: it keeps the back button ("Today") and uses the title "Habits" in the body, with no "Done". Revisit if Manage becomes a modal or a tab destination.
- **Category order is an open alternative.** Manage and Today both use `groupHabitsByCategory` — categories in order of first appearance among habits in manual order, "Other" last — so the two always agree. Ordering by the managed category order instead (ten built-ins in fixed order, then custom ones in creation order, as Manage Categories and the picker show them) would be more predictable but must change on Today in the same release, otherwise "matches Today" in the Manage footnote stops being true.
- **Archived-row subtitle.** A habit with no history reads "Archived 2 Sep · no logs" (shortened from "nothing logged", which wrapped beside Restore at phone width); "N logs kept" follows the mockup.

## HAB-16 — Summaries: range switcher + Monthly

- **C1 omits the Last week / This week switch.** The Weekly mockup (C1) shows only the Week / Month / Year switcher under the title; the V1 compact "Last week / This week" switch in the title row is kept (HAB-16's rule: the range switcher is the only change to Weekly). Decide whether C1 means it to go.
- ~~**Year is disabled** in the range switcher until HAB-17.~~ Enabled by HAB-17.
- **Pattern action** opens the habit's Reminders screen with no sheet pre-opened — `TODO(HAB-21)`: open "Add a time" with the day (`?addTime=<day>`) pre-selected.
- **Slipping body** omits C3's second sentence ("The drop started when Easy run moved to evenings") — a cause across habits isn't derivable. Insight thresholds are one named block in `services/monthly-insights.ts`.
- **Unlock date** is first day + 30 (C6: since 4 Sep → 4 Oct), with "N of 30" counting full days before today.
- **Frozen days** leave both sides of the rate (an excused miss), so the tile can differ slightly from a "scheduled" count that includes them.
- **Detail heatmap is left-aligned inside its card.** This matches the mockup (NEW-07's detail layout is a fixed 18px grid with no stretch), so it isn't a bug — but consider centering or filling the width as polish.

- **`PATTERN_CAUSE_SHARE = 0.25` is weaker than the spec's "explains most of the pattern".** Kept to match C3's "a third" copy; revisit with real data.
- **The Today menu computes the full monthly summary only for the subline.** Consider a lighter selector. (Yearly's row already uses one — habits only, no entries.)
- **Frozen days on the Monthly calendar hide that day's completions** (a freeze marks the whole day). Revisit after real use.

## Visual-check: `today-menu-open` is flaky

- **Symptom:** `npm run visual-check -- today-menu-open` alternates between "same" and "changed — 144149 px differ (10.76%)" on identical code (seen on a clean stash and with HAB-19 applied). `today-empty-menu-open` and `today-menu-open-dark` showed the same intermittent diff in one full run.
- **Difference:** in the failing render the popover sits 74px lower than the baseline's (its top edge lands just under the title row instead of overlapping the progress card).
- **Suspects:** the popover measures its anchor (the ⋯ button) before layout has settled, or the harness screenshots before layout finishes. Look at the anchor-measurement path in `nav-menu.tsx` / `today-nav-menu.tsx` and add a wait for layout (or re-measure on layout) in the `interact` step in `scripts/visual-check/screens.mjs`.
- **Status:** baseline deliberately untouched by HAB-19; fix separately.
- **Also seen on `today-empty-menu-open`** (HAB-16): the same intermittent 74px popover offset (~9.6% of pixels) — it passed on a solo run and failed in the full run on identical code. Its baseline was deliberately not re-committed in HAB-16; investigate with the anchor-measurement fix above.

## HAB-17 — Summaries: Yearly

- **Archive is not at the foot of Edit habit.** The spec has "never stuck" open Edit habit with Archive at its foot; the form has no Archive action today (archiving lives on Detail and Manage). The card links to Edit habit as it is and reads "Edit or archive <habit> →". Add Archive to the form (or retarget the card) in a later ticket — no archive UI was built here.
- **C5 shows four cards, the rule is max three.** The mockup's fourth card ("Summer dip") is cut by the cap — the seasonal dip is the lowest-ranked card, so it only shows when fewer than three others fire. The fixture's test pins best month → stuck → never stuck.
- **The month in progress is not judged.** C5's "Under 50% in five of seven months" counts September; the built card counts finished months only ("five of six"). A partial month would otherwise decide a streak of good months or "never stuck" on a few days.
- **Clauses that can't be derived are dropped:** "…through two schedule changes" (never stuck) and "Travel weeks show up as gaps" (seasonal). The seasonal card says "ran at least N points below <best>" (the smallest gap in the run), and is titled "Summer dip" only when every month is June–August, otherwise "Seasonal dip".
- **Unlock progress** is "12 of 91 days" / "from 4 December" (real calendar span); C7 shows "12 of 90 days" / "from 3 December".
- **Chart bars are scaled to 100%** (96px = every habit done); the mockup scales to the tallest month, which exaggerates small differences. Strip cells use the three heatmap levels (under 50%, 50–84%, 85%+), so a habit hovering around 85% alternates shades.
- **Yearly shows only the current year.** No way to look at last year; January opens on a nearly-empty "<year> so far". Consider defaulting to the last full year for the first weeks of January, the way Monthly opens on the last complete month.
- **Early-year card.** With three months of history but no finished month this year, an "early" insight card ("Too early in the year to call") stands in so the screen never ends on an empty list. No mockup.
- **Empty state** ("Nothing to summarize yet", no habits) has no mockup; it mirrors Monthly's.
- **Logged** counts completed scheduled days (what Overall's rate is made of), not off-schedule logs.
- **Fixture numbers differ from C4's tiles** (948 / 80% vs 1,612 / 81%): the fixture is tuned to C5's insights, as Monthly's is to C3.
- **Visual baselines:** `today-menu-open*` baselines were re-captured with Yearly live, and Weekly/Monthly baselines for the enabled Year segment. The `today-menu-open` family still flips between two popover positions (see above), so those captures were taken only on renders at the correct position; `today-empty-menu-open` was left untouched.
- **Fallback cards.** Besides the early card, two more have no mockup: "Perfect year so far" (every finished month 100%) and "Nothing stands out" (fewer than two finished months, or nothing crossed a threshold).
- **Archived habits and Yearly insights.** Insights (best month, stuck, never stuck, seasonal dip) are computed from active habits only, so an archived habit is never named or linked. Tiles, the chart and the per-habit strips keep archived habits' history (as Monthly does), so the chart header's "Best: <month>" can differ from the best-month card when an archived habit moved the all-habits rate. With every habit archived the insights section is hidden.


## Monthly vs Yearly: archived habits in insights

- **Inconsistent today.** Monthly insights (slipping, improved, weekend pattern) can still name or link an archived habit, while Yearly insights now exclude archived habits (HAB-17). **V3: make Monthly consistent** — compute its insights (and their action targets) from active habits only, keeping archived habits' history in the tiles, calendar and rows as now.
