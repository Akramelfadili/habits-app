import { toDayKey } from "@/utils/day-key";
import type { Entry, FrozenDay, Habit } from "../types";
import {
	calculateCurrentStreak,
	getStreakAtRisk,
	type StreakAtRisk,
} from "./streaks";

const NO_ENTRIES: readonly Entry[] = [];
const NO_DATES: ReadonlySet<string> = new Set();

/**
 * The log split per habit, in the order it came in (`useAllEntries` is sorted by
 * date, so each habit's list is too). One pass; callers keep the result in a
 * memo keyed on the log, so a re-render that did not change the log never
 * regroups it (audit B-04).
 */
export function groupEntriesByHabit(
	entries: readonly Entry[],
): ReadonlyMap<number, readonly Entry[]> {
	const byHabit = new Map<number, Entry[]>();
	for (const entry of entries) {
		const own = byHabit.get(entry.habitId);
		if (own) own.push(entry);
		else byHabit.set(entry.habitId, [entry]);
	}
	return byHabit;
}

/** The frozen days as one set of day keys per habit. */
export function groupFrozenDatesByHabit(
	frozenDays: readonly Pick<FrozenDay, "habitId" | "date">[],
): ReadonlyMap<number, ReadonlySet<string>> {
	const byHabit = new Map<number, Set<string>>();
	for (const { habitId, date } of frozenDays) {
		const own = byHabit.get(habitId);
		if (own) own.add(date);
		else byHabit.set(habitId, new Set([date]));
	}
	return byHabit;
}

/**
 * Answers "what is this habit's streak as of that day" and "is it at risk"
 * from the grouped log, and remembers each answer, so asking again — a re-render,
 * a flip back to a day already shown — costs a lookup instead of another walk
 * over the habit's history. Pure: build one per log (grouped entries + frozen
 * dates); answers are keyed by the habit object, so an edited habit is never
 * answered from its old self. The streak rules are `streaks.ts`'s, untouched.
 */
export type StreakReader = {
	streakAsOf(habit: Habit, asOf: Date): number;
	atRisk(habit: Habit, today: Date): StreakAtRisk | null;
};

export function createStreakReader(
	entriesByHabit: ReadonlyMap<number, readonly Entry[]>,
	frozenDatesByHabit: ReadonlyMap<number, ReadonlySet<string>>,
): StreakReader {
	const streaks = new WeakMap<Habit, Map<string, number>>();
	const risks = new WeakMap<Habit, Map<string, StreakAtRisk | null>>();

	function cacheOf<T>(
		caches: WeakMap<Habit, Map<string, T>>,
		habit: Habit,
	): Map<string, T> {
		let cache = caches.get(habit);
		if (!cache) {
			cache = new Map();
			caches.set(habit, cache);
		}
		return cache;
	}

	return {
		streakAsOf(habit, asOf) {
			const cache = cacheOf(streaks, habit);
			const key = toDayKey(asOf);
			let streak = cache.get(key);
			if (streak === undefined) {
				streak = calculateCurrentStreak(
					habit,
					entriesByHabit.get(habit.id) ?? NO_ENTRIES,
					frozenDatesByHabit.get(habit.id) ?? NO_DATES,
					asOf,
				);
				cache.set(key, streak);
			}
			return streak;
		},
		atRisk(habit, today) {
			const cache = cacheOf(risks, habit);
			const key = toDayKey(today);
			const known = cache.get(key);
			if (known !== undefined) return known;
			const risk = getStreakAtRisk(
				habit,
				entriesByHabit.get(habit.id) ?? NO_ENTRIES,
				frozenDatesByHabit.get(habit.id) ?? NO_DATES,
				today,
			);
			cache.set(key, risk);
			return risk;
		},
	};
}
