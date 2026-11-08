# Habits App

Personal iOS habit tracker (Expo / React Native / TypeScript), one module: `src/modules/habits`. Docs index: `docs/README.md`.

## Public repo: secrets are the top risk

- Never commit secrets, env values, logs, archives, generated output or files over 1 MB. Rules: `CONTRIBUTING.md` → "What never goes in git". `make check` and the `secret-scan` workflow enforce them.

## Check and git

- Run `make check` and read its exit code. Never pipe or redirect its output (or any test command). If red, fix it before committing.
- One commit per step, only when the task says so. Never push; a denied push means stop and ask.
- Never `--no-verify`, never `git stash`.
- No `Co-Authored-By`, "Generated with" or other attribution lines in commits or PRs.
- One Claude session per working copy. If Expo is running, use `git worktree` for a second session.

## Editing

- Code files: use Edit/Write, not sed/python (the format hook only fires on those). Docs and text files: edit any way that works.
- `npx expo install <pkg>`, never `npm install`.
- `ios/` and `android/` are generated; never hand-edit. Native config goes in `app.config.ts` / config plugins. Native-code libraries need a dev-client build, not Expo Go.
- Before touching an Expo, EAS or RN API: read the docs for `expo`'s major version in `package.json` (`https://docs.expo.dev/llms.txt`). Do not trust training data.
- After adding or moving a route file, start `npx expo start` once so `tsc` sees the generated typed routes.

## Specs and docs (read the section you touch, not the whole file)

- Feature `HAB-<id>`: use `/implement-feature <id>` (`.claude/skills/implement-feature`).
- V3 spec (HAB-26–50) is the source of truth; if V2 or V1 conflict, V3 wins. Check `docs/README.md` for which spec covers a ticket. Update the older text and its tests in the same change.
- Specs: `docs/specs/feature-spec-v3.md`, `docs/specs/feature-spec-v2.md`, `docs/specs/feature-spec.md`.
- UI: `DESIGN.md`, `docs/design/design-system-v3.md`, `docs/design/design-system.md` (its **Deltas** are intentional), `docs/mockups/v3/renders/INDEX.md`.
- Layers, folders, stack: `ARCHITECTURE.md`.
- Navigation, tab bar, pushed screens, First Run: `docs/decisions/006-navigation.md`, test `src/navigation.test.tsx`.
- Commands, hooks, visual-check, allowlists, token ratchet: `docs/how-to/dev-tooling.md`.
- iOS Simulator and device validation: `docs/decisions/007-device-validation.md`, `docs/how-to/device-validation.md`.
- App variants, backups, recovery screens, set-aside: `docs/decisions/010-app-variants-and-recovery.md`, `docs/how-to/backups-and-recovery.md`.
- Next fixes: `docs/backlog.md` (open work only; shipped entries are in `docs/archive/backlog-done.md`, the old audit plan in `docs/archive/audit.md`; both never read by default). Status: `docs/README.md`, `CHANGELOG.md`.
- Deviations: append to `docs/backlog.md`, never drop silently. Reviewers must not re-flag `docs/backlog.md` § "Decided" or § "Deliberate V3 deviations".

## Rules that no tool catches

- Pure rules in `domain/`; `services/` only for composite operations, never wrapping one repository call.
- New frequency type or streak rule = new Strategy file, not an `if`. Do not change existing Strategy semantics.
- Forms: React Hook Form + Zod. Dates: `date-fns`, never native `Date` math for streaks or weeks.
- Reuse before create: search `components/ui/primitives|composite` and the module's components first. Colours, shadows, font sizes come from `src/theme` tokens.
- Header buttons only via `src/components/ui/composite/header-buttons.tsx` (iOS 26 Liquid Glass bug).
- Categories: `habits.categoryId` supplies icon and color. Never read or write the legacy `habits.icon/color/category` columns; no free-text categories.
- Allowlists (`scripts/check-architecture.allowlist.json`) and the token baseline only shrink.
- Migrations (`src/lib/db/migrations/`) need approval. Test with foreign keys ON, whole chain in one transaction, child rows present; table rebuilds use `PRAGMA defer_foreign_keys`. Run the `migration-reviewer` agent.

## Definition of done

`make check` green → visual-check on touched screens, light and dark → `spec-reviewer` agent → backlog entry for deviations and an "As built" note in the spec section.
