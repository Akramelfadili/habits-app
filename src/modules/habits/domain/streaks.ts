import {
	endOfMonth,
	isBefore,
	parseISO,
	startOfDay,
	startOfMonth,
	subDays,
} from "date-fns";
import { toDayKey } from "@/utils/day-key";
import { FREEZE_POOL_SIZE } from "../constants";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import { restartDays } from "../strategies/paused-schedule";
import type { Entry, FrozenDay, Habit } from "../types";

/**
 * Whether `entry` counts as an actual completion of `habit` — presence alone
 * for a simple-check habit, but `value >= targetAmount` for a quantity habit
 * (HAB-07). Direction-agnostic: a Break habit's "completed" entry means
 * "resisted," same underlying signal (HAB-04's "same mechanism, just
 * relabeled" rule) — so streak math never branches on direction.
 */
export function isEntryComplete(habit: Habit, entry: Entry): boolean {
	if (habit.targetType !== "quantity") return true;
	return (
		entry.value !== undefined &&
		habit.targetAmount !== null &&
		entry.value >= habit.targetAmount
	);
}

/**
 * Consecutive scheduled (per the habit's FrequencyStrategy's
 * `wasScheduledOn`) days completed or frozen, walking backward from `asOf`.
 * Always computed from `entries`, never a stored counter — so a retroactive
 * edit (HAB-10) recalculates correctly just by being read again, rather than
 * needing special-case "fix the counter" logic (per HAB-08's edge case).
 * Unscheduled days are skipped — they neither extend nor break the streak.
 * The count stops at the habit's latest restore day (HAB-20): the streak
 * starts fresh from the next completed log, never across the archived gap.
 */
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
	/** The same days as day keys. */
	set: Set<string>;
};

/** `habit`'s completed days, parsed once — shared by the at-risk check and the streak it reports. */
function completionsOf(habit: Habit, entries: readonly Entry[]): Completions {
	const completedEntries = entries.filter((entry) =>
		isEntryComplete(habit, entry),
	);
	return {
		dates: completedEntries.map((entry) => parseISO(entry.date)),
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
	// A restore starts the streak over (HAB-20): never count back past it.
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
	/** The missed day a freeze would cover — always yesterday (HAB-08's grace window). */
	missedDate: Date;
	/** The streak that was standing before the miss — what a freeze would preserve. */
	currentStreak: number;
};

/**
 * Whether `habit` is at risk right now (HAB-33): yesterday was due, wasn't
 * completed, isn't already frozen, and there's a nonzero streak at stake. It
 * does not depend on the pool: with no freeze left the state still exists and
 * the sheet explains that (SR3) instead of the streak resetting silently. Rest
 * days and off-schedule days never qualify, since `isDueOn` is false for them.
 */
export function getStreakAtRisk(
	habit: Habit,
	entries: readonly Entry[],
	frozenDates: ReadonlySet<string>,
	today: Date,
): StreakAtRisk | null {
	const yesterday = subDays(startOfDay(today), 1);
	const yesterdayString = toDayKey(yesterday);
	if (frozenDates.has(yesterdayString)) return null;

	// Today renders this for every habit after every write: parse the history
	// once, and rule out "done yesterday" before asking the strategy anything.
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

/**
 * Freezes used in `monthDate`'s month, across every habit — the pool is shared,
 * not per-habit. Counted by the *missed* date of each `frozen_days` row, not
 * the day it was used, so a freeze spent on the 1st for the 31st counts
 * against the month that ended.
 */
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

/** What is left of the month's pool (`FREEZE_POOL_SIZE` minus what was used). */
export function freezesRemainingInMonth(
	frozenDays: readonly FrozenDay[],
	monthDate: Date,
): number {
	return Math.max(
		0,
		FREEZE_POOL_SIZE - freezesUsedInMonth(frozenDays, monthDate),
	);
}
