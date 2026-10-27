/**
 * Native no-op — see `forced-text-size.web.ts`. On a device the Dynamic Type
 * setting is the only thing that decides the text size.
 */
export function forcedAccessibilityTextSize(): boolean {
	return false;
}
