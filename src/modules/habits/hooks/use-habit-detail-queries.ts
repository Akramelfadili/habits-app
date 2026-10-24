import { useToday } from "@/lib/today/use-today";
import {
	buildHeatmapWeeks,
	type CompletionRate,
	calculateCompletionRate,
	calculateLongestStreak,
	currentStreakAsOf,
	type HeatmapDay,
	type LongestStreak,
	type RecentEntry,
	recentEntries,
	type StreakReset,
	streakResetInfo,
} from "../domain/habit-history";
import { freezesRemainingInMonth } from "../domain/streaks";
import { useAllEntries, useEntryNotes } from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";
import { useHabitReminders } from "../repositories/reminder-repository";
import type { Habit, Reminder } from "../types";

export type HabitDetail = {
	habit: Habit;
	currentStreak: number;
	longestStreak: LongestStreak;
	completionRate: CompletionRate;
	/** 10 Mon→Sun columns, oldest first (HAB-09's heatmap). */
	heatmapWeeks: HeatmapDay[][];
	/** Logged and/or noted days (HAB-10), newest first. */
	recentEntries: RecentEntry[];
	/** Nothing has ever been logged — drives the new-habit variant's copy. */
	hasEntries: boolean;
	/** Every logged day — what a delete would erase (HAB-13). */
	loggedDays: number;
	/** For the Reminders row's summary (HAB-12). */
	reminders: Reminder[];
	/** The shared pool's remaining freezes this month — the legend's "N freezes left" (HAB-20). */
	freezesRemaining: number;
	/** Set only in the month a streak reset with the pool empty (HAB-20 / D6). */
	streakReset: StreakReset | null;
	today: Date;
};

/**
 * Everything Habit Detail (HAB-09) shows for one habit, or null when the id
 * doesn't resolve (deleted, or a stale link), or undefined while loading. Reads the same live, unbounded
 * entry/freeze queries Today uses and narrows them here — history needs
 * everything since the habit was created anyway, so a per-habit query would
 * save nothing worth a second set of repository functions.
 */
export function useHabitDetailQueries(
	habitId: number,
): HabitDetail | null | undefined {
	const { habits, loaded } = useHabitsList();
	const today = useToday();
	const allEntries = useAllEntries();
	const frozenDays = useFrozenDays();
	const notes = useEntryNotes();
	const reminders = useHabitReminders(habitId);

	const habit = habits.find((candidate) => candidate.id === habitId);
	// `undefined` while the habit list is still loading — so "not found" is
	// never shown for a frame on a cold launch or deep link (audit A5-04).
	if (!loaded) return undefined;
	if (!habit) return null;

	const entries = allEntries.filter((entry) => entry.habitId === habitId);
	const frozenDates = new Set(
		frozenDays
			.filter((frozenDay) => frozenDay.habitId === habitId)
			.map((frozenDay) => frozenDay.date),
	);
	const history = { habit, entries, frozenDates, today };
	const freezesRemaining = freezesRemainingInMonth(frozenDays, today);
	const streakReset = streakResetInfo(history, freezesRemaining);

	return {
		habit,
		currentStreak: currentStreakAsOf(history),
		longestStreak: calculateLongestStreak(history),
		completionRate: calculateCompletionRate(history),
		heatmapWeeks: buildHeatmapWeeks(history, streakReset?.missedDate ?? null),
		recentEntries: recentEntries(
			entries,
			notes.filter((note) => note.habitId === habitId),
		),
		hasEntries: entries.length > 0,
		loggedDays: entries.length,
		reminders,
		freezesRemaining,
		streakReset,
		today,
	};
}
