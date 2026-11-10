import { isValid } from "date-fns";
import { fromDayKey, toDayKey } from "@/utils/day-key";

// Params come from deep links any app or web page can open, so they are untrusted. A refusal
// returns a short code for the log, never the param itself.
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

// expo-router hands a repeated segment as an array.
function single(raw: string | string[] | undefined): string | undefined {
	return Array.isArray(raw) ? undefined : raw;
}

const POSITIVE_INTEGER = /^[1-9][0-9]*$/;

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
