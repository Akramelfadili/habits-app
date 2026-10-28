import { addDays, addWeeks, isAfter, startOfDay, startOfWeek } from "date-fns";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { WEEK_STARTS_ON } from "../constants";
import type { Entry, Habit } from "../types";
import { isHabitListedOn } from "./selected-day";
import { isEntryComplete } from "./streaks";

/** One day of the week strip (V3-03). */
export type WeekStripDay = {
	date: Date;
	key: string;
	isToday: boolean;
	/** After today: faint and inert, nothing can be logged ahead (HAB-34). */
	isFuture: boolean;
	/** Something was due and everything due was done: the accent dot. A day with nothing due has none. */
	allDone: boolean;
};

/** The seven days of `anchor`'s week, Monday first (D9). */
export function weekDaysOf(anchor: Date): Date[] {
	const start = startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
	return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** The same weekday `weeks` weeks away — the strip's swipe. */
export function shiftWeek(anchor: Date, weeks: number): Date {
	return addWeeks(anchor, weeks);
}

/** Whether the strip may show the week after `anchor`'s: never a week that is wholly in the future. */
export function canShowNextWeek(anchor: Date, today: Date): boolean {
	const nextStart = addWeeks(
		startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }),
		1,
	);
	return !isAfter(nextStart, startOfDay(today));
}

/**
 * The strip's days for the week of `anchor`. `entries` must cover that whole
 * week (a per-week habit's due-ness depends on the week's completions, as in
 * `useTodayQueries`).
 */
export function weekStripDays(
	habits: readonly Habit[],
	entries: readonly Entry[],
	anchor: Date,
	today: Date,
): WeekStripDay[] {
	const todayKey = toDayKey(today);
	const completedByHabit = new Map<number, Entry[]>();
	for (const entry of entries) {
		const habit = habits.find((candidate) => candidate.id === entry.habitId);
		if (!habit || !isEntryComplete(habit, entry)) continue;
		const list = completedByHabit.get(entry.habitId) ?? [];
		list.push(entry);
		completedByHabit.set(entry.habitId, list);
	}

	return weekDaysOf(anchor).map((date) => {
		const key = toDayKey(date);
		const isFuture = key > todayKey;
		const due = habits.filter((habit) =>
			isHabitListedOn(
				habit,
				date,
				(completedByHabit.get(habit.id) ?? []).map((entry) =>
					fromDayKey(entry.date),
				),
			),
		);
		const allDone =
			!isFuture &&
			due.length > 0 &&
			due.every((habit) =>
				(completedByHabit.get(habit.id) ?? []).some(
					(entry) => entry.date === key,
				),
			);
		return { date, key, isToday: key === todayKey, isFuture, allDone };
	});
}
