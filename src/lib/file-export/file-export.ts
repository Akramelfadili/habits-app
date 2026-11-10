import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { log } from "@/lib/logger/logger";

// The file is deleted as soon as the share sheet closes; leftovers (a failed share, a force-quit)
// are cleared at the next launch and at the start of the next export.

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

export function clearExports(): void {
	const directory = exportsDirectory();
	for (const item of directory.list()) item.delete();
}

export function writeScratchFile(content: string): WrittenFile {
	const name = `export-${Date.now()}.partial`;
	const file = new File(exportsDirectory(), name);
	file.create({ overwrite: true });
	file.writeSync(content, { encoding: "utf8" });
	return { uri: file.uri, name, sizeBytes: file.size };
}

export function promoteScratchFile(
	scratch: WrittenFile,
	finalName: string,
): WrittenFile {
	const target = new File(exportsDirectory(), finalName);
	if (target.exists) target.delete();
	const file = new File(scratch.uri);
	file.moveSync(target);
	return { uri: file.uri, name: finalName, sizeBytes: file.size };
}

export function discardFile(uri: string): void {
	try {
		const file = new File(uri);
		if (file.exists) file.delete();
	} catch {}
}

// A failed delete is only logged: the file is already shared and `clearExports` sweeps leftovers.
function removeAfterShare(uri: string): void {
	try {
		const file = new File(uri);
		if (file.exists) file.delete();
	} catch (error) {
		log.warn("export.cleanup_failed", { error });
	}
}

// The share sheet resolves when it closes, whether saved, sent or cancelled; a failed share keeps the file for the retry.
export async function shareFile(uri: string, mimeType: string): Promise<void> {
	await Sharing.shareAsync(uri, { mimeType, UTI: utiFor(mimeType) });
	removeAfterShare(uri);
}

function utiFor(mimeType: string): string {
	return mimeType === "application/json"
		? "public.json"
		: "public.comma-separated-values-text";
}

export async function shareText(text: string, fileName: string): Promise<void> {
	const file = new File(exportsDirectory(), fileName);
	file.create({ overwrite: true });
	file.writeSync(text, { encoding: "utf8" });
	await Sharing.shareAsync(file.uri, {
		mimeType: "text/plain",
		UTI: "public.plain-text",
	});
	removeAfterShare(file.uri);
}
