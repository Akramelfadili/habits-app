import { addDays, format } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay, Habit } from "../types";
import { scopeHabits } from "./day-grid";
import {
	buildDayDetail,
	buildMonthCalendar,
	buildWeekMatrix,
	calendarEntrySpan,
	dayEntrySpan,
} from "./progress-grid";
import { rangeWindowFor } from "./range-summary";

const today = new Date(2026, 8, 17, 12);
const monday = new Date(2026, 8, 14);
const longAgo = new Date(2025, 0, 1);
const key = (offset: number) => format(addDays(monday, offset), "yyyy-MM-dd");
let id = 1;
const entry = (habitId: number, offset: number, value?: number): Entry => ({
	id: id++,
	habitId,
	date: key(offset),
	value,
	createdAt: addDays(monday, offset),
});
const frozen = (habitId: number, offset: number): FrozenDay => ({
	id: id++,
	habitId,
	date: key(offset),
	createdAt: addDays(monday, offset),
});

const water = makeHabit({
	id: 1,
	name: "Water",
	createdAt: longAgo,
	targetType: "quantity",
	targetAmount: 8,
});
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
const newcomer = makeHabit({
	id: 5,
	name: "New",
	createdAt: addDays(monday, 2),
});
const habits: Habit[] = [water, upper, cold, noSocial, newcomer];
const week = rangeWindowFor("week", today);

const entries: Entry[] = [
	entry(1, 0, 8),
	entry(1, 1, 3),
	entry(1, 2, 5),
	entry(2, 0),
	entry(2, 1),
	entry(3, 0),
	entry(3, 2),
	entry(4, 0),
	entry(4, 1),
	entry(4, 3),
	entry(5, 3),
];
const frozenDays = [frozen(4, 2)];

const matrix = () =>
	buildWeekMatrix({ habits, entries, frozenDays, today, week });
const row = (habitId: number) =>
	matrix().rows.find((r) => r.habit.id === habitId);
const statuses = (habitId: number) => row(habitId)?.cells.map((c) => c.status);

describe("buildWeekMatrix", () => {
	it("has a column per day, today flagged, and a row per habit in creation order", () => {
		const result = matrix();
		expect(result.days.map((d) => d.key)).toEqual(
			[0, 1, 2, 3, 4, 5, 6].map(key),
		);
		expect(result.days.filter((d) => d.isToday).map((d) => d.key)).toEqual([
			key(3),
		]);
		expect(result.rows.map((r) => r.habit.id)).toEqual([1, 2, 3, 4, 5]);
	});

	it("gives a quantity habit done and partial cells with a level by percentage", () => {
		expect(statuses(1)).toEqual([
			"done",
			"partial",
			"partial",
			"today",
			"future",
			"future",
			"future",
		]);
		expect(row(1)?.cells.map((c) => c.level)).toEqual([3, 1, 2, 0, 0, 0, 0]);
	});

	it("shows bonus, not-due and done on a specific-days habit", () => {
		expect(statuses(2)).toEqual([
			"bonus",
			"done",
			"not-due",
			"today",
			"future",
			"future",
			"future",
		]);
	});

	it("keeps a × per week habit's days not-due while the week can still cover them", () => {
		expect(statuses(3)).toEqual([
			"done",
			"not-due",
			"done",
			"today",
			"future",
			"future",
			"future",
		]);
	});

	it("reads a Break habit's resisted days as done, with a frozen day in between", () => {
		expect(row(4)?.isBreak).toBe(true);
		expect(statuses(4)).toEqual([
			"done",
			"done",
			"frozen",
			"done",
			"future",
			"future",
			"future",
		]);
	});

	it("marks days before a habit existed", () => {
		expect(statuses(5)).toEqual([
			"before-start",
			"before-start",
			"missed",
			"done",
			"future",
			"future",
			"future",
		]);
	});

	it("totals done over the days the habit is due this week (future included)", () => {
		expect(row(1)).toMatchObject({ done: 1, target: 7 });
		expect(row(2)).toMatchObject({ done: 1, target: 2 });
		expect(row(4)).toMatchObject({ done: 3, target: 7 });
		expect(row(5)).toMatchObject({ done: 1, target: 5 });
	});

	it("totals a × per week habit as n of its weekly count", () => {
		expect(row(3)).toMatchObject({ done: 2, target: 3 });
	});

	it("reads outlined 'nothing logged yet' cells, not missed, when nothing has ever been logged", () => {
		const fresh = buildWeekMatrix({
			habits: [water],
			entries: [],
			frozenDays: [],
			today,
			week,
			nothingLogged: true,
		});
		expect(fresh.rows[0].cells.map((c) => c.status)).toEqual([
			"nothing-logged",
			"nothing-logged",
			"nothing-logged",
			"today",
			"future",
			"future",
			"future",
		]);
	});

	it("builds the one-habit variant from the same cells", () => {
		const scoped = buildWeekMatrix({
			habits: scopeHabits(habits, 4),
			entries,
			frozenDays,
			today,
			week,
		});
		expect(scoped.rows).toHaveLength(1);
		expect(scoped.rows[0].cells.map((c) => c.status)).toEqual(statuses(4));
	});

	it("drops an archived habit with nothing in the week but keeps one that was active in it", () => {
		const retired = makeHabit({
			id: 6,
			createdAt: longAgo,
			archivedAt: new Date(2026, 7, 1),
		});
		const lastWeekRetired = makeHabit({
			id: 7,
			createdAt: longAgo,
			archivedAt: addDays(monday, 2),
		});
		const result = buildWeekMatrix({
			habits: [retired, lastWeekRetired],
			entries: [],
			frozenDays: [],
			today,
			week,
		});
		expect(result.rows.map((r) => r.habit.id)).toEqual([7]);
	});
});

describe("buildMonthCalendar", () => {
	const sept = rangeWindowFor("month", today);
	const day = (n: number) => `2026-09-${String(n).padStart(2, "0")}`;
	const log = (habitId: number, dates: number[]): Entry[] =>
		dates.map((n) => ({
			id: id++,
			habitId,
			date: day(n),
			createdAt: new Date(2026, 8, n),
		}));
	const a = makeHabit({ id: 1, createdAt: longAgo });
	const b = makeHabit({ id: 2, createdAt: longAgo });

	const calendar = (
		overrides: Partial<Parameters<typeof buildMonthCalendar>[0]> = {},
	) =>
		buildMonthCalendar({
			habits: [a, b],
			entries: [...log(1, [1, 2, 3, 4, 7]), ...log(2, [1, 2, 3, 7])],
			frozenDays: [
				{ id: 900, habitId: 2, date: day(4), createdAt: new Date(2026, 8, 4) },
			],
			today,
			month: sept,
			...overrides,
		});
	const find = (n: number) => calendar().days.find((d) => d.key === day(n));

	it("lays the month out in Monday-first rows padded with nulls", () => {
		const { weeks } = calendar();
		expect(weeks).toHaveLength(5);
		expect(weeks[0].slice(0, 2)).toEqual([
			null,
			expect.objectContaining({ key: day(1) }),
		]);
		expect(weeks[4].at(-1)).toBeNull();
		expect(weeks.every((w) => w.length === 7)).toBe(true);
	});

	it("shades L1 under half, L2 from half, L3 for a full day, and marks the notch", () => {
		const threeHabits = [a, b, makeHabit({ id: 3, createdAt: longAgo })];
		const result = buildMonthCalendar({
			habits: threeHabits,
			entries: [...log(1, [1, 2, 3]), ...log(2, [2, 3]), ...log(3, [3])],
			frozenDays: [],
			today,
			month: sept,
		});
		const level = (n: number) => result.days.find((d) => d.key === day(n));
		expect(level(1)).toMatchObject({ level: 1, notch: true, status: "level" });
		expect(level(2)).toMatchObject({ level: 2, notch: true });
		expect(level(3)).toMatchObject({ level: 3, notch: false, perfect: true });
		expect(level(5)).toMatchObject({
			level: 0,
			status: "missed",
			notch: false,
		});
	});

	it("flags a perfect day, and a frozen day is violet and not perfect", () => {
		expect(find(2)).toMatchObject({ perfect: true, status: "level", level: 3 });
		expect(find(4)).toMatchObject({
			status: "frozen",
			perfect: false,
			frozen: 1,
		});
	});

	it("marks today open, later days future and days before every habit existed", () => {
		expect(find(17)).toMatchObject({ isToday: true, status: "open" });
		expect(find(18)?.status).toBe("future");
		const young = buildMonthCalendar({
			habits: [makeHabit({ id: 1, createdAt: new Date(2026, 8, 10) })],
			entries: [],
			frozenDays: [],
			today,
			month: sept,
		});
		expect(young.days.find((d) => d.key === day(9))?.status).toBe(
			"before-start",
		);
		expect(young.days.find((d) => d.key === day(10))?.status).toBe("missed");
	});

	it("shows a rest day when nothing was due", () => {
		const weekdays = makeHabit({
			id: 1,
			createdAt: longAgo,
			frequency: { type: "weekdays", days: [1] },
		});
		const result = buildMonthCalendar({
			habits: [weekdays],
			entries: [],
			frozenDays: [],
			today,
			month: sept,
		});
		expect(result.days.find((d) => d.key === day(2))?.status).toBe("rest");
	});

	it("is binary for one habit: done or missed, with freezes violet", () => {
		const result = buildMonthCalendar({
			habits: scopeHabits([a, b], 2),
			entries: [...log(1, [1]), ...log(2, [1, 2])],
			frozenDays: [
				{ id: 901, habitId: 2, date: day(3), createdAt: new Date(2026, 8, 3) },
			],
			today,
			month: sept,
		});
		const levels = result.days.slice(0, 4).map((d) => [d.status, d.level]);
		expect(levels).toEqual([
			["level", 3],
			["level", 3],
			["frozen", null],
			["missed", 0],
		]);
	});

	it("reads outlined days when nothing has ever been logged", () => {
		const result = buildMonthCalendar({
			habits: [a],
			entries: [],
			frozenDays: [],
			today,
			month: sept,
			nothingLogged: true,
		});
		expect(result.days.find((d) => d.key === day(5))?.status).toBe(
			"nothing-logged",
		);
	});

	it("needs entries from the month's first Monday to its last Sunday", () => {
		const span = calendarEntrySpan(new Date(2026, 8, 10));
		expect([
			format(span.start, "yyyy-MM-dd"),
			format(span.end, "yyyy-MM-dd"),
		]).toEqual(["2026-08-31", "2026-10-04"]);
	});
});

describe("buildDayDetail", () => {
	const detail = (offset: number, overrides = {}) =>
		buildDayDetail({
			habits,
			entries,
			frozenDays,
			today,
			date: addDays(monday, offset),
			...overrides,
		});

	it("lists each habit that has something to say, with its state and amounts", () => {
		const result = detail(1);
		expect(result.items.map((i) => [i.habit.id, i.status])).toEqual([
			[1, "partial"],
			[2, "done"],
			[4, "done"],
		]);
		expect(result.items[0]).toMatchObject({ value: 3, target: 8 });
		expect(result.items[2]).toMatchObject({ isBreak: true });
	});

	it("counts done ÷ due for the card's headline", () => {
		expect(detail(1)).toMatchObject({
			done: 2,
			due: 3,
			percent: 67,
			editable: true,
		});
	});

	it("shows a frozen habit, excluded from the percentage", () => {
		const result = detail(2);
		expect(result.items.find((i) => i.habit.id === 4)?.status).toBe("frozen");
		expect(result.due).toBe(
			result.items.filter((i) =>
				["partial", "missed", "done"].includes(i.status),
			).length,
		);
	});

	it("is not editable ahead of today and lists nothing", () => {
		expect(detail(5)).toMatchObject({
			editable: false,
			items: [],
			percent: null,
		});
	});

	it("carries today's open habits and flags today", () => {
		const result = detail(3);
		expect(result.isToday).toBe(true);
		expect(result.items.find((i) => i.habit.id === 1)?.status).toBe("today");
	});

	it("reads the Monday–Sunday span to fetch entries for", () => {
		const span = dayEntrySpan(new Date(2026, 8, 17));
		expect([
			format(span.start, "yyyy-MM-dd"),
			format(span.end, "yyyy-MM-dd"),
		]).toEqual(["2026-09-14", "2026-09-20"]);
	});
});
