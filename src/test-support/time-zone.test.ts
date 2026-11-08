import { getDay } from "date-fns";
import {
	currentTimeZone,
	dstTransitionDays,
	inTimeZoneEachTest,
	TEST_ZONES,
	withTimeZone,
} from "./time-zone";

const offsetOfNewYear = () => new Date(2026, 0, 1).getTimezoneOffset();

describe("jest's fixed zone", () => {
	it("is America/Los_Angeles unless JEST_TZ picks another (jest.global-setup.js)", () => {
		expect(currentTimeZone()).toBe(
			process.env.JEST_TZ || "America/Los_Angeles",
		);
	});

	it("is the zone dates are actually built in", () => {
		const expected = withTimeZone(currentTimeZone() ?? "UTC", offsetOfNewYear);
		expect(offsetOfNewYear()).toBe(expected);
	});
});

describe("withTimeZone", () => {
	it("really moves local dates (Auckland is UTC+13 in January)", () => {
		expect(withTimeZone("Pacific/Auckland", offsetOfNewYear)).toBe(-780);
		expect(withTimeZone("UTC", offsetOfNewYear)).toBe(0);
	});

	it("puts the previous zone back, also after a throw", () => {
		const before = currentTimeZone();
		expect(() =>
			withTimeZone("Europe/Paris", () => {
				throw new Error("boom");
			}),
		).toThrow("boom");
		expect(currentTimeZone()).toBe(before);
	});

	it("puts the previous zone back when an async body settles", async () => {
		const before = currentTimeZone();
		const offset = await withTimeZone("UTC", async () => offsetOfNewYear());
		expect(offset).toBe(0);
		expect(currentTimeZone()).toBe(before);
	});
});

describe("inTimeZoneEachTest", () => {
	inTimeZoneEachTest("UTC");
	it("runs the test in the zone", () => {
		expect(offsetOfNewYear()).toBe(0);
	});
});

describe("dstTransitionDays", () => {
	// Cross-checked against an hour-by-hour Intl scan when this was written.
	it.each([
		["UTC", []],
		["America/Sao_Paulo", []],
		["Europe/Paris", ["2026-03-29", "2026-10-25"]],
		["America/Los_Angeles", ["2026-03-08", "2026-11-01"]],
		["Pacific/Auckland", ["2026-04-05", "2026-09-27"]],
	])("finds %s's 2026 clock changes", (zone, days) => {
		expect(dstTransitionDays(zone, 2026)).toEqual(days);
	});

	it("finds Sao Paulo's last DST years, when clocks changed at midnight", () => {
		expect(dstTransitionDays("America/Sao_Paulo", 2018)).toEqual([
			"2018-02-17",
			"2018-11-04",
		]);
	});

	it("only lands on Sundays for the matrix zones in 2026", () => {
		for (const zone of TEST_ZONES) {
			for (const key of dstTransitionDays(zone, 2026)) {
				const [y, m, d] = key.split("-").map(Number);
				expect(getDay(new Date(y, m - 1, d, 12))).toBe(0);
			}
		}
	});
});
