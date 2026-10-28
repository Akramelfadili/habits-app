import { useToday } from "@/lib/today/use-today";
import {
	buildMonthlySummary,
	historyStart,
	type MonthlySummary,
	monthEntryRange,
	monthWindowFor,
} from "../domain/monthly-summary";
import { type ProgressUnlock, progressUnlock } from "../domain/progress-unlock";
import {
	buildWeeklySummary,
	defaultSummaryWeek,
	type WeeklySummary,
} from "../domain/weekly-summary";
import {
	useEntriesInRange,
	useLoggedDays,
} from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";

export type MonthlySummaryView =
	/** The habit list hasn't loaded yet (audit A5-04) — a blank, not the empty state. */
	| { state: "loading" }
	/** No habits at all — an empty state instead of zeroed tiles. */
	| { state: "empty" }
	/** Under 7 days of logs (C6, the shared Progress gate): the partial current month, progress, and the week to look at instead. */
	| {
			state: "too-early";
			firstDay: Date;
			unlock: ProgressUnlock;
			summary: MonthlySummary;
			week: WeeklySummary;
	  }
	| { state: "ready"; summary: MonthlySummary };

/**
 * Everything Monthly Summary (HAB-16) shows. Archived habits are part of the
 * history (their days before archiving still count); the weekly row on the
 * too-early screen is the active habits' own week, as Weekly shows it.
 * Opens on the current month and unlocks after 7 days of logs (the Progress
 * gate; it was 30 days of history). Only the previous month through the month's last week is read — the span
 * `monthEntryRange` says the maths can look at.
 */
export function useMonthlySummaryQueries(): MonthlySummaryView {
	const today = useToday();
	const { habits, loaded } = useHabitsList();
	const frozenDays = useFrozenDays();
	const logged = useLoggedDays();
	const firstDay = historyStart(habits);
	const unlock = progressUnlock(logged);
	// The current month (D15); other months open from Year.
	const month = monthWindowFor(today);
	const range = monthEntryRange(month);
	const entries = useEntriesInRange(range.start, range.end);

	if (!loaded || !logged.loaded) return { state: "loading" };
	if (!firstDay) return { state: "empty" };

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
			frozenDays,
			today,
			week: defaultSummaryWeek(today),
		}),
	};
}
