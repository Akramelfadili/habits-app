// react-native-web reports `fontScale: 1` unconditionally, so the real setting never reaches
// `useAccessibilityTextSize` there and visual-check couldn't capture the AX layouts.
export function forcedAccessibilityTextSize(): boolean {
	if (!__DEV__) return false;
	if (pinned) return true;
	const search = globalThis.location?.search ?? "";
	// First Run redirects to /first-run, which drops the query, and later screens must still be AX.
	pinned = new URLSearchParams(search).get("textSize") === "ax";
	return pinned;
}

let pinned = false;
