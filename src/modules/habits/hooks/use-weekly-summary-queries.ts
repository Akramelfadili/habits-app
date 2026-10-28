import { useToday } from "@/lib/today/use-today";
import {
	buildWeeklySummary,
	type SummaryWeek,
	summaryWeekWindow,
	type WeeklySummary,
} from "../domain/weekly-summary";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useFrozenDaysInRange } from "../repositories/frozen-day-repository";
import { useActiveHabits } from "../repositories/habit-repository";

export type WeeklySummaryView = WeeklySummary & {
	/** No habits at all — the screen shows an empty state instead of zeroed tiles. */
	hasHabits: boolean;
	/** False until the habit list has loaded — the screen shows a blank, not the empty state (audit A5-04). */
	isLoaded: boolean;
};

/**
 * Everything Weekly Summary (HAB-11) shows for one Mon–Sun week — this one or
 * the one before. Only that week's entries are read — the per-week strategy
 * never looks past its own week, so nothing earlier can change these numbers.
 */
export function useWeeklySummaryQueries(
	which: SummaryWeek = "this",
): WeeklySummaryView {
	const today = useToday();
	const week = summaryWeekWindow(today, which);
	const { habits, loaded } = useActiveHabits();
	const entries = useEntriesInRange(week.start, week.end);
	const frozenDays = useFrozenDaysInRange(week.start, week.end);

	return {
		...buildWeeklySummary({ habits, entries, frozenDays, today, week: which }),
		hasHabits: habits.length > 0,
		isLoaded: loaded,
	};
}
