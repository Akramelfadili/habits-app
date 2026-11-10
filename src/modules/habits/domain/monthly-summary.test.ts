import { addDays, format, getDate } from "date-fns";
import { inTimeZoneEachTest } from "@/test-support/time-zone";
import { habitFixturesFor } from "../dev/habit-fixtures";
import { monthlyEntries, monthlyFrozenDays } from "../dev/monthly-fixtures";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay, Habit } from "../types";

import { MAX_INSIGHTS } from "./monthly-insights";
import {
	buildMonthlySummary,
	historyStart,
	monthWeeks,
	monthWindowFor,
	previousMonthWindow,
} from "./monthly-summary";

const AUGUST = monthWindowFor(new Date(2026, 7, 15));
const longAgo = new Date(2025, 0, 1);

function daily(id: number, overrides: Partial<Habit> = {}): Habit {
	return makeHabit({
		id,
		name: `Habit ${id}`,
		frequency: { type: "daily" },
		createdAt: longAgo,
		...overrides,
	});
}

function entryOn(habitId: number, day: Date): Entry {
	return {
		id: habitId * 100000 + day.getTime() / 86400000,
		habitId,
		date: format(day, "yyyy-MM-dd"),
		createdAt: day,
	};
}

function doneBetween(habitId: number, from: Date, to: Date): Entry[] {
	const entries: Entry[] = [];
	for (let day = from; day <= to; day = addDays(day, 1)) {
		entries.push(entryOn(habitId, day));
	}
	return entries;
}

function summarise(
	habits: Habit[],
	entries: Entry[],
	today: Date,
	month = AUGUST,
	frozenDays: FrozenDay[] = [],
) {
	return buildMonthlySummary({ habits, entries, frozenDays, today, month });
}

describe("month windows", () => {
	it("splits a month into Monday-based weeks clipped to the month", () => {
		const weeks = monthWeeks(AUGUST).map(
			({ start, end }) => `${getDate(start)}-${getDate(end)}`,
		);
		expect(weeks).toEqual(["1-2", "3-9", "10-16", "17-23", "24-30", "31-31"]);
	});

	it("rolls the previous month back across a year boundary", () => {
		const january = monthWindowFor(new Date(2027, 0, 10));
		const previous = previousMonthWindow(january);
		expect(format(previous.start, "yyyy-MM-dd")).toBe("2026-12-01");
		expect(format(previous.end, "yyyy-MM-dd")).toBe("2026-12-31");
	});
});

describe("history", () => {
	it("starts at the earliest habit, archived or not", () => {
		const habits = [
			daily(1, { createdAt: new Date(2026, 5, 3, 18) }),
			daily(2, { createdAt: new Date(2026, 2, 9, 7) }),
		];
		expect(format(historyStart(habits) as Date, "yyyy-MM-dd")).toBe(
			"2026-03-09",
		);
		expect(historyStart([])).toBeNull();
	});
});

describe("totals", () => {
	const today = new Date(2026, 8, 2, 9);

	it("counts perfect days against the days that had something counted", () => {
		const habits = [daily(1), daily(2)];
		const entries = [
			...doneBetween(1, AUGUST.start, AUGUST.end),
			...doneBetween(2, AUGUST.start, new Date(2026, 7, 10)),
		];
		const summary = summarise(habits, entries, today);
		expect(summary.perfectDays).toBe(10);
		expect(summary.countedDays).toBe(31);
		expect(summary.completed).toBe(41);
		expect(summary.scheduled).toBe(62);
		expect(summary.rate).toBeCloseTo(41 / 62);
	});

	it("leaves frozen days out of both sides, and out of perfect days' denominator when nothing else was due", () => {
		const habits = [daily(1)];
		const frozen = [
			{
				id: 1,
				habitId: 1,
				date: "2026-08-07",
				createdAt: new Date(2026, 7, 7),
			},
		];
		const entries = [
			...doneBetween(1, AUGUST.start, new Date(2026, 7, 6)),
			...doneBetween(1, new Date(2026, 7, 8), AUGUST.end),
		];
		const summary = summarise(habits, entries, today, AUGUST, frozen);
		expect(summary.scheduled).toBe(30);
		expect(summary.completed).toBe(30);
		expect(summary.countedDays).toBe(30);
		expect(summary.perfectDays).toBe(30);
		expect(summary.freezeDates.map((d) => getDate(d))).toEqual([7]);
		const friday = summary.calendar[1][4];
		expect(friday?.status).toEqual({ kind: "frozen" });
	});

	it("bounds scheduled days by the habit's start", () => {
		const habits = [daily(1, { createdAt: new Date(2026, 7, 20, 15) })];
		const entries = doneBetween(1, new Date(2026, 7, 20), AUGUST.end);
		const summary = summarise(habits, entries, today);
		expect(summary.scheduled).toBe(12);
		expect(summary.calendar[0][5]?.status).toEqual({ kind: "before-start" });
	});

	it("bounds scheduled days by the archive date", () => {
		// Archived on 11 Aug: its paused days only count when they were done.
		const habits = [
			daily(1, {
				archivedAt: new Date(2026, 7, 11),
			}),
		];
		const entries = doneBetween(1, AUGUST.start, new Date(2026, 7, 10));
		const summary = summarise(habits, entries, today);
		expect(summary.scheduled).toBe(10);
		expect(summary.completed).toBe(10);
		expect(summary.rate).toBe(1);
	});

	it("reads a restored habit's closed pause as paused, not missed", () => {
		const habits = [
			daily(1, { pauses: [{ from: "2026-08-11", to: "2026-08-20" }] }),
		];
		const entries = [
			...doneBetween(1, AUGUST.start, new Date(2026, 7, 10)),
			...doneBetween(1, new Date(2026, 7, 21), AUGUST.end),
		];
		const summary = summarise(habits, entries, new Date(2026, 8, 5));
		expect(summary.scheduled).toBe(21);
		expect(summary.completed).toBe(21);
		expect(summary.rate).toBe(1);
	});

	it("counts today only once it is done, and never counts the future", () => {
		const midAugust = new Date(2026, 7, 10, 9);
		const habits = [daily(1)];
		const entries = doneBetween(1, AUGUST.start, new Date(2026, 7, 9));
		const summary = summarise(habits, entries, midAugust);
		expect(summary.scheduled).toBe(9);
		const withToday = summarise(
			habits,
			[...entries, entryOn(1, new Date(2026, 7, 10))],
			midAugust,
		);
		expect(withToday.scheduled).toBe(10);
		expect(summary.calendar[1][0]?.status).toMatchObject({ kind: "level" });
		expect(summary.calendar[2][0]?.status).toEqual({ kind: "future" });
		expect(summary.calendar[2][1]?.status).toEqual({ kind: "future" });
	});

	it("pads the calendar's first and last rows to full Monday–Sunday rows", () => {
		const summary = summarise([daily(1)], [], today);
		expect(summary.calendar).toHaveLength(6);
		expect(summary.calendar.every((row) => row.length === 7)).toBe(true);
		expect(summary.calendar[0].slice(0, 5)).toEqual([
			null,
			null,
			null,
			null,
			null,
		]);
		expect(summary.calendar[5].slice(1)).toEqual(Array(6).fill(null));
	});
});

describe("per-habit rows and delta", () => {
	const today = new Date(2026, 8, 2, 9);
	const july = monthWindowFor(new Date(2026, 6, 1));

	it("gives each habit one bar per clipped week and sorts best first", () => {
		const habits = [daily(1), daily(2)];
		const entries = [
			...doneBetween(1, AUGUST.start, new Date(2026, 7, 16)),
			...doneBetween(2, AUGUST.start, AUGUST.end),
		];
		const { rows } = summarise(habits, entries, today);
		expect(rows.map((row) => row.habit.id)).toEqual([2, 1]);
		expect(rows[0].weeks).toHaveLength(6);
		expect(rows[1].weeks.map((week) => week.fraction)).toEqual([
			1, 1, 1, 0, 0, 0,
		]);
	});

	it("gives a delta in percentage points against the previous month", () => {
		const habits = [daily(1)];
		const entries = [
			...doneBetween(1, july.start, new Date(2026, 6, 15)),
			...doneBetween(1, AUGUST.start, new Date(2026, 7, 31)),
		];
		const { rows } = summarise(habits, entries, today);
		expect(rows[0].deltaPoints).toBe(100 - 48);
	});

	it("has no delta when the previous month has no data", () => {
		const habits = [daily(1, { createdAt: new Date(2026, 7, 1) })];
		const entries = doneBetween(1, AUGUST.start, AUGUST.end);
		const { rows } = summarise(habits, entries, today);
		expect(rows[0].deltaPoints).toBeNull();
	});

	it("rolls the delta over a year boundary (January against December)", () => {
		const january = monthWindowFor(new Date(2027, 0, 1));
		const habits = [daily(1)];
		const entries = [
			...doneBetween(1, new Date(2026, 11, 1), new Date(2026, 11, 31)),
			...doneBetween(1, january.start, new Date(2027, 0, 20)),
		];
		const { rows, month, previousMonth } = summarise(
			habits,
			entries,
			new Date(2027, 1, 3, 9),
			january,
		);
		expect(format(month.start, "yyyy-MM-dd")).toBe("2027-01-01");
		expect(format(previousMonth.start, "yyyy-MM-dd")).toBe("2026-12-01");
		expect(rows[0].deltaPoints).toBe(65 - 100);
	});

	it("judges a per-week habit's week whole across the month edge", () => {
		const january = monthWindowFor(new Date(2027, 0, 1));
		const habits = [
			daily(1, { frequency: { type: "per-week", timesPerWeek: 2 } }),
		];
		const entries = [
			entryOn(1, new Date(2026, 11, 29)),
			entryOn(1, new Date(2027, 0, 2)),
		];
		const { rows } = summarise(
			habits,
			entries,
			new Date(2027, 1, 3, 9),
			january,
		);
		expect(rows[0].weeks[0]).toMatchObject({ completed: 1 });
		expect(rows[0].weeks[0].scheduled).toBeLessThanOrEqual(2);
	});
});

describe("Paris daylight-saving", () => {
	// Jest copies process.env, so assigning process.env.TZ is a no-op; the environment hook really
	// switches the zone.
	inTimeZoneEachTest("Europe/Paris");

	it("runs in Paris", () => {
		expect(new Date(2026, 6, 1).getTimezoneOffset()).toBe(-120);
	});

	it.each([
		["spring forward", 2026, 2],
		["fall back", 2026, 9],
	])("counts every day once across %s", (_label, year, monthIndex) => {
		const month = monthWindowFor(new Date(year, monthIndex, 10));
		const days = new Date(year, monthIndex + 1, 0).getDate();
		const habits = [daily(1, { createdAt: new Date(2025, 0, 1) })];
		const entries = doneBetween(1, month.start, month.end);
		const summary = summarise(
			habits,
			entries,
			new Date(year, monthIndex + 2, 2, 9),
			month,
		);
		expect(summary.scheduled).toBe(days);
		expect(summary.completed).toBe(days);
		expect(summary.perfectDays).toBe(days);
		expect(summary.calendar.flat().filter(Boolean)).toHaveLength(days);
		expect(summary.rows[0].weeks.reduce((sum, w) => sum + w.scheduled, 0)).toBe(
			days,
		);
	});
});

describe("insights on the monthly-summary fixture", () => {
	const habits = habitFixturesFor("monthly-summary");
	const summary = summarise(
		habits,
		monthlyEntries(false),
		new Date(2026, 8, 2, 9),
		AUGUST,
		monthlyFrozenDays(),
	);

	it("produces exactly the mockup's three insights, in order", () => {
		expect(summary.insights.map((insight) => insight.type)).toEqual([
			"slipping",
			"improved",
			"pattern",
		]);
		expect(summary.insights.length).toBeLessThanOrEqual(MAX_INSIGHTS);
	});

	it("names Mobility as slipping, Read as improved, and Meditate on Saturdays as the cause", () => {
		const [slipping, improved, pattern] = summary.insights;
		expect(slipping).toMatchObject({
			type: "slipping",
			row: { habit: { name: "Mobility" } },
			first: { completed: 6, scheduled: 7 },
			last: { completed: 3, scheduled: 7 },
		});
		expect(improved).toMatchObject({
			type: "improved",
			row: { habit: { name: "Read" } },
		});
		expect(pattern).toMatchObject({
			type: "pattern",
			cause: { habit: { name: "Meditate" }, weekday: 6, misses: 5 },
		});
	});

	it("reports the two freezes the freeze card shows", () => {
		expect(summary.freezeDates.map((date) => getDate(date))).toEqual([7, 22]);
	});

	it("is perfect-first when nothing was missed", () => {
		const done = summarise(
			[daily(1)],
			doneBetween(1, AUGUST.start, AUGUST.end),
			new Date(2026, 8, 2, 9),
		);
		expect(done.insights).toEqual([{ type: "perfect" }]);
	});

	it("says nothing stands out rather than leaving the slot empty", () => {
		const entries = doneBetween(1, new Date(2026, 6, 1), AUGUST.end).filter(
			(entry) => Number(entry.date.slice(8)) % 9 !== 0,
		);
		const steady = summarise([daily(1)], entries, new Date(2026, 8, 2, 9));
		expect(steady.insights.map((insight) => insight.type)).toEqual(["steady"]);
	});

	it("has no insights with nothing scheduled", () => {
		expect(summarise([], [], new Date(2026, 8, 2, 9)).insights).toEqual([]);
	});

	it("gives a pattern no action when no single habit explains it", () => {
		const four = [daily(1), daily(2), daily(3), daily(4), daily(5)];
		const missed = new Map([
			[1, [1, 8]],
			[2, [2, 9]],
			[3, [15, 16]],
			[4, [22, 23]],
			[5, [29, 30]],
		]);
		const entries = four.flatMap((habit) =>
			doneBetween(habit.id, AUGUST.start, AUGUST.end).filter(
				(entry) => !missed.get(habit.id)?.includes(Number(entry.date.slice(8))),
			),
		);
		const { insights } = summarise(four, entries, new Date(2026, 8, 2, 9));
		const pattern = insights.find((insight) => insight.type === "pattern");
		expect(pattern).toMatchObject({ type: "pattern", cause: null });
	});

	describe("archived habits on Monthly", () => {
		const weekendSkipper = (overrides: Partial<Habit> = {}) =>
			daily(1, { name: "Gym", ...overrides });
		const august = (habit: Habit) =>
			doneBetween(habit.id, AUGUST.start, AUGUST.end).filter((entry) => {
				const day = new Date(`${entry.date}T12:00:00`).getDay();
				return day !== 0 && day !== 6;
			});
		const everyDay = doneBetween(2, AUGUST.start, AUGUST.end);
		const today = new Date(2026, 8, 2, 9);

		it("names the habit in a pattern insight with its action while it's active", () => {
			const gym = weekendSkipper();
			const { insights } = summarise(
				[gym, daily(2, { name: "Read" })],
				[...august(gym), ...everyDay],
				today,
			);
			const pattern = insights.find((insight) => insight.type === "pattern");
			expect(pattern).toMatchObject({ type: "pattern" });
			expect(pattern?.type === "pattern" && pattern.cause?.habit.id).toBe(1);
		});

		it("never names or targets an archived habit, though its history still counts in the tiles and rows", () => {
			const gym = weekendSkipper({ archivedAt: new Date(2026, 8, 1) });
			const read = daily(2, { name: "Read" });
			const withGym = summarise(
				[gym, read],
				[...august(gym), ...everyDay],
				today,
			);

			expect(JSON.stringify(withGym.insights)).not.toContain("Gym");
			expect(
				withGym.insights.every(
					(insight) => insight.type !== "pattern" || insight.cause === null,
				),
			).toBe(true);
			expect(withGym.rows.map((row) => row.habit.id)).toContain(1);
			const activeOnly = summarise([read], everyDay, today);
			expect(withGym.rate).toBeLessThan(activeOnly.rate ?? 1);
		});

		it("is 'perfect' on the habits still active, not blocked by an archived habit's misses", () => {
			const gym = weekendSkipper({ archivedAt: new Date(2026, 8, 1) });
			const { insights } = summarise(
				[gym, daily(2, { name: "Read" })],
				[...august(gym), ...everyDay],
				today,
			);
			expect(insights).toEqual([{ type: "perfect" }]);
		});
	});
});
