# Dev tooling — what runs, when

| Command | What it does | When |
|---|---|---|
| `make check` | `biome check .` (no writes) → `tsc --noEmit` → Jest → `node --test scripts/**/*.test.mjs` → `check-architecture` | by hand, and on every `git push` (`.husky/pre-push`) |
| `.github/workflows/check.yml` | `npm ci` → `make check` on Node from `.nvmrc` (npm cache) | every pull request and every push to `master` |
| `.husky/pre-commit` | `biome check --write .` only (fast on purpose) | every `git commit` |
| Claude Code `PostToolUse` → `.claude/hooks/format.sh` | Biome-fixes the single file that was just edited with Edit/Write | after every Edit/Write |
| Claude Code `Stop` → `.claude/hooks/verify.sh` | on a dirty tree: `tsc --incremental` → `check-architecture` → (`test:tooling` if `scripts/` changed) → `jest --onlyChanged`; exit 2 blocks the stop. Skipped on a clean tree and when `stop_hook_active` | when Claude finishes a turn |
| `npm run check-architecture` | the architecture rules below | part of all of the above |
| `npm run deadcode` / `deadcode:all` | knip: unused files, exports, dependencies (**report only**, not in `make check`) | before cleanup PRs |
| `npm run ratchet:update` | rewrites `src/theme/token-ratchet.baseline.json` to the current (lower) counts | after removing design-token escapes |
| `npm run visual-check` | renders every screen/state on web (2 pages at a time), diffs vs `docs/visual-baseline/`; a state that differs or errors is re-captured once before it is reported | per feature; never gate commits on it |
| `src/lib/db/migrations.safety.test.ts` (in `make check`) | journal / snapshot / file parity, every migration step upgraded from a seeded DB with FK on and off, a committed V1-era DB (`src/lib/db/__fixtures__/v1-era-0008.sql`) upgraded to HEAD, and a drizzle-kit drift check against `schema.ts` | every Jest run |

## `check-architecture` rules (`scripts/check-architecture.mjs`)

`drizzle-placement` · `live-query-placement` · `module-isolation` · `layer-order` (repositories/strategies ← services ← hooks ← components ← screens) · `hook-naming` · `thin-routes` (≤ 20 lines, imports only module screens / shared UI / expo-router / react; `_layout.tsx` exempt) · `colocated-tests` · `web-twin` · `hex-colour` · `date-args` (`new Date(<args>)`).

Known violations are in `scripts/check-architecture.allowlist.json`. **Entries may only be removed**: a new violation fails, and an entry that no longer matches a violation also fails ("remove it"). Regenerate the full list (to review) with `node scripts/check-architecture.mjs --print-allowlist`. The rules themselves are tested by `scripts/check-architecture.test.mjs` (`npm run test:tooling`) — Jest's testMatch does not run `.mjs`, so that is a separate `node --test` step.

Biome's `style/noRestrictedImports` (in `biome.json`) additionally flags Drizzle / `@/lib/db/client` / `@/lib/db/schema` imports in the editor, outside `repositories/`, `src/lib/db/`, tests and `drizzle.config.ts`.

## Design-token ratchet (`src/theme/token-ratchet.guard.test.ts`)

Counts raw colours (hex/rgba/oklch/'white'/'black'), shadow/elevation, `fontSize`/`lineHeight` literals and `fontWeight` other than 500/600 outside `src/theme`. Count **up** → fails (use a token). Count **down** → fails with "lower the baseline" → `npm run ratchet:update`.

## Chromium on the WSL dev box (visual-check)

The WSL box is Ubuntu 20.04 with no sudo:

1. `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu22.04-x64 npx playwright install --only-shell chromium`
2. Chromium's missing system libraries are unpacked without root via `apt-get download <pkg>` + `dpkg-deb -x <deb> ~/.cache/ms-playwright/extra-libs/`. `scripts/lib/dev-server.mjs` adds that directory to `LD_LIBRARY_PATH` automatically.

Known web-only artifacts, not bugs: SF Symbols (`expo-symbols`) render nothing on web (blank icon squares, missing chevrons/tab icons), the system font falls back to a non-SF font, safe-area insets are zero, native stack/modal chrome differs.

### Menu states (`today-menu-open*`)

These used to flicker (a popover 74 px lower, audit A10-10) because the popover's anchor was measured after it mounted, and the capture waited a fixed 400 ms. Fixed at the root: `TodayHeader` measures the ⋯ button *before* opening, so `NavMenu` mounts once at its final position, and `waitForMenuSettled` (`scripts/visual-check/screens.mjs`) polls until the popover sits 8 px under the button and has not moved for three frames — it throws, rather than capturing, if it never does. Use it for any new state that opens `NavMenu`. These baselines are ordinary baselines again: recapture them when the menu legitimately changes.

### Failure states (audit B6)

`?fixtures=migration-fails` (every attempt fails) and `?fixtures=migration-fails-once` (Retry recovers) make the web `DatabaseProvider` show the error screen; `?failWrites=1` makes every web fixture write fail (`write-failure-fixtures.ts`), which renders the error toast, the toast inside a sheet and the New habit error banner. The logger mirrors to `console.log`, so a handled failure never trips the harness's `console.error` check (or raises LogBox in development).

### Test naming

A test mirrors its source file (`x.ts` + `x.test.ts`). A variant for one aspect adds a suffix: `x.web.test.ts`, `x.live.test.ts` (live-query behaviour), `x.<aspect>.test.ts` (e.g. `category-repository.migration.test.ts`). Tests that cross files, like `src/lib/db/migrations.safety.test.ts`, are named for what they guard.

Tests that depend on "today" fake `Date` (`jest.useFakeTimers({ now, doNotFake: [...] })`, see `entry-repository.web.test.ts`) so a run that crosses midnight can't flake. `mockMeasureInWindow` (`modules/habits/test-support/`) answers `measureInWindow` for components that wait for a measurement.
