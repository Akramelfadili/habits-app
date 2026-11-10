import { isAfter, parseISO, startOfDay } from "date-fns";
import { toDayKey } from "@/utils/day-key";
import { isHabitDueOn } from "../strategies/frequency-strategy";
import type { DayLog, DayLogValue, Entry, Habit } from "../types";
import { isEntryComplete } from "./streaks";

// Only earlier completions count, so the list is what Today would have shown that day.
export function habitsForDay(
	habits: readonly Habit[],
	entries: readonly Entry[],
	date: Date,
	focusHabitId: number | null,
): Habit[] {
	const day = startOfDay(date);
	const dateString = toDayKey(day);
	const shown = habits.filter((habit) => {
		if (habit.id === focusHabitId) return true;
		if (isAfter(startOfDay(habit.createdAt), day)) return false;
		const own = entries.filter((entry) => entry.habitId === habit.id);
		if (own.some((entry) => entry.date === dateString)) return true;
		const completedDates = own
			.filter((entry) => isEntryComplete(habit, entry))
			.map((entry) => parseISO(entry.date));
		return isHabitDueOn(habit, day, completedDates);
	});
	return [
		...shown.filter((habit) => habit.id === focusHabitId),
		...shown.filter((habit) => habit.id !== focusHabitId),
	];
}

export function dayLogValueFor(
	habit: Habit,
	entry: Entry | undefined,
): DayLogValue {
	if (habit.targetType === "quantity") return entry?.value ?? 0;
	return entry !== undefined;
}

export function isDayLogValueDone(habit: Habit, value: DayLogValue): boolean {
	if (typeof value === "boolean") return value;
	return habit.targetAmount !== null && value >= habit.targetAmount;
}

// A partial quantity counts as not done, so toggling fills it to the target.
export function toggledDayLogValue(
	habit: Habit,
	value: DayLogValue,
): DayLogValue {
	if (typeof value === "boolean") return !value;
	return isDayLogValueDone(habit, value) ? 0 : (habit.targetAmount ?? 0);
}

export function diffDayLog(
	saved: Readonly<Record<string, DayLogValue>>,
	draft: Readonly<Record<string, DayLogValue>>,
): DayLog["values"] {
	return Object.entries(draft)
		.filter(([habitId, value]) => saved[habitId] !== value)
		.map(([habitId, value]) => ({ habitId: Number(habitId), value }));
}
