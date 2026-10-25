/**
 * `?textSize=ax` on any web URL (dev only) makes the app behave as if Dynamic
 * Type were at an accessibility size, so the AX layouts can be driven on web.
 *
 * It exists because react-native-web reports `fontScale: 1` unconditionally
 * (`Dimensions/index.js`), so the real setting can never reach
 * `useAccessibilityTextSize` there — and the AX fallback from the pill to
 * bar A (H10) is one of the states `npm run visual-check` has to capture.
 */
export function forcedAccessibilityTextSize(): boolean {
	if (!__DEV__) return false;
	const search = globalThis.location?.search ?? "";
	return new URLSearchParams(search).get("textSize") === "ax";
}
