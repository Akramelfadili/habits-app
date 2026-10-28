import { makeHabit } from "../test-support/habit-builder";
import { editDayRowStatus } from "./edit-day-status";

describe("editDayRowStatus (RL1/RL2)", () => {
	it("says Done, and invites a log when missed", () => {
		const habit = makeHabit({});
		expect(editDayRowStatus(habit, true, false).text).toBe("Done");
		expect(editDayRowStatus(habit, false, false).text).toBe(
			"Missed · tap to log",
		);
	});

	it("says a Break habit was resisted", () => {
		expect(
			editDayRowStatus(makeHabit({ direction: "break" }), true, false).text,
		).toBe("Break · resisted");
	});

	it("shows a quantity habit's amount and says a tap opens it", () => {
		const habit = makeHabit({
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
		});
		expect(editDayRowStatus(habit, 5, false).text).toBe(
			"5 of 8 glasses · tap for amount",
		);
	});

	it("says a frozen day returns its freeze when logged, in violet", () => {
		expect(editDayRowStatus(makeHabit({}), false, true)).toEqual({
			text: "Frozen · logging it returns the freeze",
			tone: "frozen",
		});
	});

	it("reads a frozen day that was logged as done", () => {
		expect(editDayRowStatus(makeHabit({}), true, true).text).toBe("Done");
	});
});
