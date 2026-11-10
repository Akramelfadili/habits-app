import {
	getSetting,
	setSetting,
} from "@/lib/app-settings/repositories/app-settings-repository";
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
	EVENING_REVIEW_TIME_SETTING_KEY,
	HIDE_HABIT_NAMES_SETTING_KEY,
	REMINDER_CAP,
	REMINDER_TITLES_APPLIED_SETTING_KEY,
	WEEKDAYS,
} from "../constants";
import {
	formatEveningReviewTime,
	parseEveningReviewTime,
} from "../domain/evening-review-time";
import { notificationCopy, reminderCapMessage } from "../reminder-copy";
import {
	getAllHabits,
	getHabit,
	updateHabit,
} from "../repositories/habit-repository";
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

// Every write ends in `syncHabitReminders`, which rebuilds the notifications from what is
// stored rather than patching them.

const EVERY_DAY: IsoWeekday[] = WEEKDAYS.map(({ day }) => day);

const EVENING_REVIEW_NOTIFICATION_ID = "evening-review";

// The trailing "-" keeps habit 1's prefix from matching habit 12's.
export function habitNotificationPrefix(habitId: number): string {
	return `habit-${habitId}-`;
}

export function reminderNotificationId(reminder: Reminder): string {
	return `${habitNotificationPrefix(reminder.habitId)}reminder-${reminder.id}`;
}

// Never scheduled, rather than silently firing a notification for a habit that is not due.
export function unscheduledReminderDays(
	habit: Pick<Habit, "frequency">,
	reminder: Pick<Reminder, "weekdays">,
): IsoWeekday[] {
	return reminder.weekdays.filter((day) => !canHabitFallOn(habit, day));
}

function notificationBody(habit: Habit): string {
	return habit.direction === "break"
		? notificationCopy.break
		: notificationCopy.build;
}

export async function getHideHabitNames(): Promise<boolean> {
	return (await getSetting(HIDE_HABIT_NAMES_SETTING_KEY)) !== "false";
}

export async function remindersTitlesAreCurrent(
	hide: boolean,
): Promise<boolean> {
	return (
		(await getSetting(REMINDER_TITLES_APPLIED_SETTING_KEY)) === String(hide)
	);
}

export async function markReminderTitlesApplied(hide: boolean): Promise<void> {
	await setSetting(REMINDER_TITLES_APPLIED_SETTING_KEY, String(hide));
}

// The choice is stored first (source of truth). A failed rebuild leaves the applied marker
// stale, so the next launch's reconcile finishes the job.
export async function setHideHabitNames(hide: boolean): Promise<void> {
	await setSetting(HIDE_HABIT_NAMES_SETTING_KEY, String(hide));
	let failed = false;
	for (const habit of await getAllHabits()) {
		try {
			await syncHabitReminders(habit);
		} catch (error) {
			failed = true;
			log.error("reminders.retitle_failed", { habitId: habit.id, error });
		}
	}
	if (!failed) await markReminderTitlesApplied(hide);
}

async function scheduledWithPrefix(prefix: string): Promise<string[]> {
	return (await listScheduledIdentifiers()).filter((identifier) =>
		identifier.startsWith(prefix),
	);
}

export async function cancelQuietly(
	identifiers: readonly string[],
	why: string,
): Promise<boolean> {
	if (identifiers.length === 0) return true;
	try {
		await cancelScheduled(identifiers);
		return true;
	} catch (error) {
		log.warn("reminders.cancel_failed", {
			reason: why,
			count: identifiers.length,
			error,
		});
		return false;
	}
}

// The order keeps a failure from losing reminders: capture the old identifiers, schedule the
// new set under a fresh generation (no collisions), then cancel exactly the captured old ones,
// never a blanket cancel that would take the new set too. If scheduling fails part-way the new
// ones are cancelled and the old set is untouched; if the final cancel fails the new set is
// already live and the next sync or launch reconcile tidies.
export async function syncHabitReminders(habit: Habit): Promise<void> {
	const previous = await scheduledWithPrefix(habitNotificationPrefix(habit.id));
	const created: string[] = [];

	// Rows are kept while archived but nothing is scheduled; editing must not make it fire.
	if (!habit.archivedAt) {
		const generation = newGeneration();
		const title = (await getHideHabitNames())
			? notificationCopy.genericTitle
			: habit.name;
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
							title,
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
			await cancelQuietly(created, "revert_failed_schedule");
			throw error;
		}
	}

	const stale = previous.filter((identifier) => !created.includes(identifier));
	await cancelQuietly(stale, "replace_old_set");
	log.info("reminders.synced", {
		habitId: habit.id,
		scheduled: created.length,
		cancelled: stale.length,
	});
}

// The row already changed, so a scheduling failure must not report the action as failed:
// it's logged and the launch-time reconcile brings the OS back in line.
export async function syncAfterWrite(habit: Habit): Promise<void> {
	await refreshEveningReview();
	try {
		await syncHabitReminders(habit);
	} catch (error) {
		log.error("reminders.saved_but_not_scheduled", {
			habitId: habit.id,
			error,
		});
	}
}

// A cancel failure is logged, not thrown: the action succeeded and the reconcile cancels leftovers.
export async function cancelHabitNotifications(habitId: number): Promise<void> {
	await refreshEveningReview();
	try {
		await cancelRemindersWithPrefix(habitNotificationPrefix(habitId));
	} catch (error) {
		log.error("reminders.cancel_habit_failed", { habitId, error });
	}
}

export class ReminderCapError extends Error {
	constructor() {
		super(reminderCapMessage);
		this.name = "ReminderCapError";
	}
}

// With no draft it starts on days the habit can fall on, so a fresh reminder is never flagged.
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

// The habit is re-read, not trusted from the screen: if it was archived or deleted since, the
// sync respects that (or the restore is refused).
export async function restoreReminder(reminder: Reminder): Promise<Reminder> {
	const habit = await getHabit(reminder.habitId);
	if (!habit) throw new Error(`No habit with id ${reminder.habitId}`);
	const existing = await getHabitReminders(habit.id);
	if (existing.length >= REMINDER_CAP) throw new ReminderCapError();
	const restored = await restoreReminderRow(reminder);
	await syncAfterWrite(habit);
	return restored;
}

// A schedule change can turn a flagged reminder day into a real one, so the OS schedule must follow.
export async function updateHabitAndSyncReminders(
	id: number,
	input: UpdateHabitInput,
): Promise<Habit> {
	const habit = await updateHabit(id, input);
	await syncAfterWrite(habit);
	return habit;
}

export function eveningReviewDays(habits: readonly Habit[]): IsoWeekday[] {
	const active = habits.filter((habit) => !habit.archivedAt);
	return EVERY_DAY.filter((day) =>
		active.some((habit) => canHabitFallOn(habit, day)),
	);
}

export async function getEveningReviewTime(): Promise<{
	hour: number;
	minute: number;
}> {
	return parseEveningReviewTime(
		await getSetting(EVENING_REVIEW_TIME_SETTING_KEY),
	);
}

async function scheduleEveningReview(): Promise<string[]> {
	const days = eveningReviewDays(await getAllHabits());
	if (days.length === 0) return [];
	return scheduleReminder(
		eveningReviewReminder(days, await getEveningReviewTime()),
		newGeneration(),
	);
}

// Stored first (source of truth); a failed rebuild is left for the launch-time reconcile.
export async function setEveningReviewTime(time: {
	hour: number;
	minute: number;
}): Promise<void> {
	await setSetting(
		EVENING_REVIEW_TIME_SETTING_KEY,
		formatEveningReviewTime(time),
	);
	await refreshEveningReview();
}

// A failure is logged: the changed row already saved and the launch-time reconcile tidies the rest.
export async function refreshEveningReview(): Promise<void> {
	try {
		if ((await getSetting(EVENING_REVIEW_SETTING_KEY)) !== "true") return;
		const previous = await scheduledWithPrefix(
			`${EVENING_REVIEW_NOTIFICATION_ID}:`,
		);
		const created = await scheduleEveningReview();
		await cancelQuietly(
			previous.filter((identifier) => !created.includes(identifier)),
			"replace_evening_review_after_habit_change",
		);
		log.info("eveningreview.refreshed", { scheduled: created.length });
	} catch (error) {
		log.warn("eveningreview.refresh_failed", { error });
	}
}

// A plain scheduled notification can't know at fire time what's unlogged, so the copy stays
// general. Turning on schedules first and stores the setting only once that worked, so it never
// says "on" for a notification that doesn't exist. Turning off stores first; a failed cancel is
// left for the launch-time reconcile.
export async function setEveningReview(enabled: boolean): Promise<void> {
	const prefix = `${EVENING_REVIEW_NOTIFICATION_ID}:`;
	if (!enabled) {
		await setSetting(EVENING_REVIEW_SETTING_KEY, "false");
		await cancelQuietly(
			await scheduledWithPrefix(prefix),
			"evening_review_off",
		);
		return;
	}

	const previous = await scheduledWithPrefix(prefix);
	const created = await scheduleEveningReview();
	try {
		await setSetting(EVENING_REVIEW_SETTING_KEY, "true");
	} catch (error) {
		await cancelQuietly(created, "revert_evening_review");
		throw error;
	}
	await cancelQuietly(
		previous.filter((identifier) => !created.includes(identifier)),
		"replace_old_evening_review",
	);
}

export function eveningReviewReminder(
	weekdays: readonly IsoWeekday[] = EVERY_DAY,
	time: { hour: number; minute: number } = EVENING_REVIEW_TIME,
) {
	return {
		id: EVENING_REVIEW_NOTIFICATION_ID,
		title: notificationCopy.eveningTitle,
		body: notificationCopy.eveningBody,
		hour: time.hour,
		minute: time.minute,
		weekdays: [...weekdays],
	};
}
