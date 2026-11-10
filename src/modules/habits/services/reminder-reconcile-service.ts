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
	getHideHabitNames,
	habitNotificationPrefix,
	markReminderTitlesApplied,
	reminderNotificationId,
	remindersTitlesAreCurrent,
	syncHabitReminders,
} from "./reminder-service";

// iOS keeps at most 64 pending notifications; warn well before a schedule can fail on it.
const PENDING_WARNING = 56;

const EVENING_PREFIX = "evening-review:";
const HABIT_ID_OF = /^habit-(\d+)-/;

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

function eveningReviewKeys(
	habits: readonly Habit[],
	review: { hour: number; minute: number },
): string[] {
	const days = eveningReviewDays(habits);
	const { hour, minute } = eveningReviewReminder(days, review);
	const time = `${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}`;
	return reminderSlots(days).map((slot) => `${EVENING_PREFIX}${slot}:${time}`);
}

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

// The database is the source of truth; the OS can drift (crash between save and scheduling,
// failed cancel, older identifier format). Deliberately conservative: never asks for
// permission, schedules only what an enabled reminder says should exist, leaves matching
// habits alone, and never throws so the app starts normally.
export async function reconcileScheduledReminders(): Promise<void> {
	try {
		const permission = await getNotificationPermission();
		if (permission !== "granted") {
			log.info("reminders.reconcile_skipped", { reason: "not_granted" });
			return;
		}

		const scheduled = await listScheduledIdentifiers();
		if (scheduled.length >= PENDING_WARNING) {
			log.warn("reminders.near_pending_limit", { pending: scheduled.length });
		}

		// Identifiers say nothing about titles: rebuild every habit once after "Hide habit names" changed.
		const hide = await getHideHabitNames();
		const titlesStale = !(await remindersTitlesAreCurrent(hide));
		let retitleFailed = false;

		const habits = await getAllHabits();
		const known = new Set(habits.map((habit) => habit.id));
		let resynced = 0;
		let cancelled = 0;

		const orphans = scheduled.filter((identifier) => {
			const id = identifier.match(HABIT_ID_OF)?.[1];
			return id !== undefined && !known.has(Number(id));
		});
		if (await cancelQuietly(orphans, "reconcile_deleted_habits")) {
			cancelled += orphans.length;
		}

		for (const habit of habits) {
			try {
				const owned = scheduled.filter((identifier) =>
					identifier.startsWith(habitNotificationPrefix(habit.id)),
				);
				const expected = await expectedKeys(habit);
				if (!titlesStale && matches(owned, expected)) continue;
				if (expected.length === 0) {
					if (await cancelQuietly(owned, "reconcile_nothing_expected")) {
						cancelled += owned.length;
					}
				} else {
					await syncHabitReminders(habit);
					resynced++;
				}
			} catch (error) {
				retitleFailed = true;
				log.error("reminders.reconcile_habit_failed", {
					habitId: habit.id,
					error,
				});
			}
		}

		if (titlesStale && !retitleFailed) await markReminderTitlesApplied(hide);

		const eveningOwned = scheduled.filter((identifier) =>
			identifier.startsWith(EVENING_PREFIX),
		);
		const eveningOn = (await getSetting(EVENING_REVIEW_SETTING_KEY)) === "true";
		const eveningTime = await getEveningReviewTime();
		if (!eveningOn) {
			if (await cancelQuietly(eveningOwned, "reconcile_evening_review_off")) {
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
				"reconcile_replace_evening_review",
			);
			resynced++;
		}

		log.info("reminders.reconciled", {
			resynced,
			cancelled,
			pending: scheduled.length,
		});
	} catch (error) {
		log.error("reminders.reconcile_failed", { error });
	}
}
