import { makeHabit } from "../test-support/habit-builder";
import {
	existedOn,
	hasStartedBy,
	isHabitListedOn,
	isPausedOnDay,
	isSelectableDay,
	nextSelectedKey,
} from "./selected-day";

describe("isSelectableDay / nextSelectedKey", () => {
	it("only today and earlier are selectable", () => {
		expect(isSelectableDay("2026-10-14", "2026-10-14")).toBe(true);
		expect(isSelectableDay("2026-10-13", "2026-10-14")).toBe(true);
		expect(isSelectableDay("2026-10-15", "2026-10-14")).toBe(false);
	});

	it("a past day is kept, today clears the selection, a future day changes nothing", () => {
		expect(nextSelectedKey(null, "2026-10-12", "2026-10-14")).toBe(
			"2026-10-12",
		);
		expect(
			nextSelectedKey("2026-10-12", "2026-10-14", "2026-10-14"),
		).toBeNull();
		expect(nextSelectedKey("2026-10-12", "2026-10-20", "2026-10-14")).toBe(
			"2026-10-12",
		);
		expect(nextSelectedKey(null, "2026-10-20", "2026-10-14")).toBeNull();
	});
});

describe("which habits a day lists", () => {
	const habit = makeHabit({
		createdAt: new Date(2026, 9, 5, 18),
		pauses: [{ from: "2026-10-08", to: "2026-10-09" }],
	});

	it("is not listed before the day it was created, but is on that day", () => {
		expect(hasStartedBy(habit, new Date(2026, 9, 4))).toBe(false);
		expect(hasStartedBy(habit, new Date(2026, 9, 5))).toBe(true);
		expect(isHabitListedOn(habit, new Date(2026, 9, 4), [])).toBe(false);
		expect(isHabitListedOn(habit, new Date(2026, 9, 6), [])).toBe(true);
	});

	it("is not listed inside a paused range", () => {
		expect(isPausedOnDay(habit, new Date(2026, 9, 8))).toBe(true);
		expect(isHabitListedOn(habit, new Date(2026, 9, 8), [])).toBe(false);
		expect(existedOn(habit, new Date(2026, 9, 8))).toBe(false);
		expect(existedOn(habit, new Date(2026, 9, 10))).toBe(true);
	});
});
