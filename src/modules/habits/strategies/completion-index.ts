import { startOfDay, startOfWeek } from "date-fns";
import { WEEK_STARTS_ON } from "../constants";

// Bucketed so history walks (one strategy call per day over years) answer in O(1) instead of
// scanning every completion, which made per-week habits quadratic. Keys are the instants
// date-fns compares, so answers equal the old scans (`per-week-frequency.equivalence.slow.test.ts`).
export type CompletionIndex = {
	timesByWeek: ReadonlyMap<number, readonly number[]>;
	daysByWeek: ReadonlyMap<number, ReadonlySet<number>>;
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

// Keyed by the array and rebuilt if its length changed, so an array appended to before use
// (`isOffScheduleEntry`) is still read correctly. Treat the array as frozen once seen.
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
