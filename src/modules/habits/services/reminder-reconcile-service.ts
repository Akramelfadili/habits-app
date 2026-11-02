import { getSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { log } from "@/lib/logger/logger";
import {
	getNotificationPermission,
	listScheduledIdentifiers,
	newGeneration,
	parseIdentifier,
	reminderSlots,
	scheduleReminder,
} from "@/lib/notifications/notifications";
import { EVENING_REVIEW_SETTING_KEY } from "../constants";
import { getAllHabits } from "../repositories/habit-repository";
import { getHabitReminders } from "../repositories/reminder-repository";
import { canHabitFallOn } from "../strategies/frequency-strategy";
import type { Habit } from "../types";
import {
	cancelQuietly,
	eveningReviewDays,
	eveningReviewReminder,
	getEveningReviewTime,
	habitNotificationPrefix,
	reminderNotificationId,
	syncHabitReminders,
} from "./reminder-service";

/** iOS keeps at most 64 pending notifications; warn well before a schedule can fail on it. */
const PENDING_WARNING = 56;

const EVENING_PREFIX = "evening-review:";
const HABIT_ID_OF = /^habit-(\d+)-/;

/** "<reminder id>:<slot>:<HHmm>" for each trigger this habit's stored reminders should have. */
async function expectedKeys(habit: Habit): Promise<string[]> {
	if (habit.archivedAt) return [];
	const keys: string[] = [];
	for (const reminder of await getHabitReminders(habit.id)) {
		if (!reminder.enabled) continue;
		const days = reminder.weekdays.filter((day) => canHabitFallOn(habit, day));
		const time = `${String(reminder.hour).padStart(2, "0")}${String(reminder.minute).padStart(2, "0")}`;
		for (const slot of reminderSlots(days)) {
			keys.push(`${reminderNotificationId(reminder)}:${slot}:${time}`);
		}
	}
	return keys;
}

/** The evening review's triggers for the days with open habits — none when no habit is ever due. */
function eveningReviewKeys(
	habits: readonly Habit[],
	review: { hour: number; minute: number },
): string[] {
	const days = eveningReviewDays(habits);
	const { hour, minute } = eveningReviewReminder(days, review);
	const time = `${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}`;
	return reminderSlots(days).map((slot) => `${EVENING_PREFIX}${slot}:${time}`);
}

/** Whether what the OS holds is exactly `expected` — right triggers, right times, no duplicate generations. */
function matches(
	owned: readonly string[],
	expected: readonly string[],
): boolean {
	if (owned.length !== expected.length) return false;
	const actual = owned.map((identifier) => {
		const parsed = parseIdentifier(identifier);
		return parsed ? `${parsed.reminderId}:${parsed.slot}:${parsed.time}` : null;
	});
	if (actual.includes(null)) return false;
	return [...actual].sort().join("|") === [...expected].sort().join("|");
}

/**
 * Brings the OS's scheduled notifications back in line with the database
 * (audit A3-05), once per launch. The database is the source of truth; the OS
 * can drift from it — a crash between a save and its scheduling, a failed
 * cancel, an older identifier format, a delete while a cancel was failing.
 *
 * Deliberately conservative:
 * - it never asks for permission, and does nothing at all unless it is already
 *   granted (when denied or undecided nothing could be delivered anyway);
 * - it schedules only what an enabled reminder (or the Evening review) says
 *   should exist — with everything off it can only cancel;
 * - a habit already matching is not touched;
 * - it never throws: a failure is logged and the app starts normally.
 */
export async function reconcileScheduledReminders(): Promise<void> {
	try {
		const permission = await getNotificationPermission();
		if (permission !== "granted") {
			log.info("reminders", "reconcile skipped: notifications not granted");
			return;
		}

		const scheduled = await listScheduledIdentifiers();
		if (scheduled.length >= PENDING_WARNING) {
			log.warn(
				"reminders",
				"close to the OS limit of pending notifications",
				undefined,
				{
					pending: scheduled.length,
				},
			);
		}

		const habits = await getAllHabits();
		const known = new Set(habits.map((habit) => habit.id));
		let resynced = 0;
		let cancelled = 0;

		// Notifications that belong to a habit that no longer exists.
		const orphans = scheduled.filter((identifier) => {
			const id = identifier.match(HABIT_ID_OF)?.[1];
			return id !== undefined && !known.has(Number(id));
		});
		if (await cancelQuietly(orphans, "reconcile: deleted habits")) {
			cancelled += orphans.length;
		}

		for (const habit of habits) {
			try {
				const owned = scheduled.filter((identifier) =>
					identifier.startsWith(habitNotificationPrefix(habit.id)),
				);
				const expected = await expectedKeys(habit);
				if (matches(owned, expected)) continue;
				if (expected.length === 0) {
					// Archived, or nothing enabled: only ever cancel.
					if (await cancelQuietly(owned, "reconcile: nothing expected")) {
						cancelled += owned.length;
					}
				} else {
					await syncHabitReminders(habit);
					resynced++;
				}
			} catch (error) {
				log.error("reminders", "reconcile of one habit failed", error, {
					habitId: habit.id,
				});
			}
		}

		const eveningOwned = scheduled.filter((identifier) =>
			identifier.startsWith(EVENING_PREFIX),
		);
		const eveningOn = (await getSetting(EVENING_REVIEW_SETTING_KEY)) === "true";
		const eveningTime = await getEveningReviewTime();
		if (!eveningOn) {
			if (await cancelQuietly(eveningOwned, "reconcile: evening review off")) {
				cancelled += eveningOwned.length;
			}
		} else if (!matches(eveningOwned, eveningReviewKeys(habits, eveningTime))) {
			const days = eveningReviewDays(habits);
			const created =
				days.length === 0
					? []
					: await scheduleReminder(
							eveningReviewReminder(days, eveningTime),
							newGeneration(),
						);
			await cancelQuietly(
				eveningOwned.filter((identifier) => !created.includes(identifier)),
				"reconcile: replace the evening review",
			);
			resynced++;
		}

		log.info("reminders", "reconciled", {
			resynced,
			cancelled,
			pending: scheduled.length,
		});
	} catch (error) {
		log.error("reminders", "reconcile failed", error);
	}
}
