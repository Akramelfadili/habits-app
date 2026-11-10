import { addDays, format, subMonths } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay, Habit, IsoWeekday } from "../types";
import {
	buildMonthlySummary,
	monthEntryRange,
	monthWindowFor,
} from "./monthly-summary";
import { buildRangeSummary, rangeEntrySpan } from "./range-summary";
import { buildYearlySummary, yearWindowFor } from "./yearly-summary";

/**
 * Progress's range summary must agree with the Monthly and Yearly summaries it sits beside until
 * their screens are replaced: same pass over the same logs, same numbers. A seeded log with every
 * frequency type, quantity habits, a Break habit, bonus logs and freezes.
 */
const today = new Date(2026, 9, 21, 12);
const start = new Date(2025, 5, 1);

const habits: Habit[] = [
	makeHabit({ id: 1, createdAt: start }),
	makeHabit({ id: 2, createdAt: start, direction: "break" }),
	makeHabit({
		id: 3,
		createdAt: start,
		frequency: { type: "weekdays", days: [1, 3, 5] as IsoWeekday[] },
	}),
	makeHabit({
		id: 4,
		createdAt: start,
		frequency: { type: "per-week", timesPerWeek: 3 },
	}),
	makeHabit({
		id: 5,
		createdAt: start,
		targetType: "quantity",
		targetAmount: 8,
	}),
	makeHabit({ id: 6, createdAt: new Date(2026, 2, 3) }),
];

let seed = 11;
const random = () => {
	seed = (seed * 16807) % 2147483647;
	return seed / 2147483647;
};
const entries: Entry[] = [];
const frozenDays: FrozenDay[] = [];
for (let day = start; day <= today; day = addDays(day, 1)) {
	const date = format(day, "yyyy-MM-dd");
	for (const habit of habits) {
		const roll = random();
		if (roll < 0.7) {
			entries.push({
				id: entries.length + 1,
				habitId: habit.id,
				date,
				value: habit.id === 5 ? (random() < 0.3 ? 3 : 8) : undefined,
				createdAt: day,
			});
		} else if (roll < 0.72 && habit.id !== 4) {
			frozenDays.push({
				id: frozenDays.length + 1,
				habitId: habit.id,
				date,
				createdAt: day,
			});
		}
	}
}

describe("range summary agrees with Monthly and Yearly", () => {
	// A finished month, so no open today muddies the perfect-day count.
	const month = monthWindowFor(subMonths(today, 2));
	const span = monthEntryRange(month);
	const inSpan = entries.filter(
		(e) => e.date >= format(span.start, "yyyy-MM-dd"),
	);

	it("Month: totals, perfect days and per-habit rates", () => {
		const monthly = buildMonthlySummary({
			habits,
			entries: inSpan,
			frozenDays,
			today,
			month,
		});
		const range = buildRangeSummary({
			kind: "month",
			habits,
			entries: inSpan,
			frozenDays,
			today,
			window: month,
		});
		expect(range.done).toBe(monthly.completed);
		expect(range.due).toBe(monthly.scheduled);
		expect(range.perfectDays).toBe(monthly.perfectDays);
		expect(range.countedDays).toBe(monthly.countedDays);
		for (const row of monthly.rows) {
			const mine = range.habits.find((r) => r.habit.id === row.habit.id);
			expect(mine).toMatchObject({
				done: row.completed,
				due: row.scheduled,
				rate: Math.round(row.rate * 100),
			});
		}
		expect(range.habits.length).toBeGreaterThanOrEqual(monthly.rows.length);
	});

	it("Year: totals and rate", () => {
		const year = yearWindowFor(subMonths(today, 12));
		const yearSpan = rangeEntrySpan("year", year);
		const yearEntries = entries.filter(
			(e) => e.date >= format(yearSpan.start, "yyyy-MM-dd"),
		);
		const yearly = buildYearlySummary({
			habits,
			entries: yearEntries,
			frozenDays,
			today,
			year,
		});
		const range = buildRangeSummary({
			kind: "year",
			habits,
			entries: yearEntries,
			frozenDays,
			today,
			window: year,
		});
		expect(range.done).toBe(yearly.logged);
		expect(range.due).toBe(yearly.scheduled);
		expect(range.rate).toBe(Math.round((yearly.rate ?? 0) * 100));
		expect(range.bestStreak?.days).toBe(yearly.longest.days);
	});
});
