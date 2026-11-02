import {
	groupSuggestions,
	type SuggestionSection,
} from "../presenters/suggestions-presenter";
import { useHabitQueries } from "./use-habit-queries";

/** Browse suggestions' sections (BS1), each suggestion marked Added when a habit of that name exists, archived included. */
export function useSuggestionsQueries(): { sections: SuggestionSection[] } {
	const { habits } = useHabitQueries();
	return { sections: groupSuggestions(habits) };
}
