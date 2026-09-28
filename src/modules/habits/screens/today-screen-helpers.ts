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
 * in manual order (the order `useActiveHabits()` returns them in — creation
 * order until reordered, and a reorder only permutes slots within one
 * category, so a category's first appearance never moves). "Anytime" (no
 * category) is always forced last, regardless of when it would naturally
 * fall. Within a group, input order is preserved — HAB-13's manual order.
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

/** Today's four mutually-exclusive display states (HAB-05). */
export type TodayViewState =
	| "no-habits"
	| "rest-day"
	| "day-closed"
	| "populated";

/**
 * "No habits yet" always wins over "rest day" when both could apply (a brand
 * new user, zero habits, on a day nothing would be scheduled anyway) — check
 * habit count first, per the HAB-05 edge case.
 */
export function resolveTodayViewState(input: {
	totalHabitCount: number;
	progress: Progress;
}): TodayViewState {
	if (input.totalHabitCount === 0) return "no-habits";
	if (input.progress.total === 0) return "rest-day";
	if (input.progress.completed === input.progress.total) return "day-closed";
	return "populated";
}

const NUMBER_WORDS = [
	"zero",
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven",
	"eight",
	"nine",
	"ten",
	"eleven",
	"twelve",
];

/** Day closed's celebratory headline, e.g. "All six done." (HAB-05). */
export function celebratoryHeadline(total: number): string {
	const count =
		total < NUMBER_WORDS.length ? NUMBER_WORDS[total] : String(total);
	return `All ${count} done`;
}
