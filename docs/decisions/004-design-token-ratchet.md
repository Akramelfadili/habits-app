# 004 — Design tokens are enforced by a ratchet, not a big-bang migration

Status: accepted · Sources: `docs/how-to/dev-tooling.md` ("Design-token ratchet"), `docs/audits/audit.md` A4-01…A4-03, A8-15, §13 "Proposed design-token lint" · Landed: audit batches B1–B3 (`1573646`)

## Context

CLAUDE.md rule 10 says colours, shadows and font sizes and weights come from `src/theme` tokens. The audit found the rule was only partly true:
- 25 `fontSize` literals and off-scale sizes (A4-02);
- two raw colours (A4-03);
- no spacing, radius or shadow scale at all, with ~270 padding/margin/gap and 80+ `borderRadius` literals (A4-01).

Rewriting every literal at once would touch most screens and every visual baseline, with no behaviour to show for it.

## Decision

A Jest guard, `src/theme/token-ratchet.guard.test.ts`, counts escapes outside `src/theme` using `scripts/lib/token-counts.cjs`:
- raw colours (hex, rgba, oklch, `'white'`, `'black'`);
- shadow and elevation;
- `fontSize` and `lineHeight` literals;
- `fontWeight` other than 500 and 600.

It compares the counts with the committed `src/theme/token-ratchet.baseline.json`:
- **Count goes up:** the test fails; use a token instead.
- **Count goes down:** the test also fails, with "lower the baseline". `npm run ratchet:update` then locks in the lower number.

The count may only go down. Separately, `check-architecture`'s `hex-colour` rule flags hex colours, with an allowlist that can only shrink.

## Consequences

- New escapes are blocked from the day of the change, and old ones disappear as files are touched, with no migration batch.
- **Spacing and radius were not counted at first**, because no tokens existed to point to (A4-01); the V3 assessment counted 394 spacing and size literals.
- **V3-0b (update):** the `space` and `radius` tokens exist now (F-04, F-05), and the ratchet counts three more keys:
  - `spacing-literals`: 274 at the start;
  - `radius-literals`: 55;
  - `off-scale-font-sizes`: 56. These are the V3-retired sizes 10, 10.5, 11, 11.5 and 12.5, as literals or through `typeScale.micro/caption/subtitle`; a literal is also counted under `font-size-literals`.

  Zero values and width/height are not counted. The screens move onto the tokens batch by batch during V3 rather than in one sweep, which is the same reasoning as the original decision. Details are in `docs/how-to/dev-tooling.md`.
- The baseline is a file in the repo. Lowering it is a deliberate commit, so reviewers see token progress in diffs.
- About 32 test files assert raw style values (A10-08). They change when the tokens land, separately from the ratchet.
