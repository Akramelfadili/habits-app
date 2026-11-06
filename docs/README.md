# Docs index

Which document answers which question. Sizes are estimated tokens (file bytes ÷ 4). **Never read by default** = big or historical: find the line with `grep -n`, then read a small window.

| Path | Answers | Read when | ~Tokens |
|---|---|---|---|
| `../CLAUDE.md` | Working rules, guards, the "when you touch X, read Y" table | Every session (loaded automatically) | 2.2k |
| `../README.md` | What the app is, how to run it | First visit | 0.5k |
| `../DESIGN.md` | Design principles, token rules, accessibility rules, who enforces each | Before any UI work | 1k |
| `../CHANGELOG.md` | What shipped, by version and batch; what is next | Coming back | 1.5k |
| `CONTRIBUTING.md` | Branches, commits, the gate, what never goes in git, migrations, session rules | Before the first commit | 1.5k |
| `ARCHITECTURE.md` | Folders, layers, patterns, stack, navigation, decision log | Touching `src/modules`, data or layering (read the heading you need) | 9k |
| `dev-tooling.md` | Hooks, `make check`, ratchets, visual-check setup, WSL Chromium | Tooling, CI, visual-check | 2.8k |
| `decisions/001…007` | Why: live queries, FKs off on device, `run()`, token ratchet, navigation (006), device validation (007) | Before changing what they decide | 0.6–2k each |
| `design-system-v3.md` | V3 tokens (F-xx) and components (V3-xx) | Any UI work on HAB-26–50 | 5k |
| `design-system.md` | V1+V2 tokens and components; **Deltas** section | UI work, or a component V3 does not redefine | 9k |
| `feature-spec-v3.md` | HAB-26–50: rules, edge cases, "Spec wins", D1–D15 | Implementing or reworking a V3 ticket (one section only) | 15k |
| `progress-data.md` | Progress maths (rates, cells, ranges) | HAB-35–38 | 3k |
| `backlog.md` | Open items, deviations, the **Decided** section | Before planning; by `grep` only | 21k |
| `mockups/v3/README.md`, `mockups/v3/renders/INDEX.md` | V3 design files; frame id → section | Visual work | 2.5k |
| `mockups/v3/renders/<section>/text.txt` | All copy and rules of one mockup section | Wording for one frame, by `grep` | 3–17k each |
| `visual-baseline/` | PNG baselines for `npm run visual-check` | Only through the tool | — |
| `how-to/device-validation.md` | Run the iOS Simulator validation, read its artifacts, add a state | Device-only questions | 0.9k |
| `how-to/e2e.md` (`../e2e/README.md` is a pointer) | Maestro journeys, status, coverage gaps, manual device checks | Touching `e2e/` | 2k |
| `../scripts/README.md` | What each script does | Touching `scripts/` | 0.3k |
| `feature-spec.md`, `feature-spec-v2.md` | HAB-01–13, HAB-14–25. **Never read by default** | One ticket section only | 9k, 10k |
| `assessment-v3.md` | V3 impact per ticket, batch plan. **Never read by default** | History | 16k |
| `audits/audit.md` | Full audit, batches B0–B13. **Never read by default** | "What to fix next" | 30k |
| mockup `text.txt` dumps | **Never read whole** (`foundations` is 17k tokens) | One frame, by `grep` | — |

## Spec table of contents

Find a ticket without opening the spec:

```bash
grep -n '^## HAB-35 ' docs/feature-spec-v3.md      # V3: HAB-26…50
grep -n '^## HAB-18 ' docs/feature-spec-v2.md      # V2: HAB-14…25
grep -n '^## 03 — ' docs/feature-spec.md           # V1: 01…13 (no "HAB" in the heading)
grep -n '^## Spec wins' docs/feature-spec-v3.md    # the overrides of the mockup
grep -n '^## Standing decisions' docs/feature-spec-v3.md   # D1–D15
sed -n '/^## Decided/,/^## Visual-check/p' docs/backlog.md  # deviations not to re-flag
```

A section runs to the next `^## `. Ticket → stage (used by `/implement-feature` and `spec-reviewer`): V3-0b: 26, 28, 29, 42 · V3-1: 27 · V3-2: 30–34, 48 · V3-3: 35–38 · V3-4: 39–45 · V3-5: 46–47 · V3-6: 49–50. Search the backlog by id or stage label: `grep -n 'V3-3' docs/backlog.md`.

## Status

| Stage | Status |
|---|---|
| V1 (HAB-01–13), V2 (HAB-14–25), V3 (HAB-26–50, batches V3-0a…V3-6) | Shipped; the owner's UI fix batch from device testing is done |
| Hardening (audit batches B0–B13, `audits/audit.md` §16) | Cleanups, docs and test hygiene done; folder moves, error handling, accessibility and diagnostics next |
| Device validation (iOS Simulator run in CI, ADR 007) | Built, merged, run on GitHub Actions |
| Crash/error reporting, versioning | Not started |

## Coming back to this project

**What this is.** A personal iOS habit tracker (Expo, React Native, TypeScript, SQLite through Drizzle, no backend). Habits only, three tabs: Today, Progress, Habits.

**State.** Built: V1–V3 complete. Verified: `make check`, the web visual-check baselines, the Maestro journeys on the web build, and an iOS Simulator run in CI. **Not verified on a device:** VoiceOver, Dynamic Type beyond AX3, real gestures (reorder, swipe), reminders firing, the share sheet. The list is in `backlog.md` ("Release prerequisites").

**First five steps, adding something new**
1. Write a short spec section (heading `## HAB-<id> — …`) in the newest spec file, with its rules and edge cases. Check `backlog.md` for related open items.
2. If it is visual, add the frames to the V3 mockup and run `npm run mockups:render`.
3. Plan the work as batches: one prompt per batch, one commit per step, `make check` green before each.
4. After each batch, ask for a report and run a review (`/implement-feature <id>` does the spec-reviewer step).
5. Never run two Claude sessions in one working copy. If the dev server is running, work in a git worktree.

**First five steps, reworking something**
1. Read the decision log (`decisions/`, `backlog.md` "Decided") for what was chosen on purpose.
2. Read the ticket's spec section and any "As built" note.
3. Read `design-system-v3.md` rows for the components it uses.
4. Change the spec text first if the behaviour changes, then the code and its tests.
5. Run the checks below; log deviations in `backlog.md`.

**Start or resume a session.** From the repo root run `claude` (new) or `claude --continue` (the last session in this directory). `CLAUDE.md` loads by itself. The written record (specs, backlog, `CLAUDE.md`) is the memory between sessions, not the chat.

**Checks, in order**
- `make check`: the gate. Run it unpiped.
- `npm run visual-check -- <screen>`: targeted, for the screens you touched; then once the full `npm run visual-check` (light and dark). Setup: `dev-tooling.md`.
- `npm run test:slow`: when you touch code the slow tests cover (CI runs it).
- `npm run e2e`: Maestro journeys, when navigation or a tapped label changed.
- Device validation: `gh workflow run ios-simulator.yml` (manual, not a gate). How-to: `how-to/device-validation.md`.
