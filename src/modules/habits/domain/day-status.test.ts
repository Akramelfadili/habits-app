import { addDays, format } from "date-fns";
import { toDayKey } from "@/utils/day-key";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, Habit } from "../types";
import { type CellStatus, fastDayKey, habitDayClassifier } from "./day-status";

const today = new Date(2026, 8, 16, 12);
const monday = new Date(2026, 8, 14);
const longAgo = new Date(2025, 0, 1);
const day = (offset: number) => addDays(monday, offset);

function entry(offset: number, value?: number): Entry {
	return {
		id: offset + 1,
		habitId: 1,
		date: format(day(offset), "yyyy-MM-dd"),
		value,
		createdAt: day(offset),
	};
}

function statuses(
	habit: Habit,
	entries: Entry[],
	options: { frozen?: number[]; nothingLogged?: boolean } = {},
): CellStatus[] {
	const classify = habitDayClassifier({
		habit,
		entries,
		frozenDates: new Set(
			(options.frozen ?? []).map((offset) => format(day(offset), "yyyy-MM-dd")),
		),
		today,
		nothingLogged: options.nothingLogged,
	});
	return [0, 1, 2, 3, 4, 5, 6].map((offset) => classify(day(offset)).status);
}

const daily = makeHabit({ id: 1, createdAt: longAgo });

describe("habitDayClassifier", () => {
	it("reads a daily week: done, missed, today open, then future", () => {
		expect(statuses(daily, [entry(0)])).toEqual([
			"done",
			"missed",
			"today",
			"future",
			"future",
			"future",
			"future",
		]);
	});

	it("marks only today as today, whatever its status", () => {
		const classify = habitDayClassifier({
			habit: daily,
			entries: [entry(2)],
			frozenDates: new Set(),
			today,
		});
		expect(classify(day(2))).toMatchObject({ status: "done", isToday: true });
		expect(classify(day(1)).isToday).toBe(false);
	});

	it("is before-start until the habit's own creation day", () => {
		const young = makeHabit({ id: 1, createdAt: day(1) });
		expect(statuses(young, []).slice(0, 3)).toEqual([
			"before-start",
			"missed",
			"today",
		]);
	});

	it("reads a quantity habit below target as partial, level 1 under half and 2 from half", () => {
		const water = makeHabit({
			id: 1,
			createdAt: longAgo,
			targetType: "quantity",
			targetAmount: 8,
		});
		const classify = habitDayClassifier({
			habit: water,
			entries: [entry(0, 3), entry(1, 4), entry(2, 8)],
			frozenDates: new Set(),
			today,
		});
		expect(classify(day(0))).toMatchObject({ status: "partial", level: 1 });
		expect(classify(day(1))).toMatchObject({ status: "partial", level: 2 });
		expect(classify(day(2))).toMatchObject({
			status: "done",
			level: 3,
			value: 8,
		});
	});

	it("counts a Break habit's logged day as done (resisted)", () => {
		const noSocial = makeHabit({
			id: 1,
			createdAt: longAgo,
			direction: "break",
		});
		expect(statuses(noSocial, [entry(0), entry(1)]).slice(0, 2)).toEqual([
			"done",
			"done",
		]);
	});

	it("shows a freeze as frozen, and a freeze never turns a log into a bonus", () => {
		const weekdays = makeHabit({
			id: 1,
			createdAt: longAgo,
			frequency: { type: "weekdays", days: [1, 3, 5] },
		});
		expect(statuses(daily, [], { frozen: [1] })[1]).toBe("frozen");
		// Tuesday isn't scheduled; logged and frozen, it is done, not bonus.
		expect(statuses(weekdays, [entry(1)], { frozen: [1] })[1]).toBe("done");
	});

	it("reads a log on a day that wasn't owed as bonus", () => {
		const weekdays = makeHabit({
			id: 1,
			createdAt: longAgo,
			frequency: { type: "weekdays", days: [1, 3, 5] },
		});
		expect(statuses(weekdays, [entry(1)])).toEqual([
			"missed",
			"bonus",
			"today",
			"future",
			"future",
			"future",
			"future",
		]);
	});

	it("reads days that aren't owed as not-due, never missed", () => {
		const weekdays = makeHabit({
			id: 1,
			createdAt: longAgo,
			frequency: { type: "weekdays", days: [1, 5] },
		});
		expect(statuses(weekdays, []).slice(0, 3)).toEqual([
			"missed",
			"not-due",
			"not-due",
		]);
	});

	it("keeps a × per week habit's open days not-due until they can no longer cover the target", () => {
		const twice = makeHabit({
			id: 1,
			createdAt: longAgo,
			frequency: { type: "per-week", timesPerWeek: 2 },
		});
		// Mon done; Tuesday could still be covered by Wed–Sun → not-due, not missed.
		expect(statuses(twice, [entry(0)])).toEqual([
			"done",
			"not-due",
			"today",
			"future",
			"future",
			"future",
			"future",
		]);
		// Met on Monday and Tuesday: Wednesday is closed for the week.
		expect(statuses(twice, [entry(0), entry(1)])[2]).toBe("not-due");
	});

	it("never reads an archived (paused) day as missed", () => {
		const paused = makeHabit({
			id: 1,
			createdAt: longAgo,
			pauses: [{ from: "2026-09-14", to: "2026-09-15" }],
		});
		expect(statuses(paused, []).slice(0, 2)).toEqual(["not-due", "not-due"]);
	});

	it("reads due past days as nothing-logged when nothing has ever been logged", () => {
		expect(statuses(daily, [], { nothingLogged: true }).slice(0, 3)).toEqual([
			"nothing-logged",
			"nothing-logged",
			"today",
		]);
	});
});

describe("fastDayKey", () => {
	it("is toDayKey, faster: the local calendar day as yyyy-MM-dd", () => {
		for (const date of [
			new Date(2026, 0, 5),
			new Date(2026, 9, 24, 23, 59, 59),
			new Date(2024, 1, 29, 12),
			new Date(2026, 11, 31),
			new Date(2026, 2, 29, 1),
		]) {
			expect(fastDayKey(date)).toBe(toDayKey(date));
		}
	});
});
