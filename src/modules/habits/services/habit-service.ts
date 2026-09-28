import {
	endOfMonth,
	format,
	isBefore,
	parseISO,
	startOfDay,
	startOfMonth,
	subDays,
} from "date-fns";
import { FREEZE_POOL_SIZE } from "../constants";
import {
	freezeHabitDay,
	getFreezesUsedInMonth,
} from "../repositories/frozen-day-repository";
import { getFrequencyStrategy } from "../strategies/frequency-strategy";
import type { Entry, FrozenDay, Habit } from "../types";

const DATE_FORMAT = "yyyy-MM-dd";

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
 */
export function calculateCurrentStreak(
	habit: Habit,
	entries: readonly Entry[],
	frozenDates: ReadonlySet<string>,
	asOf: Date,
): number {
	const strategy = getFrequencyStrategy(habit.frequency);
	const completedEntries = entries.filter((entry) =>
		isEntryComplete(habit, entry),
	);
	const completedDates = completedEntries.map((entry) => parseISO(entry.date));
	const completedSet = new Set(completedEntries.map((entry) => entry.date));
	const floor = startOfDay(habit.createdAt);

	let streak = 0;
	let cursor = startOfDay(asOf);
	while (!isBefore(cursor, floor)) {
		const dateString = format(cursor, DATE_FORMAT);
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
 * Whether `habit` should show the streak-at-risk prompt right now: yesterday
 * was due, wasn't completed, isn't already frozen, there's a nonzero streak
 * at stake, and the shared pool has something left to offer (an exhausted
 * pool means the streak has already silently reset — nothing to prompt for,
 * per HAB-08's "don't show a dead-end dialog" rule). Rest days and
 * off-schedule days never qualify, since `isDueOn` is false for them.
 */
export function getStreakAtRisk(
	habit: Habit,
	entries: readonly Entry[],
	frozenDates: ReadonlySet<string>,
	freezesRemaining: number,
	today: Date,
): StreakAtRisk | null {
	if (freezesRemaining <= 0) return null;

	const yesterday = subDays(startOfDay(today), 1);
	const yesterdayString = format(yesterday, DATE_FORMAT);
	if (frozenDates.has(yesterdayString)) return null;

	const strategy = getFrequencyStrategy(habit.frequency);
	const completedEntries = entries.filter((entry) =>
		isEntryComplete(habit, entry),
	);
	const completedDates = completedEntries.map((entry) => parseISO(entry.date));
	if (!strategy.isDueOn(yesterday, { completedDates })) return null;
	if (completedEntries.some((entry) => entry.date === yesterdayString))
		return null;

	const currentStreak = calculateCurrentStreak(
		habit,
		entries,
		frozenDates,
		subDays(yesterday, 1),
	);
	if (currentStreak <= 0) return null;

	return { missedDate: yesterday, currentStreak };
}

/** Freezes used this month, across every habit — the pool is shared, not per-habit. */
export function freezesRemainingInMonth(
	frozenDays: readonly FrozenDay[],
	monthDate: Date,
): number {
	const monthStart = format(startOfMonth(monthDate), DATE_FORMAT);
	const monthEnd = format(endOfMonth(monthDate), DATE_FORMAT);
	const used = frozenDays.filter(
		(frozenDay) => frozenDay.date >= monthStart && frozenDay.date <= monthEnd,
	).length;
	return Math.max(0, FREEZE_POOL_SIZE - used);
}

/**
 * The one composite operation this feature needs: freezing a missed day means
 * checking the shared pool's *current* eligibility (a fresh DB read, not
 * whatever a hook last rendered) and then writing the freeze — together, so
 * a stale UI can't push the pool over its monthly limit.
 */
export async function applyFreeze(
	habitId: number,
	missedDate: Date,
): Promise<void> {
	const used = await getFreezesUsedInMonth(
		startOfMonth(missedDate),
		endOfMonth(missedDate),
	);
	if (used >= FREEZE_POOL_SIZE) {
		throw new Error("No freezes remaining this month");
	}
	await freezeHabitDay(habitId, missedDate);
}
