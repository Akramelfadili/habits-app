# H — Workflow, CI and AI setup (audit 2026-11)

Summary: CI is fast (about 2.5-3 min, all 20 recent runs green) and the AI setup is lean (about 1.3k tokens of fixed per-turn load). Gaps: no PR/issue templates or CODEOWNERS, no release/version process, a Stop hook that runs `tsc` on every dirty turn, a pre-commit that rewrites the whole repo, and stale numbers/wording in the docs map and Makefile. Counts: High 0, Med 4, Low 7. Already reported by D and not repeated: D-01 (secret scanning off), D-03 (no branch protection, checks not required; confirmed: API returns "Branch not protected"), D-04 (Dependabot), D-05 (mutable action tags, no permissions block, curl|bash), D-06 (LICENSE/SECURITY).

Method: sizes are bytes/4. CI times from `gh run list` and `gh run view <id> --json jobs` (run 42490622991).

## Measurements

CI `check` job: about 2m25s. Steps: checkout 5s, setup-node 3s (npm cache on), `npm ci` 19s, `make check` 88s, `npm run test:slow` 27s. `secret-scan` about 15s. Recent `check` runs finished in 2m24s-3m03s. No Expo/Metro cache is needed (no bundling in CI). `test:slow` starts jest a second time (see H-08).

Always-loaded context (every turn):

| Item | Tokens |
|---|---|
| CLAUDE.md (the only one; no nested) | 1,032 |
| Skill `implement-feature` description (disable-model-invocation, so likely not listed) | 0-50 |
| Agent descriptions: codebase-auditor, migration-reviewer, spec-reviewer | about 55 + 50 + 85 |
| `.claude/settings.json` (permissions and hooks, not model context) | 0 |
| `.mcp.json`, `settings.local.json`, output styles | none exist |
| Total | about 1.3k |

On demand: implement-feature SKILL.md 1.8k, agents 1.1k / 1.0k / 1.7k, docs 0.3k-15k per file via the map.

Hooks: per tool call only `format.sh` on Edit|Write (one `node` start plus `biome check --write` on one file, about 0.5-1 s, not timed). `verify.sh` fires on Stop. Measured: `biome check .` 4.0 s; `check-architecture` 0.65 s; `tsc --noEmit --incremental` 15.6 s (warm).

## Findings

### H-01 — Stop hook runs full tsc plus jest on every dirty turn
- Severity: Med
- Effort: S
- Evidence: .claude/settings.json (Stop hook, timeout 180); .claude/hooks/verify.sh (dirty-tree guard `git status --porcelain`, then `npx tsc --noEmit --incremental`, `check-architecture`, `jest --onlyChanged`).
- Why it matters: any uncommitted change (a docs-only edit, an untracked scratch file, a tree left dirty between steps) makes every end of turn cost 15+ s of `tsc` plus jest. A failure exits 2 and forces another turn. It duplicates `make check` and pre-push. `jest --onlyChanged` follows git state, not the session's edits.
- Fix: skip when the only changes are non-code (`*.md`, `docs/`), and run tsc only when `.ts/.tsx` files changed.
- Needs: none

### H-02 — Pre-commit runs `biome check --write .` on the whole repo, not staged files
- Severity: Med
- Effort: S
- Evidence: .husky/pre-commit line 1 (`npx biome check --write .`); docs/how-to/dev-tooling.md:15 ("`biome check --write .` only (fast on purpose)"); measured 4.0 s without `--write`.
- Why it matters: it can rewrite unstaged files, which then stay out of the commit (surprise diffs, especially across `git add -p`). "One commit per step" assumes the commit contains what was checked. 4 s on 1,315 tracked files is fine now but scales with the repo.
- Fix: `biome check --staged --no-errors-on-unmatched` (no write), or lint-staged with re-add. Update dev-tooling.md:15.
- Needs: none

### H-03 — No release or versioning process; version is a placeholder, no EAS config
- Severity: Med
- Effort: M
- Evidence: package.json:4 and app.json:5 both `"1.0.0"`; no `eas.json` (ls: not found); no `buildNumber` in app.json; `git tag` lists only `mockups-v1-v2` and `spike-v3-1-navigation` (not releases); CHANGELOG.md:3 ("`package.json` version is a placeholder"); backlog.md:84 has a "Release prerequisites" section.
- Why it matters: nothing defines how a build gets a version, a tag and a changelog entry, or which of package.json and app.json is the source. Three recent CHANGELOG entries say "no PR number yet", so the changelog is hand-edited and drifts from git. See backlog "Release prerequisites" (the prerequisites exist; the procedure does not).
- Fix: when the first TestFlight/EAS build is planned, add `eas.json`, choose one version source, tag `vX.Y.Z`, add `docs/how-to/release.md`. Until then, state in CONTRIBUTING that there is no release flow.
- Needs: design decision

### H-04 — No PR template, issue templates or CODEOWNERS
- Severity: Med
- Effort: S
- Evidence: `ls .github` shows only `workflows/`; no `pull_request_template.md`, `ISSUE_TEMPLATE/` or `CODEOWNERS` (checked).
- Why it matters: the Definition of done (make check, visual-check light/dark, spec-reviewer, backlog entry, "As built", no attribution) lives only in CLAUDE.md; a PR body is free text. The repo is public, so a template also states the rules to outsiders. CODEOWNERS only matters once D-03 exists. Dependabot: see D-04.
- Fix: add a 10-line PR template mirroring the Definition of done. Defer CODEOWNERS until D-03.
- Needs: none

### H-05 — docs/README token estimates are stale; it describes a CLAUDE.md table that no longer exists
- Severity: Low
- Effort: S
- Evidence: docs/README.md:7 (CLAUDE.md row: "the 'when you touch X, read Y' table", 2.2k) vs actual 1,032 tokens (4,131 bytes); CLAUDE.md now has a "Specs and docs" list, no table. Others (stated vs actual): README.md 0.5k vs 0.38k; CHANGELOG 1.5k vs 1.24k; dev-tooling.md 2.8k vs 3.07k; e2e.md 2k vs 1.7k; design-system-v3 5k vs 4.7k; progress-data 3k vs 2.85k; starter-habits 1.5k vs 1.17k. Accurate within 10%: ARCHITECTURE 9k (9.4k), backlog 12.5k (12.4k), spec-v3 15k, design-system 9k (8.8k), v1/v2 specs, scripts/README 0.3k. The `decisions/001…008` row implies a 005; `ls docs/decisions` has 001-004 and 006-008 only.
- Why it matters: the column is the "should I read this" budget; the CLAUDE.md row is 2x too high.
- Fix: fix those rows; optionally have `check-doc-refs` warn when a stated size is off by more than 25 percent.
- Needs: none

### H-06 — Dead `deleteAllHabits` still described as open in the backlog and ADR 002 (scope C also found; line numbers here)
- Severity: Low
- Effort: S
- Evidence: docs/backlog.md:99 ("Still open: (1) dev-only `deleteAllHabits` leaves entries/notes/freezes/reminders behind"); docs/decisions/002-foreign-keys-off-on-device.md:27; `grep -rn deleteAllHabits src` returns nothing (removed, CHANGELOG "Dev controls removed").
- Why it matters: item (1) is closed by the removal but reads as open work; `check-doc-refs` does not catch dead identifiers in prose.
- Fix: delete item (1) and the ADR line; consider flagging backticked identifiers with no match in `src/`.
- Needs: none

### H-07 — Makefile `start` says "scan QR with Expo Go", contradicting README and CLAUDE.md
- Severity: Low
- Effort: S
- Evidence: Makefile:6 vs README.md:9 ("native modules need a dev-client build, not Expo Go") and CLAUDE.md ("Native-code libraries need a dev-client build, not Expo Go").
- Why it matters: the first thing `make help` tells a newcomer is wrong.
- Fix: "Start the Expo dev server (dev-client build)".
- Needs: none

### H-08 — CI runs jest twice and local `make check` is not the CI gate
- Severity: Low
- Effort: S
- Evidence: .github/workflows/check.yml steps `make check` then `npm run test:slow`; Makefile `check:` omits `test-slow`; test:slow took 27 s of about 145 s.
- Why it matters: a green local `make check` (the CLAUDE.md rule) can still fail in CI; a second jest start-up is paid serially.
- Fix: add `make check-ci: check test-slow` and call it, or run test:slow as a parallel job.
- Needs: none

### H-09 — Common read-only commands are not allowlisted (permission friction)
- Severity: Low
- Effort: S
- Evidence: .claude/settings.json `allow` has no `gh` entry, `git tag`, `git ls-tree`, `git worktree`, `git fetch`, `git switch`/`checkout -b`, `git branch` (only `--show-current`), `npx expo`, `make check-doc-refs`, `make check-repo-hygiene`, `make deadcode`, `make help`, `npm run check-doc-refs`, `npm run check-repo-hygiene`. The skill itself uses `git ls-tree` (implement-feature/SKILL.md:36) and CLAUDE.md names `git worktree`. `git add *` and `git commit:*` are allowed; `git push` is denied.
- Why it matters: these prompt every session.
- Fix: add read-only ones (`gh run list/view`, `gh pr view/list/checks`, `git tag`, `git ls-tree`, `git branch`, `git worktree list`, `make help`, `make check-doc-refs`, `make check-repo-hygiene`). Keep `gh pr create`, `git worktree add`, `expo start` prompting.
- Needs: none

### H-10 — Missing skills: backlog/bug fix, release, audit
- Severity: Low
- Effort: M
- Evidence: .claude/skills has only `implement-feature` (HAB tickets); agents are codebase-auditor, migration-reviewer, spec-reviewer. CLAUDE.md "Definition of done" and CONTRIBUTING describe fix/chore flow in prose.
- Why it matters: backlog fixes and chores need the same steps (reproduce, test first, make check, move entry to backlog-done.md) with no repeatable procedure; this audit used a hand-written rules file. A general PR-review skill is covered by the built-in code-review.
- Fix: add a `fix-backlog <id>` skill, and a `release` checklist skill once H-03 is decided.
- Needs: design decision

### H-11 — Repo "no attribution" rule conflicts with the harness default; only the hook makes it reliable
- Severity: Low
- Effort: S
- Evidence: CLAUDE.md "No `Co-Authored-By`..."; .husky/commit-msg lines 3-4 reject those strings; this session's harness instruction asks for the opposite lines, and CLAUDE.md wins.
- Why it matters: the rule is repo policy and the hook correctly enforces it for any contributor, so it belongs in the repo. A session following the harness default hits a rejected commit and retries. `~/.claude` has settings.json and skills/ (names only; contents not read); a user-level attribution setting or CLAUDE.md line would stop the conflict across repos. Nothing in the repo is purely personal preference.
- Fix: keep rule and hook; optionally turn off harness attribution in user settings.
- Needs: none

## Onboarding accuracy (README from scratch)

- Node is pinned: `.nvmrc` = 24, CI uses `node-version-file: .nvmrc`; local is v24.18.0. `package.json` has no `engines` field, so an older Node gets no warning (add `"engines": {"node": ">=24"}`).
- README says `npm install`; CI uses `npm ci` (lockfile-exact). `prepare` runs `husky`, so hooks install on install. Using `npm ci` in README would match CI.
- README does not say how to get a dev client (`expo run:ios`, Mac and Xcode); `ios/` is generated and ignored. On Linux/WSL a newcomer can run `make check` and visual-check (dev-tooling.md covers WSL Chromium) but not the app.
- `make help` targets all appear in `.PHONY`. scripts/README.md matches the scripts directory (only the test file `commit-msg-hook.test.mjs` is unlisted, which is fine).

## Not checked

- `verify.sh`'s jest step and pre-push `make check` were not timed (rules forbid the full suite); tsc time is a warm incremental run, cold is longer.
- `~/.claude` contents were not read (rules); names only.
- GitHub Actions permission settings and required checks beyond D's findings were not re-queried.
- The macOS ios-simulator workflow duration was not measured (no recent runs in the last 20).

## Strengths

- CI is fast and deterministic: Node pinned via `.nvmrc`, npm cache on, concurrency cancel-in-progress, timeout set, and one gate (`make check`) shared with pre-push.
- Fixed AI context is small (about 1.3k tokens): one CLAUDE.md, a manual-only skill, "never read by default" markers and archives kept off the default path.
- Rules are enforced by tools, not only prose: `commit-msg` rejects attribution, `check-doc-refs`, repo-hygiene and secret scan are in the gate, deny rules cover push, stash, reset --hard, --no-verify, `npm install`.
- The format hook touches only the edited file and is silent unless Biome has something to say; the Stop hook guards against loops with `stop_hook_active`.
- The Makefile is self-documenting (`make help`) and CONTRIBUTING explains why `make check` must not be piped.
