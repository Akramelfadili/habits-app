import { toDayKey } from "@/utils/day-key";
import { buildMonthCalendar, buildWeekMatrix } from "../domain/progress-grid";
import { progressInsights } from "../domain/progress-insights";
import { progressUnlock } from "../domain/progress-unlock";
import { buildRangeSummary, rangeWindowFor } from "../domain/range-summary";
import { buildYearMap } from "../domain/year-map";
import type { Habit } from "../types";
import {
	PROGRESS_V3_SCENARIOS,
	progressV3Entries,
	progressV3FrozenDays,
	progressV3Habits,
} from "./progress-v3-fixtures";

const FRIDAY = new Date(2026, 9, 23, 9);

function withLifecycle(
	scenario: (typeof PROGRESS_V3_SCENARIOS)[number],
): Habit[] {
	return progressV3Habits(scenario).map((habit, index) => ({
		sortOrder: index,
		archivedAt: null,
		pauses: [],
		...habit,
	}));
}

function logged(scenario: (typeof PROGRESS_V3_SCENARIOS)[number]) {
	const dates = new Set(progressV3Entries(scenario).map((entry) => entry.date));
	return { count: dates.size, first: [...dates].sort()[0] ?? null };
}

describe("the Progress frames' fixtures", () => {
	it("has no two entries sharing an id, and none after today", () => {
		for (const scenario of PROGRESS_V3_SCENARIOS) {
			const entries = progressV3Entries(scenario);
			expect(new Set(entries.map((entry) => entry.id)).size).toBe(
				entries.length,
			);
			expect(entries.every((entry) => entry.date <= "2026-10-23")).toBe(true);
		}
	});

	it("gates the ranges as the frames do: 7+ days, 3 days, none", () => {
		const gate = (scenario: (typeof PROGRESS_V3_SCENARIOS)[number]) => {
			const { count, first } = logged(scenario);
			return progressUnlock({ count, firstDate: first });
		};
		expect(gate("progress-v3").isUnlocked).toBe(true);
		expect(gate("progress-v3-too-early")).toEqual(
			expect.objectContaining({ loggedDays: 3, remainingDays: 4 }),
		);
		expect(gate("progress-v3-nothing-logged").loggedDays).toBe(0);
		expect(gate("progress-v3-one-habit").isUnlocked).toBe(true);
	});

	it("never logs on a frozen day (a freeze replaces the log), and keeps three freezes for Meditate", () => {
		const frozen = progressV3FrozenDays("progress-v3");
		expect(frozen.map((day) => day.date)).toEqual([
			"2026-06-12",
			"2026-10-07",
			"2026-10-20",
		]);
		const entries = progressV3Entries("progress-v3");
		for (const day of frozen) {
			expect(
				entries.some(
					(entry) => entry.habitId === day.habitId && entry.date === day.date,
				),
			).toBe(false);
		}
		expect(progressV3FrozenDays("progress-v3-too-early")).toEqual([]);
	});

	it("archives Morning run on 12 Oct, so it keeps its history but has no row this week (HP1)", () => {
		const habits = progressV3Habits("progress-v3");
		expect(habits.map((habit) => habit.name)).toEqual([
			"Drink water",
			"Read 20 min",
			"Upper body",
			"Meditate",
			"Cold shower",
			"No social media",
			"Morning run",
		]);
		expect(habits.at(-1)?.archivedAt).toEqual(new Date(2026, 9, 12, 9));
		const matrix = buildWeekMatrix({
			habits: withLifecycle("progress-v3"),
			entries: progressV3Entries("progress-v3"),
			frozenDays: [],
			today: FRIDAY,
			week: rangeWindowFor("week", FRIDAY),
		});
		expect(matrix.rows.map((row) => row.habit.name)).not.toContain(
			"Morning run",
		);
	});

	it("P1: partial water, a bonus Upper body Monday, a frozen Meditate Tuesday, Read slipping", () => {
		const habits = withLifecycle("progress-v3").filter(
			(habit) => habit.archivedAt === null,
		);
		const entries = progressV3Entries("progress-v3");
		const frozenDays = progressV3FrozenDays("progress-v3");
		const week = rangeWindowFor("week", FRIDAY);
		const matrix = buildWeekMatrix({
			habits,
			entries,
			frozenDays,
			today: FRIDAY,
			week,
		});
		const row = (name: string) =>
			matrix.rows
				.find((candidate) => candidate.habit.name === name)
				?.cells.map((cell) => cell.status);
		expect(row("Drink water")?.slice(0, 5)).toEqual([
			"done",
			"partial",
			"done",
			"done",
			"partial",
		]);
		expect(row("Upper body")?.[0]).toBe("bonus");
		expect(row("Meditate")?.[1]).toBe("frozen");
		const summary = buildRangeSummary({
			kind: "week",
			habits,
			entries,
			frozenDays,
			today: FRIDAY,
			window: week,
		});
		expect(
			progressInsights({ summary, unlocked: true, today: FRIDAY }).map(
				(insight) => insight.kind,
			),
		).toContain("slipping");
		expect(summary.perfectDays).toBeGreaterThanOrEqual(0);
	});

	it("P12: September is the best month, at 100 %", () => {
		const habits = withLifecycle("progress-v3");
		const map = buildYearMap({
			habits,
			entries: progressV3Entries("progress-v3"),
			frozenDays: progressV3FrozenDays("progress-v3"),
			today: FRIDAY,
			year: rangeWindowFor("year", FRIDAY),
		});
		expect(map.bestMonth?.percent).toBe(100);
		expect(map.bestMonth?.month.getMonth()).toBe(8);
	});

	it("P13: on Tuesday 14 July four of five due habits are done and Read is missed", () => {
		const habits = withLifecycle("progress-v3").filter(
			(habit) => habit.archivedAt === null,
		);
		const calendar = buildMonthCalendar({
			habits,
			entries: progressV3Entries("progress-v3"),
			frozenDays: progressV3FrozenDays("progress-v3"),
			today: FRIDAY,
			month: rangeWindowFor("month", new Date(2026, 6, 1)),
		});
		const day = calendar.days.find(
			(candidate) => toDayKey(candidate.date) === "2026-07-14",
		);
		expect(day).toEqual(expect.objectContaining({ done: 4, due: 5 }));
	});

	it("P10: the one-habit month misses 14 and 15 Oct", () => {
		const habits = withLifecycle("progress-v3-one-habit");
		const calendar = buildMonthCalendar({
			habits,
			entries: progressV3Entries("progress-v3-one-habit"),
			frozenDays: progressV3FrozenDays("progress-v3-one-habit"),
			today: FRIDAY,
			month: rangeWindowFor("month", FRIDAY),
		});
		const status = (n: number) =>
			calendar.days.find((day) => day.date.getDate() === n)?.status;
		expect(status(14)).toBe("missed");
		expect(status(15)).toBe("missed");
		expect(status(7)).toBe("frozen");
		expect(status(16)).toBe("level");
	});
});
