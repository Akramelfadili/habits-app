import { OTHER_CATEGORY_NAME } from "../constants";
import type { Category, Habit } from "../types";

export type CategoryGroup = {
	category: Category;
	habits: Habit[];
};

/**
 * Groups habits by category, groups in the stored category order (HAB-42:
 * `categories` as `useCategories()` returns them, which migration 0011
 * backfilled from the old first-appearance rule). A category missing from
 * `categories` (not loaded yet) follows the known ones, in first appearance.
 * The built-in "Other" — V1's "Anytime", and where uncategorised habits
 * migrated to (HAB-24) — is always forced last: a new custom category is
 * stored after it (max + 1), and only the HAB-42 reorder may say otherwise.
 * Within a group, input order is preserved — HAB-13's manual order.
 */
export function groupHabitsByCategory(
	habits: Habit[],
	categories: readonly Category[],
): CategoryGroup[] {
	const groups = new Map<number, CategoryGroup>();

	for (const habit of habits) {
		const existing = groups.get(habit.category.id);
		if (existing) {
			existing.habits.push(habit);
		} else {
			groups.set(habit.category.id, {
				category: habit.category,
				habits: [habit],
			});
		}
	}

	const position = new Map(
		categories.map((category, index) => [category.id, index]),
	);
	const rank = (group: CategoryGroup) =>
		position.get(group.category.id) ?? categories.length;
	// Array sort is stable, so unknown categories keep their first appearance.
	const ordered = Array.from(groups.values()).sort((a, b) => rank(a) - rank(b));
	const isOther = (group: CategoryGroup) =>
		group.category.builtIn && group.category.name === OTHER_CATEGORY_NAME;
	return [
		...ordered.filter((group) => !isOther(group)),
		...ordered.filter(isOther),
	];
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

/** Today's three mutually-exclusive display states (HAB-05, HAB-32). Everything done is still "populated": no extra "day closed" screen (PR-01 is Later). */
export type TodayViewState = "no-habits" | "rest-day" | "populated";

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
	return "populated";
}

/**
 * What a Today row asks of you, under its name (docs/mockups/today-populated.png):
 * a quantity habit's target ("20 pages"), and a per-week habit's standing this
 * week ("2 of 5 this week") — otherwise a 5×/week habit gives no hint whether
 * today is the first or the last it needs. Nothing for a plain daily check:
 * a subtitle that only restates the schedule is noise.
 */
export function todayRowSubtitle(
	habit: Habit,
	completedThisWeek: number,
): string | undefined {
	const parts: string[] = [];
	if (habit.targetType === "quantity" && habit.targetAmount !== null) {
		parts.push(`${habit.targetAmount} ${habit.targetUnit ?? ""}`.trim());
	}
	if (habit.frequency.type === "per-week") {
		parts.push(
			`${completedThisWeek} of ${habit.frequency.timesPerWeek} this week`,
		);
	}
	return parts.length > 0 ? parts.join(" · ") : undefined;
}
