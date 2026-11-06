# 002 — Foreign keys stay off on the device

Status: accepted · Sources: `docs/archive/audit.md` A7-04, A11-02; `docs/backlog.md` ("Orphan risks with foreign keys off"); `src/lib/db/migrations/0010_empty_iron_man.sql`; `src/lib/db/migrations.safety.test.ts`

## Context

SQLite only enforces foreign keys when `PRAGMA foreign_keys=ON` is set per connection. `expo-sqlite` does not set it, and `src/lib/db/client.ts` doesn't either, so on device the `REFERENCES` clauses in `schema.ts` are documentation. Every FK is `ON DELETE NO ACTION` (A7-04).

The tests run on `node:sqlite` with foreign keys **on**, which is stricter than production. HAB-24's table rebuild (migration 0010) failed there with `FOREIGN KEY constraint failed`. Drizzle's migrator runs all pending migrations inside one `BEGIN…COMMIT`, where `PRAGMA foreign_keys` is a no-op, so the usual `foreign_keys=OFF` rebuild pattern can't work (A11-02).

The audit offered two options: keep them off and assert integrity in tests, or turn them on after migrations and make every delete path delete children first.

## Decision

Keep foreign keys **off** on device (backlog: "decision: keep them off").

Compensate in code and tests:
- `deleteHabitAndHistory` and `deleteCategory` delete or move every child row explicitly, in one transaction.
- Reads tolerate a dangling category: `resolveHabitCategory` falls back to "Other".
- `migrations.safety.test.ts` upgrades every migration step from a seeded database with child rows, with FKs both **on and off**, and fails any migration that relies on `PRAGMA foreign_keys`.
- Table rebuilds use `PRAGMA defer_foreign_keys=ON`, which does work inside the migrator's transaction and resets at COMMIT.
- `habit-repository.integrity.test.ts` checks the delete paths leave no orphans.

## Consequences

- A write the code forgets to clean up can leave orphans silently. Known open cases (backlog):
  - dev-only `deleteAllHabits`;
  - a stale Undo or open sheet writing for a habit deleted meanwhile;
  - `deleteCategory` racing a `createHabit`;
  - a stale `categoryId` in `createHabit`.
- Every new table or delete path must add its children to the explicit deletes and to the integrity test. `.claude/agents/migration-reviewer.md` checks schema changes for this.
- Turning FKs on later is still possible. It would need a `PRAGMA foreign_key_check` cleanup migration first, plus a device check of the actual pragma value (audit §17, not yet done).
