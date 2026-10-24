import { format, parseISO } from "date-fns";

/**
 * A calendar day as stored and compared everywhere — "yyyy-MM-dd", local time.
 * Entries, frozen days, notes and pauses are keyed by it (`schema.ts`), so a
 * timezone can't shift which day something lands on. Not for user-facing
 * text: that goes through `format.ts`.
 */
export const DAY_KEY_FORMAT = "yyyy-MM-dd";

/** The day key of `date`'s local calendar day: `toDayKey(new Date(2026, 9, 24, 23, 59))` → "2026-10-24". */
export function toDayKey(date: Date): string {
	return format(date, DAY_KEY_FORMAT);
}

/** Local midnight of a day key — the inverse of `toDayKey`. */
export function fromDayKey(key: string): Date {
	return parseISO(key);
}
