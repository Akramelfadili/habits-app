import { useToday } from "@/lib/today/use-today";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";
import {
	buildMonthlySummary,
	defaultSummaryMonth,
	historyStart,
	type MonthlySummary,
	type MonthUnlock,
	monthEntryRange,
	monthUnlock,
	monthWindowFor,
} from "../services/monthly-summary";
import {
	buildWeeklySummary,
	defaultSummaryWeek,
	type WeeklySummary,
} from "../services/weekly-summary";

export type MonthlySummaryView =
	/** The habit list hasn't loaded yet (audit A5-04) — a blank, not the empty state. */
	| { state: "loading" }
	/** No habits at all — an empty state instead of zeroed tiles. */
	| { state: "empty" }
	/** Under one month of history (C6): the partial current month, progress, and the week to look at instead. */
	| {
			state: "too-early";
			firstDay: Date;
			unlock: MonthUnlock;
			summary: MonthlySummary;
			week: WeeklySummary;
	  }
	| { state: "ready"; summary: MonthlySummary };

/**
 * Everything Monthly Summary (HAB-16) shows. Archived habits are part of the
 * history (their days before archiving still count); the weekly row on the
 * too-early screen is the active habits' own week, as Weekly shows it.
 * Only the previous month through the month's last week is read — the span
 * `monthEntryRange` says the maths can look at.
 */
export function useMonthlySummaryQueries(): MonthlySummaryView {
	const today = useToday();
	const { habits, loaded } = useHabitsList();
	const frozenDays = useFrozenDays();
	const firstDay = historyStart(habits);
	const unlock = firstDay ? monthUnlock(firstDay, today) : null;
	const month =
		unlock?.isUnlocked && firstDay
			? defaultSummaryMonth(today, firstDay)
			: monthWindowFor(today);
	const range = monthEntryRange(month);
	const entries = useEntriesInRange(range.start, range.end);

	if (!loaded) return { state: "loading" };
	if (!firstDay || !unlock) return { state: "empty" };

	const summary = buildMonthlySummary({
		habits,
		entries,
		frozenDays,
		today,
		month,
	});
	if (unlock.isUnlocked) return { state: "ready", summary };

	return {
		state: "too-early",
		firstDay,
		unlock,
		summary,
		week: buildWeeklySummary({
			habits: habits.filter((habit) => habit.archivedAt === null),
			entries,
			today,
			week: defaultSummaryWeek(today),
		}),
	};
}
