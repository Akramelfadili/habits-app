import { log } from "@/lib/logger/logger";
import { ensureNotificationPermission } from "@/lib/notifications/use-notification-permission";
import { REMINDER_CAP } from "../constants";
import { createHabit } from "../repositories/habit-repository";
import { createReminder } from "../repositories/reminder-repository";
import type { CreateHabitInput, Habit, ReminderDraft } from "../types";
import { syncAfterWrite } from "./reminder-service";

export type CreatedHabit = {
	habit: Habit;
	remindersFailed: boolean;
};

// The habit row is what the person asked for, so a reminder that fails to write is logged and
// reported, not rolled back.
export async function createHabitWithReminders(
	input: CreateHabitInput,
	reminders: readonly ReminderDraft[] = [],
): Promise<CreatedHabit> {
	// Turning a reminder on first makes sure the OS has been asked; a denial never blocks the save.
	if (reminders.length > 0) await ensureNotificationPermission();
	const habit = await createHabit(input);
	if (reminders.length === 0) return { habit, remindersFailed: false };

	let remindersFailed = false;
	for (const reminder of reminders.slice(0, REMINDER_CAP)) {
		try {
			await createReminder({ habitId: habit.id, ...reminder, enabled: true });
		} catch (error) {
			remindersFailed = true;
			log.error("reminders.queued_save_failed", {
				habitId: habit.id,
				error,
			});
		}
	}
	await syncAfterWrite(habit);
	return { habit, remindersFailed };
}
