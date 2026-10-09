import type * as NativeFileExport from "./file-export";
import type { WrittenFile } from "./file-export";

/**
 * Web-only stand-in for `file-export.ts` — web exists only for visual checks,
 * and expo-file-system has no web backing. Nothing is written anywhere; sizes
 * are the UTF-8 length so the ready card shows a plausible number.
 */
const scratch = new Map<string, string>();

export function clearExports(): void {
	scratch.clear();
}

export function writeScratchFile(content: string): WrittenFile {
	// `?fixtures=export-fails` — the storage-failure state (B6) can't be
	// provoked any other way on web.
	const search = globalThis.location?.search ?? "";
	if (new URLSearchParams(search).get("fixtures") === "export-fails") {
		throw new Error("No space left on device");
	}
	const name = `export-${scratch.size}.partial`;
	scratch.set(name, content);
	return { uri: name, name, sizeBytes: content.length };
}

export function promoteScratchFile(
	file: WrittenFile,
	finalName: string,
): WrittenFile {
	const content = scratch.get(file.name) ?? "";
	scratch.delete(file.name);
	scratch.set(finalName, content);
	return { uri: finalName, name: finalName, sizeBytes: file.sizeBytes };
}

export function discardFile(uri: string): void {
	scratch.delete(uri);
}

export async function shareFile(): Promise<void> {}

export async function saveFileToFolder(): Promise<boolean> {
	return true;
}

export async function shareText(): Promise<void> {}

export function isPickerCancellation(): boolean {
	return false;
}

// Compile-time guard: this file must export exactly what the native adapter does.
const _sameShape: typeof NativeFileExport = {
	clearExports,
	writeScratchFile,
	promoteScratchFile,
	discardFile,
	shareFile,
	saveFileToFolder,
	shareText,
	isPickerCancellation,
};
void _sameShape;
