import { startOfDay } from "date-fns";
import { useAllEntries } from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";
import {
	buildHeatmapWeeks,
	type CompletionRate,
	calculateCompletionRate,
	calculateLongestStreak,
	currentStreakAsOf,
	type HeatmapDay,
	type LongestStreak,
	recentEntries,
} from "../services/habit-history";
import type { Entry, Habit } from "../types";

export type HabitDetail = {
	habit: Habit;
	currentStreak: number;
	longestStreak: LongestStreak;
	completionRate: CompletionRate;
	/** 10 Mon→Sun columns, oldest first (HAB-09's heatmap). */
	heatmapWeeks: HeatmapDay[][];
	recentEntries: Entry[];
	/** Nothing has ever been logged — drives the new-habit variant's copy. */
	hasEntries: boolean;
	today: Date;
};

/**
 * Everything Habit Detail (HAB-09) shows for one habit, or null when the id
 * doesn't resolve (deleted, or a stale link). Reads the same live, unbounded
 * entry/freeze queries Today uses and narrows them here — history needs
 * everything since the habit was created anyway, so a per-habit query would
 * save nothing worth a second set of repository functions.
 */
export function useHabitDetailQueries(habitId: number): HabitDetail | null {
	const habits = useHabitsList();
	const allEntries = useAllEntries();
	const frozenDays = useFrozenDays();

	const habit = habits.find((candidate) => candidate.id === habitId);
	if (!habit) return null;

	const today = startOfDay(new Date());
	const entries = allEntries.filter((entry) => entry.habitId === habitId);
	const frozenDates = new Set(
		frozenDays
			.filter((frozenDay) => frozenDay.habitId === habitId)
			.map((frozenDay) => frozenDay.date),
	);
	const history = { habit, entries, frozenDates, today };

	return {
		habit,
		currentStreak: currentStreakAsOf(history),
		longestStreak: calculateLongestStreak(history),
		completionRate: calculateCompletionRate(history),
		heatmapWeeks: buildHeatmapWeeks(history),
		recentEntries: recentEntries(entries),
		hasEntries: entries.length > 0,
		today,
	};
}
