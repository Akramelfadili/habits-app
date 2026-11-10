/**
 * `?textSize=ax` on any web URL (dev only) makes the app behave as if Dynamic Type were at an
 * accessibility size, so the AX layouts can be driven on web.
 *
 * It exists because react-native-web reports `fontScale: 1` unconditionally
 * (`Dimensions/index.js`), so the real setting can never reach `useAccessibilityTextSize` there,
 * and the AX fallback from the pill to bar A is one of the states `npm run visual-check` has to
 * capture.
 */
export function forcedAccessibilityTextSize(): boolean {
	if (!__DEV__) return false;
	if (pinned) return true;
	const search = globalThis.location?.search ?? "";
	// A page opened with the flag keeps it: First Run redirects to /first-run,
	// which drops the query, and the screens after that must still be AX.
	pinned = new URLSearchParams(search).get("textSize") === "ax";
	return pinned;
}

let pinned = false;
