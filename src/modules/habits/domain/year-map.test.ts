import { addDays, format } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay, Habit } from "../types";
import { scopeHabits } from "./day-grid";
import { rangeWindowFor } from "./range-summary";
import { buildYearMap } from "./year-map";

// Wednesday 21 Oct 2026.
const today = new Date(2026, 9, 21, 12);
const year = rangeWindowFor("year", today);
const created = new Date(2026, 2, 3); // 3 Mar — Jan and Feb are before the first habit
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

// September: both habits every day. October (to the 21st): habit 2 misses the 5th–6th.
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
		// 6 Oct: habit 2 missed, habit 1 done → 1 of 2 → L2 (50 %).
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
			"counted", // March: the habits start on the 3rd
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
		// October so far: 20 days × 2 habits due, minus the frozen 5th, minus the missed 6th.
		expect(months[9].percent).toBe(
			Math.round((months[9].completed / months[9].scheduled) * 100),
		);
	});

	it("picks the best finished month, with March to September all full", () => {
		const best = map().bestMonth;
		expect(best?.percent).toBe(100);
		// The earliest of equally good months wins; October is still running and never judged.
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
