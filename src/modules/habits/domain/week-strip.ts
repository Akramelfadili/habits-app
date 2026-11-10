import { addDays, addWeeks, isAfter, startOfDay } from "date-fns";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { weekStart } from "@/utils/week-window";
import type { Entry, Habit } from "../types";
import { isHabitListedOn } from "./selected-day";
import { isEntryComplete } from "./streaks";

export type WeekStripDay = {
	date: Date;
	key: string;
	isToday: boolean;
	/** After today: faint and inert, nothing can be logged ahead. */
	isFuture: boolean;
	/** Something was due and everything due was done: the accent dot. A day with nothing due has none. */
	allDone: boolean;
	due: number;
	done: number;
};

export function weekDaysOf(anchor: Date): Date[] {
	const start = weekStart(anchor);
	return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function shiftWeek(anchor: Date, weeks: number): Date {
	return addWeeks(anchor, weeks);
}

export function canShowNextWeek(anchor: Date, today: Date): boolean {
	const nextStart = addWeeks(weekStart(anchor), 1);
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
		const done = due.filter((habit) =>
			(completedByHabit.get(habit.id) ?? []).some(
				(entry) => entry.date === key,
			),
		).length;
		const allDone = !isFuture && due.length > 0 && done === due.length;
		return {
			date,
			key,
			isToday: key === todayKey,
			isFuture,
			allDone,
			due: due.length,
			done,
		};
	});
}

/**
 * The day to select after a swipe: the same weekday one week away, so the strip
 * always shows the week of the selected day. Never later than today; null when
 * there is no such week (a wholly future one).
 */
export function dayAfterWeekSwipe(
	selected: Date,
	today: Date,
	weeks: -1 | 1,
): Date | null {
	if (weeks === 1 && !canShowNextWeek(selected, today)) return null;
	const moved = shiftWeek(selected, weeks);
	return isAfter(startOfDay(moved), startOfDay(today)) ? today : moved;
}
