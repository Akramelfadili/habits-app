import { makeHabit } from "../test-support/habit-builder";
import { habitPickerSubtitle } from "./habit-picker-helpers";

describe("habitPickerSubtitle", () => {
	it("says 'Every day' for a daily habit", () => {
		expect(
			habitPickerSubtitle(makeHabit({ frequency: { type: "daily" } })),
		).toBe("Every day");
	});

	it("collapses a run of weekdays to a range", () => {
		const habit = makeHabit({
			frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
		});
		expect(habitPickerSubtitle(habit)).toBe("Mon–Fri");
	});

	it("lists non-consecutive days, sorted", () => {
		const habit = makeHabit({ frequency: { type: "weekdays", days: [4, 2] } });
		expect(habitPickerSubtitle(habit)).toBe("Tue, Thu");
	});

	it("does not treat two adjacent days as a range", () => {
		const habit = makeHabit({ frequency: { type: "weekdays", days: [6, 7] } });
		expect(habitPickerSubtitle(habit)).toBe("Sat, Sun");
	});

	it("describes a per-week habit by its count", () => {
		const habit = makeHabit({
			frequency: { type: "per-week", timesPerWeek: 3 },
		});
		expect(habitPickerSubtitle(habit)).toBe("3× per week");
	});

	it("appends the target for a quantity habit", () => {
		const habit = makeHabit({
			frequency: { type: "daily" },
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
		});
		expect(habitPickerSubtitle(habit)).toBe("Every day · 8 glasses");
	});
});
