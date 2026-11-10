import { useNotificationPermission } from "@/lib/notifications/use-notification-permission";
import { REMINDER_CAP } from "../constants";
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
	reminders: ReminderWithConflicts[];
	cap: number;
	atCap: boolean;
	/** The OS permission is denied — show the persistent notice, keep everything editable. */
	notificationsDenied: boolean;
};

/**
 * Everything the Reminders screen shows for one habit, or null when the id doesn't resolve, or
 * undefined while the habit list is still loading.
 */
export function useReminderQueries(
	habitId: number,
): ReminderScreenData | null | undefined {
	const { habits, loaded } = useHabitsList();
	const reminders = useHabitReminders(habitId);
	const permission = useNotificationPermission();

	const habit = habits.find((candidate) => candidate.id === habitId);
	if (!loaded) return undefined;
	if (!habit) return null;

	return {
		habit,
		reminders: reminders.map((reminder) => ({
			...reminder,
			unscheduledDays: unscheduledReminderDays(habit, reminder),
		})),
		cap: REMINDER_CAP,
		atCap: reminders.length >= REMINDER_CAP,
		notificationsDenied: permission === "denied",
	};
}
