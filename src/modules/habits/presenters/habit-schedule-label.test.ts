import { makeHabit } from "../test-support/habit-builder";
import { scheduleLabel, weekdaysLabel } from "./habit-schedule-label";

describe("scheduleLabel", () => {
	it("says Every day for a daily habit", () => {
		expect(scheduleLabel(makeHabit({ frequency: { type: "daily" } }))).toBe(
			"Every day",
		);
	});

	it("says N× per week", () => {
		expect(
			scheduleLabel(
				makeHabit({ frequency: { type: "per-week", timesPerWeek: 3 } }),
			),
		).toBe("3× per week");
	});

	it("collapses a run of weekdays to a range, and lists the rest", () => {
		expect(
			scheduleLabel(
				makeHabit({ frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] } }),
			),
		).toBe("Mon–Fri");
		expect(
			scheduleLabel(
				makeHabit({ frequency: { type: "weekdays", days: [4, 2] } }),
			),
		).toBe("Tue, Thu");
	});
});

describe("weekdaysLabel", () => {
	it("lists days that are not a run, in week order", () => {
		expect(weekdaysLabel([5, 1, 3])).toBe("Mon, Wed, Fri");
		expect(weekdaysLabel([4, 2])).toBe("Tue, Thu");
	});

	it("collapses three or more consecutive days to a range", () => {
		expect(weekdaysLabel([3, 1, 2])).toBe("Mon–Wed");
	});

	it("never collapses two consecutive days", () => {
		expect(weekdaysLabel([6, 7])).toBe("Sat, Sun");
	});
});
