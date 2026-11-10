import type { Habit } from "../types";

function nameKey(name: string): string {
	return name.trim().toLowerCase();
}

// Archived habits count too, so restoring one never leaves two with the same name.
export function findDuplicateHabit(
	habits: readonly Pick<Habit, "id" | "name">[],
	name: string,
	ignoreId?: number,
): Pick<Habit, "id" | "name"> | undefined {
	const key = nameKey(name);
	if (key === "") return undefined;
	return habits.find(
		(habit) => habit.id !== ignoreId && nameKey(habit.name) === key,
	);
}
