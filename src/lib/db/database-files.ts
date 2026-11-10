import { Directory, File } from "expo-file-system";
import type { BackupFiles } from "./database-backup";

// Everything lives next to `habits.db` in the Documents area, which an iOS device backup includes.

const BACKUPS_FOLDER = "backups";

export function toFileUri(path: string): string {
	return path.startsWith("file://") ? path : `file://${path}`;
}

function folderOf(databasePath: string): Directory {
	return new File(toFileUri(databasePath)).parentDirectory;
}

export function createBackupFiles(databasePath: string): BackupFiles {
	const directory = new Directory(folderOf(databasePath), BACKUPS_FOLDER);
	if (!directory.exists) directory.create({ intermediates: true });
	const fileOf = (name: string) => new File(directory, name);
	return {
		names: () => directory.list().map((item) => item.name),
		pathFor: (name) => decodeURI(fileOf(name).uri.replace(/^file:\/\//, "")),
		sizeOf: (name) => fileOf(name).size,
		rename: (from, to) => fileOf(from).moveSync(fileOf(to)),
		remove: (name) => {
			const file = fileOf(name);
			if (file.exists) file.delete();
		},
	};
}

const SIDECARS = ["-wal", "-shm"];

// The `-wal` and `-shm` companions move too: a stale one left beside a fresh `habits.db` would be
// replayed into it. Never deletes or overwrites; a failure part-way puts back what was renamed.
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
	// `moveSync()` repoints the File it is called on at the destination, so the rollback needs the original URIs.
	const moved: Array<{ fromUri: string; toUri: string }> = [];
	try {
		for (const pair of pairs) {
			const fromUri = pair.from.uri;
			const toUri = pair.to.uri;
			pair.from.moveSync(pair.to);
			moved.push({ fromUri, toUri });
		}
	} catch (error) {
		for (const { fromUri, toUri } of moved.reverse()) {
			try {
				new File(toUri).moveSync(new File(fromUri));
			} catch {
				// Nothing more can be done; the original error is the one to report.
			}
		}
		throw error;
	}
}
