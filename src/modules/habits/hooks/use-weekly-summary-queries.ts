import { startOfDay } from "date-fns";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useHabitsList } from "../repositories/habit-repository";
import {
	buildWeeklySummary,
	type WeeklySummary,
	weekWindowFor,
} from "../services/weekly-summary";

export type WeeklySummaryView = WeeklySummary & {
	/** No habits at all — the screen shows an empty state instead of zeroed tiles. */
	hasHabits: boolean;
};

/**
 * Everything Weekly Summary (HAB-11) shows for the current Mon–Sun week.
 * Only this week's entries are read — the per-week strategy never looks past
 * its own week, so nothing earlier can change these numbers.
 */
export function useWeeklySummaryQueries(): WeeklySummaryView {
	const today = startOfDay(new Date());
	const week = weekWindowFor(today);
	const habits = useHabitsList();
	const entries = useEntriesInRange(week.start, week.end);

	return {
		...buildWeeklySummary({ habits, entries, today }),
		hasHabits: habits.length > 0,
	};
}
