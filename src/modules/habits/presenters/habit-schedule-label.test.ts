import { makeHabit } from "../test-support/habit-builder";
import { scheduleLabel } from "./habit-schedule-label";

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
