# Habits

A personal iOS habit-tracking app built with Expo, React Native and TypeScript. It tracks habits only.

Data lives on the device in SQLite (Drizzle ORM). There is no backend.

## Getting started

```bash
npm install
npx expo start        # needs a dev-client build for native modules, not Expo Go
```

Use `npx expo install <package>` (not `npm install`) for Expo / React Native packages.

## Everyday commands

| Command | What it does |
|---|---|
| `make check` | The gate: Biome, `tsc`, Jest, tooling tests, architecture check. Also runs on pre-push |
| `npm test` | Jest only |
| `npm run lint` | Biome (no writes) |
| `npm run visual-check` | Renders every screen state on web and diffs against `docs/visual-baseline/` |
| `npm run e2e` | Maestro journeys in `e2e/` (needs a simulator) |
| `npm run mockups:render` | Renders the V3 design files to PNG slices + text in `docs/mockups/v3/renders/` |
| `npx drizzle-kit generate` | New migration after a schema change |

## Device validation

Renders every visual-check state, and drives the known-bug flows, on a real **iOS Simulator** build in GitHub Actions, so what the web build cannot show (SF Symbols, safe areas, the tab-bar pill and glass, fonts, Dynamic Type, sheets, toasts, gestures) can be looked at without sending screenshots. It is a validation tool, **not a gate**: manual only, it never runs on a push or a pull request. Design and trade-offs: `docs/decisions/007-device-validation.md`.

**Trigger** (the workflow file must be on the default branch for `gh workflow run` to find it):

```bash
gh workflow run ios-simulator.yml                                   # everything
gh workflow run ios-simulator.yml -f only="first-run today-v3"      # a few states
gh run watch                                                        # follow it
```

Inputs: `only` (state names), `device` (default `iPhone 16`, 393×852 pt like the web baselines), `ax_size` (default `accessibility-extra-extra-extra-large`; the web harness emulates AX3, `accessibility-extra-large`), `runner` (default `macos-26`).

**Download** (`gh run download <run-id>` gets everything; `-n <name>` one artifact):

| Artifact | What | Open |
|---|---|---|
| `contact-sheet` | each web baseline beside its simulator screenshot, the missing and not-reproducible states, thumbnails only | `index.html` |
| `shots-light`, `shots-dark`, `shots-ax-light`, `shots-ax-dark` | full-size PNGs named like `docs/visual-baseline/<state>.png` | |
| `videos` | one `.mp4` per flow, Maestro's screenshots and command logs, `summary.md` with timings | |
| `capture-log-<shard>` | `results.json` (what each state did), `log.txt`, the generated Maestro flows | |
| `build-log` | `xcodebuild.log`, only when the build fails | |

The job summary lists the runner image, Xcode, the simulator model and iOS runtime, and the counts.

**How a state is opened.** The build is made with `EXPO_PUBLIC_DEVICE_VALIDATION=1` (set only by the workflow; `src/lib/device-validation/device-validation.guard.test.ts` keeps it out of every other config). The driver writes `Documents/dev-state.json` (`{ route, clock }`) into the app's container and relaunches it; the app pins the clock, loads that route's `?fixtures=` scenario into SQLite from the same fixture generators the web repositories use (`src/modules/habits/dev/device-state.ts`) and opens the route. `habitsapp://dev-state?route=…&clock=…` does the same from a URL. Elsewhere the route redirects to Today and loads nothing.

**Add a state.** Add it to `scripts/visual-check/screens.mjs` as usual (a `route`, optional `clock`, optional `interact(page)`); the simulator run picks it up. `interact` is replayed through a recorder (`scripts/device-validation/plan.mjs`) that turns `getByText/getByRole/getByLabel/getByTestId`, `click`, `fill`, `waitFor`, `mouse.wheel` and `scrollIntoViewIfNeeded` into Maestro steps. A pointer drag (`mouse.down`), `locator.last().click()` and a key press in a field cannot be translated, and a few fixtures exist only on web (the migration screens, the loading and load-failure states, forced write failures): those states are listed as not reproducible, with the reason, by `node scripts/device-validation/plan.mjs`. A new fixture scenario needs nothing more than being in `habit-fixtures.ts`. A new flow goes in `scripts/device-validation/flows/` and in `flows.mjs`.

## Where to read more

- `CLAUDE.md` — working rules and the "when you touch X, read Y" table
- `docs/architecture.md` — folders, layers, patterns, stack (`src/modules/habits/README.md` and `scripts/README.md` for the short version)
- `docs/design-system.md` — tokens, components, variants
- `docs/feature-spec.md`, `docs/feature-spec-v2.md` — what each `HAB-<id>` ticket specifies
- `docs/feature-spec-v3.md` — V3 (HAB-26–50): habits only, three tabs, new Today / Progress / Habits
- `docs/design-system-v3.md` — V3 tokens and components (replaces V1/V2 values where it gives one)
- `docs/mockups/v3/README.md` — the V3 design files and their renders (`npm run mockups:render`)
- `docs/assessment-v3.md` — V3 impact per ticket, architecture review and batch plan
- `docs/decisions/` — architecture decision records (001–004, 006, 007; 006 is the V3 navigation shell, 007 the iOS Simulator device validation)
- `docs/CONTRIBUTING.md` — branches, commits, PRs, the gate, migrations, the feature flow
- `docs/dev-tooling.md` — hooks, checks, ratchets, visual-check setup
- `docs/backlog.md` — deferred work and deviations from the specs
- `docs/roadmap.md` — status
