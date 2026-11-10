import {
	endOfMonth,
	isBefore,
	parseISO,
	startOfDay,
	startOfMonth,
	subDays,
} from "date-fns";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { FREEZE_POOL_SIZE } from "../constants";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import { restartDays } from "../strategies/paused-schedule";
import type { Entry, FrozenDay, Habit } from "../types";

// Direction-agnostic: a Break habit's completed entry means "resisted", so streak math never
// branches on direction.
export function isEntryComplete(habit: Habit, entry: Entry): boolean {
	if (habit.targetType !== "quantity") return true;
	return (
		entry.value !== undefined &&
		habit.targetAmount !== null &&
		entry.value >= habit.targetAmount
	);
}

// Always derived from `entries`, never a stored counter, so a retroactive edit recalculates
// by being read again.
export function calculateCurrentStreak(
	habit: Habit,
	entries: readonly Entry[],
	frozenDates: ReadonlySet<string>,
	asOf: Date,
): number {
	return streakFrom(habit, completionsOf(habit, entries), frozenDates, asOf);
}

type Completions = {
	dates: Date[];
	set: Set<string>;
};

function completionsOf(habit: Habit, entries: readonly Entry[]): Completions {
	const completedEntries = entries.filter((entry) =>
		isEntryComplete(habit, entry),
	);
	return {
		dates: completedEntries.map((entry) => fromDayKey(entry.date)),
		set: new Set(completedEntries.map((entry) => entry.date)),
	};
}

function streakFrom(
	habit: Habit,
	{ dates: completedDates, set: completedSet }: Completions,
	frozenDates: ReadonlySet<string>,
	asOf: Date,
): number {
	const strategy = getHabitStrategy(habit);
	const lastRestart = restartDays(habit.pauses).at(-1);
	const floor = startOfDay(
		lastRestart && lastRestart > toDayKey(habit.createdAt)
			? parseISO(lastRestart)
			: habit.createdAt,
	);

	let streak = 0;
	let cursor = startOfDay(asOf);
	while (!isBefore(cursor, floor)) {
		const dateString = toDayKey(cursor);
		if (strategy.wasScheduledOn(cursor, { completedDates })) {
			if (completedSet.has(dateString) || frozenDates.has(dateString)) {
				streak += 1;
			} else {
				break;
			}
		}
		cursor = subDays(cursor, 1);
	}
	return streak;
}

export type StreakAtRisk = {
	missedDate: Date;
	currentStreak: number;
};

// Independent of the pool: with no freeze left the state still exists, so the sheet can
// explain it instead of the streak resetting silently.
export function getStreakAtRisk(
	habit: Habit,
	entries: readonly Entry[],
	frozenDates: ReadonlySet<string>,
	today: Date,
): StreakAtRisk | null {
	// "× per week" habits have no scheduled day to miss, so they are never at risk by day.
	if (habit.frequency.type === "per-week") return null;

	const yesterday = subDays(startOfDay(today), 1);
	const yesterdayString = toDayKey(yesterday);
	if (frozenDates.has(yesterdayString)) return null;

	// Hot path (every habit, after every write): rule out "done yesterday" before the strategy.
	const completions = completionsOf(habit, entries);
	if (completions.set.has(yesterdayString)) return null;
	if (
		!getHabitStrategy(habit).isDueOn(yesterday, {
			completedDates: completions.dates,
		})
	)
		return null;

	const currentStreak = streakFrom(
		habit,
		completions,
		frozenDates,
		subDays(yesterday, 1),
	);
	if (currentStreak <= 0) return null;

	return { missedDate: yesterday, currentStreak };
}

// Counted by each row's *missed* date, not the day it was used: a freeze spent on the 1st
// for the 31st counts against the month that ended.
export function freezesUsedInMonth(
	frozenDays: readonly FrozenDay[],
	monthDate: Date,
): number {
	const monthStart = toDayKey(startOfMonth(monthDate));
	const monthEnd = toDayKey(endOfMonth(monthDate));
	return frozenDays.filter(
		(frozenDay) => frozenDay.date >= monthStart && frozenDay.date <= monthEnd,
	).length;
}

export function freezesRemainingInMonth(
	frozenDays: readonly FrozenDay[],
	monthDate: Date,
): number {
	return Math.max(
		0,
		FREEZE_POOL_SIZE - freezesUsedInMonth(frozenDays, monthDate),
	);
}
