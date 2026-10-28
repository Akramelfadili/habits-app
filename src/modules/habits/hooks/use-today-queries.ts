import { addDays, endOfWeek, parseISO, startOfWeek } from "date-fns";
import { useToday } from "@/lib/today/use-today";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { WEEK_STARTS_ON } from "../constants";
import { isHabitListedOn } from "../domain/selected-day";
import {
	freezesRemainingInMonth,
	freezesUsedInMonth,
	getStreakAtRisk,
	isEntryComplete,
	type StreakAtRisk,
} from "../domain/streaks";
import { earliestReminderTimeOn } from "../presenters/reminders-helpers";
import {
	type CategoryGroup,
	computeProgress,
	groupHabitsByCategory,
	type Progress,
	resolveTodayViewState,
	type TodayViewState,
} from "../presenters/today-screen-helpers";
import { useCategories } from "../repositories/category-repository";
import {
	useAllEntries,
	useEntriesInRange,
} from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useActiveHabits } from "../repositories/habit-repository";
import { useAllReminders } from "../repositories/reminder-repository";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import type { Habit } from "../types";

/**
 * `selectedKey` is the day Today shows (`useSelectedDayQueries`): a past day's
 * key, or `null` to follow today. The week window and every per-day read are
 * keyed by that day; streak-at-risk belongs to the real today only.
 */
export function useTodayQueries(selectedKey: string | null = null): {
	totalHabitCount: number;
	groups: CategoryGroup[];
	progress: Progress;
	completedHabitIds: ReadonlySet<number>;
	/** The shown day's logged quantity value per habit — only set for quantity habits with an entry that day. */
	quantityValuesByHabitId: ReadonlyMap<number, number>;
	/** Days completed so far in the shown day's Mon–Sun week — per-week habits' "2 of 5". */
	completedThisWeekByHabitId: ReadonlyMap<number, number>;
	/** The real today — what streak-at-risk is measured against. */
	today: Date;
	/** The day being shown: `today`, or the past day selected. */
	selectedDay: Date;
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
	/** Freezes used this month, by missed date — the same pool, counted the other way (Settings, toast copy). */
	freezesUsedThisMonth: number;
} {
	const { habits, loaded } = useActiveHabits();
	const categories = useCategories();
	const today = useToday();
	const tomorrow = addDays(today, 1);
	const selectedDay = selectedKey === null ? today : fromDayKey(selectedKey);
	const weekStart = startOfWeek(selectedDay, { weekStartsOn: WEEK_STARTS_ON });
	const weekEnd = endOfWeek(selectedDay, { weekStartsOn: WEEK_STARTS_ON });
	const entries = useEntriesInRange(weekStart, weekEnd);
	const allEntries = useAllEntries();
	const frozenDays = useFrozenDays();
	const allReminders = useAllReminders();
	const habitsById = new Map(habits.map((habit) => [habit.id, habit]));

	const completedDatesByHabit = new Map<number, Date[]>();
	const dayString = toDayKey(selectedDay);
	const completedHabitIds = new Set<number>();
	const quantityValuesByHabitId = new Map<number, number>();
	for (const entry of entries) {
		const habit = habitsById.get(entry.habitId);
		if (!habit) continue;

		if (entry.date === dayString && entry.value !== undefined) {
			quantityValuesByHabitId.set(entry.habitId, entry.value);
		}

		if (!isEntryComplete(habit, entry)) continue;

		const list = completedDatesByHabit.get(entry.habitId) ?? [];
		list.push(parseISO(entry.date));
		completedDatesByHabit.set(entry.habitId, list);
		if (entry.date === dayString) completedHabitIds.add(entry.habitId);
	}

	const dueHabits = habits.filter((habit) =>
		isHabitListedOn(
			habit,
			selectedDay,
			completedDatesByHabit.get(habit.id) ?? [],
		),
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
	// Only the real today can be at risk: the grace window is yesterday, measured from now.
	for (const habit of selectedKey === null ? dueHabits : []) {
		const atRisk = getStreakAtRisk(
			habit,
			entriesByHabit.get(habit.id) ?? [],
			frozenDatesByHabit.get(habit.id) ?? new Set<string>(),
			today,
		);
		if (atRisk) atRiskByHabitId.set(habit.id, atRisk);
	}

	return {
		totalHabitCount: habits.length,
		groups: groupHabitsByCategory(dueHabits, categories),
		progress,
		completedHabitIds,
		quantityValuesByHabitId,
		completedThisWeekByHabitId,
		today,
		selectedDay,
		isLoaded: loaded,
		viewState: resolveTodayViewState({
			totalHabitCount: habits.length,
			progress,
		}),
		tomorrowPreview,
		tomorrowReminderTimeByHabitId,
		atRiskByHabitId,
		freezesRemainingThisMonth,
		freezesUsedThisMonth: freezesUsedInMonth(frozenDays, today),
	};
}
