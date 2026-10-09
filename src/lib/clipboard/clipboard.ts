import { shareText } from "@/lib/file-export/file-export";

type ClipboardModule = {
	setStringAsync: (text: string) => Promise<boolean>;
};

/**
 * `expo-clipboard` is a native module, so a build made before it was added
 * doesn't have it. Loading it lazily keeps such a build (and the Jest run)
 * working: the text is shared as a file instead.
 */
function loadClipboard(): ClipboardModule | null {
	try {
		return require("expo-clipboard") as ClipboardModule;
	} catch {
		return null;
	}
}

/**
 * Puts `text` on the clipboard. Without the native module, hands it to the
 * share sheet as `fallbackFileName` and reports `shared`.
 */
export async function copyText(
	text: string,
	fallbackFileName: string,
): Promise<"copied" | "shared"> {
	const clipboard = loadClipboard();
	if (clipboard) {
		await clipboard.setStringAsync(text);
		return "copied";
	}
	await shareText(text, fallbackFileName);
	return "shared";
}
