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

export type ProgressView<Grid> =
	| { state: "loading" }
	| { state: "no-habits" }
	| { state: "nothing-logged"; unlock: ProgressUnlock; grid: Grid }
	| { state: "too-early"; unlock: ProgressUnlock; grid: Grid }
	| {
			state: "ready";
			unlock: ProgressUnlock;
			grid: Grid;
			summary: RangeSummary;
			insights: ProgressInsight[];
			freezesLeft: number;
	  };

export type ProgressOptions = {
	habitId?: number | null;
};

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
	// Too early: the grid shows what was logged, and the days before
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
			scoped,
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
