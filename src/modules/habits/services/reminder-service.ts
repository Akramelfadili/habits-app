import { setSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import {
	cancelRemindersWithPrefix,
	scheduleReminder,
} from "@/lib/notifications/notifications";
import {
	DEFAULT_REMINDER_TIME,
	EVENING_REVIEW_SETTING_KEY,
	EVENING_REVIEW_TIME,
	REMINDER_CAP,
	REMINDER_CAP_MESSAGE,
	WEEKDAYS,
} from "../constants";
import { updateHabit } from "../repositories/habit-repository";
import {
	createReminder,
	deleteReminder,
	getHabitReminders,
	updateReminder,
} from "../repositories/reminder-repository";
import { canHabitFallOn } from "../strategies/frequency-strategy";
import type {
	Habit,
	IsoWeekday,
	Reminder,
	ReminderPatch,
	UpdateHabitInput,
} from "../types";

/**
 * Reminders (HAB-12). Every write here is composite: the stored reminder
 * changes, *and* the OS's scheduled notifications have to be brought back in
 * line with it — so each write ends in `syncHabitReminders`, which rebuilds
 * the habit's notifications from what's stored rather than patching them.
 * Reminders are purely a notification layer; nothing here touches whether a
 * habit is due or counts on Today.
 */

const EVERY_DAY: IsoWeekday[] = WEEKDAYS.map(({ day }) => day);

const EVENING_REVIEW_NOTIFICATION_ID = "evening-review";

/**
 * Prefix shared by every notification one habit owns. The trailing "-"
 * keeps habit 1's prefix from matching habit 12's. Archive/delete (HAB-13)
 * cancels with this so no reminder outlives its habit.
 */
export function habitNotificationPrefix(habitId: number): string {
	return `habit-${habitId}-`;
}

function reminderNotificationId(reminder: Reminder): string {
	return `${habitNotificationPrefix(reminder.habitId)}reminder-${reminder.id}`;
}

/**
 * The reminder's own days that the habit can never be due on — flagged on
 * screen as pointless, and never scheduled (HAB-12's edge case: "rather than
 * silently firing a notification for a habit that isn't due").
 */
export function unscheduledReminderDays(
	habit: Pick<Habit, "frequency">,
	reminder: Pick<Reminder, "weekdays">,
): IsoWeekday[] {
	return reminder.weekdays.filter((day) => !canHabitFallOn(habit, day));
}

function notificationBody(habit: Habit): string {
	return habit.direction === "break"
		? "A nudge to keep resisting today."
		: "Time for this one — check it off on Today.";
}

/**
 * Rebuilds all of `habit`'s scheduled notifications from its stored
 * reminders: cancel everything it owns, then schedule each enabled reminder
 * on the days it's set for *and* the habit can fall on. Idempotent — safe to
 * call after any change, including a schedule edit on the habit itself.
 * Schedules nothing for an archived habit.
 */
export async function syncHabitReminders(habit: Habit): Promise<void> {
	await cancelRemindersWithPrefix(habitNotificationPrefix(habit.id));
	// Paused while archived (HAB-20): rows are kept, but nothing is scheduled —
	// editing an archived habit's reminders must not make it fire.
	if (habit.archivedAt) return;

	for (const reminder of await getHabitReminders(habit.id)) {
		if (!reminder.enabled) continue;
		const days = reminder.weekdays.filter((day) => canHabitFallOn(habit, day));
		if (days.length === 0) continue;
		await scheduleReminder({
			id: reminderNotificationId(reminder),
			title: habit.name,
			body: notificationBody(habit),
			hour: reminder.hour,
			minute: reminder.minute,
			weekdays: days,
		});
	}
}

export class ReminderCapError extends Error {
	constructor() {
		super(REMINDER_CAP_MESSAGE);
		this.name = "ReminderCapError";
	}
}

/**
 * Adds a reminder time at the default time, pre-set to the days the habit
 * can actually fall on — so a fresh reminder never starts out flagged.
 * Blocked at the cap with an explanation, not silently.
 */
export async function addReminder(habit: Habit): Promise<Reminder> {
	const existing = await getHabitReminders(habit.id);
	if (existing.length >= REMINDER_CAP) throw new ReminderCapError();

	const reminder = await createReminder({
		habitId: habit.id,
		...DEFAULT_REMINDER_TIME,
		weekdays: EVERY_DAY.filter((day) => canHabitFallOn(habit, day)),
		enabled: true,
	});
	await syncHabitReminders(habit);
	return reminder;
}

/** Changes one reminder's time, days, and/or on/off state. */
export async function editReminder(
	habit: Habit,
	reminderId: number,
	patch: ReminderPatch,
): Promise<Reminder> {
	const reminder = await updateReminder(reminderId, patch);
	await syncHabitReminders(habit);
	return reminder;
}

export async function removeReminder(
	habit: Habit,
	reminderId: number,
): Promise<void> {
	await deleteReminder(reminderId);
	await syncHabitReminders(habit);
}

/**
 * Saves a habit edit and re-syncs its reminders — a schedule change can turn
 * a flagged reminder day into a real one (or the reverse), and the OS
 * schedule has to follow.
 */
export async function updateHabitAndSyncReminders(
	id: number,
	input: UpdateHabitInput,
): Promise<Habit> {
	const habit = await updateHabit(id, input);
	await syncHabitReminders(habit);
	return habit;
}

/**
 * The app-wide Evening review: one daily notification at a fixed time,
 * nudging to log anything left for the day, across every habit. It's a
 * plain scheduled notification, so it can't know at fire time what's still
 * unlogged — the copy stays general.
 */
export async function setEveningReview(enabled: boolean): Promise<void> {
	await setSetting(EVENING_REVIEW_SETTING_KEY, String(enabled));
	if (!enabled) {
		await cancelRemindersWithPrefix(`${EVENING_REVIEW_NOTIFICATION_ID}:`);
		return;
	}
	await scheduleReminder({
		id: EVENING_REVIEW_NOTIFICATION_ID,
		title: "Evening review",
		body: "Anything left to log today? Take a minute to catch up.",
		...EVENING_REVIEW_TIME,
		weekdays: EVERY_DAY,
	});
}
