# How to: device validation

Renders every visual-check state, and drives the known-bug flows, on a real **iOS Simulator** build in GitHub Actions, so what the web build cannot show (SF Symbols, safe areas, the tab-bar pill and glass, fonts, Dynamic Type, sheets, toasts, gestures) can be looked at without sending screenshots. It is a validation tool, **not a gate**: manual only, it never runs on a push or a pull request. Design and trade-offs: `docs/decisions/007-device-validation.md`.

## Trigger

The workflow file must be on the default branch for `gh workflow run` to find it.

```bash
gh workflow run ios-simulator.yml                                   # everything
gh workflow run ios-simulator.yml -f only="first-run today-v3"      # a few states
gh run watch                                                        # follow it
```

Inputs: `only` (state names), `device` (default `iPhone 16`, 393×852 pt like the web baselines), `ax_size` (default `accessibility-extra-extra-extra-large`; the web harness emulates AX3, `accessibility-extra-large`), `runner` (default `macos-26`).

## Download

`gh run download <run-id>` gets everything; `-n <name>` one artifact.

| Artifact | What | Open |
|---|---|---|
| `contact-sheet` | each web baseline beside its simulator screenshot, the missing and not-reproducible states, thumbnails only | `index.html` |
| `shots-light`, `shots-dark`, `shots-ax-light`, `shots-ax-dark` | full-size PNGs named like `docs/visual-baseline/<state>.png` | |
| `videos` | one `.mp4` per flow, Maestro's screenshots and command logs, `summary.md` with timings | |
| `capture-log-<shard>` | `results.json` (what each state did), `log.txt`, the generated Maestro flows | |
| `build-log` | `xcodebuild.log`, only when the build fails | |

The job summary lists the runner image, Xcode, the simulator model and iOS runtime, and the counts.

## How a state is opened

The build is made with `EXPO_PUBLIC_DEVICE_VALIDATION=1` and `APP_VARIANT=production` (both set only by the workflow; the second keeps the `habitsapp` scheme, because an unset variant means the dev scheme `habitsapp-dev`, and `app.config.ts` takes the throwaway bundle id `BUNDLE_ID` from the workflow only for this build; `src/lib/device-validation/device-validation.guard.test.ts` keeps it out of every other config). The driver writes `Documents/dev-state.json` (`{ route, clock }`) into the app's container and relaunches it; the app (this code is required behind an inline `EXPO_PUBLIC_DEVICE_VALIDATION === "1"` check, so a normal build does not contain it; `make release-check` fails if it does) pins the clock, loads that route's `?fixtures=` scenario into SQLite from the same fixture generators the web repositories use (`src/modules/habits/dev/device-state.ts`) and opens the route. `habitsapp://dev-state?route=…&clock=…` does the same from a URL. Elsewhere the route redirects to Today and loads nothing.

## Add a state

Add it to `scripts/visual-check/screens.mjs` as usual (a `route`, optional `clock`, optional `interact(page)`); the simulator run picks it up. `interact` is replayed through a recorder (`scripts/device-validation/plan.mjs`) that turns `getByText/getByRole/getByLabel/getByTestId`, `click`, `fill`, `waitFor`, `mouse.wheel` and `scrollIntoViewIfNeeded` into Maestro steps. A pointer drag (`mouse.down`), `locator.last().click()` and a key press in a field cannot be translated, and a few fixtures exist only on web (the migration screens, the loading and load-failure states, forced write failures): those states are listed as not reproducible, with the reason, by `node scripts/device-validation/plan.mjs`. A new fixture scenario needs nothing more than being in `habit-fixtures.ts`. A new flow goes in `scripts/device-validation/flows/` and in `flows.mjs`.
