import { setSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { log } from "@/lib/logger/logger";
import {
	cancelRemindersWithPrefix,
	cancelScheduled,
	listScheduledIdentifiers,
	newGeneration,
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
import { getHabit, updateHabit } from "../repositories/habit-repository";
import {
	createReminder,
	deleteReminder,
	getHabitReminders,
	restoreReminder as restoreReminderRow,
	updateReminder,
} from "../repositories/reminder-repository";
import { canHabitFallOn } from "../strategies/frequency-strategy";
import type {
	Habit,
	IsoWeekday,
	Reminder,
	ReminderDraft,
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

export function reminderNotificationId(reminder: Reminder): string {
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

/** Identifiers currently scheduled under `prefix`. */
async function scheduledWithPrefix(prefix: string): Promise<string[]> {
	return (await listScheduledIdentifiers()).filter((identifier) =>
		identifier.startsWith(prefix),
	);
}

/** Cancels these identifiers; a failure is logged, never thrown — see the callers for why. */
export async function cancelQuietly(
	identifiers: readonly string[],
	why: string,
): Promise<boolean> {
	if (identifiers.length === 0) return true;
	try {
		await cancelScheduled(identifiers);
		return true;
	} catch (error) {
		log.warn("reminders", `cancel failed (${why})`, error, {
			count: identifiers.length,
		});
		return false;
	}
}

/**
 * Rebuilds all of `habit`'s scheduled notifications from its stored
 * reminders: each enabled reminder on the days it's set for *and* the habit
 * can fall on. Idempotent — safe to call after any change, including a
 * schedule edit on the habit itself. Schedules nothing for an archived habit.
 *
 * The order is what keeps a failure from losing reminders:
 * 1. capture the identifiers the habit owns *now* (the old set);
 * 2. schedule the new set under a fresh generation, so its identifiers can't
 *    collide with the old ones;
 * 3. only then cancel the old set — exactly the identifiers captured in (1),
 *    never a blanket cancel, which would take the new set with it.
 * If step 2 fails part-way, the new identifiers created so far are cancelled
 * and the error is rethrown, leaving the old set untouched. If step 3 fails
 * the new set is already live: it's logged and left for the next sync or the
 * launch-time reconcile to tidy.
 */
export async function syncHabitReminders(habit: Habit): Promise<void> {
	const previous = await scheduledWithPrefix(habitNotificationPrefix(habit.id));
	const created: string[] = [];

	// Paused while archived (HAB-20): rows are kept, but nothing is scheduled —
	// editing an archived habit's reminders must not make it fire.
	if (!habit.archivedAt) {
		const generation = newGeneration();
		try {
			for (const reminder of await getHabitReminders(habit.id)) {
				if (!reminder.enabled) continue;
				const days = reminder.weekdays.filter((day) =>
					canHabitFallOn(habit, day),
				);
				if (days.length === 0) continue;
				created.push(
					...(await scheduleReminder(
						{
							id: reminderNotificationId(reminder),
							title: habit.name,
							body: notificationBody(habit),
							hour: reminder.hour,
							minute: reminder.minute,
							weekdays: days,
						},
						generation,
					)),
				);
			}
		} catch (error) {
			await cancelQuietly(created, "revert a failed schedule");
			throw error;
		}
	}

	const stale = previous.filter((identifier) => !created.includes(identifier));
	await cancelQuietly(stale, "replace the old set");
	log.info("reminders", "synced", {
		habitId: habit.id,
		scheduled: created.length,
		cancelled: stale.length,
	});
}

/**
 * Runs `syncHabitReminders` *after* the database row has already changed. The
 * write succeeded, so a scheduling failure must not report the whole action as
 * failed (the row did change): it's logged, and the launch-time reconcile
 * brings the OS back in line.
 */
export async function syncAfterWrite(habit: Habit): Promise<void> {
	try {
		await syncHabitReminders(habit);
	} catch (error) {
		log.error(
			"reminders",
			"scheduling failed after the change was saved",
			error,
			{
				habitId: habit.id,
			},
		);
	}
}

/**
 * Stops everything a habit owns (archive, delete). The row change already
 * happened, so a cancel failure is logged, not thrown: the action succeeded,
 * and the reconcile cancels any leftover for an archived or missing habit.
 */
export async function cancelHabitNotifications(habitId: number): Promise<void> {
	try {
		await cancelRemindersWithPrefix(habitNotificationPrefix(habitId));
	} catch (error) {
		log.error("reminders", "cancelling a habit's reminders failed", error, {
			habitId,
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
 * Adds a reminder at the time and on the days the person chose in the sheet
 * (R2). With no draft it starts at the default time on the days the habit can
 * actually fall on, so a fresh reminder never starts out flagged. Blocked at
 * the cap with an explanation, not silently.
 */
export async function addReminder(
	habit: Habit,
	draft?: ReminderDraft,
): Promise<Reminder> {
	const existing = await getHabitReminders(habit.id);
	if (existing.length >= REMINDER_CAP) throw new ReminderCapError();

	const days = EVERY_DAY.filter((day) => canHabitFallOn(habit, day));
	const reminder = await createReminder({
		habitId: habit.id,
		...(draft ?? { ...DEFAULT_REMINDER_TIME, weekdays: days }),
		enabled: true,
	});
	await syncAfterWrite(habit);
	return reminder;
}

/** Changes one reminder's time, days, and/or on/off state. */
export async function editReminder(
	habit: Habit,
	reminderId: number,
	patch: ReminderPatch,
): Promise<Reminder> {
	const reminder = await updateReminder(reminderId, patch);
	await syncAfterWrite(habit);
	return reminder;
}

export async function removeReminder(
	habit: Habit,
	reminderId: number,
): Promise<void> {
	await deleteReminder(reminderId);
	await syncAfterWrite(habit);
}

/**
 * The Undo for Remove: the same row (same id, time, days, on/off) goes back,
 * then the habit's notifications are re-synced through the normal path — so
 * exactly one is scheduled per enabled day, and nothing is scheduled by hand.
 * The habit is re-read, not trusted from the screen: if it was archived or
 * deleted since, the sync respects that (or the restore is refused).
 */
export async function restoreReminder(reminder: Reminder): Promise<Reminder> {
	const habit = await getHabit(reminder.habitId);
	if (!habit) throw new Error(`No habit with id ${reminder.habitId}`);
	const existing = await getHabitReminders(habit.id);
	if (existing.length >= REMINDER_CAP) throw new ReminderCapError();
	const restored = await restoreReminderRow(reminder);
	await syncAfterWrite(habit);
	return restored;
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
	await syncAfterWrite(habit);
	return habit;
}

/**
 * The app-wide Evening review: one daily notification at a fixed time,
 * nudging to log anything left for the day, across every habit. It's a
 * plain scheduled notification, so it can't know at fire time what's still
 * unlogged — the copy stays general.
 *
 * Turning on schedules first and stores the setting only once that worked
 * (a failure to store cancels what was just scheduled), so the setting never
 * says "on" for a notification that doesn't exist. Turning off stores the
 * setting first — the source of truth — and a failed cancel is logged for the
 * launch-time reconcile to finish.
 */
export async function setEveningReview(enabled: boolean): Promise<void> {
	const prefix = `${EVENING_REVIEW_NOTIFICATION_ID}:`;
	if (!enabled) {
		await setSetting(EVENING_REVIEW_SETTING_KEY, "false");
		await cancelQuietly(
			await scheduledWithPrefix(prefix),
			"evening review off",
		);
		return;
	}

	const previous = await scheduledWithPrefix(prefix);
	const created = await scheduleReminder(
		eveningReviewReminder(),
		newGeneration(),
	);
	try {
		await setSetting(EVENING_REVIEW_SETTING_KEY, "true");
	} catch (error) {
		await cancelQuietly(created, "revert the evening review");
		throw error;
	}
	await cancelQuietly(
		previous.filter((identifier) => !created.includes(identifier)),
		"replace the old evening review",
	);
}

export function eveningReviewReminder() {
	return {
		id: EVENING_REVIEW_NOTIFICATION_ID,
		title: "Evening review",
		body: "Anything left to log today? Take a minute to catch up.",
		...EVENING_REVIEW_TIME,
		weekdays: EVERY_DAY,
	};
}
