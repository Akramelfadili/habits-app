import { useToday } from "@/lib/today/use-today";
import { useLoggedDays } from "../repositories/entry-repository";
import { useHabitsList } from "../repositories/habit-repository";

/**
 * What the Progress shell needs whatever the range: today, and whether there
 * is anything to export. Habits and one aggregate row of logged days — the
 * ranges' own reads stay in their own hooks.
 */
export function useProgressShellQueries() {
	const today = useToday();
	const { habits, loaded } = useHabitsList();
	const logged = useLoggedDays();
	return {
		today,
		loaded: loaded && logged.loaded,
		hasHabits: habits.length > 0,
		/** At least one log exists: Export has something to put in the file. */
		hasLogs: logged.count > 0,
	};
}
