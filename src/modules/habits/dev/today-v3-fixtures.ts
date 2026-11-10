import { format, parseISO, subDays } from "date-fns";
import type { Entry } from "../types";
import { builtInFixture } from "./category-fixtures";
import type { FixtureHabit } from "./habit-fixtures";

export type TodayV3Scenario =
	| "today-v3"
	| "today-v3-at-risk"
	| "today-v3-all-done"
	| "today-v3-rest";

export const TODAY_V3_SCENARIOS: TodayV3Scenario[] = [
	"today-v3",
	"today-v3-at-risk",
	"today-v3-all-done",
	"today-v3-rest",
];

const CREATED = parseISO("2025-01-01T00:00:00");

const base = {
	direction: "build",
	targetType: "simple",
	targetAmount: null,
	targetUnit: null,
	frequency: { type: "daily" },
	createdAt: CREATED,
	updatedAt: CREATED,
} as const;

const DRINK_WATER: FixtureHabit = {
	...base,
	id: 1,
	name: "Drink water",
	category: builtInFixture("Health"),
	targetType: "quantity",
	targetAmount: 8,
	targetUnit: "glasses",
};
const COLD_SHOWER: FixtureHabit = {
	...base,
	id: 2,
	name: "Cold shower",
	category: builtInFixture("Health"),
	frequency: { type: "per-week", timesPerWeek: 3 },
};
const MEDITATE: FixtureHabit = {
	...base,
	id: 3,
	name: "Meditate",
	category: builtInFixture("Mindfulness"),
};
const READ: FixtureHabit = {
	...base,
	id: 4,
	name: "Read 20 min",
	category: builtInFixture("Learning"),
};
const NO_SOCIAL: FixtureHabit = {
	...base,
	id: 5,
	name: "No social media",
	category: builtInFixture("Productivity"),
	direction: "break",
};
const UPPER_BODY: FixtureHabit = {
	...base,
	id: 6,
	name: "Upper body",
	category: builtInFixture("Fitness"),
	frequency: { type: "weekdays", days: [2, 4] },
};

export const V3_FRAME_HABITS = {
	water: DRINK_WATER,
	cold: COLD_SHOWER,
	meditate: MEDITATE,
	read: READ,
	noSocial: NO_SOCIAL,
	upper: UPPER_BODY,
};

export function todayV3Habits(scenario: TodayV3Scenario): FixtureHabit[] {
	if (scenario === "today-v3-rest") {
		return [
			{ ...READ, frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] } },
			UPPER_BODY,
			COLD_SHOWER,
		];
	}
	return [DRINK_WATER, COLD_SHOWER, MEDITATE, READ, NO_SOCIAL, UPPER_BODY];
}

function run(habitId: number, from: number, count: number, startId: number) {
	return Array.from(
		{ length: count },
		(_, index): Entry => ({
			id: startId + index,
			habitId,
			date: format(subDays(new Date(), from + index), "yyyy-MM-dd"),
			createdAt: new Date(),
		}),
	);
}

export function todayV3Entries(scenario: TodayV3Scenario): Entry[] {
	const today = format(new Date(), "yyyy-MM-dd");
	const monday = format(subDays(new Date(), 4), "yyyy-MM-dd");
	const entry = (
		id: number,
		habitId: number,
		date: string,
		value?: number,
	): Entry => ({
		id,
		habitId,
		date,
		value,
		createdAt: new Date(),
	});

	if (scenario === "today-v3-rest") {
		return [
			entry(1, 2, format(subDays(new Date(), 5), "yyyy-MM-dd")),
			entry(2, 2, format(subDays(new Date(), 3), "yyyy-MM-dd")),
			entry(3, 2, format(subDays(new Date(), 2), "yyyy-MM-dd")),
		];
	}
	if (scenario === "today-v3-all-done") {
		return [
			entry(1, 1, today, 8),
			entry(2, 2, monday),
			entry(3, 2, today),
			...run(3, 0, 13, 10),
			...run(4, 0, 13, 40),
			...run(5, 0, 5, 70),
		];
	}
	if (scenario === "today-v3-at-risk") {
		return [
			entry(1, 1, today, 5),
			entry(2, 2, monday),
			...run(3, 2, 13, 10),
			...run(4, 1, 12, 40),
			...run(5, 1, 4, 70),
		];
	}
	return [
		entry(1, 1, today, 5),
		entry(2, 2, monday),
		...run(3, 0, 13, 10),
		...run(4, 1, 12, 40),
		...run(5, 1, 4, 70),
	];
}
