import {
	type FirstRunSuggestion,
	SEEN_FIRST_RUN_SETTING_KEY,
	suggestionToCreateHabitInput,
} from "../constants";
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
	return createHabitsAndMarkSetting(
		suggestions.map(suggestionToCreateHabitInput),
		{ key: SEEN_FIRST_RUN_SETTING_KEY, value: "true" },
	);
}
