# I — UI quality, code level (audit 2026-11)

Summary: 10 findings, 0 High, 2 Med, 8 Low. The code is in very good shape: every Pressable has a role, 33 of 41 also have a label (the other 8 have visible text or are deliberately `accessible={false}`), every animation honours Reduce Motion, the token ratchet is at 14 escapes in total with no colour, shadow or weight escapes, and no hex or `rgba()` sits outside `src/theme`. The real gaps are a design-system drift (retired 11 / 12.5 pt text sizes still shipping; Container radius 16/24 against the spec's 20/28), a few contrast pairs the contrast test does not cover, and small API / feedback inconsistencies. Nothing needs the phone to fix except I-02 and I-05. Items already in `docs/backlog.md` (touch-target exceptions, A6-xx, SF Symbols on web, toast alpha, fill transitions, header duplication) are not repeated.

Method: grep and small parsers (`/tmp/claude-1000/-home-akram-projects-habits-app/779079f3-7007-4464-981b-4e743d86543d/scratchpad/I/press.py`, `pressed.py`, `contrast.py`), plus reading the cited lines.

## Findings

### I-01 — Retired 11 pt and 12.5 pt text sizes still ship in five shared components
- Severity: Med
- Effort: M
- Evidence: `src/theme/theme.ts:63-72` (`typeScale.subtitle` 12.5, `caption` 11, `micro` 10, marked "retired" at theme.ts:92-93). Used at `src/components/ui/primitives/caption.tsx:30`, `character-counter.tsx:44`, `key-value-row.tsx:30,33`, `src/components/ui/composite/section-header.tsx:115,123,128,144`, `action-card.tsx:76`. The ratchet baseline `src/theme/token-ratchet.baseline.json` has `"off-scale-font-sizes": 9`, exactly these nine lines (verified by running `countTokens`). These lines also use `typeScale.*` instead of `textStyles.*` (138 uses elsewhere), so two type systems coexist.
- Why it matters: DESIGN.md says "Minimum text 12 pt ... blocks 10, 11, 12.5" and design-system-v3 T-07 sets a 12 pt caption floor. The ratchet only stops the count growing; it does not mean the sizes are gone. Caption (hint and error lines, 4 screens), the character counter, SectionHeader (3 screens) and Settings key-value rows still render at 11 / 12.5 pt, below the floor and off the AX3 ramp (`textStylesAx3` has no entry for them).
- Fix: Move the five files to `textStyles.caption` / `footnote` / `subhead`, run `npm run ratchet:update` (baseline goes 9 to 0), then delete `typeScale.micro/caption/subtitle`.
- Needs: phone test (the 11 to 12 pt change moves line wraps in SectionHeader and ActionCard; the visual-check baselines will move)

### I-02 — Container card and sheet radii (16 / 24) differ from the spec (20 / 28), and other cards use 20
- Severity: Med
- Effort: S
- Evidence: `src/components/ui/composite/container.tsx:119` (`base.borderRadius: 16`, used by the card, inset and outlined variants), `container.tsx:165-166` (sheet top corners 24), `action-card.tsx:62` (16). Spec: `docs/design/design-system-v3.md:111` "radius-l 20 — Every card, banner, field" and `:112` "radius-xl 28 — Sheet top corners". Hand-built cards in the module use 20: `src/modules/habits/components/progress/day-detail-card.tsx:84`, `progress-states.tsx:68`, `today/today-all-done-card.tsx:83`; `Banner` uses `radius.l` (banner.tsx:187). The `summary` and `flat` Container variants use `radius.l` (container.tsx:127,133). Four of the ratchet's eight `radius-literals` are in this file.
- Why it matters: on one screen a Container card (16) can sit next to a hand-built card (20) and a Banner (20); every bottom sheet is 4 pt tighter than the spec. This is either an intentional delta that is not recorded (the backlog "Decided" list and the Deltas section have no entry) or a drift.
- Fix: Replace the literals with `radius.l` / `radius.xl` (ratchet 8 to 3), or record the 16 / 24 values as a delta if the mockups say so.
- Needs: design decision, then phone test (sheet corner and card baselines move)

### I-03 — Three module cards re-implement the Container "outlined" card
- Severity: Low
- Effort: S
- Evidence: `src/modules/habits/components/progress/day-detail-card.tsx:24-27,82-87`, `progress-states.tsx:40-43,66-71`, `today/today-all-done-card.tsx:48-51,78-85`: each is `backgroundColor: colors.card` + `borderColor: colors.border` + `borderWidth: hairline` + `radius.l` + a padding of `space[350]` or `space[400]`. `Container variant="outlined"` is documented for this ("a card with a hairline border", container.tsx:8) and is used 41 times in the module.
- Why it matters: DESIGN.md "Reuse before create". The duplicates exist partly because Container's radius is 16 (I-02); fixing I-02 removes the reason and the three copies can collapse.
- Fix: After I-02, switch the three to `<Container variant="outlined">` with its padding props.
- Needs: none

### I-04 — Contrast test omits the `inner` surface and tinted grounds; four pairs fall under 4.5:1
- Severity: Low
- Effort: S
- Evidence: computed from `src/theme/theme.ts:5-61` with the WCAG formula (`scratchpad/I/contrast.py`). `src/theme/contrast.test.ts` checks danger, warn and frozen ink only on `bg` and `card`. Not covered and below 4.5:
  - Dark: danger text `#E56059` on `inner` 3.96, on `warnTint` 4.05.
  - Light: danger on `inner` 4.45, `warnInk` on `inner` 4.39, `frozenInk` on `inner` 4.43, `frozenInk` on `frozenBg` 4.28, `faint` on `frozenBg` 4.39.
  - Real use of `inner` as a ground: dark lifted rows (`list-item.tsx:126`) and pressed rows (`list-item.tsx:154`) with a destructive title (`list-item.tsx:102`, `dangerBg`), and Container `inset` (container.tsx:68).
  - Everything the test does cover passes. Primary / secondary / faint / placeholder on bg, card and inner: 5.5 or better (placeholder uses `faint`, text-field.tsx:136, search-field.tsx:86). Button label on accent 17.4 / 15.4. Label on the danger fill 5.16 / 5.09. Outline 3.0 to 3.9 (3:1 required, passes).
  - Category icon ink on its tint and on the page: worst 3.16 (light, hue 195), 6.4 (dark), against the 3:1 non-text floor. The values come from my own OKLCH conversion, sampled every 15 degrees, not from `oklch.ts`.
- Why it matters: the shortfalls are small and mostly transient (a pressed or dragged destructive row), but the dark danger-on-inner case is a real 3.96. The guard test gives false comfort because it never uses `inner` as a text ground.
- Fix: Add `inner` and `warnTint` / `frozenBg` to the ground lists in `contrast.test.ts`; then nudge `dangerBg` dark (about `#EA6A63`) and the light `warnInk` / `frozenInk` by a few lightness points, or keep pressed rows on `card`.
- Needs: design decision (token values change)

### I-05 — TextField error and helper text is not tied to its input for VoiceOver
- Severity: Low
- Effort: S
- Evidence: `src/components/ui/primitives/text-field.tsx:106-111` sets only `accessibilityLabel={label}` and `accessibilityState={{ disabled }}`; the error / hint renders as a separate `FieldHelper` (`:155-160`, `field-helper.tsx:33-37` with `accessibilityRole="alert"` on error). No `accessibilityHint`, no invalid state, and `announceForAccessibility` is not called for fields (only toasts, today-skeleton and the destructive sheet use it).
- Why it matters: a user who reaches a field after a failed Save hears the label only, and has to swipe on to find the error. On iOS, the `alert` role alone does not announce text that appears later. The backlog's VoiceOver device list covers screen focus, not field errors.
- Fix: Pass `error ?? helper` as the input's `accessibilityHint`, and call `AccessibilityInfo.announceForAccessibility(error)` when `error` changes from empty to set.
- Needs: phone test (VoiceOver)

### I-06 — Navigating month rows and year-map month labels give no press feedback
- Severity: Low
- Effort: S
- Evidence: `src/components/ui/composite/month-list.tsx:37-45` (style is the plain `styles.row`), `src/components/ui/composite/year-heat-map.tsx:84-97`. 11 of 41 Pressables have no `pressed` style (`scratchpad/I/pressed.py`); nine are legitimate (scrim, toast wrapper, tab pill with its own animation, switch, segmented segments with a selected state, week-strip day, matrix header). These two are plain navigation targets.
- Why it matters: DESIGN.md and `interactionOpacity` (theme.ts:257) define one press feedback for every interactive primitive; these two are the exceptions, and the Progress screen looks unresponsive on tap.
- Fix: Use `({ pressed }) => [styles.row, pressed && { opacity: opacity.pressed }]` as `past-day-bar.tsx:29-33` does.
- Needs: none

### I-07 — Two more fixed-size texts than the design system documents
- Severity: Low
- Effort: S
- Evidence: `src/components/ui/composite/week-matrix.tsx:77` (day letter) and `completion-cell.tsx:182` (cell number) set `allowFontScaling={false}`. `docs/design/design-system-v3.md:82` says "allowFontScaling on everywhere except the tab bar label"; `tab-bar-pill.tsx:310` is the only one that is documented (spec V3 line 104). Other bar caps use `barMaxFontMultiplier` (collapsing-header.tsx:233, header-buttons.tsx:250).
- Why it matters: both are probably right (the glyphs sit in fixed 16 to 44 pt cells and the matrix has an AX fallback layout), but the doc, which reviewers use, is wrong, and a user at AX3 reads a 12 pt letter and 13 pt digit.
- Fix: Add the two sites to design-system-v3.md line 82, or give them `maxFontSizeMultiplier` instead of a hard off.
- Needs: phone test (read the week matrix at AX3)

### I-08 — Prop vocabulary drift across primitives and composites
- Severity: Low
- Effort: M
- Evidence: the same idea is spelled differently.
  - `tone` has seven different value sets: `"default"|"warning"` (stat-card.tsx:14, progress-bar.tsx:19), `"warning"|"neutral"|"notice"|"error"` (banner.tsx:28), `"default"|"error"` (caption.tsx:8), `"blocking"|"hint"|"error"|"limit"` (field-helper.tsx:14), `"warning"|"success"|"neutral"` (insight-card.tsx:21), `"primary"|"destructive"` (alert-dialog.tsx:20), plus `ToastTone` (toast.tsx:12). Neutral is `default` in some and `neutral` in others.
  - Destructive is `destructive?: boolean` (list-item.tsx:69, category-row.tsx:16), a tone (alert-dialog.tsx:20), or a Button variant.
  - `size` sets are `default|small` (button.tsx:45), `default|compact` (category-chip.tsx:31), `default|large` (stepper.tsx:13), `full|compact` (segmented-control.tsx:27), `small|compact|default|large` (icon-badge.tsx:19), `default|small|group|eyebrow` (section-header.tsx:16), and a boolean `compact` (header-buttons.tsx:210, container.tsx:29).
  - `onChange` vs `onValueChange` splits cleanly by RN convention (Toggle / ToggleRow vs the rest), so it is fine.
- Why it matters: every new component re-decides these names; callers cannot guess.
- Fix: Write down one convention in `docs/how-to/dev-tooling.md` or DESIGN.md (`tone` = meaning with `default` neutral, `size` = string union, `destructive` as a tone), and apply it to new components only. Do not churn the existing API.
- Needs: design decision

### I-09 — No haptics anywhere
- Severity: Low
- Effort: M
- Evidence: no `expo-haptics` in `package.json`, no `Haptics.` call in `src` (grep), and neither the V3 spec nor the design docs mention haptics (grep for "haptic" in `docs/specs`, `docs/design`, `DESIGN.md`).
- Why it matters: for a check-in app the completion tap, the Undo and the streak-at-risk moment are where iOS users expect a tactile tick. It is a missing decision rather than an inconsistency, since there is nothing to be inconsistent about.
- Fix: Either record "no haptics" as a decided item in the backlog, or add one `useHaptics()` util (selection on circle toggle, success on all-done, warning on destructive confirm) that also respects Reduce Motion.
- Needs: design decision, phone test

### I-10 — Ratchet blind spots and a few motion literals
- Severity: Low
- Effort: S
- Evidence: `scripts/lib/token-counts.cjs:10-30` counts colours, shadows, `fontSize`/`lineHeight`, weights, padding / margin / gap and radius only. Not counted: `letterSpacing` (3 literals: `stat-card.tsx:80` 0.6, `section-header.tsx:137` and `section-label.tsx:19` 1.2), `borderWidth` 1.5 (4) and 1 (14), 59 literal `width/height/top/left/...` numbers in `src` (only 3 in `src/modules`), `SymbolView size={n}` literals (16 sites, sizes 12 / 14 / 16 / 17 / 18), `opacity` literals (1). Motion: `progress-bar.tsx:37` `SWEEP_MS = 1200` duplicates `motion.skeleton.loop` and `skeleton.tsx:45,51` hard-codes `Easing.inOut(Easing.ease)`; `Animated.timing` elsewhere uses `motion.*` tokens (use-fill-animation, toast-host, tab-bar-pill, collapsing-header). The scan also skips `test-support`, `*-fixtures.ts` and `src/theme` itself by design.
- Why it matters: small and mostly inside components that own their geometry, so this is not a bug. But the letter-spacing and icon sizes form a de facto scale that has no token, and the next contributor will invent a fifth value.
- Fix: Add `letterSpacing` and `iconSize` (12/14/16/18) to `src/theme/theme.ts`, and a `letter-spacing-literals` pattern to the ratchet; point `SWEEP_MS` at `motion.skeleton.loop`.
- Needs: none

## Measured facts (for reference, no action)

- Pressable / Touchable usage: 41 `<Pressable>` in 35 production files, 0 `TouchableOpacity`. Missing `accessibilityRole`: 1 (the toast-host tap wrapper, deliberately `accessible={false}`, toast-host.tsx:177). Missing `accessibilityLabel` with a role: 7 (banner action, alert-dialog buttons, toast action, chip, 2 segmented segments, past-day-bar link); each wraps a visible `Text` that names it, so VoiceOver reads it. `src/components/ui/touch-targets.guard.test.ts` covers all Pressables with 9 reasoned exceptions.
- `accessibilityElementsHidden` / `importantForAccessibility` (14 sites): all are correct uses: collapsed large headers (today, progress, habits, collapsing-header), decorative glyphs / pager / calendar mirror, modal sheets and dialogs use `accessibilityViewIsModal`. No misuse found.
- Dynamic type: `allowFontScaling={false}` 4 sites (tab label documented; I-07 for the others). `maxFontSizeMultiplier` 2 sites, both through `barMaxFontMultiplier`. Fixed `height:` literals on text containers: none; the 14 `height:` hits are dots, grabbers, dividers and glyph boxes (`tab-bar-pill.tsx:482,497` are icon boxes).
- Reduce Motion: every `Animated` / Reanimated user is covered. `useReducedMotion` is read directly in 14 files (sheet, toast-host, insight-pager, progress-bar, skeleton, reorderable-list, collapsing-header, tab-bar-pill, week-strip, completion-circle, today-all-done-card, today-screen, use-fill-animation, use-on-tab-retap). Others get it by composition: column-chart through `useFillAnimation`, the three headers through `useCollapsingHeader`, the screens through the shared hook. Modal `animationType` switches to fade (sheet.tsx:87); the alert dialog is always `fade` (alert-dialog.tsx:68).
- Token ratchet: baseline = live count = 14 escapes (font-size 2 in `header-buttons.tsx:353,357`, line-height 1 in `action-card.tsx:77`, spacing 2, radius 8, off-scale 9; colours, shadows and weights 0). Raw `rgba()` outside `src/theme`: 0.
- Duplicated patterns: header rows are in the backlog (not repeated). Sheet headers are clean: all sheets use `SheetHeader` / `ModalFormHeader` (8 module files), only `sheet.tsx` and `alert-dialog.tsx` import `Modal`. The only duplicated shape is the card in I-03.
- Haptics: none (I-09). Motion durations: no numeric `duration:` literal in components; they all come from `motion.*` except the two in I-10.

## Not checked

- Real VoiceOver order, Dynamic Type clipping and screen readers: need a device (see below).
- Contrast of category hues uses my own OKLCH-to-sRGB conversion with simple gamut clipping at 15-degree hue steps; the nine real hues (constants.ts:16-24, 45 to 300) fall inside that range, but `src/theme/oklch.ts` may clip differently by a few hundredths.
- Contrast of text over the blurred tab pill and the scrim, and of translucent tokens (`pillBg`, `toastBtn`): depend on what is behind them.
- Did not read screens one by one for unlabelled `SymbolView` icons (A6-08 is in the backlog).

## Judge on the phone

The backlog already lists the device-only checks (`docs/backlog.md` "Device-only checks", VoiceOver landing and reading order, Dynamic Type AX1 to AX5, Magic Tap on a toast, the Liquid Glass pill and blur). Beyond that list:

1. Card and sheet corners (I-02): 16 vs 20 pt cards side by side on Settings and Detail, and 24 vs 28 pt sheet tops. Say which one the mockup wants.
2. 11 and 12.5 pt text (I-01): read Caption hints, the character counter and SectionHeader eyebrows in sunlight; check that the 12 pt move does not wrap Settings key-value rows.
3. A destructive row under finger (I-04): in dark mode, press and hold "Delete" in a list row and a dragged lifted row; is the red readable?
4. VoiceOver on a field with an error (I-05): submit New habit with an empty name; is the error found without swiping past the field?
5. Week matrix and completion cell digits at AX3 (I-07): are the fixed letters and numbers still legible against the scaled rows around them?
6. Press feedback on Progress month rows and year-map labels (I-06) next to the habit rows that do have it.
7. Whether the completion tap, the all-done card and the destructive confirm want a haptic (I-09).
8. Mixed-type rhythm: Container cards (padding 16, radius 16) against hand-built cards (padding 14 to 16, radius 20) on Progress and Today, judged by eye for alignment of the card edges.

## Strengths

- Accessibility plumbing is consistent and enforced: roles on every Pressable, a `touch-targets.guard.test.ts` that fails on stale exceptions, `useInitialFocus` and `accessibilityViewIsModal` on sheets and dialogs, live regions for counters and the destructive sheet.
- One Reduce Motion hook used by every animation, with a documented fallback per motion token (`motion.*.reduced`), and the duration tokens are used almost everywhere. Do not add a second source.
- The token ratchet works: 0 colour, shadow and weight escapes, no hex or `rgba()` outside `src/theme`, and a 14-item total baseline that matches the live count exactly.
- Contrast is a tested property of the palette, not a hope: the existing `contrast.test.ts` plus the T-01 to T-04 history means only edge pairs (I-04) are open.
- Shared primitives are reused: sheet headers, buttons and fields come from `components/ui` (the module has no private `Modal`, no private header buttons, and 41 `Container` uses).
