---
name: implement-feature
description: Implements one feature from the Habits feature spec (docs/feature-spec.md), following Explore, Plan, Implement, Verify. Only invoke manually.
disable-model-invocation: true
---

## Usage

`/implement-feature <id>` — e.g. `/implement-feature 03` builds HAB-03.

## Instructions

1. **Explore.** Before doing anything else, check `docs/mockups/` for images matching the screens this feature will build or change. If no matching mockup exists, STOP and tell the person which screens have no mockup — do not proceed with implementation until they provide one or explicitly say to proceed without it. Read the matching `HAB-<id>` section in `docs/feature-spec.md` in full — user story, behavior, business rules, states table, edge cases, and acceptance criteria. Read `docs/app-architecture.md` and `CLAUDE.md`'s architecture rules. Look at the current state of the relevant `modules/habits/` subfolders before assuming what already exists.

2. **Plan.** Before writing any code, state:
   - Which files you'll add or change, and which layer each belongs to (repository / service / hook / screen / component / strategy)
   - Whether this operation needs a service (only if genuinely composite — say why if so) or is a direct hook-to-repository call
   - Any new Zod schema, Strategy implementation, or domain type needed
   - Which primitives/composite components this screen needs, per `docs/design-system.md` — state which already exist and which need to be created, before writing any code
   - Which existing files, if any, need touching (and confirm this doesn't cross a module boundary or add a direct Drizzle import outside `repositories/`)

   Stop here and wait for confirmation before writing code.

3. **Implement.** Follow the plan and the architecture rules in `CLAUDE.md` exactly. Match the screen structure and exact component states documented in `docs/design-system.md` for this feature. Write Jest/React Native Testing Library tests colocated with the code you add (repositories, services, strategies, and components all get tests). Do not add a Maestro E2E flow unless asked.

4. **Verify.** Run the test suite and the linter yourself. Fix any failures before reporting the feature done — do not hand back a failing build.

   **Visual verification.** Self-check on the web target before involving the person:
   1. Make sure every screen **and state** this feature touched is registered in `SCREENS` in `scripts/visual-check/screens.mjs` (feature ID, route + matching `docs/mockups/` file or `null`; add fixture rows to `repositories/habit-fixtures.ts` if the screen needs data it doesn't have yet — append `?fixtures=empty` to a route for empty states; use `interact` for sheets, toasts and gestures).
   2. Run `npm run visual-check -- <screen-name>...` (reuses a running `npx expo start` on :8081, otherwise starts one). It prints any page/console errors — fix those first. Then run the full `npm run visual-check` once: states from *other* features that drift from `docs/visual-baseline/` mean a shared component change leaked — check each in `.visual-checks/report.html`, fix unintended ones, and `--update-baseline` only the intended ones (commit the PNGs with the change).
   3. Read each `.visual-checks/<screen>.png` and the matching mockup side by side. Mockups are small; crop/upscale regions when details are unclear. List concrete discrepancies (layout, spacing, component state, label casing, colors) and fix them in the primitives/composites or screen, per the architecture rules.
   4. Repeat 2–3, **at most 3 rounds**.
   - Ignore known web-only artifacts, don't "fix" them: SF Symbols (`expo-symbols`) render nothing on web (blank icon squares, missing chevrons/tab icons), system font falls back to a non-SF font, safe-area insets are zero, native stack/modal chrome differs.
   - Only then ask the person for a real-device screenshot — framed as a **final confirmation**, not a first look: say what the self-check verified, what it couldn't (the web-only artifacts above, plus anything still off after 3 rounds), and what specifically to look at on the phone.
   - Web renders through `*.web.ts(x)` swaps (in-memory fixture repositories, no-op `DatabaseProvider`). A new repository needs a `.web.ts` counterpart with the same exports (enforced by a `typeof` guard at the bottom of the existing one), or web will crash on import.
   - Chromium setup on this WSL box (Ubuntu 20.04, no sudo): `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu22.04-x64 npx playwright install --only-shell chromium`, with its missing system libs unpacked via `apt-get download` + `dpkg-deb -x` into `~/.cache/ms-playwright/extra-libs/` (the script adds that to `LD_LIBRARY_PATH` automatically).

5. **Report.** Summarize what was built and which files changed. Go through `docs/feature-spec.md`'s acceptance criteria for this feature one by one and state which are met; do not check a box that isn't actually verified.

Do not implement a feature outside this skill — if asked to "just add X" without going through this flow, point back to this skill instead.
