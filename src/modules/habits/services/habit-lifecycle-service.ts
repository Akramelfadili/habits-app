import { format, startOfDay, subDays } from "date-fns";
import { cancelRemindersWithPrefix } from "@/lib/notifications/notifications";
import {
	deleteHabitAndHistory,
	getHabit,
	setHabitArchived,
	setHabitRestored,
} from "../repositories/habit-repository";
import type { DayRange, Habit } from "../types";
import {
	habitNotificationPrefix,
	syncHabitReminders,
} from "./reminder-service";

/**
 * Archive, restore and delete (HAB-13). Each is composite: the habit's row
 * changes *and* its OS notifications have to follow in the same operation —
 * a reminder firing for an archived or deleted habit is a user-facing bug.
 */

const DATE_FORMAT = "yyyy-MM-dd";

/**
 * The habit's pauses once it's restored at `restoredAt`: the archive period
 * becomes a closed pause from the archive day through the day before the
 * restore, so the restore day itself is an ordinary day again. Archiving and
 * restoring on the same day (Undo) leaves nothing behind.
 */
export function pausesAfterRestore(
	habit: Pick<Habit, "archivedAt" | "pauses">,
	restoredAt: Date,
): DayRange[] {
	if (!habit.archivedAt) return habit.pauses;
	const from = format(habit.archivedAt, DATE_FORMAT);
	const to = format(subDays(startOfDay(restoredAt), 1), DATE_FORMAT);
	if (to < from) return habit.pauses;
	return [...habit.pauses, { from, to }];
}

/** Off Today and every active list; reminder rows are kept, only their notifications stop. */
export async function archiveHabit(habitId: number): Promise<void> {
	await setHabitArchived(habitId, new Date());
	await cancelRemindersWithPrefix(habitNotificationPrefix(habitId));
}

/** Back exactly as it was — streak included — with its reminders firing again. */
export async function restoreHabit(habitId: number): Promise<void> {
	const habit = await getHabit(habitId);
	if (!habit) throw new Error(`Habit ${habitId} not found`);
	const restored = await setHabitRestored(
		habitId,
		pausesAfterRestore(habit, new Date()),
	);
	await syncHabitReminders(restored);
}

/** The one unrecoverable action in the module — only reachable from Habit Detail, behind a confirmation. */
export async function deleteHabit(habitId: number): Promise<void> {
	await deleteHabitAndHistory(habitId);
	await cancelRemindersWithPrefix(habitNotificationPrefix(habitId));
}
