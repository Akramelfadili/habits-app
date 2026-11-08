import { addDays, format } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, Habit } from "../types";

import {
	buildWeeklySummary,
	defaultSummaryWeek,
	SLIPPING_MIN_SCHEDULED_DAYS,
} from "./weekly-summary";

// Mid-day local, so date-only math never straddles a timezone boundary.
const monday = new Date(2026, 8, 14, 12); // Monday 14 Sep 2026
const sunday = addDays(monday, 6);
const longAgo = new Date(2025, 0, 1);

/** `dayIndex` 0 = Monday … 6 = Sunday of the 14–20 Sep week. */
function entry(habitId: number, dayIndex: number, value?: number): Entry {
	return {
		id: habitId * 10 + dayIndex,
		habitId,
		date: format(addDays(monday, dayIndex), "yyyy-MM-dd"),
		value,
		createdAt: addDays(monday, dayIndex),
	};
}

function doneOn(habitId: number, days: number[]): Entry[] {
	return days.map((day) => entry(habitId, day));
}

function daily(id: number, overrides: Partial<Habit> = {}): Habit {
	return makeHabit({
		id,
		name: `Habit ${id}`,
		frequency: { type: "daily" },
		createdAt: longAgo,
		...overrides,
	});
}

describe("buildWeeklySummary", () => {
	it("totals completed vs scheduled across every habit", () => {
		const summary = buildWeeklySummary({
			habits: [daily(1), daily(2)],
			entries: [...doneOn(1, [0, 1, 2, 3, 4, 5, 6]), ...doneOn(2, [0, 1])],
			today: sunday,
		});
		expect(summary.completed).toBe(9);
		// Habit 2's unlogged Sunday is still today — not owed yet.
		expect(summary.scheduled).toBe(13);
	});

	it("only counts scheduled days — a Mon–Fri habit owes 5, a 3×/week habit owes 3", () => {
		const weekdays = daily(1, {
			frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
		});
		const perWeek = daily(2, {
			frequency: { type: "per-week", timesPerWeek: 3 },
		});
		const summary = buildWeeklySummary({
			habits: [weekdays, perWeek],
			entries: [...doneOn(1, [0, 1, 2, 3, 4]), ...doneOn(2, [0, 2, 4])],
			today: sunday,
		});
		expect(summary.rows.map((row) => [row.scheduled, row.completed])).toEqual([
			[5, 5],
			[3, 3],
		]);
	});

	it("ignores completions logged on an unscheduled day", () => {
		const weekdays = daily(1, {
			frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
		});
		const summary = buildWeeklySummary({
			habits: [weekdays],
			entries: doneOn(1, [0, 5, 6]),
			today: sunday,
		});
		expect(summary.rows[0]).toMatchObject({ completed: 1, scheduled: 5 });
	});

	it("counts a quantity habit only when it reached its target", () => {
		const water = daily(1, { targetType: "quantity", targetAmount: 8 });
		const summary = buildWeeklySummary({
			habits: [water],
			entries: [entry(1, 0, 8), entry(1, 1, 5)],
			today: addDays(monday, 2),
		});
		expect(summary.rows[0]).toMatchObject({ completed: 1, scheduled: 2 });
	});

	it("counts up to today only, and today only once it's logged", () => {
		const wednesday = addDays(monday, 2);
		const summary = buildWeeklySummary({
			habits: [daily(1), daily(2)],
			// Habit 1 logged Mon + today; habit 2 logged Mon, not yet today.
			entries: [...doneOn(1, [0, 2]), ...doneOn(2, [0])],
			today: wednesday,
		});
		expect(summary.rows.map((row) => [row.completed, row.scheduled])).toEqual([
			[1, 2],
			[2, 3],
		]);
	});

	it("ignores future-dated entries later in the week", () => {
		const summary = buildWeeklySummary({
			habits: [daily(1)],
			entries: doneOn(1, [0, 5]),
			today: addDays(monday, 1),
		});
		expect(summary.rows[0]).toMatchObject({ completed: 1, scheduled: 1 });
	});

	it("doesn't count days before a habit was created", () => {
		const created = daily(1, { createdAt: new Date(2026, 8, 18, 9) }); // Friday
		const summary = buildWeeklySummary({
			habits: [created],
			entries: doneOn(1, [4, 5, 6]),
			today: sunday,
		});
		expect(summary.rows[0]).toMatchObject({ completed: 3, scheduled: 3 });
	});

	it("leaves out a habit with nothing scheduled yet", () => {
		const weekend = daily(1, { frequency: { type: "weekdays", days: [6, 7] } });
		const summary = buildWeeklySummary({
			habits: [weekend, daily(2)],
			entries: [],
			today: addDays(monday, 2),
		});
		expect(summary.rows.map((row) => row.habit.id)).toEqual([2]);
	});

	it("sorts rows worst to best, ties in creation order", () => {
		const summary = buildWeeklySummary({
			habits: [
				daily(3, { createdAt: new Date(2025, 2, 1) }),
				daily(1, { createdAt: new Date(2025, 0, 1) }),
				daily(2, { createdAt: new Date(2025, 1, 1) }),
			],
			entries: [
				...doneOn(1, [0, 1, 2, 3, 4]),
				...doneOn(2, [0, 1]),
				...doneOn(3, [0, 1, 2, 3, 4]),
			],
			today: sunday,
		});
		expect(summary.rows.map((row) => row.habit.id)).toEqual([2, 1, 3]);
	});

	describe("best day", () => {
		it("is the day with the most completions, with that day's own count", () => {
			const summary = buildWeeklySummary({
				habits: [daily(1), daily(2), daily(3)],
				entries: [
					...doneOn(1, [0, 1, 2]),
					...doneOn(2, [1, 2]),
					...doneOn(3, [1]),
				],
				today: sunday,
			});
			expect(format(summary.bestDay?.date ?? 0, "EEE")).toBe("Tue");
			expect(summary.bestDay).toMatchObject({ completed: 3, scheduled: 3 });
		});

		it("picks the earliest day on a tie", () => {
			const summary = buildWeeklySummary({
				habits: [daily(1)],
				entries: doneOn(1, [2, 4]),
				today: sunday,
			});
			expect(format(summary.bestDay?.date ?? 0, "EEE")).toBe("Wed");
		});

		it("is null when nothing has been completed", () => {
			const summary = buildWeeklySummary({
				habits: [daily(1)],
				entries: [],
				today: sunday,
			});
			expect(summary.bestDay).toBeNull();
		});
	});

	describe("insight", () => {
		it("flags the single worst habit that's had enough scheduled days", () => {
			const summary = buildWeeklySummary({
				habits: [daily(1), daily(2)],
				entries: [...doneOn(1, [0, 1, 2, 3, 4, 5]), ...doneOn(2, [0, 3])],
				today: sunday,
			});
			expect(summary.insight).toMatchObject({
				type: "slipping",
				// Sunday is today and unlogged, so six days are owed so far.
				row: { habit: { id: 2 }, completed: 2, scheduled: 6 },
			});
		});

		it(`skips a worse habit with fewer than ${SLIPPING_MIN_SCHEDULED_DAYS} scheduled days`, () => {
			const newHabit = daily(2, { createdAt: new Date(2026, 8, 19, 9) }); // Saturday
			const summary = buildWeeklySummary({
				habits: [daily(1), newHabit],
				entries: doneOn(1, [0, 1, 2, 3, 4]),
				today: sunday,
			});
			expect(summary.rows[0].habit.id).toBe(2); // 0/2 is still the worst bar
			expect(summary.insight).toMatchObject({
				type: "slipping",
				row: { habit: { id: 1 } },
			});
		});

		it("is too early to call when no under-target habit has enough scheduled days", () => {
			const summary = buildWeeklySummary({
				habits: [daily(1)],
				// Missed Monday, done Tuesday, Wednesday (today) still open: 1/2.
				entries: doneOn(1, [1]),
				today: addDays(monday, 2),
			});
			expect(summary.insight).toEqual({ type: "too-early" });
			expect(summary.isPerfect).toBe(false);
		});

		it("is too early to call when nothing has been scheduled at all", () => {
			const summary = buildWeeklySummary({
				habits: [daily(1)],
				entries: [],
				today: monday,
			});
			expect(summary.scheduled).toBe(0);
			expect(summary.isPerfect).toBe(false);
			expect(summary.insight).toEqual({ type: "too-early" });
		});

		it("is the perfect-week variant when every scheduled day was done", () => {
			const summary = buildWeeklySummary({
				habits: [daily(1), daily(2)],
				entries: [
					...doneOn(1, [0, 1, 2, 3, 4, 5, 6]),
					...doneOn(2, [0, 1, 2, 3, 4, 5, 6]),
				],
				today: sunday,
			});
			expect(summary.isPerfect).toBe(true);
			expect(summary.insight).toEqual({ type: "perfect" });
		});

		it("isn't a perfect week after one perfect Monday — same gate as slipping", () => {
			const summary = buildWeeklySummary({
				habits: [daily(1), daily(2)],
				entries: [...doneOn(1, [0]), ...doneOn(2, [0])],
				today: monday,
			});
			// The numbers are still honest — every owed day so far was done…
			expect(summary.isPerfect).toBe(true);
			// …but one day isn't a week to judge, either way.
			expect(summary.insight).toEqual({ type: "too-early" });
		});

		it(`is a perfect week once a habit has been due ${SLIPPING_MIN_SCHEDULED_DAYS} times, all done`, () => {
			const wednesday = addDays(monday, 2);
			const summary = buildWeeklySummary({
				habits: [daily(1)],
				entries: doneOn(1, [0, 1, 2]),
				today: wednesday,
			});
			expect(summary.insight).toEqual({ type: "perfect" });
		});

		it("picks the earlier-created habit when two tie for worst", () => {
			const summary = buildWeeklySummary({
				habits: [
					daily(2, { createdAt: new Date(2025, 5, 1) }),
					daily(1, { createdAt: new Date(2025, 0, 1) }),
				],
				entries: [...doneOn(1, [0, 1]), ...doneOn(2, [3, 4])],
				today: sunday,
			});
			expect(summary.insight).toMatchObject({
				type: "slipping",
				row: { habit: { id: 1 } },
			});
		});
	});
});

describe("archive pauses (HAB-20)", () => {
	it("reads a restored habit's paused days as paused — not owed, so not missed", () => {
		// Archived Wed 16 → restored Sat 19: the pause covers Wed–Fri.
		const habit = daily(1, {
			pauses: [{ from: "2026-09-16", to: "2026-09-18" }],
		});
		const summary = buildWeeklySummary({
			habits: [habit],
			entries: doneOn(1, [0, 1, 5, 6]),
			today: sunday,
		});
		expect(summary.scheduled).toBe(4);
		expect(summary.completed).toBe(4);
		expect(summary.isPerfect).toBe(true);
	});

	it("still counts a log made during the pause", () => {
		const habit = daily(1, {
			pauses: [{ from: "2026-09-16", to: "2026-09-18" }],
		});
		const summary = buildWeeklySummary({
			habits: [habit],
			entries: doneOn(1, [0, 1, 2, 5, 6]),
			today: sunday,
		});
		expect(summary.scheduled).toBe(5);
		expect(summary.completed).toBe(5);
	});
});

describe("last week", () => {
	const nextMonday = addDays(monday, 7);

	it("summarises the previous Mon–Sun week", () => {
		const summary = buildWeeklySummary({
			habits: [daily(1)],
			entries: doneOn(1, [0, 1, 2, 3, 4]),
			today: nextMonday,
			week: "last",
		});
		expect(format(summary.week.start, "yyyy-MM-dd")).toBe("2026-09-14");
		expect(format(summary.week.end, "yyyy-MM-dd")).toBe("2026-09-20");
	});

	it("counts all seven days — a finished Sunday is owed even if it wasn't logged", () => {
		const summary = buildWeeklySummary({
			habits: [daily(1)],
			entries: doneOn(1, [0, 1, 2, 3, 4]),
			today: nextMonday,
			week: "last",
		});
		expect(summary.rows[0]).toMatchObject({ completed: 5, scheduled: 7 });
		expect(summary.insight).toMatchObject({ type: "slipping" });
	});
});

describe("defaultSummaryWeek", () => {
	it.each([
		["Monday", 0, "last"],
		["Tuesday", 1, "last"],
		["Wednesday", 2, "this"],
		["Sunday", 6, "this"],
	] as const)("opens on %s with %s", (_day, offset, expected) => {
		expect(defaultSummaryWeek(addDays(monday, offset))).toBe(expected);
	});
});

describe("buildWeeklySummary and freezes (D14)", () => {
	const frozen = (habitId: number, dayIndex: number) => ({
		id: dayIndex,
		habitId,
		date: format(addDays(monday, dayIndex), "yyyy-MM-dd"),
		createdAt: monday,
	});

	it("leaves a frozen day out of both sides instead of counting it as missed", () => {
		const input = {
			habits: [daily(1)],
			entries: doneOn(1, [0, 1, 3, 4]),
			today: sunday,
		};
		const without = buildWeeklySummary(input);
		// Sunday (today) is still open, so six days are counted.
		expect(without).toMatchObject({ completed: 4, scheduled: 6 });

		const withFreeze = buildWeeklySummary({
			...input,
			frozenDays: [frozen(1, 2)],
		});
		expect(withFreeze).toMatchObject({ completed: 4, scheduled: 5 });
		expect(withFreeze.rows[0].fraction).toBeCloseTo(4 / 5);
	});
});
