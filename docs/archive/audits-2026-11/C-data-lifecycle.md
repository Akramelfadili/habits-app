# C — Data lifecycle (audit 2026-11)

Scope: migrations and their wiring, open/corruption failure, export format, delete-all, notification drift, starter-habits dev profile. Read-only audit, no code run.

Summary: 7 findings. High 0, Med 3, Low 4. The migration path itself is in very good shape (one atomic transaction, journal-order test, rollback test, FK on/off upgrade test, update and failure screens). The weak points are (1) what happens when a migration or open failure persists, (2) a JSON export that is not lossless, and (3) a dev-only starter profile that deletes every habit with no guard on a build that, as far as app.json shows, shares its bundle with the daily-use app.

## Findings

### C-01 — Starter profile wipes all habits in any dev build, with no backup or guard
- Severity: Med
- Effort: S
- Evidence: src/modules/habits/repositories/starter-profile-repository.ts:38-43 (deletes entries, notes, freezes, reminders, habits unconditionally); src/modules/habits/services/starter-profile-service.ts:44-47 (only condition is marker != profile.version); src/modules/habits/screens/starter-profile-gate.tsx:25 (runs on every dev launch, splash held); docs/how-to/starter-habits.md ("raise `version` ... wipes the app's habits"); app.json has only `scheme` and `ios.icon` (no `bundleIdentifier`, no app variant), and there is no app.config.* or eas.json, so nothing separates a dev-client build's sandbox from a release install of the same app.
- Why it matters: production bundles do not contain the code (guarded by `__DEV__ ? require`, the `starter-profile-site` rule in scripts/check-architecture.mjs:427-455, and tests), so a store build is safe. The remaining risk is the person's own phone: a dev build on the device that holds real history applies the profile on first launch (marker absent) or whenever `version` is bumped, and the real habits, logs and notes are deleted in one transaction. There is no export prompt, no check that the DB already holds entries, and no `isDevelopmentBuild-only-on-simulator` condition. Also, no notification cancel for the deleted habits: only the new ones are synced (service:50-52); stale schedules rely on the next launch reconcile, which needs permission already granted.
- Fix: Refuse (log `dev.starter_profile.refused`) when the DB has any entry/note/freeze and the marker is absent, unless an explicit `"replace": true` is in the profile; or give dev builds their own bundle identifier via an app.config variant so they never share data with the real install.
- Needs: design decision

### C-02 — JSON export (v1) is not a lossless backup: several stored facts are missing
- Severity: Med
- Effort: M
- Evidence: src/modules/habits/domain/export-json.ts:23-47 (habit fields written) and :55-62 (categories written as name, builtIn, order only); schema columns they omit: src/lib/db/schema.ts:43 `categories.hue`, :28 `categories.shape`, :50 `categories.createdAt`, :92 `habits.sortOrder`, :100 `habits.pausedRanges`, :101-102 `habits.createdAt/updatedAt`, :121 `entries.createdAt`, :143 `frozen_days.createdAt`, :166 `entry_notes.updatedAt`, :192 `reminders.createdAt`; `grep pauses src/modules/habits/domain/export-*.ts` finds nothing (the Habit's `pauses` are read at habit-repository.ts:94); app_settings keys (src/lib/app-settings/keys.ts:2, src/modules/habits/constants.ts:128-162: theme, evening review on/off and time, first-run seen, last export) are not exported.
- Why it matters: backlog already says the import (HAB-15 import) is missing and lists what the file carries. New evidence is what it lacks for a rebuild. The most damaging gap is `pausedRanges`: streak math skips archived periods (schema.ts:95-99), so a restored habit would show its streak broken or reset after a lost phone, while the file's own `currentStreak`/`longestStreak` would disagree with the recomputed ones. Custom categories lose their shape and hue (the icon and colour of every habit in them, since habits take both from the category). Habit order inside a category is only implicit in array order, `createdOn` drops the time (it is the streak start boundary), and entry/note creation times are lost. Because `version: 1` files are already being written and kept as the only backup, fixing the layout before an importer exists is cheap, later it needs a v2 reader plus a v1 fallback.
- Fix: add `pauses`, category `shape`/`hue`, habit `order`, ISO `createdAt`/`archivedAt`, entry `loggedAt`, and a `settings` object; bump `version` to 2 (additive) and add a round-trip test (export, import into a clean test DB, compare snapshot).
- Needs: none

### C-03 — A persistent open or migration failure is a dead end with no way out
- Severity: Med
- Effort: M
- Evidence: src/lib/db/database-provider.tsx:47-58 and :103-110 (error screen offers only `onRetry`, which reopens or remounts the migrator); src/components/ui/composite/error-screen.tsx:21,46,57-58 (Try again and Copy diagnostics only); src/lib/db/client.ts:19-33 (open failure is kept, db replaced by a throwing proxy); src/lib/db/migration-plan.ts:30-37 (any error reading `__drizzle_migrations`, including a corrupt file or an IO error, is reported as "fresh", so a corrupt upgrade is treated as a first install and shown the open-failed copy, not the update-failed copy).
- Why it matters: the in-code comment says Retry "mainly helps with transient errors". A corrupt `habits.db`, a full disk or a migration that throws on real data fails the same way on every launch. The person cannot export what is readable, cannot copy the file, and cannot start fresh; the only exits are reinstalling (the data is lost unless an iOS device backup contains it) or an app update. Backlog "back up before migrating (A7-08)" would help only the migration case, not corruption or open failure. No test covers a corrupt file (migration tests use well-formed fixtures: src/lib/db/migrations.rollback.test.ts, migrations.safety.test.ts).
- Fix: on a second consecutive failure, add a confirm-gated "Set aside the old data and start fresh" action that renames `habits.db` to `habits.corrupt-<ts>.db` (kept in Documents, so a later build or support can recover it); make `planMigrations` return a distinct "unreadable" plan instead of "fresh".
- Needs: design decision

### C-04 — No in-app delete-all-data; leftovers a future one must clear
- Severity: Low
- Effort: S
- Evidence: grep for delete-all / erase / reset in src/ finds no user-facing path (Settings has only Appearance, Notifications, Evening review, Freezes, About, Export: src/modules/habits/screens/settings-*.tsx); data lives in `habits.db` (src/lib/db/client.ts:21), a separate `logs.db` (src/lib/logger/repositories/log-repository.ts:12,18,63), OS-scheduled notifications (src/lib/notifications/notifications.ts:189-212), and the export file in `Paths.cache/exports`, which is removed only when the next export starts (src/lib/file-export/file-export.ts:20-29, caller src/modules/habits/services/export-service.ts:93).
- Why it matters: the app has no account, so uninstalling erases everything and App Store policy does not require an in-app delete. Still: the plain JSON file of every habit name and note stays in the cache until the next export, and "start over" without reinstalling is impossible (this also matters for C-03). A future delete-all must clear five stores (db rows plus sqlite_sequence, notifications by prefix, logs.db via clearLogEntries, cache exports, `habits.lastExport`/seen-first-run settings); the dev `replaceAllData` (src/modules/habits/repositories/dev-state-repository.ts:24-35) is a model for the DB part but touches neither notifications nor files.
- Fix: call `clearExports()` when the export sheet is dismissed (Done) or on app start; defer a delete-all row until C-03's fresh-start action exists and reuse it.
- Needs: design decision

### C-05 — ADR 002 and the backlog still describe a `deleteAllHabits` that no longer exists
- Severity: Low
- Effort: S
- Evidence: docs/decisions/002-foreign-keys-off-on-device.md:27 and docs/backlog.md:99 item (1) ("dev-only `deleteAllHabits` leaves entries/notes/freezes/reminders behind"); `grep -rn deleteAllHabits src` returns nothing (removed with chore/remove dev controls, #48). The two remaining destructive paths, `replaceHabitsWithStarterProfile` (starter-profile-repository.ts:38-43) and `replaceAllData` (dev-state-repository.ts:24-35), do delete children first and are covered by their own tests.
- Why it matters: a known orphan risk is listed as open when it is gone, so someone may spend time on it, and ADR 002's "Consequences" list is the checklist reviewers use.
- Fix: strike item (1) in the backlog and the first bullet in ADR 002 (leave a one-line "removed in #48").
- Needs: none

### C-06 — After a restore to a new phone, reminders stay silent until a manual permission grant and a relaunch
- Severity: Low
- Effort: S
- Evidence: src/modules/habits/services/reminder-reconcile-service.ts:86-95 (returns at once unless permission is already "granted"); src/modules/habits/hooks/use-startup-actions.ts:12-18 (once per JS runtime); src/lib/notifications/use-notification-permission.ts:46-52 (granting only updates state, no reschedule of existing reminders); src/app/_layout.tsx:79 (single call site).
- Why it matters: backlog already lists "reconcile only runs when permission is already granted at launch". New evidence is the concrete case: an iCloud/device-backup restore (or a reinstall after C-03) brings back the `reminders` table but no OS schedules, and the permission is "undetermined" on the new install, so the launch reconcile skips it. The person sees enabled reminders in the app that never fire; granting permission when creating one new reminder schedules only that habit.
- Fix: run the reconcile after `ensureNotificationPermission()` returns "granted" and when the app returns to the foreground with a changed permission.
- Needs: phone test

### C-07 — A newer database opened by an older build is treated as "current"
- Severity: Low
- Effort: S
- Evidence: src/lib/db/migration-plan.ts:38-39 (`Number(last.created_at) < newestMigrationAt ? "upgrade" : "current"`, so a newer last-applied row is "current"); src/lib/db/schema-version.ts:4; no check that the database's migration count is not above `SCHEMA_VERSION`.
- Why it matters: installing an older TestFlight build over a newer one (or restoring an old binary) runs old code against a newer schema; a later migration that adds a NOT NULL column would make every insert fail with a generic error, and nothing says why. Unlikely for a single-user app, cheap to detect.
- Fix: when the last applied `created_at` is greater than the newest journal `when`, return a plan "newer" and show the open-failed screen with copy "this data was made by a newer version".
- Needs: design decision

## Checked and fine (no finding)
- Journal `when` strictly increasing and one .sql file per entry: src/lib/db/migrations.safety.test.ts:41-47; all 12 entries are in order (src/lib/db/migrations/meta/_journal.json).
- Failed migration leaves the old schema and rows: src/lib/db/migrations.rollback.test.ts (forces a failure after the last statement of the 0009-0011 chain from a V1-era fixture, src/lib/db/__fixtures__/v1-era-0008.sql).
- Copy on the error screen ("as they were") is true because the migrator is one BEGIN..COMMIT (database-error-screen.tsx doc comment); the update screen is shown before the migrator starts (database-provider.tsx:73-82).
- Open failure does not crash at import: client.ts:19-33 keeps the error, `DatabaseProvider` renders the recovery screen and hides the splash (database-error-screen.tsx:26-29).
- Every user-visible table is in the export (habits, entries, notes, frozen days, reminders, categories) and the CSV/JSON share one model (`buildExportModel`, export-data.ts:70-130).
- Starter profile in production: the only import is `__DEV__ ? require(...)` (src/app/_layout.tsx:44-46), the env var is read only in the gate file, and architecture rule `starter-profile-site` enforces both. The `habitsapp://dev-state` route is built into the production bundle but redirects unless `EXPO_PUBLIC_DEVICE_VALIDATION=1` (src/modules/habits/screens/dev-state-screen.tsx:24,50) and its `replaceAllData` runs only behind that flag.

## Not checked
- Migrations 0000-0008 from the oldest installed versions: only the committed 0008-era fixture and per-step upgrades in tests were read, not run. Device behaviour of the update screen and a real corrupt file need a phone.
- Whether `PRAGMA foreign_keys` is really off on device (ADR 002 says the device check is not done).
- Whether `useStartupActions` mounts after the starter-profile gate (so the reconcile can clean the wiped habits' notifications): `_layout.tsx:115-168` not read in full.
- Whether iOS includes `Documents/SQLite/habits.db` in device backups (default for expo-sqlite, not verified).

## Strengths
- Migration safety is tested at the right level: journal order, file parity, drift against schema.ts, every step with FKs on and off, and a forced rollback from a V1-era fixture.
- Migration 0010 and 0011 data fixes are written as single-transaction, `defer_foreign_keys`, deterministic SQL with temp tables dropped inside the chain.
- The database open and migration failures land on a recovery screen with logged diagnostics instead of a crash or a blank splash.
- Reconcile is conservative (never asks for permission, never throws, only touches non-matching habits, cancels notifications for deleted habits).
- The starter-profile dev feature is gated by three independent mechanisms (`__DEV__` require, env read in one file, architecture rule with tests) and applies in one transaction with a version marker.
