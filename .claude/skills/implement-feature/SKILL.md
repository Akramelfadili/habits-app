---
name: implement-feature
description: Implements one feature from the Habits specs (V1 HAB-01–13 in docs/feature-spec.md, V2 HAB-14–25 in docs/feature-spec-v2.md) following Explore, Plan, Implement, Verify, Review, Report. Only invoke manually.
disable-model-invocation: true
---

## Usage

`/implement-feature <id>` — e.g. `/implement-feature 03` (HAB-03, V1) or `/implement-feature 21` (HAB-21, V2). Never commit or push unless the person says so.

## Instructions

0. **Resolve the docs and the branch.**
   - HAB-01…13 → `docs/feature-spec.md` + `docs/design-system.md`. HAB-14…25 → `docs/feature-spec-v2.md` + `docs/design-system.md`, **including its Deltas section** (smaller cells/cards there are intentional). For V2 also skim the V1 section the ticket revises — V2 wins on conflicts, and you update the V1 text/tests in the same change.
   - Read only the matching `HAB-<id>` section (+ the NEW-/VAR- entries it references), not whole files. Also read `CLAUDE.md` and the parts of `docs/architecture.md` your layers touch, and `docs/backlog.md` for the ticket's open items.
   - Work on branch `feat/hab-<id>-<slug>` (create it if you are on `master`; one ticket per branch and PR).

1. **Explore.**
   - Check `docs/mockups/` for images of the screens this feature builds or changes. If none match, STOP and say which screens lack a mockup — do not proceed until the person provides one or says to proceed without.
   - **Search before you plan:** `rg` the codebase for existing components, hooks, helpers and repositories that already do part of this (`components/ui/primitives|composite`, the module's components, `*-helpers.ts`, services). List the shared components you will touch and who else uses them.
   - Look at the current state of the relevant `modules/habits/` subfolders before assuming what exists.

2. **Plan, then wait for "Go".** State:
   - Files to add/change, and the layer of each (repository / service / hook / screen / component / strategy). A service only if genuinely composite — say why. Any new Zod schema, Strategy, or domain type.
   - **Reuse table** — one row per UI element or helper: *existing / extend / new*, and why. Extending beats creating; "new" needs a reason the existing ones can't stretch.
   - **Schema change?** Then a migration plan: what the migration does, whether it rebuilds a table (needs `defer_foreign_keys`), how it is tested with FK ON in the one-transaction chain with child rows, and the `.web.ts` twin. Hand this to the `migration-reviewer` subagent after implementing.
   - **Baselines expected to change** (`docs/visual-baseline/` states, light/dark). The `today-menu-open*` states only change when the menu itself does.
   - V1/V2 conflicts, open questions with your default answer.

3. **Implement** per the plan and `CLAUDE.md`. Match the documented screen structure and component states. Colocated Jest/RNTL tests for everything you add. Edit/Write, not python/sed. No Maestro flow unless asked — but if you remove or rename a label/button an existing `/e2e` flow taps, update that flow.

4. **Verify.**
   - `make check` must be green (Biome, tsc, Jest, tooling tests, architecture rules). Fix failures; never hand back a failing build. Do not add allowlist entries or raise the token baseline to get green — fix the code (allowlist only with explicit approval).
   - **Visual verification** (web target; setup and known web-only artifacts in `docs/dev-tooling.md`): register every screen **and state** you touched in `SCREENS` in `scripts/visual-check/screens.mjs`; run `npm run visual-check -- <screen>...` (fix reported page/console errors first), then the full `npm run visual-check`. Drift in other features' states means a shared component change leaked — inspect in `.visual-checks/report.html` and `--update-baseline` only intended ones. A `today-menu-open*` diff means the menu's placement or content changed — investigate before updating. Compare each `.visual-checks/<screen>.png` with its mockup, light **and dark**, fix discrepancies, at most 3 rounds. A new repository needs a `.web.ts` twin with the same exports.
   - Only then ask for a real-device screenshot, as a *final confirmation*: say what the self-check verified, what it couldn't, and what to look at.

5. **Review.** Run the `spec-reviewer` subagent with the feature id (`HAB-<id>`) and fix everything it ranks blocking. If the schema changed, also run `migration-reviewer`. Re-run `make check` after fixes.

6. **Report.** What was built and which files changed; every acceptance criterion in the spec, met or not (don't tick what isn't verified); baselines changed and why; deviations logged in `docs/backlog.md` and an "As built" note added to the ticket's spec section; allowlist/baseline changes (should be none, or only removals); a short list of what only a real device can confirm. Leave everything uncommitted and ask whether to commit.

Do not implement a feature outside this skill — if asked to "just add X" without this flow, point back here (small bug fixes may skip the plan, but not `make check`).
