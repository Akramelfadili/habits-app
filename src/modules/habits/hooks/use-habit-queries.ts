import { useHabitsList } from "../repositories/habit-repository";
import type { Habit } from "../types";

export function useHabitQueries() {
	const habits = useHabitsList();

	const categories = Array.from(
		new Set(
			habits
				.map((habit) => habit.category)
				.filter((category): category is string => Boolean(category)),
		),
	);

	function getHabitById(id: number): Habit | undefined {
		return habits.find((habit) => habit.id === id);
	}

	return { habits, categories, getHabitById };
}
