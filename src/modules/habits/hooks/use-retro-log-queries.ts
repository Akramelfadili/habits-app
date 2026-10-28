import { format, startOfDay } from "date-fns";
import { dayLogValueFor, habitsForDay } from "../domain/retro-log";
import { useAllEntries, useEntryNotes } from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";
import type { DayLogValue, Habit } from "../types";

export type RetroLogDay = {
	date: Date;
	/** The day's habits, the one the sheet was opened from first. */
	habits: Habit[];
	/** Each shown habit's saved value, keyed by habit id — the form's starting draft. */
	values: Record<string, DayLogValue>;
	/** Habits whose day is a frozen one: their circle is violet, and logging it gives the freeze back (PR-11). */
	frozenHabitIds: ReadonlySet<number>;
	/** The habit the sheet was opened from: it owns the day's note. */
	originHabitId: number;
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
	const { habits: allHabits } = useHabitsList();
	const entries = useAllEntries();
	const notes = useEntryNotes();
	const frozenDays = useFrozenDays();

	if (!date) return null;

	const day = startOfDay(date);
	const dateString = format(day, "yyyy-MM-dd");
	// Archived habits are out of every active list (HAB-13) — except the one
	// the sheet was opened from, whose own history stays editable.
	const candidates = allHabits.filter(
		(habit) => habit.id === habitId || habit.archivedAt === null,
	);
	const habits = habitsForDay(candidates, entries, day, habitId);
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

	const frozenHabitIds = new Set(
		frozenDays
			.filter((frozen) => frozen.date === dateString)
			.map((frozen) => frozen.habitId),
	);

	return {
		date: day,
		habits,
		values,
		frozenHabitIds,
		originHabitId: habitId,
		note,
	};
}
