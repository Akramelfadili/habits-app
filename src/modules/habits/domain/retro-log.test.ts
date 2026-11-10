import { makeHabit } from "../test-support/habit-builder";
import type { Entry } from "../types";

import { calculateLongestStreak, currentStreakAsOf } from "./habit-history";
import {
	dayLogValueFor,
	diffDayLog,
	habitsForDay,
	isDayLogValueDone,
	toggledDayLogValue,
} from "./retro-log";

const TUESDAY = new Date("2026-09-15T00:00:00");

function entry(habitId: number, date: string, value?: number): Entry {
	return { id: habitId * 100, habitId, date, value, createdAt: new Date() };
}

const water = makeHabit({
	id: 1,
	name: "Water",
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
});
const walk = makeHabit({ id: 2, name: "Walk" });

describe("habitsForDay", () => {
	it("shows the habit it was opened from first, then the rest in list order", () => {
		const read = makeHabit({ id: 3, name: "Read" });
		const shown = habitsForDay([walk, read, water], [], TUESDAY, 1);
		expect(shown.map((habit) => habit.id)).toEqual([1, 2, 3]);
	});

	it("leaves out a habit that wasn't scheduled that weekday", () => {
		const weekendOnly = makeHabit({
			id: 3,
			frequency: { type: "weekdays", days: [6, 7] },
		});
		const shown = habitsForDay([water, weekendOnly], [], TUESDAY, 1);
		expect(shown.map((habit) => habit.id)).toEqual([1]);
	});

	it("still shows an off-schedule habit that has something logged that day", () => {
		const weekendOnly = makeHabit({
			id: 3,
			frequency: { type: "weekdays", days: [6, 7] },
		});
		const shown = habitsForDay(
			[water, weekendOnly],
			[entry(3, "2026-09-15")],
			TUESDAY,
			1,
		);
		expect(shown.map((habit) => habit.id)).toEqual([1, 3]);
	});

	it("leaves out a habit created after that day", () => {
		const newer = makeHabit({ id: 3, createdAt: new Date("2026-09-20") });
		const shown = habitsForDay([water, newer], [], TUESDAY, 1);
		expect(shown.map((habit) => habit.id)).toEqual([1]);
	});

	it("leaves out a per-week habit whose week was already met before that day", () => {
		const twice = makeHabit({
			id: 3,
			frequency: { type: "per-week", timesPerWeek: 1 },
		});
		const shown = habitsForDay(
			[water, twice],
			[entry(3, "2026-09-14")],
			TUESDAY,
			1,
		);
		expect(shown.map((habit) => habit.id)).toEqual([1]);
	});
});

describe("day log values", () => {
	it("reads a check habit as presence and a quantity habit as its amount", () => {
		expect(dayLogValueFor(walk, undefined)).toBe(false);
		expect(dayLogValueFor(walk, entry(2, "2026-09-15"))).toBe(true);
		expect(dayLogValueFor(water, undefined)).toBe(0);
		expect(dayLogValueFor(water, entry(1, "2026-09-15", 6))).toBe(6);
	});

	it("counts a quantity as done only at or over target", () => {
		expect(isDayLogValueDone(water, 6)).toBe(false);
		expect(isDayLogValueDone(water, 8)).toBe(true);
		expect(isDayLogValueDone(water, 10)).toBe(true);
		expect(isDayLogValueDone(walk, true)).toBe(true);
	});

	it("toggles a check habit, and a quantity between nothing and full target", () => {
		expect(toggledDayLogValue(walk, false)).toBe(true);
		expect(toggledDayLogValue(walk, true)).toBe(false);
		expect(toggledDayLogValue(water, 0)).toBe(8);
		expect(toggledDayLogValue(water, 6)).toBe(8);
		expect(toggledDayLogValue(water, 10)).toBe(0);
	});
});

describe("diffDayLog", () => {
	it("returns only the habits whose value changed", () => {
		expect(
			diffDayLog({ 1: 6, 2: false, 3: true }, { 1: 8, 2: false, 3: false }),
		).toEqual([
			{ habitId: 1, value: 8 },
			{ habitId: 3, value: false },
		]);
	});

	it("returns nothing when only the note changes", () => {
		expect(diffDayLog({ 1: 8 }, { 1: 8 })).toEqual([]);
	});
});

describe("streaks after a retro edit", () => {
	const today = new Date(2026, 8, 23, 12);
	const habit = makeHabit({ id: 1, createdAt: new Date(2026, 8, 1) });
	const logged = [
		"2026-09-22",
		"2026-09-21",
		"2026-09-19",
		"2026-09-18",
		"2026-09-17",
	];
	const before = logged.map((date) => entry(1, date));
	const history = (entries: Entry[]) => ({
		habit,
		entries,
		frozenDates: new Set<string>(),
		today,
	});

	it("filling in a past miss recalculates the streak forward from that day", () => {
		expect(currentStreakAsOf(history(before))).toBe(2);
		expect(calculateLongestStreak(history(before)).days).toBe(3);

		const after = [...before, entry(1, "2026-09-20")];
		expect(currentStreakAsOf(history(after))).toBe(6);
		expect(calculateLongestStreak(history(after)).days).toBe(6);
	});

	it("un-completing a past day breaks the streak from that day on", () => {
		const after = before.filter((e) => e.date !== "2026-09-21");
		expect(currentStreakAsOf(history(after))).toBe(1);
	});
});
