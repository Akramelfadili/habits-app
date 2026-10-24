import { makeHabit } from "../test-support/habit-builder";
import {
	bestDayTile,
	slippingBody,
	weeklyRowCount,
	weeklyRowLabel,
	weekRangeLabel,
} from "./weekly-summary-helpers";

describe("weekRangeLabel", () => {
	it("names the month once when the week sits inside it", () => {
		expect(
			weekRangeLabel({
				start: new Date(2026, 8, 14),
				end: new Date(2026, 8, 20),
			}),
		).toBe("14 – 20 September");
	});

	it("names both months across a month boundary", () => {
		expect(
			weekRangeLabel({
				start: new Date(2026, 8, 28),
				end: new Date(2026, 9, 4),
			}),
		).toBe("28 September – 4 October");
	});
});

describe("weeklyRowLabel", () => {
	it("is the habit's name alone — never a suffix, for either direction", () => {
		expect(
			weeklyRowLabel(
				makeHabit({ name: "No phone in bed", direction: "break" }),
			),
		).toBe("No phone in bed");
		expect(weeklyRowLabel(makeHabit({ name: "Read" }))).toBe("Read");
	});
});

describe("weeklyRowCount", () => {
	it("is completed/scheduled", () => {
		const row = {
			habit: makeHabit(),
			completed: 2,
			scheduled: 7,
			fraction: 2 / 7,
		};
		expect(weeklyRowCount(row)).toBe("2/7");
	});

	it("says a Break habit's days were resisted", () => {
		const row = {
			habit: makeHabit({ direction: "break" }),
			completed: 5,
			scheduled: 7,
			fraction: 5 / 7,
		};
		expect(weeklyRowCount(row)).toBe("5/7 resisted");
	});
});

describe("bestDayTile", () => {
	it("shows the weekday and that day's count", () => {
		expect(
			bestDayTile(
				{ date: new Date(2026, 8, 15), completed: 6, scheduled: 6 },
				false,
			),
		).toEqual({ value: "Tue", caption: "6 of 6 done" });
	});

	it("reads 'All' for a perfect week", () => {
		expect(
			bestDayTile(
				{ date: new Date(2026, 8, 14), completed: 6, scheduled: 6 },
				true,
			),
		).toEqual({ value: "All", caption: "every day full" });
	});

	it("shows a dash before anything's done", () => {
		expect(bestDayTile(null, false)).toEqual({
			value: "—",
			caption: "nothing done yet",
		});
	});
});

describe("slippingBody", () => {
	it("spells out the counts", () => {
		const row = {
			habit: makeHabit(),
			completed: 2,
			scheduled: 7,
			fraction: 2 / 7,
		};
		expect(slippingBody(row)).toBe(
			"Two of seven days. Try moving it to a day or time that fits better.",
		);
	});

	it("keeps the noun singular for one scheduled day", () => {
		const row = { habit: makeHabit(), completed: 0, scheduled: 1, fraction: 0 };
		expect(slippingBody(row)).toMatch(/^Zero of one day\./);
	});

	it("reads naturally at zero", () => {
		const row = { habit: makeHabit(), completed: 0, scheduled: 3, fraction: 0 };
		expect(slippingBody(row)).toMatch(/^Zero of three days\./);
	});
});
