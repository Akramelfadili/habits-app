# 009 — Sync readiness: V4 sync is parked, no schema work now

Status: accepted · Sources: audit 2026-11 B (`docs/archive/audits-2026-11/B-scalability.md` § "Sync readiness"), C-05 / H-06, ADR 001, ADR 002

## Context

The app is local-only: one SQLite database on one phone, no backend, no account. A
V4 with sync across devices has been discussed but has no spec, no date and no
transport. The 2026-11 audit found that the data model cannot sync as it is:
integer ids, hard deletes, no per-row clock. Adding sync columns now would mean a
migration (with its own risk to real history) for a feature that may never ship,
and the JSON import that a sync would build on does not exist yet.

## Decision

**V4 sync is parked. No schema work for it now.** No uuid, `updatedAt` or
`deletedAt` columns, no change log, no conflict code until V4 is planned.

What a sync would need, for when it is:

| Need | Today | Change |
|---|---|---|
| Stable ids (`uuid`) | integer autoincrement on all 6 tables | a `uuid` text column per table, backfilled; built-in categories get fixed uuids; export and import by uuid; integer ids stay local |
| Per-row clock (`updatedAt`) | only on habits and entry_notes | `updatedAt` (ms) on every mutable table, set in every repository write |
| Deletes (`deletedAt`) | hard delete everywhere | `deletedAt` tombstones (or a `change_log` table) and a purge job |
| Conflict rules | none written | entries and frozen days: union plus tombstones; habits, categories, reminders: row last-writer-wins by `updatedAt`; `sortOrder`: fractional index; `app_settings` split into per-device and synced keys |
| Time zones | seconds-precision epochs, zone-less local day keys, no zone stored | keep day keys zone-less; store the zone or offset at write; ms or a hybrid logical clock for tie-breaks |
| Integrity | foreign keys off on device (ADR 002), orphan risks in the backlog | apply parents first, `PRAGMA foreign_key_check`, tombstone-aware child cleanup |

## When V4 starts

In this order, each its own change:

1. **Ship export v2 first**, keyed by uuid, with its import, so a phone's history can be saved and restored before anything else moves.
2. **Back up the database before migrating** (`habits.db` → `habits.db.bak`, backlog "Release prerequisites").
3. **Then one migration** adding `uuid` + `updatedAt` + `deletedAt` to every table, reviewed by the `migration-reviewer` agent (foreign keys ON in the test, the whole chain in one transaction, child rows present, `PRAGMA defer_foreign_keys` for rebuilds).

Only after that: routing every write through repositories that set the new columns, the conflict rules above, and a transport.

## Consequences

- No migration risk today for a feature without a plan.
- The repository seam (ADR 001) stays the place a sync layer would plug in; nothing outside `repositories/` should start depending on integer ids being global.
- The JSON import (backlog "Release prerequisites") is the first sync-shaped feature. If it ships before V4, build it so its format can carry uuids later, or plan for an export v2.
- Revisit this ADR when a V4 spec exists.
