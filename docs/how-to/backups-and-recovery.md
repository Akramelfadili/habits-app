# Backups and recovery

What the app does to protect the database, and what you do by hand when it is not enough. Why these choices: [ADR 010](../decisions/010-app-variants-and-recovery.md).

## Which app is which

| Variant (`APP_VARIANT`) | Name | Bundle id | Scheme |
|---|---|---|---|
| `production` | Habits | `com.akramelfadili.habits` | `habitsapp` |
| `development` (default when unset) | Habits Dev | `com.akramelfadili.habits.dev` | `habitsapp-dev` |
| `preview` | Habits Preview | `com.akramelfadili.habits.dev` | `habitsapp-dev` |

Each bundle id is a separate app with its own database, so a dev client never touches the real app's data. `app.config.ts` reads the variable; `npx expo start` and `npx expo run:ios` use the dev variant unless you set `APP_VARIANT=production`. The dev client for this id has to be built and installed once, next to any older one.

## The automatic backup

- **When:** on the first launch after an update that has a migration to run (plan "upgrade"), after the update screen is up and before the migrator starts. Not on a fresh install and not when the data is already current.
- **What:** a consistent snapshot of the open database, made with SQLite's `VACUUM INTO` (it includes everything committed, WAL included).
- **Where:** in the app's Documents area, in the `SQLite` folder next to `habits.db`, in a `backups` folder. An iOS device backup (iCloud or a Mac) includes that area.
- **Name:** `habits-<UTC time>-v<migrations applied>.db`, for example `habits-20261108T101500Z-v11.db`: the time it was taken and the schema version of the data it holds (the old one, not the new one).
- **How many:** the newest 3. After a new backup is complete, older ones are deleted. Files that do not match the name pattern are never touched. A half-written copy has a `.partial` suffix and is removed.
- **If it fails** (disk full, no permission): `migration.backup_failed` is logged with the error's name, and the update goes on. The migrator is one atomic transaction, so a failed update leaves the old data in place anyway; the backup is for an update that succeeds with wrong data. `migration.backup_done` logs the size in bytes.
- One backup per launch: Try again on a failed update does not take another.

## Restore a backup by hand

There is no restore button. With the app closed:

1. Get the app's container. Simulator: `xcrun simctl get_app_container booted com.akramelfadili.habits data`. Phone: Xcode → Window → Devices and Simulators → pick the phone → pick Habits → ⋯ → Download Container (a restored device backup works the same once the app is installed).
2. In the container open the Documents area, then `SQLite`. Move `habits.db` and any `habits.db-wal` and `habits.db-shm` out of the way (keep them, do not delete).
3. Copy the backup you want into `SQLite` and rename the copy to `habits.db`.
4. Put the container back (Replace Container in Xcode, or copy the folder on the Simulator) and open the app.

The backup is older than the build that took it, so the next launch runs the update again and takes a new backup. A backup made by a newer build than the one installed is "data from a newer version": the app refuses it (see below) until it is updated.

## When the app cannot open its data

| Screen | Cause | What it offers |
|---|---|---|
| Couldn't open your data / Update didn't finish | The file would not open, or a migration threw. The migrator rolls back whole. | Try again, Copy diagnostics. After the **second** failure in a row, also **Set aside old data and start fresh**. |
| Update needed ("This data was made by a newer version of Habits. Update the app to open it.") | The last applied migration is newer than any this build ships, for example an older TestFlight build over a newer one. | Copy diagnostics only. Nothing is opened, migrated or written. Update the app. |

An unreadable file (corrupt, I/O error, or tables with no migration record) is treated as a failure, never as a first install: the migrator and the backup do not run on it.

### What "set aside" does

After a confirm that says the old file is kept on the phone, the app closes the database and renames `habits.db`, with its `-wal` and `-shm` companions, to `habits.corrupt-<UTC time>.db` (and `.db-wal`, `.db-shm`) in the same folder, then opens a new empty database and runs the migrations. It never deletes anything and never overwrites an existing file. If the rename fails, nothing changes and the sheet says so. `database.set_aside` is logged.

The app opens empty (First Run shows). Settings such as the Appearance choice start from their defaults; the backups folder is untouched.

### Recover a set-aside file

1. Get the container as above and copy `habits.corrupt-<time>.db` (with its companions, if present) to a Mac.
2. Try it as it is: `sqlite3 habits.corrupt-<time>.db "PRAGMA integrity_check;"`. If it is readable, `.recover` or `.dump` into a new database gets the rows out.
3. To bring it back into the app: with the app closed, move the new `habits.db` aside, copy the file in as `habits.db` and open the app.

If the app is killed in the few milliseconds between the renames, the next launch can open `habits.db` without its WAL file and committed data looks missing; nothing is deleted, and the files are all in the same folder.

Set-aside files are not cleaned up automatically. They stay until you delete them.

## Not covered yet

Delete-all-data and the lossless export v2 are in part B (`docs/backlog.md`). The JSON export is not a full backup (audit C-02), and there is no import.
