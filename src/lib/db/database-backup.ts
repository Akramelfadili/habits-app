import { log } from "@/lib/logger/logger";

/**
 * A copy of `habits.db` taken just before the migrator runs on an upgrade
 * (backlog A7-08, docs/how-to/backups-and-recovery.md). A migration that
 * succeeds with wrong data cannot be undone; this is the way back.
 *
 * `VACUUM INTO` writes a consistent snapshot of the open database (committed
 * rows, WAL included) to a new file, which a plain file copy of a live WAL
 * database does not guarantee. The copy goes to a `.partial` name and is
 * renamed only when complete, so a half-written file is never taken for a
 * backup. Any failure is logged and swallowed: the migrator is one atomic
 * transaction, so an upgrade without a backup is as safe as it was before.
 */

/** Newest backups kept, the one just taken included. */
export const BACKUPS_TO_KEEP = 3;

const PARTIAL_SUFFIX = ".partial";
const BACKUP_NAME = /^habits-(\d{8}T\d{6}Z)-v(\d+)\.db$/;

/** The slice of expo-sqlite's database the backup reads and writes through. */
export type BackupSource = {
	getFirstSync: <Row>(source: string) => Row | null;
	runSync: (source: string, ...params: string[]) => unknown;
};

/** The backups folder, as the backup needs it. The real one is `database-files.ts`. */
export type BackupFiles = {
	/** Every file name in the backups folder. */
	names: () => string[];
	/** The path SQLite writes a named file to. */
	pathFor: (name: string) => string;
	sizeOf: (name: string) => number;
	rename: (from: string, to: string) => void;
	/** Missing files are not an error. */
	remove: (name: string) => void;
};

export type BackupResult =
	| { status: "done"; name: string; bytes: number }
	| { status: "failed" };

/** `habits-20261108T101500Z-v12.db`: sortable by time, with the schema it holds. */
export function backupName(schemaVersion: number, now: number): string {
	// UTC, so retention order does not depend on the phone's time zone.
	const instant = new Date();
	instant.setTime(now);
	const stamp = instant
		.toISOString()
		.replace(/[-:]/g, "")
		.replace(/\.\d+Z$/, "Z");
	return `habits-${stamp}-v${schemaVersion}.db`;
}

function appliedMigrations(database: BackupSource): number {
	const row = database.getFirstSync<{ n: number }>(
		"SELECT COUNT(*) AS n FROM __drizzle_migrations",
	);
	return Number(row?.n ?? 0);
}

/** Deletes the oldest finished backups beyond the newest `BACKUPS_TO_KEEP`, and any stale partial. */
function prune(files: BackupFiles): void {
	const names = files.names();
	for (const name of names) {
		if (name.endsWith(PARTIAL_SUFFIX)) files.remove(name);
	}
	const finished = names
		.filter((name) => BACKUP_NAME.test(name))
		.sort((a, b) => {
			const left = BACKUP_NAME.exec(a)?.[1] ?? "";
			const right = BACKUP_NAME.exec(b)?.[1] ?? "";
			return right.localeCompare(left) || b.localeCompare(a);
		});
	for (const name of finished.slice(BACKUPS_TO_KEEP)) files.remove(name);
}

/**
 * Takes the backup. Never throws. Logs `migration.backup_done` (size only) or
 * `migration.backup_failed` (the error's name only: a path or message could
 * carry the user's folder names).
 */
export function backupBeforeMigrating(
	database: BackupSource,
	openFiles: () => BackupFiles,
	now: number,
): BackupResult {
	let partial: string | undefined;
	let files: BackupFiles | undefined;
	try {
		files = openFiles();
		const schemaVersion = appliedMigrations(database);
		const name = backupName(schemaVersion, now);
		partial = `${name}${PARTIAL_SUFFIX}`;
		files.remove(partial);
		database.runSync("VACUUM INTO ?", files.pathFor(partial));
		files.remove(name);
		files.rename(partial, name);
		partial = undefined;
		const bytes = files.sizeOf(name);
		try {
			prune(files);
		} catch (error) {
			log.warn("migration.backup_prune_failed", { errorName: nameOf(error) });
		}
		log.info("migration.backup_done", { bytes, schemaVersion });
		return { status: "done", name, bytes };
	} catch (error) {
		if (partial && files) {
			try {
				files.remove(partial);
			} catch {
				// Pruned with the next backup.
			}
		}
		log.error("migration.backup_failed", { errorName: nameOf(error) });
		return { status: "failed" };
	}
}

function nameOf(error: unknown): string {
	return error instanceof Error ? error.name.toLowerCase() : "nonerror";
}
