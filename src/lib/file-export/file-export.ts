import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/**
 * Thin adapter over `expo-file-system` and `expo-sharing` for the data export
 * (HAB-15) — the only place that touches either, so a service stays testable
 * with a mock and SDK API changes land in one file (same idea as
 * `lib/notifications`). Files live in the cache's `exports/` folder: the user
 * takes a copy out through Share or Save to Files, and the next export clears
 * whatever is left behind.
 */

export type WrittenFile = {
	uri: string;
	name: string;
	sizeBytes: number;
};

function exportsDirectory(): Directory {
	const directory = new Directory(Paths.cache, "exports");
	if (!directory.exists) directory.create({ intermediates: true });
	return directory;
}

/** Removes every earlier export — a stale file never lingers past the next one. */
export function clearExports(): void {
	const directory = exportsDirectory();
	for (const item of directory.list()) item.delete();
}

/** Writes UTF-8 text to a scratch path that is never mistaken for a finished export. */
export function writeScratchFile(content: string): WrittenFile {
	const name = `export-${Date.now()}.partial`;
	const file = new File(exportsDirectory(), name);
	file.create({ overwrite: true });
	file.write(content, { encoding: "utf8" });
	return { uri: file.uri, name, sizeBytes: file.size };
}

/** Gives a finished scratch file its real name — the "move on success" step. */
export function promoteScratchFile(
	scratch: WrittenFile,
	finalName: string,
): WrittenFile {
	const target = new File(exportsDirectory(), finalName);
	if (target.exists) target.delete();
	const file = new File(scratch.uri);
	file.move(target);
	return { uri: file.uri, name: finalName, sizeBytes: file.size };
}

/** Deletes a file if it's still there — safe to call twice. */
export function discardFile(uri: string): void {
	try {
		const file = new File(uri);
		if (file.exists) file.delete();
	} catch {
		// Already gone, or never created — either way nothing is left on disk.
	}
}

export async function shareFile(uri: string, mimeType: string): Promise<void> {
	await Sharing.shareAsync(uri, { mimeType, UTI: utiFor(mimeType) });
}

function utiFor(mimeType: string): string {
	return mimeType === "application/json"
		? "public.json"
		: "public.comma-separated-values-text";
}

/**
 * "Save to Files": the system folder picker, then a copy of the export into
 * the chosen folder. Resolves false when the person backs out of the picker.
 */
export async function saveFileToFolder(uri: string): Promise<boolean> {
	let folder: Directory;
	try {
		folder = await Directory.pickDirectoryAsync();
	} catch {
		return false;
	}
	new File(uri).copy(folder);
	return true;
}
