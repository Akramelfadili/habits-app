import { parseHabitIdParam, parseMonthParam } from "./route-params";

describe("parseHabitIdParam (D-09)", () => {
	it.each([
		["1", 1],
		["42", 42],
		["9007199254740991", Number.MAX_SAFE_INTEGER],
	])("accepts %s", (raw, id) => {
		expect(parseHabitIdParam(raw)).toEqual({ ok: true, value: id });
	});

	it.each([
		["-3", "not_positive_integer"],
		["0", "not_positive_integer"],
		["abc", "not_positive_integer"],
		["1.5", "not_positive_integer"],
		["1e3", "not_positive_integer"],
		["012", "not_positive_integer"],
		[" 1", "not_positive_integer"],
		["NaN", "not_positive_integer"],
		["9007199254740993", "not_positive_integer"],
		["", "missing"],
		[undefined, "missing"],
		[["1", "2"], "missing"],
	])("refuses %p (%s)", (raw, reason) => {
		expect(parseHabitIdParam(raw)).toEqual({ ok: false, reason });
	});
});

describe("parseMonthParam (D-09)", () => {
	it.each(["2026-07-01", "2026-07-15", "2028-02-29", "2026-12-31"])(
		"accepts %s",
		(raw) => {
			expect(parseMonthParam(raw)).toEqual({ ok: true, value: raw });
		},
	);

	it.each([
		["garbage", "bad_format"],
		["2026-7-1", "bad_format"],
		["2026-07", "bad_format"],
		["2026-07-01T00:00", "bad_format"],
		["20260701", "bad_format"],
		["2026-02-31", "invalid_date"],
		["2027-02-29", "invalid_date"],
		["2026-13-01", "invalid_date"],
		["2026-00-10", "invalid_date"],
		["0000-01-01", "invalid_date"],
		["", "missing"],
		[undefined, "missing"],
	])("refuses %p (%s)", (raw, reason) => {
		expect(parseMonthParam(raw)).toEqual({ ok: false, reason });
	});
});
