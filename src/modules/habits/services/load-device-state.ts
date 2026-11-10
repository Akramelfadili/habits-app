import { shiftClockTo } from "@/lib/dev-clock/shift-clock";
import { log } from "@/lib/logger/logger";
import { loadThemePreference } from "@/theme/theme-preference";
import { buildDeviceState } from "../dev/device-state";
import { replaceAllData } from "../repositories/dev-state-repository";

export async function loadDeviceState(search: string): Promise<void> {
	await replaceAllData(buildDeviceState(search));
}

// Lives here, not in the screen, so it is reachable only through the screen's flag-gated
// `require` and a release bundle contains none of it (`scripts/check-release-bundle.mjs`).
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
