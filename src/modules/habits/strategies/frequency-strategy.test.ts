import type { Frequency } from "../types";
import {
	canHabitFallOn,
	getFrequencyStrategy,
	isHabitDueOn,
} from "./frequency-strategy";

// 2026-09-21 is a Monday.
const monday = new Date(2026, 8, 21, 9);

describe("frequency-strategy", () => {
	it.each<[Frequency, boolean]>([
		[{ type: "daily" }, true],
		[{ type: "weekdays", days: [2] }, false],
		[{ type: "per-week", timesPerWeek: 1 }, true],
	])("resolves the strategy for %j", (frequency, expected) => {
		expect(
			getFrequencyStrategy(frequency).isDueOn(monday, { completedDates: [] }),
		).toBe(expected);
	});

	it("isHabitDueOn defaults to no completions", () => {
		expect(
			isHabitDueOn(
				{ frequency: { type: "per-week", timesPerWeek: 2 } },
				monday,
			),
		).toBe(true);
	});

	it("canHabitFallOn delegates to the habit's strategy", () => {
		expect(canHabitFallOn({ frequency: { type: "daily" } }, 6)).toBe(true);
		expect(
			canHabitFallOn({ frequency: { type: "weekdays", days: [1] } }, 6),
		).toBe(false);
	});
});
