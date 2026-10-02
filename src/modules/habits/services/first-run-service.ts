import {
	type FirstRunSuggestion,
	SEEN_FIRST_RUN_SETTING_KEY,
	suggestionToCreateHabitInput,
} from "../constants";
import { getCategories } from "../repositories/category-repository";
import { createHabitsAndMarkSetting } from "../repositories/habit-repository";
import type { Habit } from "../types";

/**
 * Composite HAB-06 write: creates one habit per selected suggestion and marks
 * First Run as seen, atomically — see `createHabitsAndMarkSetting`'s comment
 * for why this needs its own transaction rather than being two plain calls.
 */
export async function addSuggestedHabits(
	suggestions: FirstRunSuggestion[],
): Promise<Habit[]> {
	const categories = await getCategories();
	return createHabitsAndMarkSetting(
		suggestions.map((suggestion) =>
			suggestionToCreateHabitInput(suggestion, categories),
		),
		{ key: SEEN_FIRST_RUN_SETTING_KEY, value: "true" },
	);
}
