// Web visual check only, never bundled for the app: failures render without any dev-only
// route or button in the product.
function failWritesRequested(): boolean {
	const search = globalThis.location?.search ?? "";
	return new URLSearchParams(search).get("failWrites") === "1";
}

export function assertWritesAllowed(): void {
	if (failWritesRequested()) throw new Error("Simulated write failure");
}

// Never finishes, so an in-flight state can be captured without a timer.
export function holdWriteIfSlow(): Promise<void> {
	const search = globalThis.location?.search ?? "";
	return new URLSearchParams(search).get("slowWrites") === "1"
		? new Promise(() => {})
		: Promise.resolve();
}
