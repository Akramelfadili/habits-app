import { addDays, format, parseISO, startOfDay } from "date-fns";

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

/**
 * Local midnight of a day key — the inverse of `toDayKey`. Read straight off the
 * three fields: `parseISO` is general and ~30× slower, which showed once
 * Progress parsed five years of entries (tens of thousands) per open. A string
 * that is not "yyyy-MM-dd" falls back to `parseISO`.
 */
export function fromDayKey(key: string): Date {
	if (key.length === 10 && key[4] === "-" && key[7] === "-") {
		const year = Number(key.slice(0, 4));
		const month = Number(key.slice(5, 7));
		const day = Number(key.slice(8, 10));
		if (year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
			const date = new Date(year, month - 1, day);
			// 2026-02-31 must not roll over into March: let parseISO call it invalid.
			if (date.getMonth() === month - 1) return date;
		}
	}
	return parseISO(key);
}

/**
 * The local midnight of the day after `date` — the step of every day-by-day
 * walk. Not bare `addDays`: in a zone whose DST starts at midnight (Sao Paulo
 * until 2019, Santiago, Asunción, Havana) that day's "midnight" is 01:00, and
 * `addDays` carries the 01:00 onto every later day, so a walk bounded by
 * `!isAfter(cursor, end)` with a midnight `end` drops its last day.
 */
export function nextDay(date: Date): Date {
	return startOfDay(addDays(date, 1));
}
