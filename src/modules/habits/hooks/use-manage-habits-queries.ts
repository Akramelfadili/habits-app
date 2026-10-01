import { useAllEntries } from "../repositories/entry-repository";
import {
	useActiveHabits,
	useArchivedHabits,
} from "../repositories/habit-repository";
import { groupHabitsByCategory } from "../screens/today-screen-helpers";
import type { Habit } from "../types";

export type ArchivedHabitRow = {
	habit: Habit;
	/** Every logged day, still there — "41 days logged". */
	logsKept: number;
};

export type ManageHabitsView = {
	/** Category by category (Today's group order), manual order within each. */
	active: Habit[];
	/** Most recently archived first. */
	archived: ArchivedHabitRow[];
};

/** Everything Manage & Archive (HAB-13) lists. */
export function useManageHabitsQueries(): ManageHabitsView {
	const active = useActiveHabits();
	const archived = useArchivedHabits();
	const entries = useAllEntries();

	const logCounts = new Map<number, number>();
	for (const entry of entries) {
		logCounts.set(entry.habitId, (logCounts.get(entry.habitId) ?? 0) + 1);
	}

	return {
		active: groupHabitsByCategory(active).flatMap((group) => group.habits),
		archived: archived.map((habit) => ({
			habit,
			logsKept: logCounts.get(habit.id) ?? 0,
		})),
	};
}
