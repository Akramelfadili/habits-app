import { addDays, format, startOfDay } from "date-fns";
import { atIndex } from "@/utils/indexed";
import type { Entry } from "../types";
import { builtInFixture } from "./category-fixtures";
import type { FixtureHabit } from "./habit-fixtures";

// Misses per month are tuned against the insight thresholds (pinned by `yearly-summary.test.ts`);
// the seasonal dip is the fourth card and is cut by the three-card cap.

const CREATED = new Date(2026, 2, 3, 8);

const IDS = {
	water: 1,
	meditate: 2,
	read: 3,
	mobility: 4,
	easyRun: 5,
	upperBody: 6,
} as const;

const MONTHS = [
	{ month: 3, first: 3, last: 31 },
	{ month: 4, first: 1, last: 30 },
	{ month: 5, first: 1, last: 31 },
	{ month: 6, first: 1, last: 30 },
	{ month: 7, first: 1, last: 31 },
	{ month: 8, first: 1, last: 31 },
	{ month: 9, first: 1, last: 15 },
] as const;

const MISS_COUNTS: Record<number, number[]> = {
	[IDS.water]: [3, 5, 4, 0, 6, 6, 2],
	[IDS.meditate]: [4, 6, 3, 0, 6, 6, 2],
	[IDS.read]: [2, 2, 1, 0, 6, 7, 2],
	[IDS.mobility]: [17, 18, 12, 16, 19, 19, 9],
	[IDS.easyRun]: [4, 6, 3, 0, 5, 6, 2],
	[IDS.upperBody]: [3, 5, 4, 0, 6, 5, 2],
};

function spread(first: number, last: number, count: number): number[] {
	const length = last - first + 1;
	return Array.from(
		{ length: count },
		(_, index) => first + Math.floor(((index + 0.5) * length) / count),
	);
}

// Every habit but Water misses 30 May and 2 July, so none can out-run Water's pinned streak.
function missedDays(habitId: number, index: number): Set<number> {
	const { month, first, last } = atIndex(MONTHS, index);
	const count = MISS_COUNTS[habitId]?.[index] ?? 0;
	let days = spread(first, last, count);
	if (habitId === IDS.water) {
		if (month === 5) days = [3, 8, 14, 20];
		if (month === 7) days = [1, ...spread(2, last, count - 1)];
	} else {
		if (month === 5 && days.length > 0) days[days.length - 1] = 30;
		if (month === 7) days[0] = 2;
	}
	return new Set(days);
}

export function yearlyHabitFixtures(): FixtureHabit[] {
	const base = {
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		createdAt: CREATED,
		updatedAt: CREATED,
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
			id: IDS.mobility,
			name: "Mobility",
			category: builtInFixture("Fitness"),
		},
		{
			...base,
			id: IDS.easyRun,
			name: "Easy run",
			category: builtInFixture("Social"),
		},
		{
			...base,
			id: IDS.upperBody,
			name: "Upper body",
			category: builtInFixture("Creativity"),
		},
	];
}

export function yearlyEntries(): Entry[] {
	const entries: Entry[] = [];
	for (const habitId of Object.values(IDS)) {
		MONTHS.forEach(({ month, first, last }, index) => {
			const missed = missedDays(habitId, index);
			const monthStart = startOfDay(new Date(2026, month - 1, first));
			for (let offset = 0; offset <= last - first; offset += 1) {
				const day = addDays(monthStart, offset);
				if (missed.has(day.getDate())) continue;
				entries.push({
					id: entries.length + 1,
					habitId,
					date: format(day, "yyyy-MM-dd"),
					createdAt: day,
				});
			}
		});
	}
	return entries;
}
