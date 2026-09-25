import type { HabitAccentKey } from "@/theme/theme";
import { HABIT_COLORS } from "../constants";
import type { Habit } from "../types";

const MAX_CATEGORY_SUGGESTIONS = 5;

/**
 * The first habit color (in HABIT_COLORS pick order) no existing habit uses —
 * falling back to the first color once all six are taken.
 */
export function pickDefaultColor(habits: Habit[]): HabitAccentKey {
	const usedColors = new Set(habits.map((habit) => habit.color));
	return HABIT_COLORS.find((key) => !usedColors.has(key)) ?? HABIT_COLORS[0];
}

/**
 * Previously-used categories matching what's typed (case-insensitive), minus
 * an exact match of the current value — suggesting that would be a no-op.
 */
export function filterCategorySuggestions(
	categories: string[],
	value: string,
): string[] {
	const trimmed = value.trim();
	const query = trimmed.toLowerCase();
	return categories
		.filter(
			(category) =>
				category.toLowerCase().includes(query) && category !== trimmed,
		)
		.slice(0, MAX_CATEGORY_SUGGESTIONS);
}
