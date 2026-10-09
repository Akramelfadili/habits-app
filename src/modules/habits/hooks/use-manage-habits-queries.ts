import { useAllEntries } from "../repositories/entry-repository";
import {
	useActiveHabits,
	useArchivedHabits,
} from "../repositories/habit-repository";
import {
	type CategoryGroup,
	groupHabitsByCategory,
} from "../screens/today-screen-helpers";
import type { Habit } from "../types";

export type ArchivedHabitRow = {
	habit: Habit;
	/** Every logged day, still there — "41 days logged". */
	logsKept: number;
};

export type ManageHabitsView = {
	/** Category by category (Today's group order), manual order within each. */
	active: Habit[];
	/** The same habits as one group per category — Today's grouping, so both agree. */
	groups: CategoryGroup[];
	/** Most recently archived first. */
	archived: ArchivedHabitRow[];
	/** False until both lists have loaded — Manage shows a blank, not "No active habits" (audit A5-04). */
	isLoaded: boolean;
};

/** Everything Manage & Archive (HAB-13) lists. */
export function useManageHabitsQueries(): ManageHabitsView {
	const { habits: active, loaded: activeLoaded } = useActiveHabits();
	const { habits: archived, loaded: archivedLoaded } = useArchivedHabits();
	const entries = useAllEntries();

	const logCounts = new Map<number, number>();
	for (const entry of entries) {
		logCounts.set(entry.habitId, (logCounts.get(entry.habitId) ?? 0) + 1);
	}

	const groups = groupHabitsByCategory(active);
	return {
		isLoaded: activeLoaded && archivedLoaded,
		active: groups.flatMap((group) => group.habits),
		groups,
		archived: archived.map((habit) => ({
			habit,
			logsKept: logCounts.get(habit.id) ?? 0,
		})),
	};
}
