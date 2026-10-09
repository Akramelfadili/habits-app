import type * as NativeClipboard from "./clipboard";

/** Web-only stand-in (visual checks): the browser clipboard. */
export async function copyText(text: string): Promise<"copied" | "shared"> {
	await globalThis.navigator?.clipboard?.writeText(text);
	return "copied";
}

// Compile-time guard: this file must export what the native adapter does.
const _sameShape: Pick<typeof NativeClipboard, "copyText"> = { copyText };
void _sameShape;
