import { addDays, format } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay, Habit } from "../types";

import {
	buildHeatmapWeeks,
	calculateCompletionRate,
	currentStreakAsOf,
} from "./habit-history";
import {
	buildMonthlySummary,
	counts,
	monthWindowFor,
	outcomesFor,
} from "./monthly-summary";
import {
	isOffScheduleEntry,
	offScheduleCandidates,
	offScheduleLogsOn,
} from "./off-schedule";
import { buildWeeklySummary } from "./weekly-summary";
import { buildYearlySummary, yearWindowFor } from "./yearly-summary";

// Monday 14 Sep 2026 … Sunday 20 Sep, mid-day local.
const monday = new Date(2026, 8, 14, 12);
const sunday = addDays(monday, 6);
const longAgo = new Date(2025, 0, 1);

function entry(habitId: number, dayIndex: number, value?: number): Entry {
	const date = addDays(monday, dayIndex);
	return {
		id: habitId * 100 + dayIndex,
		habitId,
		date: format(date, "yyyy-MM-dd"),
		value,
		createdAt: date,
	};
}

const weekdays = makeHabit({
	id: 1,
	name: "Meditate",
	frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
	createdAt: longAgo,
});
const threePerWeek = makeHabit({
	id: 2,
	name: "Run",
	frequency: { type: "per-week", timesPerWeek: 3 },
	createdAt: longAgo,
});
const noFreezes = new Set<string>();

describe("offScheduleCandidates", () => {
	it("drops Break habits and archived habits", () => {
		const keep = makeHabit({ id: 1 });
		const breakHabit = makeHabit({ id: 2, direction: "break" });
		const archived = makeHabit({ id: 3, archivedAt: new Date() });
		expect(offScheduleCandidates([keep, breakHabit, archived])).toEqual([keep]);
	});

	it("is empty when only Break or archived habits exist (the 'nothing eligible' picker)", () => {
		expect(
			offScheduleCandidates([
				makeHabit({ id: 2, direction: "break" }),
				makeHabit({ id: 3, archivedAt: new Date() }),
			]),
		).toEqual([]);
	});
});

describe("isOffScheduleEntry", () => {
	it("is a bonus on a day the habit isn't scheduled, and not on a scheduled day", () => {
		const saturday = entry(1, 5);
		const tuesday = entry(1, 1);
		expect(isOffScheduleEntry(weekdays, saturday, [saturday, tuesday])).toBe(
			true,
		);
		expect(isOffScheduleEntry(weekdays, tuesday, [saturday, tuesday])).toBe(
			false,
		);
	});

	it("never treats a per-week habit's log as a bonus — it is scheduled on any day", () => {
		const all = [entry(2, 0), entry(2, 1), entry(2, 2), entry(2, 5)];
		for (const logged of all) {
			expect(isOffScheduleEntry(threePerWeek, logged, all)).toBe(false);
		}
		const partial = makeHabit({
			id: 3,
			frequency: { type: "per-week", timesPerWeek: 3 },
			targetType: "quantity",
			targetAmount: 8,
			createdAt: longAgo,
		});
		expect(isOffScheduleEntry(partial, entry(3, 1, 2), [entry(3, 1, 2)])).toBe(
			false,
		);
	});
});

describe("offScheduleLogsOn", () => {
	it("lists today's entries for habits that weren't due, and only those", () => {
		const saturday = addDays(monday, 5);
		const habits: Habit[] = [
			weekdays,
			makeHabit({ id: 9, createdAt: longAgo }),
		];
		const logs = offScheduleLogsOn(
			habits,
			[entry(1, 5), entry(9, 5), entry(9, 4)],
			saturday,
		);
		expect(logs.map(({ habit }) => habit.id)).toEqual([1]);
	});
});

describe("off-schedule entries never count toward scheduled completion", () => {
	const weekendLog = [entry(1, 5), entry(1, 6)];
	const weekdayDone = [0, 1, 2, 3, 4].map((day) => entry(1, day));

	it("Weekly: a bonus log neither adds to done nor scheduled, so the rate stays ≤ 100%", () => {
		const base = buildWeeklySummary({
			habits: [weekdays],
			entries: weekdayDone,
			today: sunday,
		});
		const withBonus = buildWeeklySummary({
			habits: [weekdays],
			entries: [...weekdayDone, ...weekendLog],
			today: sunday,
		});
		expect(withBonus.completed).toBe(base.completed);
		expect(withBonus.scheduled).toBe(base.scheduled);
		expect(withBonus.completed).toBeLessThanOrEqual(withBonus.scheduled);
		expect(withBonus.rows[0].fraction).toBeLessThanOrEqual(1);
	});

	it("Weekly: bonus logs alone make no perfect week and no best day", () => {
		const summary = buildWeeklySummary({
			habits: [weekdays],
			entries: weekendLog,
			today: sunday,
		});
		expect(summary.completed).toBe(0);
		expect(summary.bestDay).toBeNull();
	});

	it("Monthly and Yearly: outcomes, rates and perfect days ignore bonus logs", () => {
		const month = monthWindowFor(monday);
		const input = {
			habits: [weekdays, threePerWeek],
			frozenDays: [] as FrozenDay[],
			today: sunday,
		};
		const entries = [...weekdayDone, ...[0, 1, 2].map((d) => entry(2, d))];
		const bonus = [...entries, ...weekendLog];

		const before = counts(outcomesFor({ ...input, entries, window: month }));
		const after = counts(
			outcomesFor({ ...input, entries: bonus, window: month }),
		);
		expect(after).toEqual(before);
		expect(after.completed).toBeLessThanOrEqual(after.scheduled);

		const monthly = buildMonthlySummary({ ...input, entries: bonus, month });
		expect(monthly.rate).toBeLessThanOrEqual(1);
		const yearly = buildYearlySummary({
			...input,
			entries: bonus,
			year: yearWindowFor(monday),
		});
		const year = yearWindowFor(monday);
		const yearBefore = counts(outcomesFor({ ...input, entries, window: year }));
		expect(yearly.logged).toBe(yearBefore.completed);
		expect(yearly.scheduled).toBe(yearBefore.scheduled);
		expect(yearly.rate).toBeLessThanOrEqual(1);
	});

	it("Detail: a bonus log changes neither the streak nor the 90-day rate", () => {
		const base = { habit: weekdays, frozenDates: noFreezes, today: sunday };
		const without = { ...base, entries: weekdayDone };
		const withBonus = { ...base, entries: [...weekdayDone, ...weekendLog] };
		expect(currentStreakAsOf(withBonus)).toBe(currentStreakAsOf(without));
		const rate = calculateCompletionRate(withBonus);
		expect(rate).toEqual(calculateCompletionRate(without));
		expect(rate.completed).toBeLessThanOrEqual(rate.scheduled);
	});

	it("Detail: the heatmap marks the bonus days 'bonus' and the scheduled ones 'logged'", () => {
		const weeks = buildHeatmapWeeks({
			habit: weekdays,
			entries: [...weekdayDone, ...weekendLog],
			frozenDates: noFreezes,
			today: sunday,
		});
		const statuses = weeks[weeks.length - 1].map((day) => day.status);
		expect(statuses).toEqual([
			"logged",
			"logged",
			"logged",
			"logged",
			"logged",
			"bonus",
			"bonus",
		]);
	});
});
