# Dev tooling — what runs, when

| Command | What it does | When |
|---|---|---|
| `make check` | `biome check .` (no writes) → `tsc --noEmit` → `tsc -p tsconfig.strict.json` (see "Strict project") → Jest → Jest perf tests (`make test-perf`, in band) → `node --test scripts/**/*.test.mjs` → `check-architecture` → `check-repo-hygiene` → `check-doc-refs` | by hand, and on every `git push` (`.husky/pre-push`, which adds `JEST_ARGS=--maxWorkers=2`; CI and a hand run use all cores) |
| `make check-repo-hygiene` (in `make check`) | `scripts/check-repo-hygiene.mjs`: fails if a tracked file is a secret/env/signing file, log, OS/editor file, archive, generated output, `ios/`, `android/` or `node_modules`, is over 1 MB outside a short allowlist, or contains a private-key header, AWS/Google/GitHub token shape or a literal `password = "..."` | every `make check` |
| `make check-doc-refs` (in `make check`) | `scripts/check-doc-refs.mjs`: fails if a backticked path or markdown link in a tracked `.md`, `CLAUDE.md` or `.claude/` points at a file that does not exist, or a `` `path` § "Heading" `` / `→ "Heading"` reference names a heading the file lacks. Skips URLs, anchors, globs, `<placeholders>`, and `docs/archive/`; exceptions are in the script's `ALLOWLIST` (it only shrinks). Tested by `check-doc-refs.test.mjs` | in `make check` |
| `make check-comment-refs` (in `make check`) | `scripts/check-comment-refs.mjs`: fails if a code comment or a test title (the string of a `describe`, `it` or `test`) in `src/` or `scripts/` has a ticket ID (`HAB-` plus digits) or a spec-version word (V1, V2, V3). Known hits: `scripts/check-comment-refs.allowlist.json` (`{path: count}`, may only shrink; empty today) | every push |
| `make comment-report` | `scripts/comment-report.mjs`: the 15 files with the highest comment ratio and the comment lines per folder (report only, not in `make check`) | before a comment cleanup |
| `.github/workflows/secret-scan.yml` / `make secrets` | gitleaks (pinned version, SHA-256 verified, `--redact`, full history, config `.gitleaks.toml`). Bump version and hash together | every pull request and push to `master`; locally with `make secrets` |
| `make clean` / `make clean-all` | `git clean -fdX` on explicit ignored paths only (dry-run listing first). `clean-all` adds `.expo` and the mockup PNGs (re-run `npm run mockups:render`) | by hand |
| `npm run lint` / `make lint-check` / `make lint` | `npm run lint` and `make lint-check` are Biome **without writes** (what `make check` runs); `make lint` is `biome check --write .` and **rewrites files** | by hand |
| `.github/workflows/check.yml` | `npm ci` → `make check-ci` (`make check` + `make test-slow` + `make test-tz`) on Node from `.nvmrc` (npm cache) | every pull request and every push to `master` |
| `make coverage` (`npm run coverage`) | Jest with coverage (`collectCoverageFrom`: `src/**` minus tests, `test-support` and `*.d.ts`) and the floors in `package.json` → `coverageThreshold`: global 96 % lines / 90 % branches / 93 % functions (Jest computes "global" without the two folders that have their own floor, so it is below the 94.2 % overall), 98 % lines for `modules/habits/domain/` and `modules/habits/strategies/`. Fails under a floor. **Thresholds may only go up**: raise them when a batch lifts the numbers, never lower one to make a run pass (add the missing test). Output goes to the gitignored `coverage/` | by hand; CI job `coverage`. Not in `make check` (a coverage run is about twice as slow) |
| `.github/workflows/check.yml` job `coverage` | `npm ci` → `make coverage`, in parallel with `check` and `release-bundle`; not part of `make check-ci`; coverage output is not uploaded or committed | every pull request and push to `master` |
| `.github/workflows/check.yml` job `release-bundle` | `npm ci` → `make release-check` (production iOS export, dev-only code scan, bundle-size ratchet; `docs/how-to/release.md`) | in parallel with `check`, same triggers |
| `.github/workflows/ios-simulator.yml` (manual) | builds the app for the iOS Simulator, opens every visual-check state on it (`scripts/device-validation/`), records the flows in `scripts/device-validation/flows/` on video and writes a web-vs-simulator contact sheet | `gh workflow run ios-simulator.yml`; never on a push or PR. See `docs/how-to/device-validation.md` and ADR 007 |
| `npm run test:perf` (`make test-perf`) | only the `*.perf.test.ts(x)` timing tests, in band (`--runInBand`), after the main Jest run, so parallel workers cannot skew their thresholds. The default run ignores them. Thresholds are unchanged | every `make check` and pre-push |
| `npm run test:slow` (`make test-slow`) | only the `*.slow.test.ts(x)` files, which the default Jest run ignores (`testPathIgnorePatterns` in `package.json`). Today: `per-week-frequency.equivalence.slow.test.ts` (~25 s) | CI (`make check-ci`); by hand when you touch the code it covers. Not in `make check` / pre-push |
| `make test-tz` | the domain, `src/utils` and `src/test-support` tests again with `JEST_TZ` = UTC, Europe/Paris and Pacific/Auckland (`make test` runs in America/Los_Angeles); see "Time zones in tests" below | CI (`make check-ci`); by hand after date changes. Not in `make check` / pre-push |
| `.husky/pre-commit` | `biome check --staged --no-errors-on-unmatched` only: the staged files, **no writes**, so the commit holds exactly what was checked (fix with `make lint` or the format hook, then re-stage) | every `git commit` |
| Claude Code `PostToolUse` → `.claude/hooks/format.sh` | Biome-fixes the single file that was just edited with Edit/Write | after every Edit/Write |
| Claude Code `Stop` → `.claude/hooks/verify.sh` | on a dirty tree: (`tsc --incremental` and the strict project if a `.ts`/`.tsx` file changed) → `check-architecture` → (`test:tooling` if `scripts/` changed) → `jest --onlyChanged`; exit 2 blocks the stop. Skipped on a clean tree, when only `*.md` or `docs/` changed, and when `stop_hook_active` | when Claude finishes a turn |
| `npm run check-architecture` | the architecture rules below | part of all of the above |
| `npm run deadcode` / `deadcode:all` | knip: unused files, exports, dependencies (**report only**, not in `make check`) | before cleanup PRs |
| `npm run ratchet:update` | rewrites `src/theme/token-ratchet.baseline.json` to the current (lower) counts | after removing design-token escapes |
| `VC_AUDIT=1 npm run visual-check` | the same run, plus `.visual-checks/audit/<state>.json`: every pressable's rendered size and every text that is truncated or clipped by its box. react-native-web ignores `hitSlop`, so a size under 44 is a finding only when no slop makes up the difference (see the guard below) | the V3-6 touch-target and Dynamic Type audits; whenever a layout changes at AX sizes |
| `src/components/ui/touch-targets.guard.test.ts` (in `make check`) | reads every `Pressable` / `Touchable*` in `src/` and fails unless its style and `hitSlop` prove 44 × 44 pt, or it has a reasoned exception in the file; a stale exception fails too | every Jest run |
| `npm run visual-check` | renders every screen/state on web (2 pages at a time), diffs vs `docs/visual-baseline/`; a state that differs or errors is re-captured once before it is reported | per feature; never gate commits on it |
| `src/lib/db/migrations.safety.test.ts` (in `make check`) | journal / snapshot / file parity, every migration step upgraded from a seeded DB with FK on and off, a committed V1-era DB (`src/lib/db/__fixtures__/v1-era-0008.sql`) upgraded to HEAD, and a drizzle-kit drift check against `schema.ts` | every Jest run |

## Strict project (`tsconfig.strict.json`)

`tsconfig.json` is `strict` plus `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters` and `noImplicitOverride`. `tsconfig.strict.json` extends it with **`noUncheckedIndexedAccess`**, so `items[i]` is `T | undefined` and a computed-offset off-by-one fails the build, not a release. It runs as `make typecheck-strict` (inside `make check`, about 4 s warm, 10 s cold, incremental via `tsconfig.strict.tsbuildinfo`) and in the Stop hook whenever a `.ts`/`.tsx` file changed.

**Exclusions** (one commented list in the file, which may only shrink): `**/*.test.ts(x)` and `**/test-support/**`, about 400 errors, mostly `result[0]` after an assertion (counts in `docs/backlog.md`). `exclude` only removes *root* files: a file that production code imports is checked anyway, which is why the dev fixtures are fixed, not excluded.

**To shrink the list:** delete one pattern (or narrow it to a folder), run `npx tsc -p tsconfig.strict.json --noEmit`, fix every error, run that folder's tests, commit. Fix with narrowing or an early return; `atIndex(items, i)` for a list built to be long enough (fixed-size grids, cells aligned with a date list: it throws a `RangeError` naming the index); `present(value, "what")` for a row an INSERT/UPDATE returns; `Array.at()` with a guard. No blanket `!` and no `as` to silence it; a `!` needs a one-line comment saying why it cannot be undefined.

**Parked flags** (not on, counts in `docs/backlog.md` § Parked): `noPropertyAccessFromIndexSignature` (style only) and `exactOptionalPropertyTypes`.

## Floating promises (Biome `nursery/noFloatingPromises`)

On as an error in `biome.json` (Biome 2.5; type-aware, so `biome check` takes a few seconds longer). A promise is awaited, returned, handled with `.catch`, or deliberately dropped with `void` and a one-line comment saying why that is safe. Never silence it with a `biome-ignore`. In tests, `await` `fireEvent.*` and `act(...)`.

## `check-architecture` rules (`scripts/check-architecture.mjs`)

`drizzle-placement` · `live-query-placement` · `module-isolation` · `layer-order` (repositories/strategies/dev ← domain ← services ← presenters ← hooks ← components ← screens; `domain/` never imports repositories or `dev/`) · `hook-naming` · `thin-routes` (≤ 20 lines, imports only module screens / shared UI / expo-router / react; `_layout.tsx` exempt) · `colocated-tests` · `web-twin` · `hex-colour` · `date-args` (`new Date(<args>)`) · `no-dev-in-ui` (hooks, components, screens, presenters and routes never import `dev/`; the removed seed, clear and reset helpers and "(dev)" labels stay out of production code).

Known violations are in `scripts/check-architecture.allowlist.json`. **Entries may only be removed**: a new violation fails, and an entry that no longer matches a violation also fails ("remove it"). Regenerate the full list (to review) with `node scripts/check-architecture.mjs --print-allowlist`. The rules themselves are tested by `scripts/check-architecture.test.mjs` (`npm run test:tooling`) — Jest's testMatch does not run `.mjs`, so that is a separate `node --test` step.

Biome's `style/noRestrictedImports` (in `biome.json`) additionally flags Drizzle / `@/lib/db/client` / `@/lib/db/schema` imports in the editor, outside `repositories/`, `src/lib/db/`, tests and `drizzle.config.ts`.

## Comments

Write only the why: a constraint, a workaround (and for what), an invariant, a surprising choice, a platform quirk, or a link to the ADR that explains a deviation. No comment that restates the code or the name below it, no banners or file headers, no "was previously" history, no spec versions or ticket IDs in code or test titles (a deviation from a spec or mockup is explained in plain words: what the mockup shows and why the code differs). Tool directives (`biome-ignore`, `@ts-expect-error`, `@jest-environment`, `/// <reference>`) stay. `make check-comment-refs` enforces the last rule; `make comment-report` shows where comments pile up.

## Design-token ratchet (`src/theme/token-ratchet.guard.test.ts`)

Counts raw colours (hex/rgba/oklch/'white'/'black'), shadow/elevation, `fontSize`/`lineHeight` literals and `fontWeight` other than 500/600 outside `src/theme`. Count **up** → fails (use a token). Count **down** → fails with "lower the baseline" → `npm run ratchet:update`.

Since V3-0b it also counts (lines, like the others):

| Key | What | Use instead | Baseline now (`token-ratchet.baseline.json`) |
|---|---|---|---|
| `spacing-literals` | non-zero numeric `padding*`, `margin*` (negative too), `gap`/`rowGap`/`columnGap` | `space[…]` (F-04) | 2 |
| `radius-literals` | non-zero numeric `border*Radius` | `radius.*`, `cellRadius()`, `squareRadius()` (F-05) | 4 |
| `letter-spacing-literals` | non-zero numeric `letterSpacing` | `letterSpacing.label` / `.eyebrow` (F-03) | 0 |
| `off-scale-font-sizes` | `fontSize` 10 / 10.5 / 11 / 11.5 / 12.5, and `typeScale.micro` / `.caption` / `.subtitle` (deleted in batch 20; the pattern stays as a guard) | a `textStyles` style (F-03) | 0 |

An off-scale literal (`fontSize: 11`) counts under both `font-size-literals` and `off-scale-font-sizes`. Two literals on one line count once. `0` is not counted (a reset, not a step); sizes (`width`/`height`) are not counted (no size scale). The V3 assessment's "~394" figure (`docs/archive/assessment-v3.md`) counted spacing *and* sizes, and the baseline was 274 + 55 + 56 when the keys were added in V3-0b; the screens have since moved onto the tokens, and each batch lowers these numbers with `npm run ratchet:update`. That script refuses a key the baseline does not have yet: a new key is added to the baseline by hand, in the commit that introduces it.

## Chromium on the WSL dev box (visual-check)

The WSL box is Ubuntu 20.04 with no sudo:

1. `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu22.04-x64 npx playwright install --only-shell chromium`
2. Chromium's missing system libraries are unpacked without root via `apt-get download <pkg>` + `dpkg-deb -x <deb> ~/.cache/ms-playwright/extra-libs/`. `scripts/lib/dev-server.mjs` adds that directory to `LD_LIBRARY_PATH` automatically.

Known web-only artifacts, not bugs: SF Symbols (`expo-symbols`) render nothing on web (blank icon squares, missing chevrons/tab icons), the system font falls back to a non-SF font, safe-area insets are zero, native stack/modal chrome differs.

### The tab bar in every baseline (HAB-27)

The floating pill is on every screen inside the tabs, so every baseline shows
it and every scrolling screen gained the 112 pt bottom padding — a V3-1 change
re-captured the whole set at once. `?textSize=ax` (dev + web only,
`src/lib/dev-text-size/`) forces the AX fallback to bar A, because
react-native-web always reports `fontScale: 1` and the real Dynamic Type
setting can never reach the app there.

Routes name their tab group (`/(progress)/progress`) so a cold load lands on the
right tab; a plain `/week` would open inside Today.

### Dynamic Type on web (V3-6)

react-native-web has no Dynamic Type, so `?textSize=ax` only switches the layouts to their accessibility variants. For a state whose route says `textSize=ax` the harness also scales every text element to the 08.6a AX3 sizes (display 52, stat 48, title 43, body-lg 40, body 38, callout/subhead 36, footnote 33, caption 32), so clipping and overlap show up in the capture and in `VC_AUDIT` reports. It leaves alone what the app holds fixed (tab-bar labels, week-matrix day letters and cell numbers) and caps the inline bar and header pills at 1.3x like `barMaxFontMultiplier`. Add a state with `AX_VARIANTS` in `screens.mjs`; the emulation is the harness's, not the app's, so a real device at AX1–AX5 is still a device check.

### The page clock (V3-2a)

The harness starts the page's clock at each state's pinned moment with `page.clock.setSystemTime` and lets it run. It must not use `setFixedTime`: that froze React's own clock, so a lazily loaded route never got past its Suspense fallback ("Bundling…") and every such state was captured blank (V3-1 committed ~33 of them). A state may list `ignoreErrors` (regexes) for a known web-only console error. When you recapture, look at the images, not only the diff count: a blank capture equals a blank baseline.

### Failure states (audit B6)

`?fixtures=migration-fails` (every attempt fails) and `?fixtures=migration-fails-once` (Retry recovers) make the web `DatabaseProvider` show the error screen; `?failWrites=1` makes every web fixture write fail (`write-failure-fixtures.ts`), which renders the error toast, the toast inside a sheet and the New habit error banner. The logger mirrors to `console.log`, so a handled failure never trips the harness's `console.error` check (or raises LogBox in development).

### Test naming

A test mirrors its source file (`x.ts` + `x.test.ts`). A variant for one aspect adds a suffix: `x.web.test.ts`, `x.live.test.ts` (live-query behaviour), `x.<aspect>.test.ts` (e.g. `category-repository.migration.test.ts`). Tests that cross files, like `src/lib/db/migrations.safety.test.ts`, are named for what they guard. A test that is slow by design (randomised or exhaustive) ends in `.slow.test.ts` so the gate skips it and only CI runs it (see the table above).

`src/lib/db/test-db.ts`'s `createTestDb({ onWrite: notifyTableChanged })` plus the live-query stand-in lets a screen test drive the real hooks over an in-memory database (`today-screen.db.test.tsx`).

Tests that depend on "today" fake `Date` (`jest.useFakeTimers({ now, doNotFake: [...] })`, see `entry-repository.web.test.ts`) so a run that crosses midnight can't flake. `mockMeasureInWindow` (`modules/habits/test-support/`) answers `measureInWindow` for components that wait for a measurement.

### Time zones in tests

Jest runs in one fixed zone, whatever the machine's: `jest.global-setup.js` sets `TZ` to **America/Los_Angeles** (a negative offset, different from CI's UTC and from a European laptop). `JEST_TZ=<zone>` overrides it for a whole run; `make test-tz` uses that for UTC, Europe/Paris and Pacific/Auckland. Build local days with `new Date(2026, 8, 1)` or `fromDayKey("2026-09-01")`, never `new Date("2026-09-01")` or a `…T00:00:00Z` string: those are UTC instants, the evening before in Los Angeles.

One test in another zone: `withTimeZone(zone, fn)` (also async), or `inTimeZoneEachTest(zone)` in a `describe`, from `src/test-support/time-zone.ts`. Assigning `process.env.TZ` inside a test does **nothing** (Jest hands each file a copy of `process.env`); the helpers go through a hook that `jest.environment.js` (jest-expo's environment plus that hook) exposes from the real process, and the zone is restored when the file ends. Create dates inside `fn` or the test, not in the describe body. `dstTransitionDays(zone, year)` returns a zone's clock-change days from Intl, so tests never hard-code DST dates. The matrix over UTC, Paris, Sao Paulo, Los Angeles and Auckland is `src/modules/habits/domain/date-zones.test.ts`.

Day-by-day walks step with `nextDay` (`src/utils/day-key.ts`), not bare `addDays`: where DST starts at midnight (Sao Paulo until 2019, Santiago, Havana) that day begins at 01:00 and `addDays` would carry the 01:00 forward. Week bounds come from `src/utils/week-window.ts`.

## Testing

What a new test should reach for. The test-naming and time-zone rules are in the two subsections above ("Test naming", "Time zones in tests").

**Zones.** Jest runs in America/Los_Angeles; a test that cares about another zone uses `withTimeZone` and takes `TEST_ZONES` from `src/test-support/time-zone.ts`. Anything that walks days, weeks or years gets the five-zone treatment, not only the default one.

**Property tests** (`*.property.test.ts`, fast-check, a dev dependency). They state an invariant over random inputs and shrink a failure to a small counterexample; they run in the default `make check`, so each uses 100–200 runs (`PROPERTY_RUNS` in `src/modules/habits/test-support/habit-arbitraries.ts`, fewer for the year map) and all four files together add about 5 s of file time (3 s of wall time in a parallel run). Where they are: day keys (`src/utils/day-key.property.test.ts`), the Monday–Sunday week (`src/utils/week-window.property.test.ts`), the three frequency strategies against a plain reference (`src/modules/habits/strategies/frequency-strategies.property.test.ts`), and rates, streaks and the year map (`src/modules/habits/domain/history.property.test.ts`). Seeds are random per run, so a red run is a find, not a flake: the output prints the seed and the shrunk case; paste it into a normal example test (`fc.assert(..., { seed, path })` replays it) and fix or record it. `per-week-frequency.equivalence.slow.test.ts` stays because it also pins the history and summary functions; the property over the strategies does not replace it. Arbitraries build a habit and its log from plain numbers (`historyArb`, `buildHistory`); add a new rule's generator there.

**Builders** (`src/modules/habits/test-support/habit-builder.ts`). `makeHabit`, `makeHabitInput`, `makeCategory`, `makeEntry`, `makeFreeze`, and the frequency literals `daily()`, `weekdays(1, 3, 5)`, `perWeek(3)`. Start from them and override only what the test is about, so a field added to `Habit`, `Entry` or `FrozenDay` is one edit. Do not write `frequency: { type: ... }` or a full `Entry` literal in a test.

**Time budgets.** The whole default run is about 50 s on this box (4 workers, warm cache; 107 s with a cold transform cache). The median test file takes 0.2 s and none of the 3,500 tests takes 5 s. A test over 5 s alone is a finding: look for real timers, `waitFor` polling, an unmocked animation or a large fixture in `beforeEach` before anything else. Never raise `testTimeout` (15 s) or skip a test to make a run pass. `package.json` caps Jest at `"maxWorkers": "50%"`: the default of cores minus one (7 here) oversubscribed the 8 GB machine and took 94 s against 51 s. The React Compiler is not in the Jest transform (babel-jest does not tell `babel-preset-expo` the compiler is supported), so screen tests do not pay for it.

**Measuring.** Run the whole suite once with a JSON report written outside the repo, never piped or redirected:

```sh
npx jest --maxWorkers=2 --json --outputFile=<a file outside the repo>
```

Then read `testResults[].endTime - startTime` per file and `assertionResults[].duration` per test, and the wall time as the last `endTime` minus `startTime`. `--no-cache` gives the cold-cache figure. `--detectOpenHandles` runs in band and is slow (about 85 s for five files); use it on named files, not the suite.
