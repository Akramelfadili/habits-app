import {
	addDays,
	endOfWeek,
	format,
	parseISO,
	startOfDay,
	startOfWeek,
} from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import { useEntriesInRange } from "../repositories/entry-repository";
import { useHabitsList } from "../repositories/habit-repository";
import {
	type CategoryGroup,
	computeProgress,
	groupHabitsByCategory,
	type Progress,
	resolveTodayViewState,
	type TodayViewState,
} from "../screens/today-screen-helpers";
import { getFrequencyStrategy } from "../strategies/frequency-strategy";
import type { Entry, Habit } from "../types";

const DATE_FORMAT = "yyyy-MM-dd";

/**
 * Whether `entry` counts as an actual completion of `habit` — presence alone
 * for a simple-check habit, but `value >= targetAmount` for a quantity habit
 * (HAB-07), so a partially-logged quantity day isn't treated as done anywhere
 * completion is inferred (progress, streak scheduling, "last completed").
 */
function isEntryComplete(habit: Habit, entry: Entry): boolean {
	if (habit.targetType !== "quantity") return true;
	return (
		entry.value !== undefined &&
		habit.targetAmount !== null &&
		entry.value >= habit.targetAmount
	);
}

export function useTodayQueries(): {
	totalHabitCount: number;
	groups: CategoryGroup[];
	progress: Progress;
	completedHabitIds: ReadonlySet<number>;
	/** Today's logged quantity value per habit — only set for quantity habits with an entry today. */
	quantityValuesByHabitId: ReadonlyMap<number, number>;
	today: Date;
	viewState: TodayViewState;
	/** Habits due tomorrow — only meaningful for the Day closed preview (HAB-05). */
	tomorrowPreview: Habit[];
	/** The due-today habit completed most recently — Day closed's Undo target (HAB-05). */
	lastCompletedToday: { id: number; name: string } | null;
} {
	const habits = useHabitsList();
	const today = startOfDay(new Date());
	const tomorrow = addDays(today, 1);
	const weekStart = startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
	const weekEnd = endOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
	const entries = useEntriesInRange(weekStart, weekEnd);
	const habitsById = new Map(habits.map((habit) => [habit.id, habit]));

	const completedDatesByHabit = new Map<number, Date[]>();
	const todayString = format(today, DATE_FORMAT);
	const completedHabitIds = new Set<number>();
	const quantityValuesByHabitId = new Map<number, number>();
	for (const entry of entries) {
		const habit = habitsById.get(entry.habitId);
		if (!habit) continue;

		if (entry.date === todayString && entry.value !== undefined) {
			quantityValuesByHabitId.set(entry.habitId, entry.value);
		}

		if (!isEntryComplete(habit, entry)) continue;

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
	const tomorrowPreview = habits.filter((habit) =>
		getFrequencyStrategy(habit.frequency).isDueOn(tomorrow, {
			completedDates: completedDatesByHabit.get(habit.id) ?? [],
		}),
	);

	const progress = computeProgress(dueHabits, completedHabitIds);

	// The due-today entry created most recently — a real timestamp, so this
	// survives app restarts, unlike tracking "last toggled" in screen state.
	const dueHabitIds = new Set(dueHabits.map((habit) => habit.id));
	let lastCompletedToday: { id: number; name: string } | null = null;
	let latestCreatedAt = -Infinity;
	for (const entry of entries) {
		if (entry.date !== todayString || !dueHabitIds.has(entry.habitId)) continue;
		const habit = habitsById.get(entry.habitId);
		if (!habit || !isEntryComplete(habit, entry)) continue;
		const createdAtTime = entry.createdAt.getTime();
		if (createdAtTime <= latestCreatedAt) continue;
		latestCreatedAt = createdAtTime;
		lastCompletedToday = { id: habit.id, name: habit.name };
	}

	return {
		totalHabitCount: habits.length,
		groups: groupHabitsByCategory(dueHabits),
		progress,
		completedHabitIds,
		quantityValuesByHabitId,
		today,
		viewState: resolveTodayViewState({
			totalHabitCount: habits.length,
			progress,
		}),
		tomorrowPreview,
		lastCompletedToday,
	};
}
