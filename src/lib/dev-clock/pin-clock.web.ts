import { shiftClockTo } from "./shift-clock";

// Several screens depend on the weekday, and Maestro has no clock control, so its journeys pin it
// through the URL (visual-check pins it through Playwright).
export function pinClockFromUrl(): void {
	if (!__DEV__) return;
	const search = globalThis.location?.search ?? "";
	const value = new URLSearchParams(search).get("clock");
	if (value) shiftClockTo(value);
}
