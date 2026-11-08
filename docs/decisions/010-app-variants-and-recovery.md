# 010 — App variants, and recovery from a database that will not open

Status: accepted · Sources: audit 2026-11 findings C-01, C-03, C-07, F-02, F-07 and the dev-state note in D-security; backlog A7-08; `docs/how-to/backups-and-recovery.md`

## Context

The audit found that nothing separated a development build on the owner's phone from the real app: no bundle identifier existed, so a dev client and a release install were the same app with the same database, and the dev-only starter profile could wipe real history. A failing database was a dead end (Try again re-ran the same failure), a corrupt file was reported as a fresh install, a database written by a newer build was opened by an older one as if it were current, and a migration that succeeded with wrong data could not be undone.

## Decision

**Variants.** `app.config.ts` replaces `app.json` and is driven by `APP_VARIANT`:

| `APP_VARIANT` | Name | Bundle id | Scheme |
|---|---|---|---|
| `production` | Habits | `com.akramelfadili.habits` | `habitsapp` |
| `development`, or unset | Habits Dev | `com.akramelfadili.habits.dev` | `habitsapp-dev` |
| `preview` | Habits Preview | `com.akramelfadili.habits.dev` | `habitsapp-dev` |

Preview deliberately does not take the production id: a preview build installed over the real app would replace it and open its data. Unset means development so a forgotten variable can never produce something that looks like the real app. An unknown value throws.

**Guards.** When `EAS_BUILD_PROFILE` is `production`, `app.config.ts` throws unless `APP_VARIANT` is `production` and neither `EXPO_PUBLIC_DEVICE_VALIDATION=1` nor `EXPO_PUBLIC_STARTER_PROFILE` is set. This is the "fail an EAS release build when the dev switch is set" mitigation from the security audit; there is no `eas.json` yet, so it takes effect at the first EAS setup. The manual simulator workflow sets `APP_VARIANT=production` explicitly (it keeps the `habitsapp` scheme the flows use) and `BUNDLE_ID`, which the config honours only when `EXPO_PUBLIC_DEVICE_VALIDATION=1`.

**Starter profile.** With no marker, the profile is refused if the database already has any entry, note or frozen day, unless the profile says `"replace": true` (`dev.starter_profile.refused`, counts only). A replace cancels the deleted habits' scheduled notifications.

**Backup before migrating.** On an upgrade plan only, `VACUUM INTO` writes a snapshot to a backups folder next to `habits.db`; the newest 3 are kept. A backup failure is logged and does not stop the migration, because the migrator is one atomic transaction: the backup protects against a migration that succeeds with wrong data, and requiring it would turn a full disk into an app that cannot update.

**Migration plan.** `planMigrations` returns `fresh` (genuinely empty), `current`, `upgrade`, `newer` or `unreadable`. A read error other than "no such table", or tables without any migration record, is `unreadable`.

**Newer data is blocked.** An older build never opens, migrates or writes data from a newer one: a screen with the explanation and Copy diagnostics, and no Try again. Downgrading is not supported; the way out is updating the app.

**Set aside, never delete.** From the second consecutive failure the error screen adds "Set aside old data and start fresh", behind a destructive-style confirm that states the old file stays on the phone. It renames `habits.db` and its `-wal`/`-shm` to `habits.corrupt-<timestamp>.db`, in the same folder, and opens a fresh database. A rename failure puts everything back and says so. The companions move with the main file because a stale WAL left beside a new file would be replayed into it.

## Consequences

- The dev variant is a separate app. The dev client has to be rebuilt and installed once under the new id; it starts empty (the starter profile fills it).
- No schema change. Recovery lives in `lib/db` (`client.ts`, `database-provider.tsx`, `database-backup.ts`, `database-files.ts`, `migration-plan.ts`, `recovery-state.ts`); the file work is isolated in `database-files.ts`.
- The release checklist must set `APP_VARIANT=production` for store builds.
- Set-aside files and backups use storage until someone deletes them. Delete-all-data (part B) must clear both.
- Restoring a backup is manual. An in-app restore and import from the JSON export remain open.
