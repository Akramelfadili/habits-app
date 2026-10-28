import { OTHER_CATEGORY_NAME } from "../constants";
import { todayCopy } from "../messages";
import type { Category, Habit } from "../types";
import { scheduleLabel } from "./habit-schedule-label";

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
 * T1's fold row summary: "1 not due today · Upper body". Two names, then "+N".
 * On a past day it reads "not due" without "today".
 */
export function foldSummary(
	notDue: readonly Habit[],
	isToday: boolean,
): string {
	const names = notDue.slice(0, 2).map((habit) => habit.name);
	const rest = notDue.length - names.length;
	const joined = rest > 0 ? `${names.join(", ")} +${rest}` : names.join(", ");
	return isToday
		? todayCopy.foldSummary(notDue.length, joined)
		: todayCopy.foldSummaryOnDay(notDue.length, joined);
}

/**
 * The line under a not-due habit's name (T3, the fold row): a per-week habit
 * that has met its target says it is back next week; anything else says how it
 * is scheduled and that a log is a bonus. A logged bonus says it changes no
 * streak.
 */
export function bonusRowStatus(
	habit: Habit,
	completedThisWeek: number,
	logged: boolean,
): string {
	if (
		habit.frequency.type === "per-week" &&
		completedThisWeek >= habit.frequency.timesPerWeek
	) {
		return todayCopy.backNextWeek(
			completedThisWeek,
			habit.frequency.timesPerWeek,
		);
	}
	return logged
		? todayCopy.bonusLogged
		: todayCopy.bonusSchedule(scheduleLabel(habit));
}

/** T8's second line: "5 of 5 · Meditate is on a 13-day streak" — the longest running streak among today's habits, if any. */
export function allDoneBody(
	habits: readonly Habit[],
	streaks: ReadonlyMap<number, number>,
): string {
	let best: { name: string; days: number } | undefined;
	for (const habit of habits) {
		const days = streaks.get(habit.id) ?? 0;
		if (days > 1 && (!best || days > best.days)) {
			best = { name: habit.name, days };
		}
	}
	return todayCopy.allDoneBody(habits.length, best?.name, best?.days);
}
