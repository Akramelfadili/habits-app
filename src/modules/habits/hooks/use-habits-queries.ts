import { useMemo } from "react";
import { useToday } from "@/lib/today/use-today";
import {
	calculateLongestStreak,
	currentStreakAsOf,
} from "../domain/habit-history";
import {
	groupEntriesByHabit,
	groupFrozenDatesByHabit,
} from "../domain/streak-reader";
import {
	type CategoryGroup,
	groupHabitsByCategory,
} from "../presenters/today-screen-helpers";
import { useCategories } from "../repositories/category-repository";
import { useAllEntries } from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import {
	useActiveHabits,
	useArchivedHabits,
} from "../repositories/habit-repository";
import type { Habit } from "../types";

export type HabitsLibrary = {
	/** False until both lists have loaded: the tab shows a blank, not "No habits yet". */
	isLoaded: boolean;
	/** The active habits, one group per category in the stored order (as Today), manual order within each. */
	groups: CategoryGroup[];
	/** The same habits flattened in group order: what Reorder and search walk. */
	active: Habit[];
	/** Most recently archived first. */
	archived: Habit[];
	/** The running streak of each active habit that has one — the row's "13-day streak". */
	streakByHabitId: ReadonlyMap<number, number>;
	/** The longest run an archived habit ever had — "best streak 41". */
	bestStreakByHabitId: ReadonlyMap<number, number>;
	/** Every category, built-in and custom: the Categories row's count. */
	categoryCount: number;
};

/**
 * Everything the Habits tab lists: active habits by category, the archived ones, and the two
 * numbers a row can carry (running streak, best streak). One pass over the log per render of its
 * inputs; the live lists are memo-stable, so a tap elsewhere does not redo it.
 */
export function useHabitsQueries(): HabitsLibrary {
	const { habits: active, loaded: activeLoaded } = useActiveHabits();
	const { habits: archived, loaded: archivedLoaded } = useArchivedHabits();
	const entries = useAllEntries();
	const frozenDays = useFrozenDays();
	const categories = useCategories();
	const today = useToday();

	return useMemo(() => {
		const entriesByHabit = groupEntriesByHabit(entries);
		const frozenByHabit = groupFrozenDatesByHabit(frozenDays);
		const historyOf = (habit: Habit) => ({
			habit,
			entries: entriesByHabit.get(habit.id) ?? [],
			frozenDates: frozenByHabit.get(habit.id) ?? new Set<string>(),
			today,
		});

		const streakByHabitId = new Map<number, number>();
		for (const habit of active) {
			const streak = currentStreakAsOf(historyOf(habit));
			if (streak > 0) streakByHabitId.set(habit.id, streak);
		}
		const bestStreakByHabitId = new Map<number, number>();
		for (const habit of archived) {
			const { days } = calculateLongestStreak(historyOf(habit));
			if (days > 0) bestStreakByHabitId.set(habit.id, days);
		}

		const groups = groupHabitsByCategory(active, categories);
		return {
			isLoaded: activeLoaded && archivedLoaded,
			groups,
			active: groups.flatMap((group) => group.habits),
			archived,
			streakByHabitId,
			bestStreakByHabitId,
			categoryCount: categories.length,
		};
	}, [
		active,
		archived,
		entries,
		frozenDays,
		categories,
		today,
		activeLoaded,
		archivedLoaded,
	]);
}
