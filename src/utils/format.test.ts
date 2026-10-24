import {
	formatCount,
	formatDateRange,
	formatDayMonth,
	formatDayMonthShort,
	noun,
	pluralise,
} from "./format";

describe("pluralise", () => {
	it.each([
		[0, "0 days"],
		[1, "1 day"],
		[2, "2 days"],
		[1612, "1,612 days"],
	])("%i → %s", (count, expected) => {
		expect(pluralise(count, "day")).toBe(expected);
	});

	it("takes an irregular plural", () => {
		expect(pluralise(1, "entry", "entries")).toBe("1 entry");
		expect(pluralise(3, "entry", "entries")).toBe("3 entries");
	});

	it("noun() is the word alone", () => {
		expect(noun(1, "month")).toBe("month");
		expect(noun(0, "month")).toBe("months");
	});
});

describe("formatCount", () => {
	it("groups thousands with commas", () => {
		expect(formatCount(999)).toBe("999");
		expect(formatCount(1284)).toBe("1,284");
		expect(formatCount(1234567)).toBe("1,234,567");
	});
});

describe("dates", () => {
	const mar3 = new Date(2026, 2, 3);
	const sep16 = new Date(2026, 8, 16);

	it("formats day + month in both widths", () => {
		expect(formatDayMonth(mar3)).toBe("3 March");
		expect(formatDayMonthShort(mar3)).toBe("3 Mar");
	});

	it("joins a range with a spaced en dash", () => {
		expect(formatDateRange(mar3, sep16)).toBe("3 Mar – 16 Sep");
		expect(formatDateRange(mar3, sep16, { long: true })).toBe(
			"3 March – 16 September",
		);
	});

	it("drops the shared month and shows years only when asked or spanning two", () => {
		expect(formatDateRange(mar3, new Date(2026, 2, 9))).toBe("3 – 9 Mar");
		expect(formatDateRange(mar3, sep16, { withYear: true })).toBe(
			"3 Mar 2026 – 16 Sep 2026",
		);
		expect(formatDateRange(new Date(2025, 11, 30), new Date(2026, 0, 5))).toBe(
			"30 Dec 2025 – 5 Jan 2026",
		);
	});
});
