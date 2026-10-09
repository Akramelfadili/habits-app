import { useHabitsList } from "../repositories/habit-repository";
import type { Habit } from "../types";

export function useHabitQueries() {
	const { habits } = useHabitsList();

	function getHabitById(id: number): Habit | undefined {
		return habits.find((habit) => habit.id === id);
	}

	return { habits, getHabitById };
}
