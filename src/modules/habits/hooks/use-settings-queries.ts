import { useAppSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { getAppInfo } from "@/lib/diagnostics/app-info";
import { useNotificationPermission } from "@/lib/notifications/use-notification-permission";
import { useThemePreferenceStore } from "@/theme/theme-preference-store";
import { useTheme } from "@/theme/use-theme";
import {
	EVENING_REVIEW_SETTING_KEY,
	EVENING_REVIEW_TIME_SETTING_KEY,
	FREEZE_POOL_SIZE,
} from "../constants";
import { parseEveningReviewTime } from "../domain/evening-review-time";
import { freezesUsedInMonth } from "../domain/streaks";
import { notificationImpact } from "../presenters/settings-helpers";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";
import { useAllReminders } from "../repositories/reminder-repository";

/**
 * Everything the Settings screen (HAB-15) shows. The Evening review reads the
 * very setting the per-habit Reminders screen reads, so the two can't drift.
 */
export function useSettingsQueries() {
	const preference = useThemePreferenceStore((state) => state.preference);
	const { scheme } = useTheme();
	const eveningReview = useAppSetting(EVENING_REVIEW_SETTING_KEY);
	const eveningTime = useAppSetting(EVENING_REVIEW_TIME_SETTING_KEY);
	const permission = useNotificationPermission();
	const frozenDays = useFrozenDays();
	const reminders = useAllReminders();
	const { habits } = useHabitsList();

	return {
		themePreference: preference,
		/** What "System" currently resolves to — the Appearance caption reports it. */
		resolvedScheme: scheme,
		eveningReviewEnabled: eveningReview === "true",
		/** The Evening review's time: the stored choice, else 21:30. */
		eveningReviewTime: parseEveningReviewTime(eveningTime),
		notificationsDenied: permission === "denied",
		/** "granted", "denied" or "undetermined": the Notifications row says which. */
		notificationPermission: permission,
		/** What a denied permission holds back, for the SY6 summary. */
		notificationImpact: notificationImpact(reminders, habits),
		/** The shared monthly pool, counted by missed date (HAB-33, S4) — for the "used this month" row. */
		freezePool: {
			size: FREEZE_POOL_SIZE,
			usedThisMonth: freezesUsedInMonth(frozenDays, new Date()),
		},
		/** Version, build and database schema — the About group. */
		about: getAppInfo(),
	};
}
