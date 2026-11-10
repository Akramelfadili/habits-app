import { addWeeks } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry } from "../types";
import { canShowNextWeek, weekDaysOf, weekStripDays } from "./week-strip";

const TODAY = new Date(2026, 9, 23, 10);

function entry(habitId: number, date: string, value?: number): Entry {
	return {
		id: habitId * 1000 + Number(date.slice(-2)),
		habitId,
		date,
		value,
		createdAt: new Date(`${date}T08:00:00`),
	};
}

describe("weekDaysOf", () => {
	it("lists the seven days of the week Monday first", () => {
		const days = weekDaysOf(TODAY);
		expect(days).toHaveLength(7);
		expect(days[0]).toEqual(new Date(2026, 9, 19));
		expect(days[6]).toEqual(new Date(2026, 9, 25));
	});

	it("is the same week from a Sunday", () => {
		expect(weekDaysOf(new Date(2026, 9, 25))[0]).toEqual(new Date(2026, 9, 19));
	});
});

describe("canShowNextWeek", () => {
	it("allows going back always, and forward only to the week of today", () => {
		expect(canShowNextWeek(addWeeks(TODAY, -1), TODAY)).toBe(true);
		expect(canShowNextWeek(TODAY, TODAY)).toBe(false);
	});
});

describe("weekStripDays", () => {
	const habit = makeHabit({
		id: 1,
		createdAt: new Date(2026, 8, 1),
		frequency: { type: "daily" },
	});

	it("marks today and the future, and gives no dot to a future day", () => {
		const days = weekStripDays([habit], [], TODAY, TODAY);
		expect(days.map((day) => day.isToday)).toEqual([
			false,
			false,
			false,
			false,
			true,
			false,
			false,
		]);
		expect(days.map((day) => day.isFuture)).toEqual([
			false,
			false,
			false,
			false,
			false,
			true,
			true,
		]);
		expect(days.every((day) => !day.allDone)).toBe(true);
	});

	it("dots a day only when everything due that day was done", () => {
		const second = makeHabit({
			id: 2,
			createdAt: new Date(2026, 8, 1),
			frequency: { type: "daily" },
		});
		const entries = [
			entry(1, "2026-10-19"),
			entry(2, "2026-10-19"),
			entry(1, "2026-10-20"),
		];
		const days = weekStripDays([habit, second], entries, TODAY, TODAY);
		expect(days[0].allDone).toBe(true);
		expect(days[1].allDone).toBe(false);
	});

	it("gives no dot to a day with nothing due", () => {
		const weekdays = makeHabit({
			id: 3,
			createdAt: new Date(2026, 8, 1),
			frequency: { type: "weekdays", days: [1] },
		});
		const days = weekStripDays(
			[weekdays],
			[entry(3, "2026-10-19")],
			TODAY,
			TODAY,
		);
		expect(days[0].allDone).toBe(true);
		expect(days[1].allDone).toBe(false);
	});

	it("does not count a partial quantity as done", () => {
		const water = makeHabit({
			id: 4,
			createdAt: new Date(2026, 8, 1),
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
		});
		const days = weekStripDays(
			[water],
			[entry(4, "2026-10-19", 5), entry(4, "2026-10-20", 8)],
			TODAY,
			TODAY,
		);
		expect(days[0].allDone).toBe(false);
		expect(days[1].allDone).toBe(true);
	});

	it("does not list a habit before the day it was created", () => {
		const late = makeHabit({ id: 5, createdAt: new Date(2026, 9, 22) });
		const days = weekStripDays([late], [], TODAY, TODAY);
		expect(days[0].allDone).toBe(false);
	});
});
