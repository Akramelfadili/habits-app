import { format, startOfDay } from "date-fns";
import { useAllEntries, useEntryNotes } from "../repositories/entry-repository";
import { useHabitsList } from "../repositories/habit-repository";
import { dayLogValueFor, habitsForDay } from "../services/retro-log";
import type { DayLogValue, Habit } from "../types";

export type RetroLogDay = {
	date: Date;
	/** The day's habits, the one the sheet was opened from first. */
	habits: Habit[];
	/** Each shown habit's saved value, keyed by habit id — the form's starting draft. */
	values: Record<string, DayLogValue>;
	/** The opening habit's saved note for the day — "" when there isn't one. */
	note: string;
};

/**
 * What the Retro log sheet (HAB-10) edits for `date`, opened from `habitId`'s
 * heatmap — or null while no day is selected.
 */
export function useRetroLogQueries(
	habitId: number,
	date: Date | null,
): RetroLogDay | null {
	const allHabits = useHabitsList();
	const entries = useAllEntries();
	const notes = useEntryNotes();

	if (!date) return null;

	const day = startOfDay(date);
	const dateString = format(day, "yyyy-MM-dd");
	const habits = habitsForDay(allHabits, entries, day, habitId);
	const values: Record<string, DayLogValue> = {};
	for (const habit of habits) {
		const entry = entries.find(
			(candidate) =>
				candidate.habitId === habit.id && candidate.date === dateString,
		);
		values[habit.id] = dayLogValueFor(habit, entry);
	}
	const note =
		notes.find(
			(candidate) =>
				candidate.habitId === habitId && candidate.date === dateString,
		)?.note ?? "";

	return { date: day, habits, values, note };
}
