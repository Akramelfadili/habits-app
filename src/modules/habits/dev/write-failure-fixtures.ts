/**
 * Web visual check only (imported by the `.web.ts` repositories, never bundled
 * for the app): `?failWrites=1` makes every fixture write fail, so the error
 * toast, the error banner and a sheet's toast can be rendered by the existing
 * harness without any dev-only route or button in the product. Same idea as
 * `?fixtures=export-fails`.
 */
function failWritesRequested(): boolean {
	const search = globalThis.location?.search ?? "";
	return new URLSearchParams(search).get("failWrites") === "1";
}

export function assertWritesAllowed(): void {
	if (failWritesRequested()) throw new Error("Simulated write failure");
}

/**
 * `?slowWrites=1`: a write that never finishes, so the in-flight state of a
 * sheet (Delete habit's "Deleting…", DC3) can be captured without a timer.
 */
export function holdWriteIfSlow(): Promise<void> {
	const search = globalThis.location?.search ?? "";
	return new URLSearchParams(search).get("slowWrites") === "1"
		? new Promise(() => {})
		: Promise.resolve();
}
