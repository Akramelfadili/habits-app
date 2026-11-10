import { isAfter, startOfDay } from "date-fns";
import {
	getHabitStrategy,
	habitPauses,
} from "../strategies/frequency-strategy";
import { isPausedOn } from "../strategies/paused-schedule";
import type { Habit } from "../types";

export function isSelectableDay(dayKey: string, todayKey: string): boolean {
	return dayKey <= todayKey;
}

// `null` means "follow today": choosing today clears the selection so the screen rolls over
// with midnight instead of pinning the day that was tapped.
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
