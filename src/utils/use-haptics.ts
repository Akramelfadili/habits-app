import * as Haptics from "expo-haptics";
import { useMemo } from "react";
import { HAPTICS_SETTING_KEY } from "@/lib/app-settings/keys";
import {
	getSetting,
	setSetting,
} from "@/lib/app-settings/repositories/app-settings-repository";
import { log } from "@/lib/logger/logger";
import { useHapticsStore } from "@/store/haptics-store";

/** Fire-and-forget: haptics are a nicety, so an unsupported device or the web never throws. */
function fire(feedback: () => Promise<void>) {
	if (!useHapticsStore.getState().enabled) return;
	try {
		feedback().catch(() => {});
	} catch {}
}

const haptics = {
	/** A toggle changing state: the completion circle. */
	selection: () => fire(() => Haptics.selectionAsync()),
	/** Something finished well: the all-done card appearing. */
	success: () =>
		fire(() =>
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
		),
	/** The person is about to do something that cannot be undone. */
	warning: () =>
		fire(() =>
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
		),
};

/**
 * Light, restrained feedback (design-system-v3 "Haptics"): selection on the
 * completion circle, success on the all-done card, warning on a destructive
 * confirm. Nothing else. Skipped when the Haptics switch is off. The returned
 * object is stable, so it is safe in effect dependencies.
 */
export function useHaptics() {
	return useMemo(() => haptics, []);
}

export async function loadHapticsSetting(): Promise<void> {
	try {
		const stored = await getSetting(HAPTICS_SETTING_KEY);
		useHapticsStore.setState({ enabled: stored !== "false" });
	} catch (error) {
		log.warn("haptics.setting_read_failed", { error });
	}
}

export async function setHapticsEnabled(enabled: boolean): Promise<void> {
	useHapticsStore.setState({ enabled });
	await setSetting(HAPTICS_SETTING_KEY, String(enabled));
}
