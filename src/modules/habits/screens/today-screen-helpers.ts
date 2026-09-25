import { NO_CATEGORY_LABEL } from "../constants";
import type { Habit } from "../types";

export type CategoryGroup = {
	category: string;
	habits: Habit[];
};

/**
 * Groups habits by category in the order each category was first created —
 * derived, not stored: there's no separate categories table (`category` is
 * just a nullable text column on `habits`), so "creation order" means the
 * order each distinct category value first appears among habits already
 * sorted by `createdAt` ascending (the order `useHabitsList()` returns them
 * in). "Anytime" (no category) is always forced last, regardless of when it
 * would naturally fall. Within a group, input order is preserved — creation
 * order until Feature 13's manual sort exists (HAB-03 business rules).
 */
export function groupHabitsByCategory(habits: Habit[]): CategoryGroup[] {
	const groups = new Map<string, Habit[]>();

	for (const habit of habits) {
		const key = habit.category ?? NO_CATEGORY_LABEL;
		const existing = groups.get(key);
		if (existing) {
			existing.push(habit);
		} else {
			groups.set(key, [habit]);
		}
	}

	const anytime = groups.get(NO_CATEGORY_LABEL);
	groups.delete(NO_CATEGORY_LABEL);

	const ordered = Array.from(groups, ([category, habits]) => ({
		category,
		habits,
	}));
	if (anytime) {
		ordered.push({ category: NO_CATEGORY_LABEL, habits: anytime });
	}
	return ordered;
}

export type Progress = {
	completed: number;
	total: number;
	/** 0–1, and 0 when there's nothing due (never NaN from a 0/0 division). */
	fraction: number;
};

export function computeProgress(
	dueHabits: Habit[],
	completedHabitIds: ReadonlySet<number>,
): Progress {
	const total = dueHabits.length;
	const completed = dueHabits.filter((habit) =>
		completedHabitIds.has(habit.id),
	).length;
	return { completed, total, fraction: total === 0 ? 0 : completed / total };
}
