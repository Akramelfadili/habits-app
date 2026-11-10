import { addDays } from "date-fns";
import fc from "fast-check";
import { TEST_ZONES, withTimeZone } from "@/test-support/time-zone";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import {
	buildHistory,
	completionOn,
	dayAgo,
	frequencyArb,
	historyArb,
	PROPERTY_RUNS,
} from "../test-support/habit-arbitraries";
import { makeEntry, makeHabit } from "../test-support/habit-builder";
import type { Entry } from "../types";
import {
	calculateCompletionRate,
	calculateLongestStreak,
	currentStreakAsOf,
} from "./habit-history";
import { rangeWindowFor } from "./range-summary";
import { calculateCurrentStreak, isEntryComplete } from "./streaks";
import { buildYearMap } from "./year-map";

/**
 * Property tests (docs/how-to/dev-tooling.md § "Testing") over random habits
 * and logs: the invariants the streak and rate screens rely on, whatever the
 * history looks like. Failures print a shrunk counterexample and a seed.
 */

describe("completion rate", () => {
	it("stays within 0 to 1, with completed never above scheduled", () => {
		fc.assert(
			fc.property(historyArb, (spec) => {
				const { habit, entries, frozenDates, today } = buildHistory(spec);
				const rate = calculateCompletionRate({
					habit,
					entries,
					frozenDates,
					today,
				});
				if (rate.fraction === null) return rate.scheduled === 0;
				return (
					rate.fraction >= 0 &&
					rate.fraction <= 1 &&
					rate.completed <= rate.scheduled
				);
			}),
			{ numRuns: PROPERTY_RUNS },
		);
	});

	it("never decreases when a completion is added on a day with no log", () => {
		fc.assert(
			fc.property(historyArb, fc.nat(), (spec, pick) => {
				const before = buildHistory(spec);
				const logged = new Set(spec.logs.map((log) => log.daysAgo));
				const free = Array.from(
					{ length: spec.ageDays + 1 },
					(_, i) => i,
				).filter((daysAgo) => !logged.has(daysAgo));
				if (free.length === 0) return true;
				const added = free[pick % free.length];
				const after = buildHistory(spec);
				after.entries.push(completionOn(after.habit, dayAgo(added), 1000));
				const rateOf = (h: typeof before) =>
					calculateCompletionRate({
						habit: h.habit,
						entries: h.entries,
						frozenDates: h.frozenDates,
						today: h.today,
					}).fraction;
				const [low, high] = [rateOf(before), rateOf(after)];
				if (low === null) return true;
				return high !== null && high >= low;
			}),
			{ numRuns: PROPERTY_RUNS },
		);
	});
});

describe("streaks", () => {
	it("the current streak never exceeds the best streak", () => {
		fc.assert(
			fc.property(historyArb, (spec) => {
				const { habit, entries, frozenDates, today } = buildHistory(spec);
				const best = calculateLongestStreak({
					habit,
					entries,
					frozenDates,
					today,
				}).days;
				const current = currentStreakAsOf({
					habit,
					entries,
					frozenDates,
					today,
				});
				const strict = calculateCurrentStreak(
					habit,
					entries,
					frozenDates,
					today,
				);
				return current <= best && strict <= best;
			}),
			{ numRuns: PROPERTY_RUNS },
		);
	});

	it("logging the next scheduled day never lowers the current streak", () => {
		fc.assert(
			fc.property(historyArb, fc.nat(), (spec, pick) => {
				const { habit, entries, frozenDates } = buildHistory(spec);
				const asOf = dayAgo(pick % (spec.ageDays + 1));
				const completedDates = entries
					.filter((entry) => isEntryComplete(habit, entry))
					.map((entry) => fromDayKey(entry.date));
				const strategy = getHabitStrategy(habit);
				let next = addDays(asOf, 1);
				for (let i = 0; i < 14; i++) {
					if (strategy.isDueOn(next, { completedDates })) break;
					next = addDays(next, 1);
				}
				const key = toDayKey(next);
				const withLog: Entry[] = [
					...entries.filter((entry) => entry.date !== key),
					completionOn(habit, next, 1000),
				];
				return (
					calculateCurrentStreak(habit, withLog, frozenDates, next) >=
					calculateCurrentStreak(habit, entries, frozenDates, asOf)
				);
			}),
			{ numRuns: PROPERTY_RUNS },
		);
	});
});

const isLeap = (year: number) =>
	(year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const yearScenarioArb = fc.record({
	year: fc.integer({ min: 1971, max: 2100 }),
	todayDay: fc.integer({ min: 0, max: 365 }),
	frequency: frequencyArb,
	logDays: fc.uniqueArray(fc.integer({ min: 0, max: 365 }), { maxLength: 30 }),
});

describe.each(TEST_ZONES)("year map in %s", (zone) => {
	it("has 365 or 366 strictly increasing days, January 1st to December 31st", () => {
		withTimeZone(zone, () => {
			fc.assert(
				fc.property(
					yearScenarioArb,
					({ year, todayDay, frequency, logDays }) => {
						const today = new Date(year, 0, 1 + (todayDay % 365), 12);
						const habit = makeHabit({
							id: 1,
							frequency,
							createdAt: new Date(year - 1, 6, 1),
						});
						const entries = logDays.map((n, index) => {
							const day = new Date(year, 0, 1 + (n % 365));
							return makeEntry({
								id: index + 1,
								habitId: 1,
								date: toDayKey(day),
								createdAt: day,
							});
						});
						const map = buildYearMap({
							habits: [habit],
							entries,
							frozenDays: [],
							today,
							year: rangeWindowFor("year", today),
						});
						const keys = map.days.map((day) => day.key);
						return (
							keys.length === (isLeap(year) ? 366 : 365) &&
							keys[0] === `${year}-01-01` &&
							keys[keys.length - 1] === `${year}-12-31` &&
							keys.every((key, i) => i === 0 || keys[i - 1] < key) &&
							map.months.reduce((sum, m) => sum + m.days.length, 0) ===
								keys.length
						);
					},
				),
				{ numRuns: 30 },
			);
		});
	});
});
