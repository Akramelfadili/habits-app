import { addDays, parseISO } from "date-fns";
import { toDayKey } from "@/utils/day-key";
import type { Entry, FrozenDay } from "../types";
import { builtInFixture } from "./category-fixtures";
import type { FixtureHabit } from "./habit-fixtures";
import { V3_FRAME_HABITS } from "./today-v3-fixtures";

/**
 * The Progress frames' data: the six habits the Today frames draw, with a history from 3
 * March to Thursday 22 October 2026; the visual checks pin "now" to Friday 23 October. Dates
 * are absolute, so the data never depends on the day a check runs.
 * - `progress-v3`: September is perfect (the best month); Read 20 min slips in October;
 *   Meditate has the freezes (7 and 20 Oct, and 12 Jun), Upper body two bonus logs (3 and
 *   19 Oct); Morning run is archived.
 * - `progress-v3-too-early`: three habits, logged on 21, 22, 23 Oct.
 * - `progress-v3-nothing-logged`: habits, no logs.
 * - `progress-v3-one-habit`: Meditate only; 14-15 Oct missed.
 */
export type ProgressV3Scenario =
	| "progress-v3"
	| "progress-v3-too-early"
	| "progress-v3-nothing-logged"
	| "progress-v3-one-habit";

export const PROGRESS_V3_SCENARIOS: ProgressV3Scenario[] = [
	"progress-v3",
	"progress-v3-too-early",
	"progress-v3-nothing-logged",
	"progress-v3-one-habit",
];

const STARTED = parseISO("2026-03-03T00:00:00");
const LAST_LOGGED = parseISO("2026-10-22T00:00:00");
const { water, cold, meditate, read, noSocial, upper } = V3_FRAME_HABITS;

const since = (habit: FixtureHabit, date: Date): FixtureHabit => ({
	...habit,
	createdAt: date,
	updatedAt: date,
});

const MORNING_RUN: FixtureHabit = {
	id: 7,
	name: "Morning run",
	category: builtInFixture("Fitness"),
	direction: "build",
	targetType: "simple",
	targetAmount: null,
	targetUnit: null,
	frequency: { type: "daily" },
	createdAt: STARTED,
	updatedAt: STARTED,
	archivedAt: parseISO("2026-10-12T09:00:00"),
};

export function progressV3Habits(scenario: ProgressV3Scenario): FixtureHabit[] {
	switch (scenario) {
		case "progress-v3-too-early": {
			const first = parseISO("2026-10-21T08:00:00");
			return [water, read, meditate].map((habit) => since(habit, first));
		}
		case "progress-v3-nothing-logged": {
			const first = parseISO("2026-10-19T08:00:00");
			return [water, read, meditate, noSocial].map((habit) =>
				since(habit, first),
			);
		}
		case "progress-v3-one-habit":
			return [since(meditate, STARTED)];
		default:
			return [
				since(water, STARTED),
				since(read, STARTED),
				since(upper, STARTED),
				since(meditate, STARTED),
				since(cold, STARTED),
				since(noSocial, STARTED),
				MORNING_RUN,
			];
	}
}

const IDS = {
	water: water.id,
	cold: cold.id,
	meditate: meditate.id,
	read: read.id,
	noSocial: noSocial.id,
	upper: upper.id,
	run: MORNING_RUN.id,
};

/** October days a habit was missed, written out so the month reads like the frames. */
const OCTOBER_MISSES: Record<number, number[]> = {
	[IDS.water]: [2, 9],
	[IDS.read]: [4, 6, 9, 13, 21],
	[IDS.upper]: [13],
	[IDS.meditate]: [],
	[IDS.noSocial]: [5, 11, 22],
	[IDS.run]: [],
};

/** Freezes: Meditate on 12 Jun, 7 Oct and 20 Oct. */
const FROZEN_DATES = ["2026-06-12", "2026-10-07", "2026-10-20"];

/** One-habit Meditate: 14–15 Oct missed, the same freezes. */
const ONE_HABIT_MISSES = ["2026-10-14", "2026-10-15"];

/** Before October a habit is missed on a spread of days (a hash of the day), never in September. */
const MISS_EVERY: Record<number, number> = {
	[IDS.water]: 23,
	[IDS.read]: 12,
	[IDS.upper]: 15,
	[IDS.meditate]: 19,
	[IDS.noSocial]: 13,
	[IDS.run]: 17,
};

function isoWeekday(date: Date): number {
	return date.getDay() === 0 ? 7 : date.getDay();
}

function dueOn(habitId: number, date: Date): boolean {
	const weekday = isoWeekday(date);
	if (habitId === IDS.upper) return weekday === 2 || weekday === 4;
	// Cold shower: 3× per week, logged on Mon, Wed and Sat.
	if (habitId === IDS.cold) return [1, 3, 6].includes(weekday);
	return true;
}

function missedOn(habitId: number, date: Date): boolean {
	const key = toDayKey(date);
	if (FROZEN_DATES.includes(key) && habitId === IDS.meditate) return true;
	if (key === "2026-07-14") return habitId === IDS.read;
	const month = date.getMonth();
	if (month === 8) return false;
	if (month === 9)
		return OCTOBER_MISSES[habitId]?.includes(date.getDate()) ?? false;
	const every = MISS_EVERY[habitId];
	if (!every) return false;
	return (date.getDate() * 7 + month * 11 + habitId * 3) % every === 0;
}

/** Quantity: a few October days stop short of 8 glasses, so the matrix shows partial cells. */
function waterValue(date: Date): number {
	if (date.getMonth() === 9 && [20, 23].includes(date.getDate())) return 4;
	if ((date.getDate() + date.getMonth()) % 9 === 0 && date.getMonth() !== 8) {
		return 5;
	}
	return 8;
}

export function progressV3Entries(scenario: ProgressV3Scenario): Entry[] {
	let nextId = 1;
	const made = new Date();
	const entry = (habitId: number, date: string, value?: number): Entry => ({
		id: nextId++,
		habitId,
		date,
		value,
		createdAt: made,
	});

	if (scenario === "progress-v3-nothing-logged") return [];
	if (scenario === "progress-v3-too-early") {
		return ["2026-10-21", "2026-10-22", "2026-10-23"].flatMap((date) => [
			entry(IDS.water, date, 8),
			entry(IDS.read, date),
			entry(IDS.meditate, date),
		]);
	}

	const entries: Entry[] = [];
	const oneHabit = scenario === "progress-v3-one-habit";
	const habits = oneHabit
		? [IDS.meditate]
		: [IDS.water, IDS.read, IDS.upper, IDS.meditate, IDS.cold, IDS.noSocial];
	for (let day = STARTED; day <= LAST_LOGGED; day = addDays(day, 1)) {
		const key = toDayKey(day);
		for (const habitId of habits) {
			if (!dueOn(habitId, day)) continue;
			if (oneHabit) {
				if (ONE_HABIT_MISSES.includes(key) || FROZEN_DATES.includes(key))
					continue;
			} else if (missedOn(habitId, day)) continue;
			entries.push(
				entry(
					habitId,
					key,
					habitId === IDS.water ? waterValue(day) : undefined,
				),
			);
		}
	}
	if (oneHabit) return entries;

	for (
		let day = STARTED;
		day < parseISO("2026-10-12T00:00:00");
		day = addDays(day, 1)
	) {
		entries.push(entry(IDS.run, toDayKey(day)));
	}
	// Bonus logs: Upper body is Tue/Thu, but it was done on Sat 3 Oct and Mon 19 Oct.
	entries.push(entry(IDS.upper, "2026-10-03"), entry(IDS.upper, "2026-10-19"));
	// This week (Fri 23 Oct, today): Drink water is under way, Meditate not yet.
	entries.push(entry(IDS.water, "2026-10-23", 3));
	return entries;
}

export function progressV3FrozenDays(
	scenario: ProgressV3Scenario,
): FrozenDay[] {
	if (
		scenario === "progress-v3-too-early" ||
		scenario === "progress-v3-nothing-logged"
	) {
		return [];
	}
	return FROZEN_DATES.map((date, index) => ({
		id: index + 1,
		habitId: IDS.meditate,
		date,
		createdAt: parseISO(`${date}T09:00:00`),
	}));
}
