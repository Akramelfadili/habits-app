import { endOfWeek, startOfDay, startOfWeek } from "date-fns";

/**
 * Weeks run Monday → Sunday (HAB-02). The single source for every week bound in
 * the app: scheduling, summaries, the week strip and the entry ranges read from
 * the database. `modules/habits/constants.ts` re-exports it.
 */
export const WEEK_STARTS_ON = 1;

/**
 * A run of calendar days, both ends inclusive, each a local midnight. `end` is
 * the *start* of the last day, not 23:59:59.999: day keys ("yyyy-MM-dd") are
 * what is stored and queried (`gte(start) / lte(end)` on the key), and the
 * domain walks days with `!isAfter(cursor, end)`, so a midnight end means the
 * same thing in both places and survives `min([end, todayStart])`.
 */
export type DayWindow = { start: Date; end: Date };

/** Local midnight of the Monday that starts `date`'s week. */
export function weekStart(date: Date): Date {
	return startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
}

/** Local midnight of the Sunday that ends `date`'s week. */
export function weekLastDay(date: Date): Date {
	return startOfDay(endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }));
}

/** The Monday–Sunday week containing `date`. */
export function weekWindow(date: Date): DayWindow {
	return { start: weekStart(date), end: weekLastDay(date) };
}

/** From the Monday of `from`'s week to the Sunday of `to`'s week: the whole weeks a range touches. */
export function weekAlignedSpan(from: Date, to: Date): DayWindow {
	return { start: weekStart(from), end: weekLastDay(to) };
}
