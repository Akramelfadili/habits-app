import { shiftClockTo } from "./shift-clock";

/**
 * `?clock=2026-10-01T20:00:00` on any web URL (dev only) shifts the page's
 * `Date` so "now" starts at that local time and keeps ticking from there.
 *
 * Web exists only to drive the in-memory fixtures (scripts/visual-check.mjs,
 * the Maestro journeys in /e2e), and several screens depend on the weekday —
 * the Weekly Summary's "slipping" insight can't appear before a habit has
 * been due three times in the week.
 * visual-check pins the clock through Playwright; Maestro has no clock
 * control, so the journeys pin it through the URL instead.
 */
export function pinClockFromUrl(): void {
	if (!__DEV__) return;
	const search = globalThis.location?.search ?? "";
	const value = new URLSearchParams(search).get("clock");
	if (value) shiftClockTo(value);
}
