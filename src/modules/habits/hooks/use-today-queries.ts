import { endOfWeek, format, parseISO, startOfDay, startOfWeek } from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useHabitsList } from "../repositories/habit-repository";
import {
	type CategoryGroup,
	computeProgress,
	groupHabitsByCategory,
	type Progress,
} from "../screens/today-screen-helpers";
import { getFrequencyStrategy } from "../strategies/frequency-strategy";

const DATE_FORMAT = "yyyy-MM-dd";

export function useTodayQueries(): {
	totalHabitCount: number;
	groups: CategoryGroup[];
	progress: Progress;
	completedHabitIds: ReadonlySet<number>;
	today: Date;
} {
	const habits = useHabitsList();
	const today = startOfDay(new Date());
	const weekStart = startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
	const weekEnd = endOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
	const entries = useEntriesInRange(weekStart, weekEnd);

	const completedDatesByHabit = new Map<number, Date[]>();
	const todayString = format(today, DATE_FORMAT);
	const completedHabitIds = new Set<number>();
	for (const entry of entries) {
		const list = completedDatesByHabit.get(entry.habitId) ?? [];
		list.push(parseISO(entry.date));
		completedDatesByHabit.set(entry.habitId, list);
		if (entry.date === todayString) completedHabitIds.add(entry.habitId);
	}

	const dueHabits = habits.filter((habit) =>
		getFrequencyStrategy(habit.frequency).isDueOn(today, {
			completedDates: completedDatesByHabit.get(habit.id) ?? [],
		}),
	);

	return {
		totalHabitCount: habits.length,
		groups: groupHabitsByCategory(dueHabits),
		progress: computeProgress(dueHabits, completedHabitIds),
		completedHabitIds,
		today,
	};
}
