import { addDays, format } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import {
	PROGRESS_TODAY,
	progressEntries,
	progressFrozen,
	progressHabits,
} from "../test-support/progress-views";
import type { Entry, FrozenDay, Habit } from "../types";
import { scopeHabits } from "./day-grid";
import {
	buildRangeSummary,
	classifyRangeDays,
	rangeWindowFor,
} from "./range-summary";
import { buildYearMap } from "./year-map";

const today = new Date(2026, 9, 21, 12);
const year = rangeWindowFor("year", today);
const created = new Date(2026, 2, 3);
const a = makeHabit({ id: 1, createdAt: created });
const b = makeHabit({ id: 2, createdAt: created, direction: "break" });
const habits: Habit[] = [a, b];

let id = 1;
const key = (date: Date) => format(date, "yyyy-MM-dd");
function logs(habitId: number, from: Date, to: Date, skip: number[] = []) {
	const result: Entry[] = [];
	for (let day = from; day <= to; day = addDays(day, 1)) {
		if (skip.includes(day.getDate()) && day.getMonth() === to.getMonth()) {
			continue;
		}
		result.push({ id: id++, habitId, date: key(day), createdAt: day });
	}
	return result;
}

const entries: Entry[] = [
	...logs(1, created, today),
	...logs(2, created, new Date(2026, 8, 30)),
	...logs(2, new Date(2026, 9, 1), new Date(2026, 9, 4)),
	...logs(2, new Date(2026, 9, 7), today),
];
const frozenDays: FrozenDay[] = [
	{ id: 1, habitId: 2, date: "2026-10-05", createdAt: new Date(2026, 9, 5) },
];

const map = () => buildYearMap({ habits, entries, frozenDays, today, year });

describe("buildYearMap", () => {
	it("has a cell for every day of the year and twelve months in three bands", () => {
		const result = map();
		expect(result.days).toHaveLength(365);
		expect(result.months).toHaveLength(12);
		expect(result.bands.map((band) => band.length)).toEqual([4, 4, 4]);
		expect(result.bands[0][0].key).toBe("2026-01");
		expect(result.months.reduce((sum, m) => sum + m.days.length, 0)).toBe(365);
	});

	it("gives each day a level 0–3 and a status, frozen and missed included", () => {
		const day = (date: string) => map().days.find((d) => d.key === date);
		expect(day("2026-09-15")).toMatchObject({
			level: 3,
			status: "level",
			perfect: true,
		});
		expect(day("2026-10-05")).toMatchObject({ status: "frozen" });
		expect(day("2026-10-06")).toMatchObject({
			level: 2,
			notch: true,
			perfect: false,
		});
		expect(day("2026-01-10")?.status).toBe("before-start");
		expect(day("2026-11-10")?.status).toBe("future");
		expect(day("2026-10-21")).toMatchObject({ isToday: true });
	});

	it("tiles the months: before start, counted with a whole-number %, the running month, future", () => {
		const { months } = map();
		expect(months.map((m) => m.kind)).toEqual([
			"before-start",
			"before-start",
			"counted",
			"counted",
			"counted",
			"counted",
			"counted",
			"counted",
			"counted",
			"counted",
			"future",
			"future",
		]);
		expect(months[8]).toMatchObject({
			key: "2026-09",
			percent: 100,
			current: false,
		});
		expect(months[9]).toMatchObject({ key: "2026-10", current: true });
		expect(months[9].percent).toBe(
			Math.round((months[9].completed / months[9].scheduled) * 100),
		);
	});

	it("picks the best finished month, with March to September all full", () => {
		const best = map().bestMonth;
		expect(best?.percent).toBe(100);
		expect(best?.key).toBe("2026-03");
	});

	it("lists the started months with a bar and a whole-number % for the AX / VoiceOver fallback", () => {
		const list = map().monthList;
		expect(list.map((m) => m.key)).toEqual([
			"2026-03",
			"2026-04",
			"2026-05",
			"2026-06",
			"2026-07",
			"2026-08",
			"2026-09",
			"2026-10",
		]);
		const sept = list.find((m) => m.key === "2026-09");
		expect(sept).toMatchObject({ percent: 100, bar: 1 });
	});

	it("is binary for one habit: 1 of 1 or 0", () => {
		const result = buildYearMap({
			habits: scopeHabits(habits, 2),
			entries,
			frozenDays,
			today,
			year,
		});
		const levels = new Set(
			result.days.filter((d) => d.level !== null).map((d) => d.level),
		);
		expect([...levels].sort()).toEqual([0, 3]);
		expect(result.days.find((d) => d.key === "2026-10-05")?.status).toBe(
			"frozen",
		);
		expect(result.days.find((d) => d.key === "2026-10-06")).toMatchObject({
			status: "missed",
			level: 0,
		});
	});

	it("with no habits nothing is due: rest days and the future, no best month", () => {
		const result = buildYearMap({
			habits: [],
			entries: [],
			frozenDays: [],
			today,
			year,
		});
		expect(
			result.days.every((d) => d.status === "rest" || d.status === "future"),
		).toBe(true);
		expect(result.bestMonth).toBeNull();
	});
});

describe("buildYearMap — leap years", () => {
	function yearOf(y: number) {
		const habit = makeHabit({ id: 1, createdAt: new Date(y - 1, 11, 1) });
		return buildYearMap({
			habits: [habit],
			entries: logs(1, new Date(y, 0, 1), new Date(y, 11, 31)),
			frozenDays: [],
			today: new Date(y + 1, 0, 10),
			year: rangeWindowFor("year", new Date(y, 5, 15)),
		});
	}

	it.each([2024, 2028])("draws 366 cells for %i, with 29 February", (y) => {
		const result = yearOf(y);
		expect(result.days).toHaveLength(366);
		expect(new Set(result.days.map((d) => d.key)).size).toBe(366);
		expect(result.days[59].key).toBe(`${y}-02-29`);
		expect(result.days[60].key).toBe(`${y}-03-01`);
		expect(result.days[59]).toMatchObject({ done: 1, due: 1 });
		expect(result.months[1].days).toHaveLength(29);
		expect(result.months.reduce((sum, m) => sum + m.days.length, 0)).toBe(366);
	});

	it.each([2026, 2027])("draws 365 cells for %i, with no 29 February", (y) => {
		const result = yearOf(y);
		expect(result.days).toHaveLength(365);
		expect(result.days.some((d) => d.key.endsWith("-02-29"))).toBe(false);
		expect(result.days[59].key).toBe(`${y}-03-01`);
		expect(result.months[1].days).toHaveLength(28);
		expect(result.months.reduce((sum, m) => sum + m.days.length, 0)).toBe(365);
	});
});

describe("one classification shared by the year map and the range summary", () => {
	const habits = progressHabits;
	const entries = progressEntries();
	const today = PROGRESS_TODAY;
	const window = rangeWindowFor("year", today);
	const common = { habits, entries, frozenDays: progressFrozen, today };
	const classified = classifyRangeDays({ kind: "year", ...common, window });

	it("gives the year map exactly what it builds on its own", () => {
		expect(buildYearMap({ ...common, year: window, classified })).toEqual(
			buildYearMap({ ...common, year: window }),
		);
	});

	it("gives the range summary exactly what it builds on its own", () => {
		expect(
			buildRangeSummary({ kind: "year", ...common, window, classified }),
		).toEqual(buildRangeSummary({ kind: "year", ...common, window }));
	});

	it("covers the previous year and this one, in one run of days", () => {
		expect(classified.dates[0]).toEqual(new Date(2025, 0, 1));
		expect(classified.dates.at(-1)).toEqual(new Date(2026, 11, 31));
		for (const { cells } of classified.perHabit) {
			expect(cells).toHaveLength(classified.dates.length);
		}
	});
});
