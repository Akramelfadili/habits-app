import { log } from "@/lib/logger/logger";
import { errorNameOf } from "./error-name";

// `VACUUM INTO` gives a consistent snapshot (WAL included), which a plain copy of a live WAL
// database does not. It writes a `.partial` name renamed only when complete, so a half-written
// file is never taken for a backup. Failures are swallowed: the migrator is one atomic transaction.

export const BACKUPS_TO_KEEP = 3;

const PARTIAL_SUFFIX = ".partial";
const BACKUP_NAME = /^habits-(\d{8}T\d{6}Z)-v(\d+)\.db$/;

export type BackupSource = {
	getFirstSync: <Row>(source: string) => Row | null;
	runSync: (source: string, ...params: string[]) => unknown;
};

export type BackupFiles = {
	names: () => string[];
	pathFor: (name: string) => string;
	sizeOf: (name: string) => number;
	rename: (from: string, to: string) => void;
	remove: (name: string) => void;
};

export type BackupResult =
	| { status: "done"; name: string; bytes: number }
	| { status: "failed" };

// UTC, so file order does not depend on the phone's time zone.
export function utcStamp(now: number): string {
	const instant = new Date();
	instant.setTime(now);
	return instant
		.toISOString()
		.replace(/[-:]/g, "")
		.replace(/\.\d+Z$/, "Z");
}

export function backupName(schemaVersion: number, now: number): string {
	return `habits-${utcStamp(now)}-v${schemaVersion}.db`;
}

function appliedMigrations(database: BackupSource): number {
	const row = database.getFirstSync<{ n: number }>(
		"SELECT COUNT(*) AS n FROM __drizzle_migrations",
	);
	return Number(row?.n ?? 0);
}

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

// Logs the error's name only: a path or message could carry the user's folder names.
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
			log.warn("migration.backup_prune_failed", {
				errorName: errorNameOf(error),
			});
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
		log.error("migration.backup_failed", { errorName: errorNameOf(error) });
		return { status: "failed" };
	}
}
