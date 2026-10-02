import { setThemePreference } from "@/theme/theme-preference";
import { toggleEveningReview } from "./use-reminder-actions";

/**
 * Settings' writes (HAB-15). Both go through the same functions the rest of
 * the app uses: the Evening review via `toggleEveningReview` (permission
 * prompt + schedule, identical to the Reminders screen's toggle), Appearance
 * via the theme store (applies instantly, persists after).
 */
export function useSettingsActions() {
	return {
		setThemePreference,
		setEveningReview: toggleEveningReview,
	};
}
