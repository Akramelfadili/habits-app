import { useMemo } from "react";
import { useHabitsList } from "../repositories/habit-repository";
import type { Habit } from "../types";

/**
 * The habits the Year chip can pick: all habits first, then the active ones in their order, then
 * the archived ones (their history is still theirs to look at).
 */
export function useProgressFilterQueries(): {
	active: Habit[];
	archived: Habit[];
	/** Exactly one habit exists and it is active: Progress is its one-habit variant. */
	onlyHabit: Habit | null;
} {
	const { habits } = useHabitsList();
	return useMemo(() => {
		const active = habits.filter((habit) => habit.archivedAt === null);
		const archived = habits.filter((habit) => habit.archivedAt !== null);
		return {
			active,
			archived,
			onlyHabit:
				habits.length === 1 && active.length === 1 ? (active[0] ?? null) : null,
		};
	}, [habits]);
}
