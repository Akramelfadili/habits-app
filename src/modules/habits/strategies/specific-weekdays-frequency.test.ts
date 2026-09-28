import { addDays } from "date-fns";
import { createSpecificWeekdaysFrequency } from "./specific-weekdays-frequency";

// 2026-09-21 is a Monday.
const monday = new Date(2026, 8, 21, 9);
const noCompletions = { completedDates: [] };

describe("specific weekdays frequency", () => {
	it("is due only on the selected Mon/Wed/Fri", () => {
		const strategy = createSpecificWeekdaysFrequency({
			type: "weekdays",
			days: [1, 3, 5],
		});

		const due = [0, 1, 2, 3, 4, 5, 6].map((offset) =>
			strategy.isDueOn(addDays(monday, offset), noCompletions),
		);
		expect(due).toEqual([true, false, true, false, true, false, false]);
	});

	it("treats Sunday as ISO day 7", () => {
		const strategy = createSpecificWeekdaysFrequency({
			type: "weekdays",
			days: [7],
		});
		expect(strategy.isDueOn(addDays(monday, 6), noCompletions)).toBe(true);
		expect(strategy.isDueOn(monday, noCompletions)).toBe(false);
	});

	it("was scheduled on exactly the days it was due", () => {
		const strategy = createSpecificWeekdaysFrequency({
			type: "weekdays",
			days: [1, 3, 5],
		});
		const scheduled = [0, 1, 2, 3, 4, 5, 6].map((offset) =>
			strategy.wasScheduledOn(addDays(monday, offset), noCompletions),
		);
		expect(scheduled).toEqual([true, false, true, false, true, false, false]);
	});

	it("can fall only on its selected weekdays", () => {
		const strategy = createSpecificWeekdaysFrequency({
			type: "weekdays",
			days: [1, 3, 5],
		});
		expect(strategy.canFallOn(3)).toBe(true);
		expect(strategy.canFallOn(6)).toBe(false);
	});
});
