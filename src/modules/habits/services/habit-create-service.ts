import { log } from "@/lib/logger/logger";
import { REMINDER_CAP } from "../constants";
import { createHabit } from "../repositories/habit-repository";
import { createReminder } from "../repositories/reminder-repository";
import type { CreateHabitInput, Habit, ReminderDraft } from "../types";
import { syncAfterWrite } from "./reminder-service";

export type CreatedHabit = {
	habit: Habit;
	/** The habit is saved but some queued reminders were not (the form says so). */
	remindersFailed: boolean;
};

/**
 * Saves a new habit together with the reminders queued on the form (F7): the
 * habit first, then each reminder on its own days, then one sync so every
 * enabled day has exactly one scheduled notification. The habit row is the
 * thing the person asked for, so a reminder that fails to write is logged and
 * reported, not rolled back — the habit stays and the reminder can be added
 * from its Reminders screen.
 */
export async function createHabitWithReminders(
	input: CreateHabitInput,
	reminders: readonly ReminderDraft[] = [],
): Promise<CreatedHabit> {
	const habit = await createHabit(input);
	if (reminders.length === 0) return { habit, remindersFailed: false };

	let remindersFailed = false;
	for (const reminder of reminders.slice(0, REMINDER_CAP)) {
		try {
			await createReminder({ habitId: habit.id, ...reminder, enabled: true });
		} catch (error) {
			remindersFailed = true;
			log.error("reminders", "queued reminder failed to save", error, {
				habitId: habit.id,
			});
		}
	}
	await syncAfterWrite(habit);
	return { habit, remindersFailed };
}
