import { endOfWeek, startOfDay, startOfWeek } from "date-fns";

// Single source for every week bound in the app, so scheduling, summaries and DB ranges agree.
export const WEEK_STARTS_ON = 1;

// `end` is the *start* of the last day, not 23:59:59.999: day keys are what is stored and queried,
// and the domain walks with `!isAfter(cursor, end)`, so a midnight end means the same in both places.
export type DayWindow = { start: Date; end: Date };

export function weekStart(date: Date): Date {
	return startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
}

export function weekLastDay(date: Date): Date {
	return startOfDay(endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }));
}

export function weekWindow(date: Date): DayWindow {
	return { start: weekStart(date), end: weekLastDay(date) };
}

export function weekAlignedSpan(from: Date, to: Date): DayWindow {
	return { start: weekStart(from), end: weekLastDay(to) };
}
