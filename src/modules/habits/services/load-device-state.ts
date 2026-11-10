import { shiftClockTo } from "@/lib/dev-clock/shift-clock";
import { log } from "@/lib/logger/logger";
import { loadThemePreference } from "@/theme/theme-preference";
import { buildDeviceState } from "../dev/device-state";
import { replaceAllData } from "../repositories/dev-state-repository";

/**
 * Device validation only: writes the data a visual-check route's `?fixtures=`
 * scenario shows into the database. `search` is that route's query string.
 */
export async function loadDeviceState(search: string): Promise<void> {
	await replaceAllData(buildDeviceState(search));
}

/**
 * What `habitsapp://dev-state` does before it opens its route: pins the clock,
 * writes the route's scenario into the database and applies the stored
 * Appearance. Never rejects; a failure is logged and the route opens anyway.
 * Lives here, not in the screen, so that the log event and everything above
 * are reachable only through the screen's flag-gated `require` and a release
 * bundle contains none of it (`scripts/check-release-bundle.mjs`).
 */
export async function applyDeviceState(
	search: string,
	clock: string | null,
): Promise<void> {
	try {
		shiftClockTo(clock);
		await loadDeviceState(search);
		await loadThemePreference();
	} catch (error) {
		log.error("devstate.load_failed", { error });
	}
}
