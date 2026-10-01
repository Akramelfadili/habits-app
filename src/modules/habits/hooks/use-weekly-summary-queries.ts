import { startOfDay } from "date-fns";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useActiveHabits } from "../repositories/habit-repository";
import {
	buildWeeklySummary,
	type SummaryWeek,
	summaryWeekWindow,
	type WeeklySummary,
} from "../services/weekly-summary";

export type WeeklySummaryView = WeeklySummary & {
	/** No habits at all — the screen shows an empty state instead of zeroed tiles. */
	hasHabits: boolean;
};

/**
 * Everything Weekly Summary (HAB-11) shows for one Mon–Sun week — this one or
 * the one before. Only that week's entries are read — the per-week strategy
 * never looks past its own week, so nothing earlier can change these numbers.
 */
export function useWeeklySummaryQueries(
	which: SummaryWeek = "this",
): WeeklySummaryView {
	const today = startOfDay(new Date());
	const week = summaryWeekWindow(today, which);
	const habits = useActiveHabits();
	const entries = useEntriesInRange(week.start, week.end);

	return {
		...buildWeeklySummary({ habits, entries, today, week: which }),
		hasHabits: habits.length > 0,
	};
}
