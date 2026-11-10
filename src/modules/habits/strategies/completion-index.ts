import { startOfDay, startOfWeek } from "date-fns";
import { WEEK_STARTS_ON } from "../constants";

/**
 * A habit's completed dates, bucketed once so a strategy can answer "what was done this week /
 * on this day" in O(1) instead of scanning every completion for every day it is asked about.
 * History walks call a strategy once per day over years, so the scan made per-week habits
 * quadratic.
 *
 * Keys are the same instants date-fns compares: `isSameWeek(a, b)` is
 * `startOfWeek(a) === startOfWeek(b)` and `isSameDay(a, b)` is `startOfDay(a) === startOfDay(b)`,
 * so answers are identical to the scans they replace
 * (`per-week-frequency.equivalence.slow.test.ts`).
 */
export type CompletionIndex = {
	/** startOfWeek(…).getTime() → each completion's own instant, duplicates kept. */
	timesByWeek: ReadonlyMap<number, readonly number[]>;
	/** startOfWeek(…).getTime() → the distinct startOfDay(…).getTime() completed that week. */
	daysByWeek: ReadonlyMap<number, ReadonlySet<number>>;
	/** Every distinct startOfDay(…).getTime() completed. */
	days: ReadonlySet<number>;
};

const EMPTY_TIMES: readonly number[] = [];
const EMPTY_DAYS: ReadonlySet<number> = new Set();

export function weekKey(date: Date): number {
	return startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }).getTime();
}

export function dayKeyTime(date: Date): number {
	return startOfDay(date).getTime();
}

function buildIndex(dates: readonly Date[]): CompletionIndex {
	const timesByWeek = new Map<number, number[]>();
	const daysByWeek = new Map<number, Set<number>>();
	const days = new Set<number>();
	for (const date of dates) {
		const week = weekKey(date);
		const day = dayKeyTime(date);
		const times = timesByWeek.get(week);
		if (times) times.push(date.getTime());
		else timesByWeek.set(week, [date.getTime()]);
		const weekDays = daysByWeek.get(week);
		if (weekDays) weekDays.add(day);
		else daysByWeek.set(week, new Set([day]));
		days.add(day);
	}
	return { timesByWeek, daysByWeek, days };
}

/**
 * Built once per `completedDates` array and reused for every day a caller asks
 * about (callers build one array per habit per computation). The cache is keyed
 * by the array itself and rebuilt if its length changed, so an array that is
 * appended to before use (`isOffScheduleEntry`) is still read correctly. Treat
 * the array as frozen once a strategy has seen it.
 */
const cache = new WeakMap<
	readonly Date[],
	{ length: number; index: CompletionIndex }
>();

export function completionIndex(dates: readonly Date[]): CompletionIndex {
	const cached = cache.get(dates);
	if (cached && cached.length === dates.length) return cached.index;
	const index = buildIndex(dates);
	cache.set(dates, { length: dates.length, index });
	return index;
}

export function completionTimesInWeek(
	index: CompletionIndex,
	date: Date,
): readonly number[] {
	return index.timesByWeek.get(weekKey(date)) ?? EMPTY_TIMES;
}

export function completedDaysInWeek(
	index: CompletionIndex,
	date: Date,
): ReadonlySet<number> {
	return index.daysByWeek.get(weekKey(date)) ?? EMPTY_DAYS;
}
