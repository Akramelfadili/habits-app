import { format, startOfDay } from "date-fns";
import { dayLogValueFor, habitsForDay } from "../domain/retro-log";
import { useAllEntries, useEntryNotes } from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";
import type { DayLogValue, Habit } from "../types";

export type RetroLogDay = {
	date: Date;
	habits: Habit[];
	values: Record<string, DayLogValue>;
	frozenHabitIds: ReadonlySet<number>;
	originHabitId?: number;
	note: string;
};

export function useRetroLogQueries(
	habitId: number | null,
	date: Date | null,
): RetroLogDay | null {
	const { habits: allHabits } = useHabitsList();
	const entries = useAllEntries();
	const notes = useEntryNotes();
	const frozenDays = useFrozenDays();

	if (!date) return null;

	const day = startOfDay(date);
	const dateString = format(day, "yyyy-MM-dd");
	// Archived habits are out of every active list, except the one the sheet was opened from,
	// whose own history stays editable.
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
		habitId === null
			? ""
			: (notes.find(
					(candidate) =>
						candidate.habitId === habitId && candidate.date === dateString,
				)?.note ?? "");

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
		...(habitId === null ? {} : { originHabitId: habitId }),
		note,
	};
}
