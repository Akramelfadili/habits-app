# `scripts/`

Node scripts behind the `npm run` commands; details in `docs/dev-tooling.md`.

- `check-architecture.mjs` enforces the layer rules (allowlist may only shrink; tested by `check-architecture.test.mjs`).
- `token-ratchet-update.mjs` lowers the design-token baseline.
- `visual-check.mjs` (+ `visual-check/screens.mjs`, the list of screen states) renders and diffs every state on the web build.
- `e2e.mjs` runs the Maestro journeys in `e2e/`.
- `render-mockups.mjs` turns the V3 design files into PNG slices and text (`docs/mockups/v3/renders/`).
- `lib/` holds what they share: the dev server and Chromium library path, and token counting.

Tooling tests run with `npm run test:tooling`.
