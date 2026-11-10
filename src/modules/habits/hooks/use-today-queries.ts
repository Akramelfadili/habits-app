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

/**
 * `selectedKey` is the day Today shows (`useSelectedDayQueries`): a past day's
 * key, or `null` to follow today. The week window and every per-day read are
 * keyed by that day; streak-at-risk belongs to the real today only.
 */
/** A habit at risk, with what is left of the pool for the *missed day's* month — on the 1st that is last month's, the one `applyFreeze` checks. */
export type TodayAtRisk = StreakAtRisk & { freezesRemaining: number };

export function useTodayQueries(selectedKey: string | null = null): {
	totalHabitCount: number;
	groups: CategoryGroup[];
	progress: Progress;
	completedHabitIds: ReadonlySet<number>;
	/** The shown day's logged quantity value per habit — only set for quantity habits with an entry that day. */
	quantityValuesByHabitId: ReadonlyMap<number, number>;
	/** Days completed so far in the shown day's Mon–Sun week — per-week habits' "2 of 5". */
	completedThisWeekByHabitId: ReadonlyMap<number, number>;
	/**
	 * The running streak of every listed habit that has one to show (V3-13's status
	 * line): counted to the shown day when it is done, else to the day before.
	 * Per-week habits show "3× per week · 1 done" instead and are not counted.
	 */
	streakByHabitId: ReadonlyMap<number, number>;
	/** Habits whose yesterday was covered by a freeze (T7): "Thu frozen · streak kept at 13". Real today only. */
	frozenYesterdayByHabitId: ReadonlyMap<number, { date: Date; streak: number }>;
	/** The real today — what streak-at-risk is measured against. */
	today: Date;
	/** The day being shown: `today`, or the past day selected. */
	selectedDay: Date;
	/** False until the habit list has loaded — Today shows a neutral blank, not "Nothing to track yet" (audit A5-04). */
	isLoaded: boolean;
	viewState: TodayViewState;
	/** Due-today habits currently showing the streak-at-risk prompt (HAB-08), keyed by habit id. */
	atRiskByHabitId: ReadonlyMap<number, TodayAtRisk>;
	/** The shared freeze pool's remaining count this month (HAB-08) — across every habit. */
	freezesRemainingThisMonth: number;
	/** Freezes used this month, by missed date — the same pool, counted the other way (Settings, toast copy). */
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

	// The log-wide part (audit B-04): grouped once per change of the log, and the
	// streak reader remembers each habit's answers, so a re-render that changed
	// neither the log nor the habits — the clock, a toast, a day flip back to one
	// already shown — walks no history.
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

	// What depends on the shown day only: that week's entries, who is due, done.
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
