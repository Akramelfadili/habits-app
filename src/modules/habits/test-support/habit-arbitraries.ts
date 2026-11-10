import { parseISO, startOfDay, subDays } from "date-fns";
import fc from "fast-check";
import { toDayKey } from "@/utils/day-key";
import type { Entry, Frequency, FrozenDay, Habit, IsoWeekday } from "../types";
import {
	daily,
	makeEntry,
	makeFreeze,
	makeHabit,
	perWeek,
	weekdays,
} from "./habit-builder";

/**
 * fast-check arbitraries for the pure rules (streaks, rates, strategies): a
 * random habit with a random log, built from plain numbers so a failing case
 * shrinks to a few small offsets a person can read.
 */

/** Property tests run ~100-200 cases so `make check` stays fast. */
export const PROPERTY_RUNS = 150;

/** The "today" every history is measured against: local noon, Wed 23 Sep 2026. */
export const PROPERTY_TODAY = parseISO("2026-09-23T12:00:00");

export const isoWeekdayArb: fc.Arbitrary<IsoWeekday> = fc.constantFrom(
	1,
	2,
	3,
	4,
	5,
	6,
	7,
);

/** One of the three frequency types, with its own parameters. */
export const frequencyArb: fc.Arbitrary<Frequency> = fc.oneof(
	fc.constant(daily()),
	fc
		.uniqueArray(isoWeekdayArb, { minLength: 1, maxLength: 7 })
		.map((days) => weekdays(...days)),
	fc.integer({ min: 1, max: 7 }).map(perWeek),
);

export type HistorySpec = {
	frequency: Frequency;
	/** Quantity habit with this target, or a simple check when null. */
	target: number | null;
	/** Days before today the habit was created. */
	ageDays: number;
	/** Days before today that carry a log, each paired with its logged amount. */
	logs: { daysAgo: number; value: number }[];
	/** Days before today covered by a freeze. */
	frozenDaysAgo: number[];
};

/** A habit created up to 60 days ago with logs and freezes only on days it existed. */
export const historyArb: fc.Arbitrary<HistorySpec> = fc
	.record({
		frequency: frequencyArb,
		target: fc.option(fc.integer({ min: 1, max: 5 }), { nil: null }),
		ageDays: fc.integer({ min: 0, max: 60 }),
	})
	.chain(({ frequency, target, ageDays }) =>
		fc.record({
			frequency: fc.constant(frequency),
			target: fc.constant(target),
			ageDays: fc.constant(ageDays),
			logs: fc.uniqueArray(
				fc.record({
					daysAgo: fc.integer({ min: 0, max: ageDays }),
					value: fc.integer({ min: 0, max: 8 }),
				}),
				{ selector: (log) => log.daysAgo, maxLength: ageDays + 1 },
			),
			frozenDaysAgo: fc.uniqueArray(fc.integer({ min: 0, max: ageDays }), {
				maxLength: 6,
			}),
		}),
	);

export type History = {
	habit: Habit;
	entries: Entry[];
	frozenDays: FrozenDay[];
	frozenDates: Set<string>;
	today: Date;
};

export function dayAgo(daysAgo: number): Date {
	return subDays(startOfDay(PROPERTY_TODAY), daysAgo);
}

export function buildHistory(spec: HistorySpec): History {
	const habit = makeHabit({
		id: 1,
		frequency: spec.frequency,
		createdAt: dayAgo(spec.ageDays),
		...(spec.target === null
			? {}
			: {
					targetType: "quantity" as const,
					targetAmount: spec.target,
					targetUnit: "reps",
				}),
	});
	const entries = spec.logs.map((log, index) =>
		entryOn(habit, dayAgo(log.daysAgo), index + 1, log.value),
	);
	const frozenDays = spec.frozenDaysAgo.map((daysAgo, index) =>
		makeFreeze({ id: index + 1, habitId: 1, date: toDayKey(dayAgo(daysAgo)) }),
	);
	return {
		habit,
		entries,
		frozenDays,
		frozenDates: new Set(frozenDays.map((freeze) => freeze.date)),
		today: PROPERTY_TODAY,
	};
}

/** A log that counts as a completion for `habit`: presence, or the full target. */
export function completionOn(habit: Habit, day: Date, id: number): Entry {
	return entryOn(habit, day, id, habit.targetAmount ?? 1);
}

function entryOn(habit: Habit, day: Date, id: number, value: number): Entry {
	return makeEntry({
		id,
		habitId: habit.id,
		date: toDayKey(day),
		createdAt: day,
		...(habit.targetType === "quantity" ? { value } : {}),
	});
}
