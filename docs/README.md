# Docs index

Which document answers which question. Sizes are estimated tokens (characters ÷ 4, measured 2026-11-08). **Never read by default** = big or historical: find the line with `grep -n`, then read a small window.

| Path | Answers | Read when | ~Tokens |
|---|---|---|---|
| `../CLAUDE.md` | Working rules, guards, the "Specs and docs" list (which doc to read for each area), Definition of done | Every session (loaded automatically) | 1k |
| `../README.md` | What the app is, how to run it | First visit | 0.5k |
| `../DESIGN.md` | Design principles, token rules, accessibility rules, who enforces each | Before any UI work | 1.2k |
| `../CHANGELOG.md` | What shipped, by version and batch; what is next | Coming back | 1.5k |
| `../CONTRIBUTING.md` | Branches, commits, the gate, what never goes in git, migrations, session rules | Before the first commit | 1.5k |
| `../ARCHITECTURE.md` | Folders, layers, patterns, stack, navigation, decision log | Touching `src/modules`, data or layering (read the heading you need) | 9.6k |
| `how-to/dev-tooling.md` | Hooks, `make check`, ratchets, visual-check setup, WSL Chromium | Tooling, CI, visual-check | 3.6k |
| `decisions/001…010` (001–004 and 006–010; there is no 005) | Why: live queries, FKs off on device, `run()`, token ratchet, navigation (006), device validation (007), logging (008), sync readiness (009), app variants and recovery (010) | Before changing what they decide | 0.5–1.8k each |
| `design/design-system-v3.md` | V3 tokens (F-xx) and components (V3-xx) | Any UI work on HAB-26–50 | 4.6k |
| `design/design-system.md` | V1+V2 tokens and components; **Deltas** section | UI work, or a component V3 does not redefine | 8.7k |
| `specs/feature-spec-v3.md` | HAB-26–50: rules, edge cases, "Spec wins", D1–D15 | Implementing or reworking a V3 ticket (one section only) | 15k |
| `progress-data.md` | Progress maths (rates, cells, ranges) | HAB-35–38 | 2.8k |
| `backlog.md` | Open work by theme, the **Decided** section, the deliberate V3 deviations | Before planning; open groups can be read whole, otherwise `grep` | 12.8k |
| `mockups/v3/README.md`, `mockups/v3/renders/INDEX.md` | V3 design files; frame id → section | Visual work | 3k |
| `mockups/v3/renders/<section>/text.txt` | All copy and rules of one mockup section | Wording for one frame, by `grep` | 3–17k each |
| `visual-baseline/` | PNG baselines for `npm run visual-check` | Only through the tool | — |
| `how-to/starter-habits.md` | Dev builds: your own habits from `.env.local`, format, version bump, why dev-only | Setting up or changing the starter habits | 1.2k |
| `how-to/backups-and-recovery.md` | App variants and ids, the backup taken before an upgrade, restoring one by hand, what the recovery screens do, recovering a set-aside file | Data-safety questions, or a phone that will not open its data | 1.3k |
| `how-to/export-format.md` | Every field of the JSON export (version 2), the `derived` object, `notesIncluded`, the CSV columns, the compatibility rule for a future importer | Building the importer, or reading an export file | 1.8k |
| `how-to/app-store-privacy.md` | App Privacy label answers, the data inventory, required-reason APIs by dependency, the GDPR mapping, the first EAS build checklist | Submitting to App Store Connect, or changing what the app stores or sends | 2k |
| `how-to/release.md` | Build profiles, version policy, Apple prerequisites, first-build commands, TestFlight and rollout, rollback, compatibility rules, the device checklist before real data | Cutting a build, submitting, or doing the phone checks | 3.3k |
| `../site/privacy.html` | The privacy policy page (GitHub Pages, deployed by `.github/workflows/pages.yml`) | Changing what the app stores or sends | 1k |
| `how-to/device-validation.md` | Run the iOS Simulator validation, read its artifacts, add a state | Device-only questions | 0.9k |
| `how-to/e2e.md` (`../e2e/README.md` is a pointer) | Maestro journeys, status, coverage gaps, manual device checks | Touching `e2e/` | 1.7k |
| `../scripts/README.md` | What each script does | Touching `scripts/` | 0.3k |
| `specs/feature-spec.md`, `specs/feature-spec-v2.md` | HAB-01–13, HAB-14–25. **Never read by default** | One ticket section only | 9k, 9.6k |
| `archive/assessment-v3.md` | V3 impact per ticket, batch plan. **Never read by default** | History | 16k |
| `archive/audit.md` | Full audit, batches B0–B13 (superseded by `backlog.md` for what to fix next). **Never read by default** | History, or a finding id (`grep -n A12-02`) | 30k |
| `archive/backlog-done.md` | Shipped and obsolete backlog entries with their "As built" notes, in their original sections. **Never read by default** | History, or an id (`grep -n 'HAB-30' docs/archive/backlog-done.md`) | 10k |
| mockup `text.txt` dumps | **Never read whole** (`foundations` is 17k tokens) | One frame, by `grep` | — |

## Layout

```
ARCHITECTURE.md  CONTRIBUTING.md  CLAUDE.md  DESIGN.md  CHANGELOG.md   (repo root)
docs/
  README.md            this index
  backlog.md           open items by theme, "Decided", deliberate V3 deviations
  progress-data.md     Progress maths
  specs/               feature-spec.md (V1), feature-spec-v2.md, feature-spec-v3.md
  design/              design-system.md (V1+V2), design-system-v3.md
  decisions/           ADRs 001-004, 006-009 (no 005)
  how-to/              dev-tooling.md, e2e.md, device-validation.md, starter-habits.md, export-format.md, app-store-privacy.md, release.md
  archive/             audit.md, assessment-v3.md, backlog-done.md, audits-2026-11/ (history; not scanned by check-doc-refs)
  mockups/v3/          V3 design files and text renders
  visual-baseline/     web baselines for visual-check
```

## Spec table of contents

Find a ticket without opening the spec:

```bash
grep -n '^## HAB-35 ' docs/specs/feature-spec-v3.md      # V3: HAB-26…50
grep -n '^## HAB-18 ' docs/specs/feature-spec-v2.md      # V2: HAB-14…25
grep -n '^## 03 — ' docs/specs/feature-spec.md           # V1: 01…13 (no "HAB" in the heading)
grep -n '^## Spec wins' docs/specs/feature-spec-v3.md    # the overrides of the mockup
grep -n '^## Standing decisions' docs/specs/feature-spec-v3.md   # D1–D15
awk '/^## /{p=0} /^## (Decided|Deliberate V3)/{p=1} p' docs/backlog.md  # deviations not to re-flag
```

A section runs to the next `^## `. Ticket → stage (used by `/implement-feature` and `spec-reviewer`): V3-0b: 26, 28, 29, 42 · V3-1: 27 · V3-2: 30–34, 48 · V3-3: 35–38 · V3-4: 39–45 · V3-5: 46–47 · V3-6: 49–50. Search the backlog by id or stage label: `grep -n 'V3-3' docs/backlog.md`; shipped history is in `archive/backlog-done.md`.

## Status

| Stage | Status |
|---|---|
| V1 (HAB-01–13), V2 (HAB-14–25), V3 (HAB-26–50) | Shipped; the owner's UI fix batch from device testing is done |
| Audit 2026-11 (82 findings) | Closed in batches 12–22 and the final pass, except the items below. Per-finding table: `archive/audits-2026-11/STATUS.md` |
| Device validation (iOS Simulator run in CI, ADR 007) | Built and run on a branch. No run on master yet: the freeze, custom-category and export flows are unverified (simulator run pending) |

**Open.** Delete all data (C-04); data-at-rest protection (D-07); OTA and crash-reporter decisions (F-04, F-09); icon artwork (F-05); the module recipe, FlatList and file-size cleanups (B-11, B-12, A-05); two parked TypeScript flags; mutation testing (parked); V4 sync findings B-01..03, B-05, B-06 (parked, ADR 009). The rest of the open work is in `backlog.md`.

**Needs you.** GitHub settings: secret scanning and push protection, Dependabot alerts, private vulnerability reporting, a master ruleset requiring `check` and `secret-scan` (D-01, D-03, D-04, D-06). Apple account: `eas login`, `eas init`, the App ID, the first build and the privacy-manifest check. Run `ios-simulator.yml` on master.

**Needs a device.** The device checklist in `how-to/release.md` (items 1–11): backups, newer-data screen, set-aside, share sheet, lock-screen titles, VoiceOver and Dynamic Type, Hermes timings, haptics.

## Coming back to this project

**What this is.** A personal iOS habit tracker (Expo, React Native, TypeScript, SQLite through Drizzle, no backend). Habits only, three tabs: Today, Progress, Habits.

**State.** Built: V1–V3 complete. Verified: `make check`, the web visual-check baselines, the Maestro journeys on the web build, and an iOS Simulator run in CI. **Not verified on a device:** VoiceOver, Dynamic Type beyond AX3, real gestures (reorder, swipe), reminders firing, the share sheet. The list is in `backlog.md` ("Release prerequisites", "Open — device findings"). The rest of the open work is the other `Open —` groups there; shipped entries are in `archive/backlog-done.md`.

**First five steps, adding something new**
1. Write a short spec section (heading `## HAB-<id> — …`) in the newest spec file, with its rules and edge cases. Check `backlog.md` for related open items.
2. If it is visual, add the frames to the V3 mockup and run `npm run mockups:render`.
3. Plan the work as batches: one prompt per batch, one commit per step, `make check` green before each.
4. After each batch, ask for a report and run a review (`/implement-feature <id>` does the spec-reviewer step).
5. Never run two Claude sessions in one working copy. If the dev server is running, work in a git worktree.

**First five steps, reworking something**
1. Read the decision log (`decisions/`, `backlog.md` "Decided" and "Deliberate V3 deviations") for what was chosen on purpose.
2. Read the ticket's spec section and any "As built" note.
3. Read `design-system-v3.md` rows for the components it uses.
4. Change the spec text first if the behaviour changes, then the code and its tests.
5. Run the checks below; log deviations in `backlog.md`.

**Start or resume a session.** From the repo root run `claude` (new) or `claude --continue` (the last session in this directory). `CLAUDE.md` loads by itself. The written record (specs, backlog, `CLAUDE.md`) is the memory between sessions, not the chat.

**Checks, in order**
- `make check`: the gate. Run it unpiped.
- `npm run visual-check -- <screen>`: targeted, for the screens you touched; then once the full `npm run visual-check` (light and dark). Setup: `how-to/dev-tooling.md`.
- `npm run test:slow`: when you touch code the slow tests cover (CI runs it).
- `npm run e2e`: Maestro journeys, when navigation or a tapped label changed.
- Device validation: `gh workflow run ios-simulator.yml` (manual, not a gate). How-to: `how-to/device-validation.md`.
