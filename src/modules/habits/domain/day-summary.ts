import { fromDayKey, toDayKey } from "@/utils/day-key";
import type { Entry, Habit } from "../types";
import { isHabitListedOn } from "./selected-day";
import { isEntryComplete } from "./streaks";

export type DaySummary = { completed: number; total: number };

// `entries` must cover the Monday-Sunday week of `day`: a per-week habit's due-ness depends on it.
export function daySummary(
	habits: readonly Habit[],
	entries: readonly Entry[],
	day: Date,
): DaySummary {
	const key = toDayKey(day);
	const completedByHabit = new Map<number, Entry[]>();
	for (const entry of entries) {
		const habit = habits.find((candidate) => candidate.id === entry.habitId);
		if (!habit || !isEntryComplete(habit, entry)) continue;
		const list = completedByHabit.get(entry.habitId) ?? [];
		list.push(entry);
		completedByHabit.set(entry.habitId, list);
	}
	const due = habits.filter((habit) =>
		isHabitListedOn(
			habit,
			day,
			(completedByHabit.get(habit.id) ?? []).map((entry) =>
				fromDayKey(entry.date),
			),
		),
	);
	const completed = due.filter((habit) =>
		(completedByHabit.get(habit.id) ?? []).some((entry) => entry.date === key),
	).length;
	return { completed, total: due.length };
}
