---
name: implement-feature
description: Implements one feature from the Habits feature spec (docs/feature-spec.md), following Explore, Plan, Implement, Verify. Only invoke manually.
disable-model-invocation: true
---

## Usage

`/implement-feature <id>` — e.g. `/implement-feature 03` builds HAB-03.

## Instructions

1. **Explore.** Read the matching `HAB-<id>` section in `docs/feature-spec.md` in full — user story, behavior, business rules, states table, edge cases, and acceptance criteria. Read `docs/app-architecture.md` and `CLAUDE.md`'s architecture rules. Look at the current state of the relevant `modules/habits/` subfolders before assuming what already exists.

2. **Plan.** Before writing any code, state:
   - Which files you'll add or change, and which layer each belongs to (repository / service / hook / screen / component / strategy)
   - Whether this operation needs a service (only if genuinely composite — say why if so) or is a direct hook-to-repository call
   - Any new Zod schema, Strategy implementation, or domain type needed
   - Which existing files, if any, need touching (and confirm this doesn't cross a module boundary or add a direct Drizzle import outside `repositories/`)

   Stop here and wait for confirmation before writing code.

3. **Implement.** Follow the plan and the architecture rules in `CLAUDE.md` exactly. Match the screen structure and exact component states documented in `docs/design-system.md` for this feature. Write Jest/React Native Testing Library tests colocated with the code you add (repositories, services, strategies, and components all get tests). Do not add a Maestro E2E flow unless asked.

4. **Verify.** Run the test suite and the linter yourself. Fix any failures before reporting the feature done — do not hand back a failing build.

5. **Report.** Summarize what was built and which files changed. Go through `docs/feature-spec.md`'s acceptance criteria for this feature one by one and state which are met; do not check a box that isn't actually verified.

Do not implement a feature outside this skill — if asked to "just add X" without going through this flow, point back to this skill instead.
