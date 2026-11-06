# Contributing

How changes get into this repo. The rules themselves are in `CLAUDE.md`; the reasons in `docs/architecture.md` and `docs/decisions/`; the tools in `docs/dev-tooling.md`.

## Branches, commits, pull requests

- `master` is always releasable. Work on a branch: `feat/hab-<id>-<slug>` for a ticket (one ticket per branch and PR), `fix/…`, `chore/…`, `docs/…` otherwise.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(today): …`, `fix(db): …`, `refactor(habits): …`, `test: …`, `docs: …`, `ci: …`, `chore: …`. One logical step per commit. `make check` green before each one.
- No `Co-Authored-By` or any other attribution line in commit messages or PR descriptions.
- A PR describes what changed and why, lists the baselines that changed, and links the spec section (`HAB-<id>`). CI (`.github/workflows/check.yml`) runs `make check` on every PR.

## The gate

```bash
make check     # Biome (no writes) + tsc + Jest + tooling tests + check-architecture
```

It also runs on `git push` (`.husky/pre-push`) and in CI. Jest skips tests named `*.slow.test.ts(x)` (today: the per-week equivalence test, ~25 s); CI runs them after `make check` with `npm run test:slow` (`make test-slow`). Run them yourself when you touch the code they cover. Name a test `.slow.test.ts` only when it is slow by design (a randomised or exhaustive check), not to hide a slow unit test. Never add an allowlist entry (`scripts/check-architecture.allowlist.json`) or raise the token baseline to get green: fix the code. Both files may only shrink.

## Visual check

`npm run visual-check` renders every screen state on the web build and diffs it against `docs/visual-baseline/`. Run it on the screens you touched, in light and dark. Review `.visual-checks/report.html`, and only then accept intended changes with `npm run visual-check -- --update-baseline`. Commit the new PNGs with the change. Chromium setup on WSL: `docs/dev-tooling.md`. It is not part of `make check`.

## Adding a migration

1. Change `src/lib/db/schema.ts`, then `npx drizzle-kit generate`. Check the SQL it wrote and `migrations/migrations.js`. Edits under `src/lib/db/migrations/` need the owner's approval.
2. Remember that all pending migrations run in **one transaction** (ADR 002). `PRAGMA foreign_keys` is a no-op there, so a table rebuild uses `PRAGMA defer_foreign_keys=ON`.
3. `src/lib/db/migrations.safety.test.ts` must pass. It upgrades each step from a seeded database with child rows, with foreign keys on and off, and checks drift against `schema.ts`. Add seed rows for any new table.
4. A new repository ships a `.web.ts` twin with identical exports. New child tables join the explicit deletes and the integrity test.
5. Run the `migration-reviewer` subagent (`.claude/agents/migration-reviewer.md`) before calling it done.

## Building a feature with Claude Code

`/implement-feature <id>` (`.claude/skills/implement-feature/SKILL.md`):

1. Resolve the spec section and design docs.
2. Explore and search for reuse.
3. Plan and wait for "Go".
4. Implement with colocated tests.
5. Run `make check` and visual-check.
6. Run `spec-reviewer` (+ `migration-reviewer` for schema changes).
7. Report, log deviations in `docs/backlog.md`, and add an "As built" note to the spec.

Commit only when the task says so (one commit per step); never push.

## Session rules

Rules for working with Claude Code (and anyone else) in this repo, with the incident behind each:

- **One Claude session per working copy at a time.** Concurrent edits once corrupted `package.json` and the settings file.
- **Never run `git stash`.** It once applied an old stash and conflicted 26 files. Denied in `.claude/settings.json`.
- **Never skip hooks with `--no-verify`.** The hooks are the gate. Denied in `.claude/settings.json`.
- **If a push is denied, stop and ask.** Do not retry or work around it.
- **No attribution lines in commits or PR descriptions.** The `.husky/commit-msg` hook rejects them.
- **Commit per step when the task says so; never push.** The owner pushes.
