import { addDays, format, startOfDay } from "date-fns";
import type { Entry, FrozenDay } from "../types";
import { builtInFixture } from "./category-fixtures";
import type { FixtureHabit } from "./habit-fixtures";

/**
 * Fixture data for Monthly Summary (HAB-16): docs/mockups/hab-16-c2.png and
 * c3.png's six habits over August 2026 (the visual check pins "now" to 2 Sep,
 * so August is the last complete month), and c6.png's under-a-month history.
 *
 * Every habit is daily; each is described by the days it was *missed*, so the
 * misses — not the completions — are what the insight thresholds are tuned
 * against (`monthly-insights.ts`, pinned by `monthly-summary.test.ts`):
 * - Mobility drifts down week over week (6, 5, 4, 3 of 7) → slipping.
 * - Read is the only habit up 10+ points on July → improved.
 * - Weekends trail weekdays, and Meditate's five Saturdays are the biggest
 *   single cause → pattern with an action.
 * - Easy run's two freezes (7 and 22 Aug) → the freeze card.
 */

const READY_CREATED = new Date("2025-01-01T00:00:00Z");
const TOO_EARLY_CREATED = new Date("2026-09-04T08:00:00Z");

const IDS = {
	water: 1,
	meditate: 2,
	read: 3,
	easyRun: 4,
	noPhone: 5,
	mobility: 6,
} as const;

/** August 2026 days of the month each habit was missed (1 Aug is a Saturday). */
const AUGUST_MISSES: Record<number, number[]> = {
	[IDS.water]: [12, 30],
	[IDS.meditate]: [1, 8, 15, 22, 29, 9, 23],
	[IDS.read]: [5, 20, 26, 15, 23],
	[IDS.easyRun]: [2, 16, 30],
	[IDS.noPhone]: [6, 24, 8, 9, 16, 23],
	[IDS.mobility]: [4, 11, 13, 18, 19, 21, 25, 26, 27, 28],
};

/** The two freezes — both Easy run, both missed days that would otherwise count. */
const AUGUST_FROZEN: { habitId: number; day: number }[] = [
	{ habitId: IDS.easyRun, day: 7 },
	{ habitId: IDS.easyRun, day: 22 },
];

/** How many July days each habit was done on — Read's the only big climb into August. */
const JULY_DONE: Record<number, number> = {
	[IDS.water]: 28,
	[IDS.meditate]: 23,
	[IDS.read]: 22,
	[IDS.easyRun]: 26,
	[IDS.noPhone]: 24,
	[IDS.mobility]: 28,
};

/** Spreads `count` misses evenly over a 31-day month, deterministically. */
function spreadMisses(count: number): number[] {
	return Array.from(
		{ length: count },
		(_, index) => Math.floor(((index + 0.5) * 31) / count) + 1,
	);
}

/** 4 Sep → 15 Sep (12 days, matching c6.png's "12 days tracked"). */
const TOO_EARLY_MISSES: Record<number, number[]> = {
	[IDS.water]: [],
	[IDS.meditate]: [5, 12],
	[IDS.read]: [8],
	[IDS.easyRun]: [6, 13],
	[IDS.noPhone]: [9],
	[IDS.mobility]: [7, 10, 11],
};

export function monthlyHabitFixtures(tooEarly: boolean): FixtureHabit[] {
	const createdAt = tooEarly ? TOO_EARLY_CREATED : READY_CREATED;
	const base = {
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		createdAt,
		updatedAt: createdAt,
	} as const;
	return [
		{
			...base,
			id: IDS.water,
			name: "Glass of water",
			category: builtInFixture("Health"),
		},
		{
			...base,
			id: IDS.meditate,
			name: "Meditate",
			category: builtInFixture("Mindfulness"),
		},
		{
			...base,
			id: IDS.read,
			name: "Read",
			category: builtInFixture("Learning"),
		},
		{
			...base,
			id: IDS.easyRun,
			name: "Easy run",
			category: builtInFixture("Fitness"),
		},
		{
			...base,
			id: IDS.noPhone,
			name: "No phone in bed",
			category: builtInFixture("Social"),
			direction: "break",
		},
		{
			...base,
			id: IDS.mobility,
			name: "Mobility",
			category: builtInFixture("Fitness"),
		},
	];
}

function daysOf(monthStart: Date, length: number): Date[] {
	return Array.from({ length }, (_, index) => addDays(monthStart, index));
}

function entriesFor(
	days: Date[],
	missed: (habitId: number, day: Date, dayOfMonth: number) => boolean,
): Entry[] {
	const entries: Entry[] = [];
	for (const habitId of Object.values(IDS)) {
		for (const day of days) {
			if (missed(habitId, day, day.getDate())) continue;
			entries.push({
				id: entries.length + 1,
				habitId,
				date: format(day, "yyyy-MM-dd"),
				createdAt: day,
			});
		}
	}
	return entries;
}

export function monthlyEntries(tooEarly: boolean): Entry[] {
	if (tooEarly) {
		return entriesFor(
			daysOf(startOfDay(new Date(2026, 8, 4)), 12),
			(habitId, _day, dayOfMonth) =>
				TOO_EARLY_MISSES[habitId].includes(dayOfMonth),
		);
	}
	const frozen = new Set(
		AUGUST_FROZEN.map(({ habitId, day }) => `${habitId}:${day}`),
	);
	const july = entriesFor(
		daysOf(startOfDay(new Date(2026, 6, 1)), 31),
		(habitId, _day, dayOfMonth) =>
			spreadMisses(31 - JULY_DONE[habitId]).includes(dayOfMonth),
	);
	const august = entriesFor(
		daysOf(startOfDay(new Date(2026, 7, 1)), 31),
		(habitId, _day, dayOfMonth) =>
			AUGUST_MISSES[habitId].includes(dayOfMonth) ||
			frozen.has(`${habitId}:${dayOfMonth}`),
	);
	return [...july, ...august].map((entry, index) => ({
		...entry,
		id: index + 1,
	}));
}

export function monthlyFrozenDays(): FrozenDay[] {
	return AUGUST_FROZEN.map(({ habitId, day }, index) => ({
		id: index + 1,
		habitId,
		date: format(new Date(2026, 7, day), "yyyy-MM-dd"),
		createdAt: new Date(2026, 7, day),
	}));
}
