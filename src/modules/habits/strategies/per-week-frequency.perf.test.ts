// Ceilings are generous so a slow CI box never flakes, but low enough that a return to per-day
// scans fails.
import { addDays, format, subDays, subYears } from "date-fns";
import {
	buildHeatmapWeeks,
	calculateCompletionRate,
	calculateLongestStreak,
	currentStreakAsOf,
} from "../domain/habit-history";
import { getStreakAtRisk } from "../domain/streaks";
import { buildYearlySummary, yearWindowFor } from "../domain/yearly-summary";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, Habit, IsoWeekday } from "../types";

const today = new Date(2026, 9, 24);
const start = subYears(today, 5);
const yesterday = format(subDays(today, 1), "yyyy-MM-dd");

const habits: Habit[] = Array.from({ length: 20 }, (_, i) =>
	makeHabit({
		id: i + 1,
		name: `H${i + 1}`,
		createdAt: start,
		frequency:
			i < 12
				? { type: "daily" }
				: i < 16
					? { type: "weekdays", days: [1, 3, 5] as IsoWeekday[] }
					: { type: "per-week", timesPerWeek: 3 },
	}),
);

let seed = 7;
const random = () => {
	seed = (seed * 16807) % 2147483647;
	return seed / 2147483647;
};
const entries: Entry[] = [];
for (let day = start; day <= today; day = addDays(day, 1)) {
	const date = format(day, "yyyy-MM-dd");
	if (date === yesterday) continue;
	for (const habit of habits) {
		if (random() < 0.8)
			entries.push({
				id: entries.length + 1,
				habitId: habit.id,
				date,
				createdAt: day,
			});
	}
}
const byHabit = new Map(
	habits.map((habit) => [
		habit.id,
		entries.filter((e) => e.habitId === habit.id),
	]),
);
const perWeek = habits[19];
const history = (habit: Habit) => ({
	habit,
	entries: byHabit.get(habit.id) ?? [],
	frozenDates: new Set<string>(),
	today,
});

function timed(work: () => unknown): number {
	const started = performance.now();
	work();
	return performance.now() - started;
}

describe("history on 5 years × 20 habits", () => {
	it("builds a large log", () => {
		expect(entries.length).toBeGreaterThan(25_000);
	});

	it("Detail: longest streak of a per-week habit", () => {
		expect(timed(() => calculateLongestStreak(history(perWeek)))).toBeLessThan(
			1500,
		);
	});

	it("Detail: current streak of every habit (unbroken per-week runs)", () => {
		expect(
			timed(() => habits.map((habit) => currentStreakAsOf(history(habit)))),
		).toBeLessThan(4000);
	});

	it("Detail: 90-day rate and heatmap of a per-week habit", () => {
		expect(timed(() => calculateCompletionRate(history(perWeek)))).toBeLessThan(
			750,
		);
		expect(timed(() => buildHeatmapWeeks(history(perWeek)))).toBeLessThan(500);
	});

	it("Today: streak-at-risk for every habit", () => {
		expect(
			timed(() =>
				habits.map((habit) =>
					getStreakAtRisk(habit, byHabit.get(habit.id) ?? [], new Set(), today),
				),
			),
		).toBeLessThan(1500);
	});

	it("Year: the yearly summary", () => {
		const year = yearWindowFor(today);
		const yearEntries = entries.filter((e) => e.date >= "2025-12-29");
		expect(
			timed(() =>
				buildYearlySummary({
					habits,
					entries: yearEntries,
					frozenDays: [],
					today,
					year,
				}),
			),
		).toBeLessThan(1500);
	});
});
