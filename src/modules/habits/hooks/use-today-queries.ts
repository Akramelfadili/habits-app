import { parseISO, subDays } from "date-fns";
import { useMemo } from "react";
import { useToday } from "@/lib/today/use-today";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { weekWindow } from "@/utils/week-window";
import { isHabitListedOn } from "../domain/selected-day";
import {
	createStreakReader,
	groupEntriesByHabit,
	groupFrozenDatesByHabit,
} from "../domain/streak-reader";
import {
	freezesRemainingInMonth,
	freezesUsedInMonth,
	isEntryComplete,
	type StreakAtRisk,
} from "../domain/streaks";
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

// The pool is for the missed day's month: on the 1st that is last month's, the one `applyFreeze` checks.
export type TodayAtRisk = StreakAtRisk & { freezesRemaining: number };

export function useTodayQueries(selectedKey: string | null = null): {
	totalHabitCount: number;
	groups: CategoryGroup[];
	progress: Progress;
	completedHabitIds: ReadonlySet<number>;
	quantityValuesByHabitId: ReadonlyMap<number, number>;
	completedThisWeekByHabitId: ReadonlyMap<number, number>;
	streakByHabitId: ReadonlyMap<number, number>;
	frozenYesterdayByHabitId: ReadonlyMap<number, { date: Date; streak: number }>;
	today: Date;
	selectedDay: Date;
	isLoaded: boolean;
	viewState: TodayViewState;
	atRiskByHabitId: ReadonlyMap<number, TodayAtRisk>;
	freezesRemainingThisMonth: number;
	freezesUsedThisMonth: number;
} {
	const { habits, loaded } = useActiveHabits();
	const categories = useCategories();
	const today = useToday();
	// Stable between renders, so what hangs off the day below is memoised on it.
	const selectedDay = useMemo(
		() => (selectedKey === null ? today : fromDayKey(selectedKey)),
		[selectedKey, today],
	);
	const week = useMemo(() => weekWindow(selectedDay), [selectedDay]);
	const entries = useEntriesInRange(week.start, week.end);
	const allEntries = useAllEntries();
	const frozenDays = useFrozenDays();

	// The log-wide part: grouped once per change of the log, and the streak reader remembers each
	// habit's answers, so a re-render that changed neither the log nor the habits (the clock, a
	// toast, a day flip back to one already shown) walks no history.
	const entriesByHabit = useMemo(
		() => groupEntriesByHabit(allEntries),
		[allEntries],
	);
	const frozenDatesByHabit = useMemo(
		() => groupFrozenDatesByHabit(frozenDays),
		[frozenDays],
	);
	const reader = useMemo(
		() => createStreakReader(entriesByHabit, frozenDatesByHabit),
		[entriesByHabit, frozenDatesByHabit],
	);

	const day = useMemo(() => {
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
		return {
			dueHabits,
			completedHabitIds,
			quantityValuesByHabitId,
			progress: computeProgress(dueHabits, completedHabitIds),
			completedThisWeekByHabitId: new Map(
				[...completedDatesByHabit].map(([habitId, dates]) => [
					habitId,
					new Set(dates.map((date) => date.getTime())).size,
				]),
			),
		};
	}, [habits, entries, selectedDay]);
	const { dueHabits, completedHabitIds, progress } = day;

	const atRiskByHabitId = useMemo(() => {
		const atRiskByHabitId = new Map<number, TodayAtRisk>();
		// Only the real today can be at risk: the grace window is yesterday, measured from now.
		for (const habit of selectedKey === null ? dueHabits : []) {
			const atRisk = reader.atRisk(habit, today);
			if (atRisk) {
				atRiskByHabitId.set(habit.id, {
					...atRisk,
					freezesRemaining: freezesRemainingInMonth(
						frozenDays,
						atRisk.missedDate,
					),
				});
			}
		}
		return atRiskByHabitId;
	}, [selectedKey, dueHabits, reader, today, frozenDays]);

	const { streakByHabitId, frozenYesterdayByHabitId } = useMemo(() => {
		const streakByHabitId = new Map<number, number>();
		const frozenYesterdayByHabitId = new Map<
			number,
			{ date: Date; streak: number }
		>();
		const yesterday = subDays(today, 1);
		for (const habit of dueHabits) {
			if (habit.frequency.type === "per-week") continue;
			const asOf = completedHabitIds.has(habit.id)
				? selectedDay
				: subDays(selectedDay, 1);
			const streak = reader.streakAsOf(habit, asOf);
			if (streak > 0) streakByHabitId.set(habit.id, streak);
			if (
				selectedKey === null &&
				frozenDatesByHabit.get(habit.id)?.has(toDayKey(yesterday))
			) {
				// "streak kept at 13": the run before the covered day, not counting it.
				frozenYesterdayByHabitId.set(habit.id, {
					date: yesterday,
					streak: reader.streakAsOf(habit, subDays(yesterday, 1)),
				});
			}
		}
		return { streakByHabitId, frozenYesterdayByHabitId };
	}, [
		dueHabits,
		completedHabitIds,
		reader,
		frozenDatesByHabit,
		selectedDay,
		selectedKey,
		today,
	]);

	const groups = useMemo(
		() => groupHabitsByCategory(dueHabits, categories),
		[dueHabits, categories],
	);
	const freezesRemainingThisMonth = useMemo(
		() => freezesRemainingInMonth(frozenDays, today),
		[frozenDays, today],
	);
	const freezesUsedThisMonth = useMemo(
		() => freezesUsedInMonth(frozenDays, today),
		[frozenDays, today],
	);

	return {
		totalHabitCount: habits.length,
		streakByHabitId,
		frozenYesterdayByHabitId,
		groups,
		progress,
		completedHabitIds,
		quantityValuesByHabitId: day.quantityValuesByHabitId,
		completedThisWeekByHabitId: day.completedThisWeekByHabitId,
		today,
		selectedDay,
		isLoaded: loaded,
		viewState: resolveTodayViewState({
			totalHabitCount: habits.length,
			progress,
		}),
		atRiskByHabitId,
		freezesRemainingThisMonth,
		freezesUsedThisMonth,
	};
}
