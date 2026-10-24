import { isAfter, parseISO, startOfDay } from "date-fns";
import { toDayKey } from "@/utils/day-key";
import { isHabitDueOn } from "../strategies/frequency-strategy";
import type { DayLog, DayLogValue, Entry, Habit } from "../types";
import { isEntryComplete } from "./streaks";

/**
 * Retro log's day math (HAB-10) — pure functions over one calendar day. The
 * sheet edits a draft of these values; only the diff is written on save, and
 * streaks/rate/heatmap follow automatically because they're always derived
 * from entries, never stored.
 */

/**
 * The habits a retro-logged `date` shows: each one that existed then and was
 * due that day (per its FrequencyStrategy, with only earlier completions
 * counting — what Today would have shown) or has something logged that day.
 * The habit the sheet was opened from always shows, first.
 */
export function habitsForDay(
	habits: readonly Habit[],
	entries: readonly Entry[],
	date: Date,
	focusHabitId: number,
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

/** A habit's saved value for the day: presence for a check habit, the amount (0 = nothing) for a quantity one. */
export function dayLogValueFor(
	habit: Habit,
	entry: Entry | undefined,
): DayLogValue {
	if (habit.targetType === "quantity") return entry?.value ?? 0;
	return entry !== undefined;
}

/** Whether a draft value counts as done — the check's state in the sheet. */
export function isDayLogValueDone(habit: Habit, value: DayLogValue): boolean {
	if (typeof value === "boolean") return value;
	return habit.targetAmount !== null && value >= habit.targetAmount;
}

/**
 * The check's toggle: a check habit flips; a quantity habit goes between
 * nothing logged and its full target — a partial amount counts as not done,
 * so it fills up to the target (exact amounts go through the row's stepper).
 */
export function toggledDayLogValue(
	habit: Habit,
	value: DayLogValue,
): DayLogValue {
	if (typeof value === "boolean") return !value;
	return isDayLogValueDone(habit, value) ? 0 : (habit.targetAmount ?? 0);
}

/** Only the habits whose draft differs from what's saved — what a save writes. */
export function diffDayLog(
	saved: Readonly<Record<string, DayLogValue>>,
	draft: Readonly<Record<string, DayLogValue>>,
): DayLog["values"] {
	return Object.entries(draft)
		.filter(([habitId, value]) => saved[habitId] !== value)
		.map(([habitId, value]) => ({ habitId: Number(habitId), value }));
}
