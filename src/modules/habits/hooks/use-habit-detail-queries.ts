import { addDays, format, parseISO } from "date-fns";
import { useToday } from "@/lib/today/use-today";
import {
	buildHeatmapWeeks,
	type CompletionRate,
	calculateCompletionRate,
	calculateLongestStreak,
	completionRateDelta,
	currentStreakAsOf,
	type HeatmapDay,
	type HistoryRow,
	habitHistoryRows,
	type LongestStreak,
	type StreakReset,
	streakResetInfo,
} from "../domain/habit-history";
import { freezesRemainingInMonth } from "../domain/streaks";
import {
	useEntryNotes,
	useHabitEntries,
} from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";
import { useHabitReminders } from "../repositories/reminder-repository";
import type { Habit, Reminder } from "../types";

export type HabitDetail = {
	habit: Habit;
	currentStreak: number;
	longestStreak: LongestStreak;
	completionRate: CompletionRate;
	/** The 90-day rate against the 90 days before it, in whole points; null with nothing to compare (D1). */
	rateDelta: number | null;
	/** 5 Mon→Sun weeks, oldest first (D1's last five weeks). */
	heatmapWeeks: HeatmapDay[][];
	/** Days that were done, missed, frozen or a bonus, with their notes, newest first (D2). */
	history: HistoryRow[];
	/** Anything has ever been logged — drives the new-habit variant (D3). */
	hasEntries: boolean;
	/** Every log: what a delete would erase, and names in its sheet (DC1). */
	logCount: number;
	/** For the Reminders row's value (D1). */
	reminders: Reminder[];
	/** The shared pool's remaining freezes this month — the D6 tile. */
	freezesRemaining: number;
	/** Set only in the month a streak reset with the pool empty (D6). */
	streakReset: StreakReset | null;
	/** Restored today (its last pause ended yesterday): the one-time banner (D5). */
	restoredToday: boolean;
	/** Restored and not yet logged since: a streak of 0 is a fresh start, not a loss (D5). */
	freshStart: boolean;
	today: Date;
};

/**
 * Everything Habit Detail shows for one habit, or null when the id doesn't
 * resolve (deleted, or a stale link), or undefined while loading. Reads this
 * habit's slice of the shared entry log (no query or listener of its own, A-03)
 * and the shared frozen days, narrowing the latter here — the pool is shared, so
 * the month's remaining count needs every habit's.
 */
export function useHabitDetailQueries(
	habitId: number,
): HabitDetail | null | undefined {
	const { habits, loaded } = useHabitsList();
	const today = useToday();
	const entries = useHabitEntries(habitId);
	const frozenDays = useFrozenDays();
	const notes = useEntryNotes();
	const reminders = useHabitReminders(habitId);

	const habit = habits.find((candidate) => candidate.id === habitId);
	// `undefined` while the habit list is still loading — so "not found" is
	// never shown for a frame on a cold launch or deep link (audit A5-04).
	if (!loaded) return undefined;
	if (!habit) return null;

	const frozenDates = new Set(
		frozenDays
			.filter((frozenDay) => frozenDay.habitId === habitId)
			.map((frozenDay) => frozenDay.date),
	);
	const history = { habit, entries, frozenDates, today };
	const freezesRemaining = freezesRemainingInMonth(frozenDays, today);
	const streakReset = streakResetInfo(history, freezesRemaining);
	const currentStreak = currentStreakAsOf(history);

	const lastPause = habit.pauses.at(-1);
	const restoredOn = lastPause
		? format(addDays(parseISO(lastPause.to), 1), "yyyy-MM-dd")
		: null;
	const latestEntry = entries.reduce(
		(latest, entry) => (entry.date > latest ? entry.date : latest),
		"",
	);

	return {
		habit,
		currentStreak,
		longestStreak: calculateLongestStreak(history),
		completionRate: calculateCompletionRate(history),
		rateDelta: completionRateDelta(history),
		heatmapWeeks: buildHeatmapWeeks(history, streakReset?.missedDate ?? null),
		history: habitHistoryRows(
			history,
			notes.filter((note) => note.habitId === habitId),
		),
		hasEntries: entries.length > 0,
		logCount: entries.length,
		reminders,
		freezesRemaining,
		streakReset,
		restoredToday:
			restoredOn !== null && restoredOn === format(today, "yyyy-MM-dd"),
		freshStart:
			restoredOn !== null && currentStreak === 0 && latestEntry < restoredOn,
		today,
	};
}
