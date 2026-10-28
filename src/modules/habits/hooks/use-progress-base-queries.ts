import { endOfMonth, max, startOfMonth } from "date-fns";
import { useMemo } from "react";
import { useToday } from "@/lib/today/use-today";
import { scopeHabits } from "../domain/day-grid";
import { historyStart } from "../domain/monthly-summary";
import type { ProgressInsight } from "../domain/progress-insights";
import {
	type ProgressGate,
	type ProgressUnlock,
	progressGate,
	progressUnlock,
} from "../domain/progress-unlock";
import type { RangeSummary } from "../domain/range-summary";
import { freezesRemainingInMonth } from "../domain/streaks";
import { useLoggedDays } from "../repositories/entry-repository";
import { useFrozenDaysInRange } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";

/**
 * What a Progress screen shows (HAB-35–37), one shape for Week, Month and Year.
 * Before "ready" the states are distinct views (P2–P4): no habits at all, habits
 * but nothing ever logged (the grid draws outlined "nothing logged yet" cells),
 * and too early (< 7 days of logs: an unlock card instead of stats and
 * insights, the grid still renders).
 */
export type ProgressView<Grid> =
	/** The habit list or the logged-day count hasn't loaded — a blank, not an empty state (audit A5-04). */
	| { state: "loading" }
	| { state: "no-habits" }
	| { state: "nothing-logged"; unlock: ProgressUnlock; grid: Grid }
	| { state: "too-early"; unlock: ProgressUnlock; grid: Grid }
	| {
			state: "ready";
			unlock: ProgressUnlock;
			grid: Grid;
			summary: RangeSummary;
			/** Ranked, never more than three; year-scale ones need 3 months of history. */
			insights: ProgressInsight[];
			/** The shared pool's freezes left this calendar month (T6, P5). */
			freezesLeft: number;
	  };

export type ProgressOptions = {
	/** One habit's variant (P5, P10, P15); all habits when null or left out. */
	habitId?: number | null;
};

/**
 * The reads every Progress range shares: the habit list, how much has been
 * logged (one aggregate row), the gate, and this month's freezes. The ranges'
 * own entry reads are bounded to their span in their own hooks.
 */
export function useProgressBaseQueries(habitId: number | null | undefined) {
	const today = useToday();
	const { habits, loaded } = useHabitsList();
	const logged = useLoggedDays();
	const monthFreezes = useFrozenDaysInRange(
		startOfMonth(today),
		endOfMonth(today),
	);
	const { count: loggedCount, firstDate: firstLoggedDate } = logged;
	const unlock = useMemo(
		() => progressUnlock({ count: loggedCount, firstDate: firstLoggedDate }),
		[loggedCount, firstLoggedDate],
	);
	const scoped = useMemo(() => scopeHabits(habits, habitId), [habits, habitId]);
	const gate: ProgressGate = progressGate(habits.length, unlock);
	const freezesLeft = freezesRemainingInMonth(monthFreezes, today);
	const isLoaded = loaded && logged.loaded;
	// One stable object until something it holds changes, so each range's
	// memoised maths can depend on it.
	// Too early (P2/P9/P14): the grid shows what was logged, and the days before
	// the first log read as "before start" (dashed) rather than missed.
	const firstLog = unlock.firstLogDate;
	const gridHabits = useMemo(
		() =>
			gate === "too-early" && firstLog
				? scoped.map((habit) => ({
						...habit,
						createdAt: max([habit.createdAt, firstLog]),
					}))
				: scoped,
		[gate, firstLog, scoped],
	);
	return useMemo(
		() => ({
			today,
			loaded: isLoaded,
			habits,
			/** The habits in play: one for a one-habit variant, otherwise all. */
			scoped,
			/** `scoped`, with the days before the first log marked before-start while too early. */
			gridHabits,
			unlock,
			gate,
			nothingLogged: unlock.loggedDays === 0,
			freezesLeft,
			firstDay: historyStart(scoped),
		}),
		[today, isLoaded, habits, scoped, gridHabits, unlock, gate, freezesLeft],
	);
}
