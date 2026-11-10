import { format, isSameYear } from "date-fns";

/**
 * The app's one home for user-facing counts and dates, so copy can't drift. British English
 * throughout (dates are en-GB).
 */

const RANGE_DASH = " – ";

export function formatCount(value: number): string {
	return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function noun(count: number, singular: string, plural?: string): string {
	return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function pluralise(
	count: number,
	singular: string,
	plural?: string,
): string {
	return `${formatCount(count)} ${noun(count, singular, plural)}`;
}

export function formatDayMonth(day: Date): string {
	return format(day, "d MMMM");
}

export function formatDayMonthShort(day: Date): string {
	return format(day, "d MMM");
}

/**
 * "3 Mar – 16 Sep" (short months) or "3 March – 16 September" (long). The
 * start drops its month when both ends share one — "3 – 16 March" — and the
 * year is shown only when `withYear` is set or the ends span two years.
 */
export function formatDateRange(
	from: Date,
	to: Date,
	{
		long = false,
		withYear = false,
	}: { long?: boolean; withYear?: boolean } = {},
): string {
	const month = long ? "MMMM" : "MMM";
	const sameMonth = format(from, "yyyy-MM") === format(to, "yyyy-MM");
	const showYear = withYear || !isSameYear(from, to);
	const start = sameMonth
		? format(from, "d")
		: format(from, showYear ? `d ${month} yyyy` : `d ${month}`);
	const end = format(
		to,
		withYear || showYear ? `d ${month} yyyy` : `d ${month}`,
	);
	return `${start}${RANGE_DASH}${end}`;
}
