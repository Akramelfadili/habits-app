import { addDays, format } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay } from "../types";
import {
	aggregateDays,
	classifyHabits,
	daysIn,
	groupByHabit,
} from "./day-grid";

// Wednesday 16 Sep 2026.
const today = new Date(2026, 8, 16, 12);
const monday = new Date(2026, 8, 14);
const key = (offset: number) => format(addDays(monday, offset), "yyyy-MM-dd");
const entry = (habitId: number, offset: number): Entry => ({
	id: habitId * 10 + offset,
	habitId,
	date: key(offset),
	createdAt: addDays(monday, offset),
});
const frozen = (habitId: number, offset: number): FrozenDay => ({
	id: habitId * 10 + offset,
	habitId,
	date: key(offset),
	createdAt: addDays(monday, offset),
});

const a = makeHabit({ id: 1, createdAt: new Date(2025, 0, 1) });
const b = makeHabit({ id: 2, createdAt: new Date(2025, 0, 1) });

describe("daysIn", () => {
	it("lists every day from start to end inclusive at local midnight", () => {
		const days = daysIn(new Date(2026, 8, 14, 18), new Date(2026, 8, 16));
		expect(days.map((d) => format(d, "yyyy-MM-dd HH:mm"))).toEqual([
			"2026-09-14 00:00",
			"2026-09-15 00:00",
			"2026-09-16 00:00",
		]);
	});

	it("is empty when the end is before the start", () => {
		expect(daysIn(new Date(2026, 8, 16), new Date(2026, 8, 14))).toEqual([]);
	});
});

describe("groupByHabit", () => {
	it("keeps each habit's items together, in order", () => {
		const groups = groupByHabit([entry(1, 0), entry(2, 0), entry(1, 1)]);
		expect(groups.get(1)?.map((e) => e.date)).toEqual([key(0), key(1)]);
		expect(groups.get(2)).toHaveLength(1);
	});
});

describe("aggregateDays", () => {
	const dates = daysIn(monday, addDays(monday, 3)); // Mon … Thu (Thu is future)
	const perHabit = classifyHabits({
		habits: [a, b],
		entries: [entry(1, 0), entry(2, 0), entry(1, 1), entry(1, 2)],
		frozenDays: [frozen(2, 1)],
		today,
		dates,
	});
	const days = aggregateDays(perHabit, dates, today);

	it("sums the shared rule per day: a perfect Monday, a frozen Tuesday", () => {
		expect(days[0]).toMatchObject({
			key: key(0),
			tally: { done: 2, due: 2, frozen: 0 },
			level: 3,
			perfect: true,
		});
		expect(days[1]).toMatchObject({
			tally: { done: 1, due: 1, frozen: 1 },
			level: 3,
			perfect: false, // a frozen day is not perfect
		});
	});

	it("keeps today from being perfect while a habit is still open", () => {
		expect(days[2]).toMatchObject({
			isToday: true,
			tally: { done: 1, due: 1 },
			perfect: false,
		});
		expect(days[2].counts).toMatchObject({ done: 1, today: 1 });
	});

	it("counts future days as future for every habit", () => {
		expect(days[3].counts.future).toBe(2);
		expect(days[3].level).toBeNull();
	});
});
