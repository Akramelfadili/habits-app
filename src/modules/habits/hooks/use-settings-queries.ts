import { useAppSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { getAppInfo } from "@/lib/diagnostics/app-info";
import { useNotificationPermission } from "@/lib/notifications/use-notification-permission";
import { useHapticsStore } from "@/store/haptics-store";
import { useThemePreferenceStore } from "@/theme/theme-preference-store";
import { useTheme } from "@/theme/use-theme";
import {
	EVENING_REVIEW_SETTING_KEY,
	EVENING_REVIEW_TIME_SETTING_KEY,
	FREEZE_POOL_SIZE,
	HIDE_HABIT_NAMES_SETTING_KEY,
} from "../constants";
import { parseEveningReviewTime } from "../domain/evening-review-time";
import { freezesUsedInMonth } from "../domain/streaks";
import { notificationImpact } from "../presenters/settings-helpers";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";
import { useAllReminders } from "../repositories/reminder-repository";

/**
 * Everything the Settings screen shows. The Evening review reads the very setting the
 * per-habit Reminders screen reads, so the two can't drift.
 */
export function useSettingsQueries() {
	const preference = useThemePreferenceStore((state) => state.preference);
	const hapticsEnabled = useHapticsStore((state) => state.enabled);
	const { scheme } = useTheme();
	const eveningReview = useAppSetting(EVENING_REVIEW_SETTING_KEY);
	const eveningTime = useAppSetting(EVENING_REVIEW_TIME_SETTING_KEY);
	const hideNames = useAppSetting(HIDE_HABIT_NAMES_SETTING_KEY);
	const permission = useNotificationPermission();
	const frozenDays = useFrozenDays();
	const reminders = useAllReminders();
	const { habits } = useHabitsList();

	return {
		themePreference: preference,
		hapticsEnabled,
		resolvedScheme: scheme,
		eveningReviewEnabled: eveningReview === "true",
		/** The Evening review's time: the stored choice, else 21:30. */
		eveningReviewTime: parseEveningReviewTime(eveningTime),
		/** Reminders use a generic title: on unless the person turned it off. */
		hideHabitNames: hideNames !== "false",
		notificationsDenied: permission === "denied",
		notificationPermission: permission,
		/** What a denied permission holds back. */
		notificationImpact: notificationImpact(reminders, habits),
		/** The shared monthly pool, counted by missed date: for the "used this month" row. */
		freezePool: {
			size: FREEZE_POOL_SIZE,
			usedThisMonth: freezesUsedInMonth(frozenDays, new Date()),
		},
		about: getAppInfo(),
	};
}
