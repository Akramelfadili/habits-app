import { useNotificationPermission } from "@/lib/notifications/use-notification-permission";
import { REMINDER_CAP } from "../constants";
import { useHabitsList } from "../repositories/habit-repository";
import { useHabitReminders } from "../repositories/reminder-repository";
import { unscheduledReminderDays } from "../services/reminder-service";
import type { Habit, IsoWeekday, Reminder } from "../types";

export type ReminderWithConflicts = Reminder & {
	unscheduledDays: IsoWeekday[];
};

export type ReminderScreenData = {
	habit: Habit;
	reminders: ReminderWithConflicts[];
	cap: number;
	atCap: boolean;
	notificationsDenied: boolean;
};

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
