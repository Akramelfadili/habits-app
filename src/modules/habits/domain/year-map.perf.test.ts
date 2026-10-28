/**
 * Performance smoke for Progress's year maths on a large log (V3-3a): 20
 * habits (12 daily, 4 on specific days, 4 at 3× per week) over 5 years, ~29k
 * entries. The Year view reads one year's entries (plus the year before for
 * "+N pts"), so that is what the realistic cases pass; the stress cases hand
 * the whole five years to the same functions. Ceilings are generous — a slow
 * CI box must not flake — but low enough that a return to per-day scans of
 * entries fails. Set PERF_REPORT=1 to print the measured times.
 */
import { addDays, format, subYears } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay, Habit, IsoWeekday } from "../types";
import { aggregateDays, classifyHabits, daysIn } from "./day-grid";
import { buildMonthCalendar } from "./progress-grid";
import {
	buildRangeSummary,
	rangeEntrySpan,
	rangeWindowFor,
} from "./range-summary";
import { buildYearMap } from "./year-map";
import {
	buildYearlySummary,
	yearEntryRange,
	yearWindowFor,
} from "./yearly-summary";

const today = new Date(2026, 9, 24);
const start = subYears(today, 5);

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
const frozenDays: FrozenDay[] = [];
for (let day = start; day <= today; day = addDays(day, 1)) {
	const date = format(day, "yyyy-MM-dd");
	for (const habit of habits) {
		const roll = random();
		if (roll < 0.8) {
			entries.push({
				id: entries.length + 1,
				habitId: habit.id,
				date,
				createdAt: day,
			});
		} else if (roll < 0.81 && habit.frequency.type !== "per-week") {
			frozenDays.push({
				id: frozenDays.length + 1,
				habitId: habit.id,
				date,
				createdAt: day,
			});
		}
	}
}

const year = rangeWindowFor("year", today);
const span = rangeEntrySpan("year", year);
const yearEntries = entries.filter(
	(e) => e.date >= format(span.start, "yyyy-MM-dd"),
);
const yearFrozen = frozenDays.filter(
	(f) => f.date >= format(span.start, "yyyy-MM-dd"),
);
// What the old Yearly hook reads: the year's own Monday-aligned span.
const ownStart = format(
	yearEntryRange(yearWindowFor(today)).start,
	"yyyy-MM-dd",
);
const ownYearEntries = entries.filter((e) => e.date >= ownStart);
const ownYearFrozen = frozenDays.filter((f) => f.date >= ownStart);

const timings: string[] = [];
function timed(label: string, work: () => unknown): number {
	const started = performance.now();
	work();
	const elapsed = performance.now() - started;
	timings.push(`${label}: ${Math.round(elapsed)} ms`);
	return elapsed;
}

afterAll(() => {
	if (process.env.PERF_REPORT) {
		process.stdout.write(
			`\nentries=${entries.length} (year span ${yearEntries.length})\n${timings.join("\n")}\n`,
		);
	}
});

describe("Progress year maths on 5 years × 20 habits", () => {
	it("builds a large log", () => {
		expect(entries.length).toBeGreaterThan(25_000);
	});

	it("the year map for one year of entries", () => {
		expect(
			timed("buildYearMap (year entries)", () =>
				buildYearMap({
					habits,
					entries: yearEntries,
					frozenDays: yearFrozen,
					today,
					year,
				}),
			),
		).toBeLessThan(700);
	});

	it("the year map handed all five years of entries", () => {
		expect(
			timed("buildYearMap (all 5 years of entries)", () =>
				buildYearMap({ habits, entries, frozenDays, today, year }),
			),
		).toBeLessThan(1200);
	});

	it("the year range summary with its previous year", () => {
		expect(
			timed("buildRangeSummary year", () =>
				buildRangeSummary({
					kind: "year",
					habits,
					entries: yearEntries,
					frozenDays: yearFrozen,
					today,
					window: year,
				}),
			),
		).toBeLessThan(1200);
	});

	it("the old yearly summary on the same classifier", () => {
		expect(
			timed("buildYearlySummary", () =>
				buildYearlySummary({
					habits,
					entries: ownYearEntries,
					frozenDays: ownYearFrozen,
					today,
					year: yearWindowFor(today),
				}),
			),
		).toBeLessThan(1000);
	});

	it("one habit's year map", () => {
		expect(
			timed("buildYearMap (one habit)", () =>
				buildYearMap({
					habits: [habits[19]],
					entries: yearEntries,
					frozenDays: yearFrozen,
					today,
					year,
				}),
			),
		).toBeLessThan(300);
	});

	it("a month calendar", () => {
		expect(
			timed("buildMonthCalendar", () =>
				buildMonthCalendar({
					habits,
					entries: yearEntries,
					frozenDays: yearFrozen,
					today,
					month: rangeWindowFor("month", today),
				}),
			),
		).toBeLessThan(400);
	});

	it("the grid itself: five years of cells for every habit, aggregated per day", () => {
		const dates = daysIn(start, today);
		expect(
			timed("classify + aggregate 5 years", () => {
				const perHabit = classifyHabits({
					habits,
					entries,
					frozenDays,
					today,
					dates,
				});
				return aggregateDays(perHabit, dates, today);
			}),
		).toBeLessThan(2500);
	});
});
