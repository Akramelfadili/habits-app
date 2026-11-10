import { useMemo } from "react";
import { useHabitsList } from "../repositories/habit-repository";
import type { Habit } from "../types";

export function useProgressFilterQueries(): {
	active: Habit[];
	archived: Habit[];
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
