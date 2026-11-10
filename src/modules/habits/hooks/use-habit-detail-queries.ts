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
	rateDelta: number | null;
	heatmapWeeks: HeatmapDay[][];
	history: HistoryRow[];
	hasEntries: boolean;
	logCount: number;
	reminders: Reminder[];
	freezesRemaining: number;
	streakReset: StreakReset | null;
	restoredToday: boolean;
	freshStart: boolean;
	today: Date;
};

// Frozen days are read unnarrowed: the pool is shared, so the month's remaining count needs every habit's.
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
	// `undefined` while the habit list is still loading, so "not found" is never shown for a frame
	// on a cold launch or deep link.
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
