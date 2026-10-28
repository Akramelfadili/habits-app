import { min } from "date-fns";
import { useToday } from "@/lib/today/use-today";
import { historyStart } from "../domain/monthly-summary";
import {
	buildWeeklySummary,
	defaultSummaryWeek,
	summaryWeekWindow,
	type WeeklySummary,
} from "../domain/weekly-summary";
import {
	buildYearlySummary,
	type YearlySummary,
	type YearUnlock,
	yearEntryRange,
	yearUnlock,
	yearWindowFor,
} from "../domain/yearly-summary";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";

export type YearlySummaryView =
	/** The habit list hasn't loaded yet (audit A5-04) — a blank, not the empty state. */
	| { state: "loading" }
	/** No habits at all — an empty state instead of zeroed tiles. */
	| { state: "empty" }
	/** Under three months of history (C7): the partial chart, progress, and the week to look at instead. */
	| {
			state: "too-early";
			firstDay: Date;
			unlock: YearUnlock;
			summary: YearlySummary;
			week: WeeklySummary;
	  }
	| { state: "ready"; summary: YearlySummary; firstDay: Date };

/**
 * Everything Yearly Summary (HAB-17) shows. Archived habits are part of the
 * history (their days before archiving still count); the week row on the
 * too-early screen is the active habits' own week, as Weekly shows it.
 * The year opens on the current calendar year, "so far"; history starts at the
 * same `historyStart` Monthly uses. Entries are read for the year's
 * Monday-aligned span (widened to the shown week, which can start last December).
 */
export function useYearlySummaryQueries(): YearlySummaryView {
	const today = useToday();
	const { habits, loaded } = useHabitsList();
	const frozenDays = useFrozenDays();
	const year = yearWindowFor(today);
	const week = summaryWeekWindow(today, defaultSummaryWeek(today));
	const range = yearEntryRange(year);
	const entries = useEntriesInRange(min([range.start, week.start]), range.end);
	const firstDay = historyStart(habits);

	if (!loaded) return { state: "loading" };
	if (!firstDay) return { state: "empty" };

	const summary = buildYearlySummary({
		habits,
		entries,
		frozenDays,
		today,
		year,
	});
	const unlock = yearUnlock(firstDay, today);
	if (unlock.isUnlocked) return { state: "ready", summary, firstDay };

	return {
		state: "too-early",
		firstDay,
		unlock,
		summary,
		week: buildWeeklySummary({
			habits: habits.filter((habit) => habit.archivedAt === null),
			entries,
			frozenDays,
			today,
			week: defaultSummaryWeek(today),
		}),
	};
}
