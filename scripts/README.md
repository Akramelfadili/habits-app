# `scripts/`

Node scripts behind the `npm run` commands; details in `docs/how-to/dev-tooling.md`.

- `check-architecture.mjs` enforces the layer rules (allowlist may only shrink; tested by `check-architecture.test.mjs`).
- `check-repo-hygiene.mjs` fails on a tracked secret, log, archive, generated file or file over 1 MB.
- `check-doc-refs.mjs` fails on a doc that points at a missing path or "§ section" heading (tested by `check-doc-refs.test.mjs`).
- `token-ratchet-update.mjs` lowers the design-token baseline.
- `visual-check.mjs` (+ `visual-check/screens.mjs`, the list of screen states) renders and diffs every state on the web build.
- `e2e.mjs` runs the Maestro journeys in `e2e/`.
- `render-mockups.mjs` turns the V3 design files into PNG slices and text (`docs/mockups/v3/renders/`).
- `device-validation/` is the iOS Simulator run (CI only, needs macOS): `plan.mjs` (registry → what the simulator can open; `node scripts/device-validation/plan.mjs` prints the coverage), `boot-simulator.mjs`, `capture.mjs`, `record-flows.mjs` + `flows/` (Maestro flows for the known bugs), `contact-sheet.mjs`. Tested by `*.test.mjs` next to them.
- `lib/` holds what they share: the dev server and Chromium library path, and token counting.

Tooling tests run with `npm run test:tooling`.
