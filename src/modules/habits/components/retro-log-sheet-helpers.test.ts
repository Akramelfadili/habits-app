import { makeHabit } from "../test-support/habit-builder";

jest.mock("../repositories/frozen-day-repository", () => ({}));

import { retroLogRowSubtitle, retroLogTitle } from "./retro-log-sheet-helpers";

const water = makeHabit({
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});

describe("retroLogTitle", () => {
	it("formats the day like the mockup", () => {
		expect(retroLogTitle(new Date(2026, 8, 8))).toBe("Tuesday, 8 September");
	});
});

describe("retroLogRowSubtitle", () => {
	it("shows a quantity habit's target when nothing or exactly the target is logged", () => {
		expect(retroLogRowSubtitle(water, 0)).toBe("8 glasses");
		expect(retroLogRowSubtitle(water, 8)).toBe("8 glasses");
	});

	it("shows the exact logged amount otherwise", () => {
		expect(retroLogRowSubtitle(water, 6)).toBe("6 of 8 glasses");
		expect(retroLogRowSubtitle(water, 10)).toBe("10 of 8 glasses");
	});

	it("frames a resisted Break habit as resisted", () => {
		const breakHabit = makeHabit({ direction: "break", category: "Evening" });
		expect(retroLogRowSubtitle(breakHabit, true)).toBe("Resisted");
		expect(retroLogRowSubtitle(breakHabit, false)).toBe("Evening");
	});

	it("falls back to the cadence for an uncategorised check habit", () => {
		expect(retroLogRowSubtitle(makeHabit({ category: null }), false)).toBe(
			"daily",
		);
	});
});
