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

/**
 * Renames the database file inside its own folder; never deletes. The caller
 * has closed the database. Refuses to overwrite: a name that exists is an error.
 */
export function renameDatabaseFile(
	databasePath: string,
	newName: string,
): void {
	const file = new File(toFileUri(databasePath));
	const target = new File(file.parentDirectory, newName);
	if (target.exists) throw new Error("set-aside target exists");
	file.move(target);
}
