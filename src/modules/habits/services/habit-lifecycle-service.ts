import { startOfDay, subDays } from "date-fns";
import { toDayKey } from "@/utils/day-key";
import {
	deleteHabitAndHistory,
	getHabit,
	setHabitArchived,
	setHabitRestored,
} from "../repositories/habit-repository";
import type { DayRange, Habit } from "../types";
import { cancelHabitNotifications, syncAfterWrite } from "./reminder-service";

// Each operation changes the row and its OS notifications together: a reminder firing for an
// archived or deleted habit is a user-facing bug.

// The pause ends the day before the restore, so the restore day is an ordinary day again;
// archiving and restoring on the same day leaves nothing behind.
export function pausesAfterRestore(
	habit: Pick<Habit, "archivedAt" | "pauses">,
	restoredAt: Date,
): DayRange[] {
	if (!habit.archivedAt) return habit.pauses;
	const from = toDayKey(habit.archivedAt);
	const to = toDayKey(subDays(startOfDay(restoredAt), 1));
	if (to < from) return habit.pauses;
	return [...habit.pauses, { from, to }];
}

export async function archiveHabit(habitId: number): Promise<void> {
	await setHabitArchived(habitId, new Date());
	await cancelHabitNotifications(habitId);
}

// `syncHabitReminders` rebuilds rather than appends, so repeated restores never stack
// notifications. The streak starts fresh from the restore day: nothing counts across the gap.
export async function restoreHabit(habitId: number): Promise<void> {
	const habit = await getHabit(habitId);
	if (!habit) throw new Error(`Habit ${habitId} not found`);
	const restored = await setHabitRestored(
		habitId,
		pausesAfterRestore(habit, new Date()),
	);
	await syncAfterWrite(restored);
}

// Re-archives with the original archive date and pauses, not a fresh archive dated today.
export async function undoRestoreHabit(
	habitId: number,
	before: Pick<Habit, "archivedAt" | "pauses">,
): Promise<void> {
	if (!before.archivedAt)
		throw new Error("Nothing to undo: habit wasn't archived");
	await setHabitArchived(habitId, before.archivedAt, before.pauses);
	await cancelHabitNotifications(habitId);
}

// The one unrecoverable action: only reachable from Habit Detail, behind a confirmation.
export async function deleteHabit(habitId: number): Promise<void> {
	await deleteHabitAndHistory(habitId);
	await cancelHabitNotifications(habitId);
}
