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
	file.writeSync(content, { encoding: "utf8" });
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
 * Whether `error` is the iOS folder picker reporting that the person backed
 * out. expo-modules-core derives the code from the Swift class
 * `FilePickingCancelledException` → `ERR_FILE_PICKING_CANCELLED`; the message
 * is matched as well in case a platform reports it differently.
 */
export function isPickerCancellation(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const { code, message } = error as { code?: unknown; message?: unknown };
	return (
		(typeof code === "string" && /CANCEL/i.test(code)) ||
		(typeof message === "string" && /cancel/i.test(message))
	);
}

/**
 * "Save to Files": the system folder picker, then a copy of the export into
 * the chosen folder. Resolves false only when the person backs out of the
 * picker; every other failure (no view controller, copy denied, out of space)
 * rejects with the real error.
 */
export async function saveFileToFolder(uri: string): Promise<boolean> {
	let folder: Directory;
	try {
		folder = await Directory.pickDirectoryAsync();
	} catch (error) {
		if (isPickerCancellation(error)) return false;
		throw error;
	}
	await new File(uri).copy(folder);
	return true;
}

/** Hands plain text to the share sheet as a `.txt` file — "Copy diagnostics" without the clipboard module. */
export async function shareText(text: string, fileName: string): Promise<void> {
	const file = new File(exportsDirectory(), fileName);
	file.create({ overwrite: true });
	file.writeSync(text, { encoding: "utf8" });
	await Sharing.shareAsync(file.uri, {
		mimeType: "text/plain",
		UTI: "public.plain-text",
	});
}
