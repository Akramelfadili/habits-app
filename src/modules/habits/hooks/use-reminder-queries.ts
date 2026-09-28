import { useAppSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { useNotificationPermission } from "@/lib/notifications/use-notification-permission";
import { EVENING_REVIEW_SETTING_KEY, REMINDER_CAP } from "../constants";
import { useHabitsList } from "../repositories/habit-repository";
import { useHabitReminders } from "../repositories/reminder-repository";
import { unscheduledReminderDays } from "../services/reminder-service";
import type { Habit, IsoWeekday, Reminder } from "../types";

export type ReminderWithConflicts = Reminder & {
	/** This reminder's days the habit can never be due on — flagged, never fired. */
	unscheduledDays: IsoWeekday[];
};

export type ReminderScreenData = {
	habit: Habit;
	/** Earliest first. */
	reminders: ReminderWithConflicts[];
	cap: number;
	atCap: boolean;
	eveningReviewEnabled: boolean;
	/** The OS permission is denied — show the persistent notice, keep everything editable. */
	notificationsDenied: boolean;
};

/**
 * Everything the Reminders screen (HAB-12) shows for one habit, or null when
 * the id doesn't resolve.
 */
export function useReminderQueries(habitId: number): ReminderScreenData | null {
	const habits = useHabitsList();
	const reminders = useHabitReminders(habitId);
	const eveningReview = useAppSetting(EVENING_REVIEW_SETTING_KEY);
	const permission = useNotificationPermission();

	const habit = habits.find((candidate) => candidate.id === habitId);
	if (!habit) return null;

	return {
		habit,
		reminders: reminders.map((reminder) => ({
			...reminder,
			unscheduledDays: unscheduledReminderDays(habit, reminder),
		})),
		cap: REMINDER_CAP,
		atCap: reminders.length >= REMINDER_CAP,
		eveningReviewEnabled: eveningReview === "true",
		notificationsDenied: permission === "denied",
	};
}
