import { isValid } from "date-fns";
import { fromDayKey, toDayKey } from "@/utils/day-key";

/**
 * Route params arrive from deep links (`habitsapp://…`) that any app or web
 * page can open, so they are untrusted text (D-09). Each parser returns the
 * value the screen needs, or why it was refused — a short code for the log,
 * never the param itself.
 */
export type ParamResult<T> =
	| { ok: true; value: T }
	| {
			ok: false;
			reason:
				| "missing"
				| "not_positive_integer"
				| "bad_format"
				| "invalid_date";
	  };

/** expo-router hands a repeated segment as an array; only one value is meaningful. */
function single(raw: string | string[] | undefined): string | undefined {
	return Array.isArray(raw) ? undefined : raw;
}

const POSITIVE_INTEGER = /^[1-9][0-9]*$/;

/** `edit-habit/[id]`: a positive integer, written plainly ("12", not "012", "1.0" or "-3"). */
export function parseHabitIdParam(
	raw: string | string[] | undefined,
): ParamResult<number> {
	const value = single(raw);
	if (value === undefined || value === "")
		return { ok: false, reason: "missing" };
	if (!POSITIVE_INTEGER.test(value)) {
		return { ok: false, reason: "not_positive_integer" };
	}
	const id = Number(value);
	if (!Number.isSafeInteger(id)) {
		return { ok: false, reason: "not_positive_integer" };
	}
	return { ok: true, value: id };
}

const DAY_KEY = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

/** `month/[month]`: a real calendar day, "yyyy-MM-dd" (any day of the month to show). */
export function parseMonthParam(
	raw: string | string[] | undefined,
): ParamResult<string> {
	const value = single(raw);
	if (value === undefined || value === "")
		return { ok: false, reason: "missing" };
	if (!DAY_KEY.test(value)) return { ok: false, reason: "bad_format" };
	const date = fromDayKey(value);
	// The round trip refuses 2026-02-31 and 2026-13-01, which parse or roll over.
	if (!isValid(date) || toDayKey(date) !== value) {
		return { ok: false, reason: "invalid_date" };
	}
	return { ok: true, value };
}
