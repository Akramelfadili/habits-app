import { builtInAppearance } from "../constants";
import { findDuplicateHabit } from "../domain/habit-name-rules";
import { suggestionsCopy } from "../messages";
import { SUGGESTIONS, type Suggestion } from "../suggestions";
import type { CategoryAppearance, Frequency, Habit } from "../types";
import type { HabitFormPrefill } from "./habit-form-prefill";
import { weekdaysLabel } from "./habit-schedule-label";

export type SuggestionItem = {
	suggestion: Suggestion;
	subtitle: string;
	/** A habit with this name already exists, archived included: shown as Added and not selectable. */
	added: boolean;
	appearance: CategoryAppearance;
};

export type SuggestionSection = {
	/** Stable key: the category's name, or "break". */
	key: string;
	title: string;
	items: SuggestionItem[];
};

function frequencyLabel(frequency: Frequency): string {
	if (frequency.type === "daily") return suggestionsCopy.daily;
	if (frequency.type === "per-week") {
		return suggestionsCopy.perWeek(frequency.timesPerWeek);
	}
	return weekdaysLabel(frequency.days);
}

export function suggestionSubtitle(suggestion: Suggestion): string {
	const { target, direction, frequency } = suggestion;
	if (direction === "break") {
		return frequency.type === "daily"
			? suggestionsCopy.breakDaily
			: `${suggestionsCopy.breakWord} · ${frequencyLabel(frequency).toLowerCase()}`;
	}
	if (target) return suggestionsCopy.quantity(target.amount, target.unit);
	return frequencyLabel(frequency);
}

/**
 * The bundle grouped: one section per category in the order the bundle first names it,
 * and the Break habits together at the end whatever their category. `habits` (archived
 * included) decides which are Added: the same duplicate rule the New habit form applies,
 * so a suggestion marked Added is exactly one the form would refuse.
 */
export function groupSuggestions(
	habits: readonly Habit[],
	suggestions: readonly Suggestion[] = SUGGESTIONS,
): SuggestionSection[] {
	const sections: SuggestionSection[] = [];
	const ordered = [
		...suggestions.filter((s) => s.direction === "build"),
		...suggestions.filter((s) => s.direction === "break"),
	];
	for (const suggestion of ordered) {
		const key =
			suggestion.direction === "break" ? "break" : suggestion.category;
		let section = sections.find((candidate) => candidate.key === key);
		if (!section) {
			section = {
				key,
				title:
					suggestion.direction === "break"
						? suggestionsCopy.breakGroup
						: suggestion.category,
				items: [],
			};
			sections.push(section);
		}
		section.items.push({
			suggestion,
			subtitle: suggestionSubtitle(suggestion),
			added: findDuplicateHabit(habits, suggestion.name) !== undefined,
			appearance: builtInAppearance(suggestion.category),
		});
	}
	return sections;
}

export function suggestionToPrefill(suggestion: Suggestion): HabitFormPrefill {
	return {
		name: suggestion.name,
		category: suggestion.category,
		direction: suggestion.direction,
		target: suggestion.target,
		frequency: suggestion.frequency,
	};
}
