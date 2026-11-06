---
name: implement-feature
description: Implements one feature from the Habits specs (HAB-01–25 in feature-spec.md / feature-spec-v2.md, HAB-26–50 in feature-spec-v3.md) following Explore, Plan, Implement, Verify, Review, Report. Only invoke manually.
disable-model-invocation: true
---

`/implement-feature <id>` — e.g. `03` (V1), `21` (V2), `35` (V3). Never commit or push unless the person says so. `CLAUDE.md` already holds the architecture rules, guards and definition of done: follow it, do not restate it.

## Docs map (the only place doc paths appear; a doc move edits this table)

| Doc kind | Path |
|---|---|
| Spec HAB-01–13 / HAB-14–25 / HAB-26–50 | `docs/specs/feature-spec.md` / `docs/specs/feature-spec-v2.md` / `docs/specs/feature-spec-v3.md` |
| Design system HAB-01–25 (has **Deltas**) / HAB-26–50 | `docs/design/design-system.md` / `docs/design/design-system-v3.md` |
| Progress maths (HAB-35–38) | `docs/progress-data.md` |
| Architecture, navigation ADR | `ARCHITECTURE.md`, `docs/decisions/006-navigation.md` |
| Backlog (deviations, open items) | `docs/backlog.md` |
| V3 mockup index and frame text | `docs/mockups/v3/renders/INDEX.md`, `docs/mockups/v3/renders/<section>/text.txt` |
| Tooling, visual-check | `docs/how-to/dev-tooling.md` |

## Reading rule: never open a whole spec, backlog or text.txt

Sizes: specs 36–61 KB, backlog 83 KB, each `text.txt` 11–67 KB. Find the line with `grep -n`, then read a window with Read `offset`/`limit` (or `sed -n 'A,Bp'`).

## 0. Resolve the ticket and the branch

- **Spec section.** Heading patterns (verified): V1 `^## 03 — ` (two-digit id, no "HAB"); V2 and V3 `^## HAB-35 — `. So: `grep -n '^## HAB-35 \|^## HAB-36 ' <spec>` → section runs to the next `^## `. Read only that, plus the NEW-/VAR- entries it cites (V2) or the **Check against code** line (V3).
- **V3 also:** read the `Standing decisions` table (D1–D15) and `Spec wins over the mockup` list at the top of `feature-spec-v3.md` once (~7 KB); they override the mockup. Design system: grep the ticket's `V3-xx` component ids and the `F-xx` tokens it names in `design-system-v3.md`, read those rows only. HAB-35–38 also read the matching rules in `progress-data.md`. V1/V2 tickets: `design-system.md` **Deltas** section plus the ticket's screen; for V2 skim the V1 section it revises (V2 wins; update V1 text and tests in the same change).
- **Backlog, by grep only:** `grep -n 'HAB-35' docs/backlog.md` (a hit may be a heading or a bullet), plus the stage label from the spec's Build order (V3-0b: HAB-26/28/29/42 · V3-1: 27 · V3-2: 30–34, 48 · V3-3: 35–38 · V3-4: 39–45 · V3-5: 46–47 · V3-6: 49–50), e.g. `grep -n 'V3-3' docs/backlog.md`. Read those lines with a small window. Then read only the **"Decided — deviations the reviewers should not re-flag"** section: `sed -n '/^## Decided/,/^## Visual-check/p' docs/backlog.md`.
- `ARCHITECTURE.md`: only the layers you touch (`grep -n '^## '` for the heading). Navigation or a pushed screen: `docs/decisions/006-navigation.md` too.
- Branch `feat/hab-<id>-<slug>` (create if on `master`; one ticket per branch and PR).

## 1. Explore

- **V3 mockups (HAB-26–50):** take the frame ids from the ticket's **Frames** line (e.g. `P1–P6`). `grep -n 'P1' docs/mockups/v3/renders/INDEX.md` names the section (`## progress`); then in that section's `text.txt` run `grep -n '^P1 ·' <section>/text.txt` (each frame starts at `P1 · Light`) and read from that line to the next `· Light` header with a window (~70–90 lines per frame, Light only; Dark repeats it). Never open a whole `text.txt`. Slices (PNG) are gitignored (`npm run mockups:render` makes them): look at one only for layout you cannot get from text. If a frame is in none of them, STOP and say which.
- **V1/V2 mockups (HAB-01–25):** only at git tag `mockups-v1-v2` (`git ls-tree --name-only mockups-v1-v2 docs/mockups/`, files named like `hab-25-f3a.png`). If no PNG matches the screens, STOP and say which lack one.
- **Search before you plan:** `rg` for existing components, hooks, helpers, repositories (`components/ui/primitives|composite`, the module's components, `presenters/`, services). List the shared components you will touch and who else uses them.

## 2. Plan, then wait for "Go"

State: files to add/change with the layer of each (service only if genuinely composite, and why); any new Zod schema, Strategy or domain type; a **reuse table** (one row per UI element/helper: existing / extend / new, and why; "new" needs a reason); **schema change?** → migration plan (rebuild needs `defer_foreign_keys`, FK-ON one-transaction test with child rows, `.web.ts` twin; hand to `migration-reviewer` after); baselines expected to change (`docs/visual-baseline/`, light and dark; `today-menu-open*` only if the menu changed); spec/mockup conflicts and open questions with your default. Finish with the list of files and sections you read.

## 3. Implement

Per the plan and `CLAUDE.md`; match the documented screen structure and component states. Colocated Jest/RNTL tests for everything you add. Edit/Write, not python/sed. No Maestro flow unless asked, but update an existing `/e2e` flow if you rename a label it taps.

## 4. Verify

- `make check` green, **run unpiped** (no `tail`/`head`/`grep`) so the exit code stays visible. Fix failures; never add allowlist entries or raise the token baseline to get green.
- **Visual check** (setup in `docs/how-to/dev-tooling.md`): register every screen **and state** you touched in `SCREENS` in `scripts/visual-check/screens.mjs`. First targeted: `npm run visual-check -- <screen>...` (fix page/console errors), then once the full `npm run visual-check`. Drift in other features' states = a shared-component leak; inspect `.visual-checks/report.html`, `--update-baseline` only intended ones. Compare each screen with its mockup, light **and dark**, at most 3 rounds. New `-ax` states run with `?textSize=ax`.
- Only then ask for a real-device screenshot as a final confirmation: what the self-check verified, what it could not, what to look at.

## 5. Review

Run `spec-reviewer` with `HAB-<id>`; fix everything it ranks blocking. Schema changed → also `migration-reviewer`. Re-run `make check`.

## 6. Report

What was built and which files changed; every acceptance criterion met or not (don't tick what isn't verified); baselines changed and why; deviations logged in the backlog and an "As built" note in the ticket's spec section; allowlist/baseline changes (none, or only removals); what only a real device can confirm. Leave uncommitted and ask whether to commit, unless the task says to commit per step. Never push; no attribution lines.

"Just add X" without this flow → point back here (small bug fixes may skip the plan, never `make check`).
