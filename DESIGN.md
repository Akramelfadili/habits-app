# Design

Entry point for anyone changing how the app looks or behaves on screen. The values live in `docs/design-system-v3.md` (V3) and `docs/design-system.md` (V1/V2, with its **Deltas** section); this file says which rules exist and what enforces them.

## Principles

From the V3 design system and spec (`docs/design-system-v3.md` "Principles", `docs/specs/feature-spec-v3.md` D1–D15):

- Habits only, three tabs (Today, Progress, Habits). One purpose per screen; short-lived things are sheets.
- **One accent.** Each colour means one thing: amber = Break habits and warnings, violet = freezes, red = destructive actions and errors, category hue = identity (icon squares and dots only).
- Calm and forgiving: flat surfaces (no shadow on a card), language is "resisted / slipped", never "failed"; a mistake is undoable (Undo toast, "Archive instead" before Delete). Toasts report events, banners describe lasting states.
- Motion confirms an action and never decorates.

## Tokens

Colour, spacing, radius, type size and weight, elevation and motion come from `src/theme/theme.ts` (`surfaceColors`, `semanticColors`, `textStyles`, `space`, `radius`, `elevation`, `motion`), read in components through `useTheme()` (`src/theme/use-theme.ts`).

| Rule | Enforced by |
|---|---|
| No raw colours, shadows, `fontSize`/`lineHeight` literals, `fontWeight` other than 500/600, non-zero spacing or radius literals, off-scale font sizes outside `src/theme`; counts may only go down | `src/theme/token-ratchet.guard.test.ts` against `src/theme/token-ratchet.baseline.json` (`npm run ratchet:update` lowers it; ADR 004) |
| No hex colour in app code | `hex-colour` rule of `npm run check-architecture` |
| Text ≥ 4.5:1 and non-text ≥ 3:1 for the palette | `src/theme/contrast.test.ts` |

## Components

- Shared UI is in `src/components/ui/primitives` (one element: button, chip, toggle…) and `src/components/ui/composite` (assembled: sheet, banner, list item, header buttons…). Module-specific components stay in the module.
- **Reuse before create:** search both folders first, then extend, then create in `components/ui/` with every documented state. No raw styled `Pressable`/`View`/`Text` for an element the design system documents. This is a review rule (`CLAUDE.md` rule 10); only the token part is mechanical (above).
- Header buttons only from `src/components/ui/composite/header-buttons.tsx`: `src/components/ui/composite/header-buttons.guard.test.ts` fails if any other file sets a `header*` button option (iOS 26 Liquid Glass).
- Every scrolling screen inside the tabs ends with `TAB_BAR_BOTTOM_PADDING` (the bar overlays content). Convention, no guard; `tab-bar-pill.test.tsx` pins the constant.

## Theme and dark mode

Every token has a light and a dark value. The Appearance setting (Light, Dark, System) resolves against the OS in `useTheme()`. Check both: `npm run visual-check` renders each state light and dark. A new colour needs both values and its contrast figures.

## Accessibility

| Rule | Enforced by |
|---|---|
| Every `Pressable` proves a 44 × 44 pt hit area from its style and `hitSlop`, or has a reasoned exception | `src/components/ui/touch-targets.guard.test.ts` (stale exceptions fail too); `VC_AUDIT=1 npm run visual-check` measures rendered sizes |
| Text scales with Dynamic Type up to AX3 (`textStylesAx3`); the bar title and header pills stop at 1.3x (`barMaxFontMultiplier`) | The `-ax` visual-check states run with `?textSize=ax`; real AX1–AX5 is a device check |
| Minimum text 12 pt | The off-scale font-size ratchet (blocks 10, 11, 12.5) |
| Reduce Motion: no scale or slide, crossfade or jump instead | `useReducedMotion` (`src/utils/use-reduced-motion.ts`); each component's test. No global guard |
| VoiceOver lands on the title when a screen is entered | `ScreenHeader` / `useInitialFocus` (`src/utils/use-initial-focus.ts`). Convention, no guard: a new pushed screen must use one |
| Colour is never the only signal (shape, glyph or words too) | Design rule, checked by review and the mockups. No guard |

## Mockups

The V3 design files are `docs/mockups/v3/*.dc.html`; the master `Habits V3.dc.html` wins when anything disagrees. Their text and frame index are generated: `npm run mockups:render` writes `docs/mockups/v3/renders/INDEX.md` (frame id → section) and `<section>/text.txt` (commit these); the PNG slices are gitignored. V1/V2 mockups exist only at git tag `mockups-v1-v2`.

Values and components: `docs/design-system-v3.md`, `docs/design-system.md`, `docs/mockups/v3/README.md`. Why: `docs/decisions/004-design-token-ratchet.md`, `006-navigation.md`.
