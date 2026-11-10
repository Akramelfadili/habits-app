import {
	groupSuggestions,
	type SuggestionSection,
} from "../presenters/suggestions-presenter";
import { useHabitQueries } from "./use-habit-queries";

export function useSuggestionsQueries(): { sections: SuggestionSection[] } {
	const { habits } = useHabitQueries();
	return { sections: groupSuggestions(habits) };
}
