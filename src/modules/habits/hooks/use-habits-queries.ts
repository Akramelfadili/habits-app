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
	isLoaded: boolean;
	groups: CategoryGroup[];
	active: Habit[];
	archived: Habit[];
	streakByHabitId: ReadonlyMap<number, number>;
	bestStreakByHabitId: ReadonlyMap<number, number>;
	categoryCount: number;
};

// The live lists are memo-stable, so a tap elsewhere does not redo the pass over the log.
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
