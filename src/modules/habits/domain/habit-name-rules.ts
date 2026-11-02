import type { Habit } from "../types";

/** The comparison key for habit names: surrounding whitespace and case don't count. */
function nameKey(name: string): string {
	return name.trim().toLowerCase();
}

/**
 * The existing habit a name would clash with, if any (HAB-41, F8) — matching
 * ignores case and surrounding whitespace and looks at archived habits too, so
 * restoring one never leaves two with the same name. `ignoreId` lets an edit
 * keep its own name without colliding with itself.
 */
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
