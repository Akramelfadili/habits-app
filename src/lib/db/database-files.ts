import { Directory, File } from "expo-file-system";
import type { BackupFiles } from "./database-backup";

/**
 * The only place the database's own files are touched (backups folder, the
 * set-aside rename). A thin adapter over `expo-file-system`, like
 * `lib/file-export`, so the logic above it is tested with a fake and an SDK
 * change lands here. Everything lives next to `habits.db`, in the app's
 * Documents area, which an iOS device backup includes.
 */

const BACKUPS_FOLDER = "backups";

/** expo-sqlite reports a plain path; expo-file-system wants a file URI. */
export function toFileUri(path: string): string {
	return path.startsWith("file://") ? path : `file://${path}`;
}

function folderOf(databasePath: string): Directory {
	return new File(toFileUri(databasePath)).parentDirectory;
}

/** The backups folder next to the database file, created on first use. */
export function createBackupFiles(databasePath: string): BackupFiles {
	const directory = new Directory(folderOf(databasePath), BACKUPS_FOLDER);
	if (!directory.exists) directory.create({ intermediates: true });
	const fileOf = (name: string) => new File(directory, name);
	return {
		names: () => directory.list().map((item) => item.name),
		pathFor: (name) => decodeURI(fileOf(name).uri.replace(/^file:\/\//, "")),
		sizeOf: (name) => fileOf(name).size,
		rename: (from, to) => fileOf(from).move(fileOf(to)),
		remove: (name) => {
			const file = fileOf(name);
			if (file.exists) file.delete();
		},
	};
}

/** SQLite's companions to the main file: both belong to the same database. */
const SIDECARS = ["-wal", "-shm"];

/**
 * Renames the database file inside its own folder, with its `-wal` and `-shm`
 * companions (a stale one left beside a fresh `habits.db` would be replayed
 * into it). `newName` is the new main name, e.g. `habits.corrupt-<ts>.db`.
 * Never deletes and never overwrites: a name that exists is an error. The
 * caller has closed the database. On a failure part-way, what was already
 * renamed is put back, so the folder is as it was found.
 */
export function renameDatabaseFile(
	databasePath: string,
	newName: string,
): void {
	const main = new File(toFileUri(databasePath));
	const folder = main.parentDirectory;
	const pairs = [
		...SIDECARS.map((suffix) => ({
			from: new File(folder, `${main.name}${suffix}`),
			to: new File(folder, `${newName}${suffix}`),
		})),
		{ from: main, to: new File(folder, newName) },
	].filter((pair) => pair.from.exists || pair.from === main);

	if (pairs.some((pair) => pair.to.exists)) {
		throw new Error("set-aside target exists");
	}
	const moved: typeof pairs = [];
	try {
		for (const pair of pairs) {
			pair.from.move(pair.to);
			moved.push(pair);
		}
	} catch (error) {
		for (const pair of moved.reverse()) {
			try {
				pair.to.move(pair.from);
			} catch {
				// Nothing more can be done; the original error is the one to report.
			}
		}
		throw error;
	}
}
