import { makeHabit } from "../test-support/habit-builder";
import {
	IMPROVED_MIN_POINTS,
	insightsFor,
	MAX_INSIGHTS,
	PATTERN_CAUSE_SHARE,
	PATTERN_MIN_GAP,
	PATTERN_MIN_SLOTS,
	SLIPPING_MIN_DROP,
} from "./monthly-insights";
import type {
	DayOutcome,
	MonthlyHabitRow,
	MonthlyWeekBar,
	Outcome,
} from "./monthly-summary";

const habit = (id: number) => makeHabit({ id, name: `Habit ${id}` });

function week(completed: number, scheduled: number): MonthlyWeekBar {
	return {
		start: new Date(2026, 7, 3),
		end: new Date(2026, 7, 9),
		completed,
		scheduled,
		fraction: scheduled ? completed / scheduled : null,
	};
}

function row(
	id: number,
	weeks: MonthlyWeekBar[],
	deltaPoints: number | null = null,
): MonthlyHabitRow {
	return {
		habit: habit(id),
		completed: 20,
		scheduled: 28,
		rate: 20 / 28,
		weeks,
		deltaPoints,
	};
}

function outcome(
	habitId: number,
	weekday: DayOutcome["weekday"],
	kind: Outcome,
): DayOutcome {
	return { habitId, date: "2026-08-01", weekday, outcome: kind };
}

const input = (
	over: Partial<Parameters<typeof insightsFor>[0]> = {},
): Parameters<typeof insightsFor>[0] => ({
	rows: [],
	outcomes: [],
	habits: [habit(1), habit(2)],
	completed: 20,
	scheduled: 28,
	...over,
});

const types = (list: ReturnType<typeof insightsFor>) =>
	list.map((insight) => insight.type);

describe("gate order", () => {
	it("says nothing with nothing scheduled", () => {
		expect(insightsFor(input({ scheduled: 0, completed: 0 }))).toEqual([]);
	});

	it("declares perfect before looking for anything to fix", () => {
		const slipping = row(1, [week(7, 7), week(5, 7), week(3, 7)]);
		expect(
			types(insightsFor(input({ rows: [slipping], completed: 28 }))),
		).toEqual(["perfect"]);
	});

	it("falls back to steady rather than an empty slot", () => {
		expect(types(insightsFor(input({ rows: [row(1, [week(5, 7)])] })))).toEqual(
			["steady"],
		);
	});
});

describe("slipping", () => {
	const drop = (pointsDown: number) => {
		const last = Math.round((1 - pointsDown) * 20);
		return row(1, [week(20, 20), week(15, 20), week(last, 20)]);
	};

	it("needs a drop of at least the threshold, never up along the way", () => {
		const at = insightsFor(input({ rows: [drop(SLIPPING_MIN_DROP)] }));
		expect(types(at)).toEqual(["slipping"]);
		const below = insightsFor(input({ rows: [drop(SLIPPING_MIN_DROP - 0.1)] }));
		expect(types(below)).toEqual(["steady"]);
	});

	it("is not slipping if any week climbs back", () => {
		const bumpy = row(1, [week(20, 20), week(10, 20), week(15, 20)]);
		expect(types(insightsFor(input({ rows: [bumpy] })))).toEqual(["steady"]);
	});

	it("needs three weeks with enough days each", () => {
		const twoWeeks = row(1, [week(7, 7), week(1, 7)]);
		const thinWeek = row(1, [week(7, 7), week(1, 2), week(0, 7)]);
		expect(types(insightsFor(input({ rows: [twoWeeks] })))).toEqual(["steady"]);
		expect(types(insightsFor(input({ rows: [thinWeek] })))).toEqual(["steady"]);
	});

	it("picks the biggest drop", () => {
		const small = row(1, [week(20, 20), week(18, 20), week(14, 20)]);
		const big = row(2, [week(20, 20), week(10, 20), week(2, 20)]);
		const [first] = insightsFor(input({ rows: [small, big] }));
		expect(first).toMatchObject({
			type: "slipping",
			row: { habit: { id: 2 } },
		});
	});
});

describe("improved", () => {
	it("needs the threshold climb on last month", () => {
		const flat = [week(5, 7)];
		expect(
			types(insightsFor(input({ rows: [row(1, flat, IMPROVED_MIN_POINTS)] }))),
		).toEqual(["improved"]);
		expect(
			types(
				insightsFor(input({ rows: [row(1, flat, IMPROVED_MIN_POINTS - 1)] })),
			),
		).toEqual(["steady"]);
	});

	it("never fires without a previous month to compare", () => {
		expect(
			types(insightsFor(input({ rows: [row(1, [week(5, 7)], null)] }))),
		).toEqual(["steady"]);
	});

	it("doesn't re-use the habit that's already slipping", () => {
		const both = row(1, [week(20, 20), week(10, 20), week(2, 20)], 30);
		expect(types(insightsFor(input({ rows: [both] })))).toEqual(["slipping"]);
	});
});

describe("pattern", () => {
	/** `weekdayDone`/`weekendDone` of 10 slots each, misses from habit 2 on Saturdays. */
	function slots(weekdayDone: number, weekendDone: number) {
		const list: DayOutcome[] = [];
		for (let i = 0; i < 10; i++) {
			list.push(outcome(1, 3, i < weekdayDone ? "done" : "missed"));
			list.push(outcome(2, 6, i < weekendDone ? "done" : "missed"));
		}
		return list;
	}

	it("needs weekends to trail weekdays by the threshold", () => {
		const gap = Math.round(PATTERN_MIN_GAP * 10);
		expect(
			types(insightsFor(input({ outcomes: slots(10, 10 - gap) }))),
		).toEqual(["pattern"]);
		expect(
			types(insightsFor(input({ outcomes: slots(10, 10 - gap + 1) }))),
		).toEqual(["steady"]);
	});

	it("needs enough slots on both sides", () => {
		expect(PATTERN_MIN_SLOTS).toBeGreaterThan(1);
		const few = [outcome(1, 3, "done"), outcome(2, 6, "missed")];
		expect(types(insightsFor(input({ outcomes: few })))).toEqual(["steady"]);
	});

	it("names one habit's weekday as the cause when it holds enough of the misses", () => {
		const [pattern] = insightsFor(input({ outcomes: slots(10, 4) }));
		expect(pattern).toMatchObject({
			type: "pattern",
			cause: { habit: { id: 2 }, weekday: 6, misses: 6, weekendMisses: 6 },
		});
		expect(6 / 6).toBeGreaterThanOrEqual(PATTERN_CAUSE_SHARE);
	});

	it("ignores frozen days", () => {
		const frozenWeekend = slots(10, 10).map((o) =>
			o.weekday === 6 ? { ...o, outcome: "frozen" as const } : o,
		);
		expect(types(insightsFor(input({ outcomes: frozenWeekend })))).toEqual([
			"steady",
		]);
	});
});

it("never returns more than the cap", () => {
	expect(MAX_INSIGHTS).toBe(3);
});
