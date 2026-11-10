import { setThemePreference } from "@/theme/theme-preference";
import { failureMessage } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { setHapticsEnabled } from "@/utils/use-haptics";
import {
	setEveningReviewTime,
	setHideHabitNames,
} from "../services/reminder-service";
import { toggleEveningReview } from "./use-reminder-actions";

/**
 * Settings' writes (HAB-15). Both go through the same functions the rest of
 * the app uses: the Evening review via `toggleEveningReview` (permission
 * prompt + schedule, identical to the Reminders screen's toggle), Appearance
 * via the theme store (applies instantly, persists after). Neither rejects —
 * a failure is logged and toasted.
 */
export function useSettingsActions() {
	const appearance = useAsyncAction(setThemePreference, {
		scope: "settings",
		failure: failureMessage("save", "your Appearance choice"),
	});
	const haptics = useAsyncAction(setHapticsEnabled, {
		scope: "settings",
		failure: failureMessage("save", "your Haptics choice"),
	});
	const eveningReview = useAsyncAction(toggleEveningReview, {
		scope: "settings",
		failure: failureMessage("update", "the Evening review"),
	});

	const eveningTime = useAsyncAction(setEveningReviewTime, {
		scope: "settings",
		failure: failureMessage("save", "the Evening review time"),
	});

	const hideNames = useAsyncAction(setHideHabitNames, {
		scope: "settings",
		failure: failureMessage("update", "your reminders"),
	});

	return {
		setHideHabitNames: hideNames.run,
		setThemePreference: appearance.run,
		setHaptics: haptics.run,
		setEveningReview: eveningReview.run,
		setEveningReviewTime: eveningTime.run,
	};
}
