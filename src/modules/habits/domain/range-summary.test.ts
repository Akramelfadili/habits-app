import { addDays, format } from "date-fns";
import { weekWindow } from "@/utils/week-window";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay, Habit } from "../types";
import { monthWindowFor } from "./monthly-summary";
import {
	buildRangeSummary,
	previousRangeWindow,
	rangeEntrySpan,
	rangeWindowFor,
} from "./range-summary";
import { yearWindowFor } from "./yearly-summary";

// Friday 18 Sep 2026 — the week is Mon 14 – Sun 20, the one before Mon 7 – Sun 13.
const today = new Date(2026, 8, 18, 12);
const monday = new Date(2026, 8, 14);
const longAgo = new Date(2025, 0, 1);
const key = (date: Date) => format(date, "yyyy-MM-dd");
/** 0 = Monday of the current week; negatives reach into the week before. */
const at = (offset: number) => addDays(monday, offset);

let nextId = 1;
function entry(habitId: number, offset: number, value?: number): Entry {
	nextId += 1;
	return {
		id: nextId,
		habitId,
		date: key(at(offset)),
		value,
		createdAt: at(offset),
	};
}
const done = (habitId: number, offsets: number[]) =>
	offsets.map((offset) => entry(habitId, offset));
const freeze = (habitId: number, offset: number): FrozenDay => ({
	id: nextId++,
	habitId,
	date: key(at(offset)),
	createdAt: at(offset),
});

const water = makeHabit({ id: 1, name: "Water", createdAt: longAgo });
const upper = makeHabit({
	id: 2,
	name: "Upper body",
	createdAt: longAgo,
	frequency: { type: "weekdays", days: [2, 4] },
});
const cold = makeHabit({
	id: 3,
	name: "Cold shower",
	createdAt: longAgo,
	frequency: { type: "per-week", timesPerWeek: 3 },
});
const noSocial = makeHabit({
	id: 4,
	name: "No social media",
	createdAt: longAgo,
	direction: "break",
});
const read = makeHabit({ id: 5, name: "Read", createdAt: longAgo });
const habits: Habit[] = [water, upper, cold, noSocial, read];

// This week up to Friday (today): see the per-habit comments below.
const entries: Entry[] = [
	...done(1, [0, 1, 2, 3, 4]), // 5 of 5
	...done(2, [0, 1, 3]), // Tue + Thu done; Monday is a bonus
	...done(3, [0, 2]), // 2 of 3 — every open day can still cover the third
	...done(4, [0, 1, 3]), // resisted Mon, Tue, Thu; Wed slipped
	...done(5, [0, 1]), // Wed missed, Thu frozen
];
const frozenDays = [freeze(5, 3)];

const week = rangeWindowFor("week", today);
const summary = () =>
	buildRangeSummary({
		kind: "week",
		habits,
		entries,
		frozenDays,
		today,
		window: week,
	});

describe("range windows", () => {
	it("are the Mon–Sun week, the calendar month and the calendar year", () => {
		expect(rangeWindowFor("week", today)).toEqual(weekWindow(today));
		expect(rangeWindowFor("month", today)).toEqual(monthWindowFor(today));
		expect(rangeWindowFor("year", today)).toEqual(yearWindowFor(today));
	});

	it("each has a previous range of the same kind", () => {
		const fmt = (w: { start: Date; end: Date }) =>
			`${key(w.start)}..${key(w.end)}`;
		expect(fmt(previousRangeWindow("week", week))).toBe(
			"2026-09-07..2026-09-13",
		);
		expect(
			fmt(previousRangeWindow("month", rangeWindowFor("month", today))),
		).toBe("2026-08-01..2026-08-31");
		expect(
			fmt(previousRangeWindow("year", rangeWindowFor("year", today))),
		).toBe("2025-01-01..2025-12-31");
	});

	it("read entries from the previous range's first Monday to the range's last Sunday", () => {
		const span = rangeEntrySpan("week", week);
		expect([key(span.start), key(span.end)]).toEqual([
			"2026-09-07",
			"2026-09-20",
		]);
		const year = rangeEntrySpan("year", rangeWindowFor("year", today));
		expect([key(year.start), key(year.end)]).toEqual([
			"2024-12-30",
			"2027-01-03",
		]);
	});
});

describe("buildRangeSummary — week", () => {
	it("rates done ÷ due with frozen, bonus and the open today left out", () => {
		// water 5/5, upper 2/2, cold 2/2, no-social 3/4 (Fri open), read 2/3 (Thu frozen, Fri open).
		const result = summary();
		expect(result).toMatchObject({ done: 14, due: 16, rate: 88 });
		expect(result.freezes.map(({ date }) => date)).toEqual(["2026-09-17"]);
	});

	it("counts a Break habit's resisted days as done, and a slip as missed", () => {
		const row = summary().habits.find((r) => r.habit.id === 4);
		expect(row).toMatchObject({
			isBreak: true,
			done: 3,
			due: 4,
			rate: 75,
		});
	});

	it("lists off-schedule logs separately as bonus, never in the rate", () => {
		const result = summary();
		expect(result.bonus.map(({ habit, date }) => [habit.id, date])).toEqual([
			[2, "2026-09-14"],
		]);
		expect(result.habits.find((r) => r.habit.id === 2)).toMatchObject({
			done: 2,
			due: 2,
			bonus: 1,
		});
	});

	it("keeps a × per week habit due on its open days only", () => {
		expect(summary().habits.find((r) => r.habit.id === 3)).toMatchObject({
			done: 2,
			due: 2,
			rate: 100,
		});
	});

	it("counts perfect days: Mon, Tue, and not a frozen Thursday or a Friday still open", () => {
		const result = summary();
		expect(result.perfectDays).toBe(2);
		// Mon–Thu have something due; Friday has water done only so far.
		expect(result.countedDays).toBe(5);
	});

	it("gives daily bars and a best day (earliest on a tie)", () => {
		const result = summary();
		expect(result.weekdays.map((d) => d.percent)).toEqual([
			100,
			100,
			50,
			100,
			100,
			null,
			null,
		]);
		expect(key(result.weekdays[0].date as Date)).toBe("2026-09-14");
		expect(result.bestDay).toMatchObject({ weekday: 1, done: 4, due: 4 });
	});

	it("takes the previous week's rate from the same function", () => {
		const lastWeek = [
			...done(1, [-7, -6, -5, -4, -3, -2, -1]),
			...done(5, [-7, -6, -5, -4, -3, -2, -1]),
		];
		const result = buildRangeSummary({
			kind: "week",
			habits: [water, read],
			entries: [...lastWeek, ...done(1, [0, 1, 2, 3, 4]), ...done(5, [0, 1])],
			frozenDays: [freeze(5, 3)],
			today,
			window: week,
		});
		// this week: water 5/5 + read 2/3 = 7/8 (88); last week 14/14 (100)
		expect(result).toMatchObject({
			rate: 88,
			previousRate: 100,
			deltaPoints: -12,
		});
	});

	it("ranks per-habit rates best first with a slipping habit last and tagged", () => {
		const lastWeek = [
			...done(1, [-7, -6, -5, -4, -3, -2, -1]),
			...done(5, [-7, -6, -5, -4, -3, -2, -1]),
		];
		const result = buildRangeSummary({
			kind: "week",
			habits: [water, read],
			// Read: 1 of 4 due this week (Mon done; Tue, Wed, Thu missed) after 7 of 7.
			entries: [...lastWeek, ...done(1, [0, 1, 2, 3, 4]), ...done(5, [0])],
			frozenDays: [],
			today,
			window: week,
		});
		expect(result.habits.map((r) => [r.habit.id, r.rate, r.slipping])).toEqual([
			[1, 100, false],
			[5, 25, true],
		]);
	});

	it("reports the best current streak across active habits", () => {
		expect(summary().bestStreak).toMatchObject({ days: 5, habit: { id: 1 } });
	});

	it("is empty-handed before anything is due", () => {
		const result = buildRangeSummary({
			kind: "week",
			habits: [makeHabit({ id: 1, createdAt: addDays(today, 3) })],
			entries: [],
			frozenDays: [],
			today,
			window: week,
		});
		expect(result).toMatchObject({
			rate: null,
			bestDay: null,
			perfectDays: 0,
			habits: [],
		});
	});
});

describe("buildRangeSummary — month", () => {
	const sept = new Date(2026, 8, 18, 12);
	const august = rangeWindowFor("month", new Date(2026, 7, 10));
	const log = (habitId: number, from: number, count: number) =>
		Array.from({ length: count }, (_, index) => ({
			id: 1000 + habitId * 100 + from + index,
			habitId,
			date: format(new Date(2026, 7, from + index), "yyyy-MM-dd"),
			createdAt: new Date(2026, 7, from + index),
		}));

	it("tags a habit whose weeks only fall as slipping and ranks it last", () => {
		const fading = makeHabit({ id: 1, name: "Fading", createdAt: longAgo });
		const steady = makeHabit({ id: 2, name: "Steady", createdAt: longAgo });
		// Mon 3 Aug → Sun 30 Aug: 7, 5, 3, 1 of 7 against a habit done every day.
		const result = buildRangeSummary({
			kind: "month",
			habits: [fading, steady],
			entries: [
				...log(1, 3, 7),
				...log(1, 10, 5),
				...log(1, 17, 3),
				...log(1, 24, 1),
				...log(2, 1, 31),
			],
			frozenDays: [],
			today: sept,
			window: august,
		});
		expect(result.habits.map((r) => [r.habit.id, r.slipping])).toEqual([
			[2, false],
			[1, true],
		]);
	});

	it("reports the longest run inside the month as the best streak", () => {
		const meditate = makeHabit({ id: 1, createdAt: longAgo });
		const result = buildRangeSummary({
			kind: "month",
			habits: [meditate],
			// 1–13 Aug, a two-day gap, then 16–20 Aug; a July run before the month is not counted.
			entries: [...log(1, 1, 13), ...log(1, 16, 5)],
			frozenDays: [],
			today: sept,
			window: august,
		});
		expect(result.bestStreak).toMatchObject({ days: 13 });
		expect(key(result.bestStreak?.endedOn as Date)).toBe("2026-08-13");
	});

	it("ignores weeks that haven't started when judging the current month", () => {
		// Today is Sun 20 Sep: the weeks of 21 and 28 Sep are still ahead. Weeks of
		// 6, 5 and 2 done fall every week; the empty future weeks must not add a
		// month-to-date "week" (a rise) that hides it.
		const fading = makeHabit({ id: 1, name: "Fading", createdAt: longAgo });
		const days = (from: number, count: number) =>
			Array.from({ length: count }, (_, index) => ({
				id: 2000 + from + index,
				habitId: 1,
				date: format(new Date(2026, 8, from + index), "yyyy-MM-dd"),
				createdAt: new Date(2026, 8, from + index),
			}));
		const result = buildRangeSummary({
			kind: "month",
			habits: [fading],
			entries: [...days(1, 6), ...days(7, 5), ...days(14, 2)],
			frozenDays: [],
			today: new Date(2026, 8, 20, 12),
			window: rangeWindowFor("month", new Date(2026, 8, 1)),
		});
		expect(result.habits[0].slipping).toBe(true);
	});
});
