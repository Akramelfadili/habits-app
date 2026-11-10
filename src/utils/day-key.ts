import { addDays, format, parseISO, startOfDay } from "date-fns";

// Local calendar day, never UTC: a timezone can't shift which day something lands on.
export const DAY_KEY_FORMAT = "yyyy-MM-dd";

export function toDayKey(date: Date): string {
	return format(date, DAY_KEY_FORMAT);
}

// Read straight off the three fields: `parseISO` is ~30× slower, which showed once Progress parsed
// tens of thousands of entries per open. Anything not "yyyy-MM-dd" falls back to `parseISO`.
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

// Not bare `addDays`: where DST starts at midnight (Sao Paulo until 2019, Santiago, Havana) that
// day's "midnight" is 01:00, and `addDays` carries it onto every later day, so a walk bounded by a
// midnight `end` drops its last day.
export function nextDay(date: Date): Date {
	return startOfDay(addDays(date, 1));
}
