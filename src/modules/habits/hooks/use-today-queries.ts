import { addDays, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { useToday } from "@/lib/today/use-today";
import { WEEK_STARTS_ON } from "../constants";
import {
	useAllEntries,
	useEntriesInRange,
} from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useActiveHabits } from "../repositories/habit-repository";
import { useAllReminders } from "../repositories/reminder-repository";
import { earliestReminderTimeOn } from "../screens/reminders-helpers";
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
	/** Days completed so far this Mon–Sun week, today included — per-week habits' "2 of 5". */
	completedThisWeekByHabitId: ReadonlyMap<number, number>;
	today: Date;
	/** False until the habit list has loaded — Today shows a neutral blank, not "Nothing to track yet" (audit A5-04). */
	isLoaded: boolean;
	viewState: TodayViewState;
	/** Habits due tomorrow — only meaningful for the Day closed preview (HAB-05). */
	tomorrowPreview: Habit[];
	/** Each tomorrow habit's earliest enabled reminder time ("07:20"); habits with none are absent. */
	tomorrowReminderTimeByHabitId: ReadonlyMap<number, string>;
	/** Due-today habits currently showing the streak-at-risk prompt (HAB-08), keyed by habit id. */
	atRiskByHabitId: ReadonlyMap<number, StreakAtRisk>;
	/** The shared freeze pool's remaining count this month (HAB-08) — across every habit. */
	freezesRemainingThisMonth: number;
} {
	const { habits, loaded } = useActiveHabits();
	const today = useToday();
	const tomorrow = addDays(today, 1);
	const weekStart = startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
	const weekEnd = endOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
	const entries = useEntriesInRange(weekStart, weekEnd);
	const allEntries = useAllEntries();
	const frozenDays = useFrozenDays();
	const allReminders = useAllReminders();
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

	const tomorrowReminderTimeByHabitId = new Map<number, string>();
	for (const habit of tomorrowPreview) {
		const time = earliestReminderTimeOn(
			allReminders.filter((reminder) => reminder.habitId === habit.id),
			tomorrow,
		);
		if (time) tomorrowReminderTimeByHabitId.set(habit.id, time);
	}

	const progress = computeProgress(dueHabits, completedHabitIds);
	const completedThisWeekByHabitId = new Map(
		[...completedDatesByHabit].map(([habitId, dates]) => [
			habitId,
			new Set(dates.map((date) => date.getTime())).size,
		]),
	);

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

	return {
		totalHabitCount: habits.length,
		groups: groupHabitsByCategory(dueHabits),
		progress,
		completedHabitIds,
		quantityValuesByHabitId,
		completedThisWeekByHabitId,
		today,
		isLoaded: loaded,
		viewState: resolveTodayViewState({
			totalHabitCount: habits.length,
			progress,
		}),
		tomorrowPreview,
		tomorrowReminderTimeByHabitId,
		atRiskByHabitId,
		freezesRemainingThisMonth,
	};
}
