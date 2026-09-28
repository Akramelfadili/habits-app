import {
	addDays,
	endOfWeek,
	format,
	parseISO,
	startOfDay,
	startOfWeek,
} from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import {
	useAllEntries,
	useEntriesInRange,
} from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useActiveHabits } from "../repositories/habit-repository";
import {
	type CategoryGroup,
	computeProgress,
	groupHabitsByCategory,
	type Progress,
	resolveTodayViewState,
	type TodayViewState,
} from "../screens/today-screen-helpers";
import {
	freezesRemainingInMonth,
	getStreakAtRisk,
	isEntryComplete,
	type StreakAtRisk,
} from "../services/habit-service";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import type { Habit } from "../types";

const DATE_FORMAT = "yyyy-MM-dd";

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
	/** Due-today habits currently showing the streak-at-risk prompt (HAB-08), keyed by habit id. */
	atRiskByHabitId: ReadonlyMap<number, StreakAtRisk>;
	/** The shared freeze pool's remaining count this month (HAB-08) — across every habit. */
	freezesRemainingThisMonth: number;
} {
	const habits = useActiveHabits();
	const today = startOfDay(new Date());
	const tomorrow = addDays(today, 1);
	const weekStart = startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
	const weekEnd = endOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
	const entries = useEntriesInRange(weekStart, weekEnd);
	const allEntries = useAllEntries();
	const frozenDays = useFrozenDays();
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
		getHabitStrategy(habit).isDueOn(today, {
			completedDates: completedDatesByHabit.get(habit.id) ?? [],
		}),
	);
	const tomorrowPreview = habits.filter((habit) =>
		getHabitStrategy(habit).isDueOn(tomorrow, {
			completedDates: completedDatesByHabit.get(habit.id) ?? [],
		}),
	);

	const progress = computeProgress(dueHabits, completedHabitIds);

	const entriesByHabit = new Map<number, typeof allEntries>();
	for (const entry of allEntries) {
		const list = entriesByHabit.get(entry.habitId) ?? [];
		list.push(entry);
		entriesByHabit.set(entry.habitId, list);
	}
	const frozenDatesByHabit = new Map<number, Set<string>>();
	for (const frozenDay of frozenDays) {
		const set = frozenDatesByHabit.get(frozenDay.habitId) ?? new Set<string>();
		set.add(frozenDay.date);
		frozenDatesByHabit.set(frozenDay.habitId, set);
	}
	const freezesRemainingThisMonth = freezesRemainingInMonth(frozenDays, today);
	const atRiskByHabitId = new Map<number, StreakAtRisk>();
	for (const habit of dueHabits) {
		const atRisk = getStreakAtRisk(
			habit,
			entriesByHabit.get(habit.id) ?? [],
			frozenDatesByHabit.get(habit.id) ?? new Set<string>(),
			freezesRemainingThisMonth,
			today,
		);
		if (atRisk) atRiskByHabitId.set(habit.id, atRisk);
	}

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
		atRiskByHabitId,
		freezesRemainingThisMonth,
	};
}
