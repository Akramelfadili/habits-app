import { isAfter, startOfDay } from "date-fns";
import {
	getHabitStrategy,
	habitPauses,
} from "../strategies/frequency-strategy";
import { isPausedOn } from "../strategies/paused-schedule";
import type { Habit } from "../types";

/**
 * Today as a day view: which day is shown and which habits it lists. Pure; the React state that
 * holds the selection is `useSelectedDayQueries`.
 */

/** Future days are not selectable: nothing can be logged ahead. */
export function isSelectableDay(dayKey: string, todayKey: string): boolean {
	return dayKey <= todayKey;
}

/**
 * The selection after choosing `dayKey`. `null` means "follow today": choosing today itself
 * clears the selection, so the screen rolls over with midnight instead of pinning the day that
 * was today when it was tapped. A future day leaves the selection as it was.
 */
export function nextSelectedKey(
	current: string | null,
	dayKey: string,
	todayKey: string,
): string | null {
	if (!isSelectableDay(dayKey, todayKey)) return current;
	return dayKey === todayKey ? null : dayKey;
}

export function hasStartedBy(habit: Habit, day: Date): boolean {
	return !isAfter(startOfDay(habit.createdAt), startOfDay(day));
}

export function isPausedOnDay(habit: Habit, day: Date): boolean {
	return isPausedOn(day, habitPauses(habit));
}

/**
 * Whether the day view lists `habit` on `day`: it had started, wasn't paused,
 * and its frequency owes it that day (a per-week habit already met that week
 * is not listed). `completedDates` are the habit's completions in `day`'s week.
 */
export function isHabitListedOn(
	habit: Habit,
	day: Date,
	completedDates: readonly Date[],
): boolean {
	if (!hasStartedBy(habit, day)) return false;
	return getHabitStrategy(habit).isDueOn(day, { completedDates });
}

export function existedOn(habit: Habit, day: Date): boolean {
	return hasStartedBy(habit, day) && !isPausedOnDay(habit, day);
}
