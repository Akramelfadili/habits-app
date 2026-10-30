import { addDays, format, parseISO, startOfWeek, subDays } from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import type { Entry, FrozenDay, Reminder } from "../types";
import { builtInFixture } from "./category-fixtures";
import type { FixtureHabit } from "./habit-fixtures";

/**
 * The Habits tab and Habit Detail frames' data (H1–H10, D1–D8, DC1–DC7,
 * docs/mockups/v3/renders/habits and sheets), pinned to Friday 23 Oct 2026 by
 * the visual checks. `habits-v3` is the library and every Detail but two:
 * `habits-v3-new` (D3) is Drink water created today with nothing logged, and
 * `habits-v3-reset` (D6) spends the month's second freeze, so Meditate's missed
 * Wednesday 14 Oct reads as a streak reset.
 *
 * Ids: 1 Drink water · 2 Cold shower · 3 Upper body · 4 Meditate · 5 Read 20 min
 * · 6 No social media · 7 No phone in bed · 8 Morning run (archived 12 Oct) ·
 * 9 Journal 5 min (archived 2 Oct). Read 20 min has exactly 214 logs, as DC1 says.
 */
export type HabitsV3Scenario =
	| "habits-v3"
	| "habits-v3-new"
	| "habits-v3-reset";

export const HABITS_V3_SCENARIOS: HabitsV3Scenario[] = [
	"habits-v3",
	"habits-v3-new",
	"habits-v3-reset",
];

const LONG_AGO = parseISO("2025-01-01T00:00:00");

const base = {
	direction: "build",
	targetType: "simple",
	targetAmount: null,
	targetUnit: null,
	frequency: { type: "daily" },
	createdAt: LONG_AGO,
	updatedAt: LONG_AGO,
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
const UPPER_BODY: FixtureHabit = {
	...base,
	id: 3,
	name: "Upper body",
	category: builtInFixture("Fitness"),
	frequency: { type: "weekdays", days: [2, 4] },
	createdAt: parseISO("2026-03-02T00:00:00"),
	updatedAt: parseISO("2026-03-02T00:00:00"),
};
const MEDITATE: FixtureHabit = {
	...base,
	id: 4,
	name: "Meditate",
	category: builtInFixture("Mindfulness"),
};
const READ: FixtureHabit = {
	...base,
	id: 5,
	name: "Read 20 min",
	category: builtInFixture("Learning"),
};
const NO_SOCIAL: FixtureHabit = {
	...base,
	id: 6,
	name: "No social media",
	category: builtInFixture("Productivity"),
	direction: "break",
};
const NO_PHONE: FixtureHabit = {
	...base,
	id: 7,
	name: "No phone in bed",
	category: builtInFixture("Home"),
	direction: "break",
};
const MORNING_RUN: FixtureHabit = {
	...base,
	id: 8,
	name: "Morning run",
	category: builtInFixture("Fitness"),
	frequency: { type: "weekdays", days: [1, 3, 5] },
	createdAt: parseISO("2026-03-02T00:00:00"),
	updatedAt: parseISO("2026-03-02T00:00:00"),
	archivedAt: parseISO("2026-10-12T09:00:00"),
};
const JOURNAL: FixtureHabit = {
	...base,
	id: 9,
	name: "Journal 5 min",
	category: builtInFixture("Mindfulness"),
	createdAt: parseISO("2026-05-01T00:00:00"),
	updatedAt: parseISO("2026-05-01T00:00:00"),
	archivedAt: parseISO("2026-10-02T09:00:00"),
};

export function habitsV3Habits(scenario: HabitsV3Scenario): FixtureHabit[] {
	if (scenario === "habits-v3-new") {
		// D3: created today, nothing logged.
		return [{ ...DRINK_WATER, createdAt: new Date(), updatedAt: new Date() }];
	}
	return [
		DRINK_WATER,
		COLD_SHOWER,
		UPPER_BODY,
		MEDITATE,
		READ,
		NO_SOCIAL,
		NO_PHONE,
		MORNING_RUN,
		JOURNAL,
	];
}

const key = (date: Date) => format(date, "yyyy-MM-dd");

/** Every weekday of `days` (ISO 1–7) from `from` to `to`, inclusive, as day keys. */
function scheduledDays(from: string, to: string, days: number[]): string[] {
	const out: string[] = [];
	for (
		let cursor = parseISO(from);
		key(cursor) <= to;
		cursor = addDays(cursor, 1)
	) {
		const iso = cursor.getDay() === 0 ? 7 : cursor.getDay();
		if (days.includes(iso)) out.push(key(cursor));
	}
	return out;
}

export function habitsV3Entries(scenario: HabitsV3Scenario): Entry[] {
	if (scenario === "habits-v3-new") return [];
	const now = new Date();
	const ago = (days: number) => key(subDays(now, days));
	let nextId = 1;
	const entries: Entry[] = [];
	const add = (habitId: number, date: string, value?: number) =>
		entries.push({ id: nextId++, habitId, date, value, createdAt: now });
	const addRun = (habitId: number, from: number, to: number) => {
		for (let daysAgo = from; daysAgo <= to; daysAgo++)
			add(habitId, ago(daysAgo));
	};

	// Drink water: 8 of 8 for three weeks, 5 of 8 today.
	add(1, ago(0), 5);
	for (let daysAgo = 1; daysAgo <= 21; daysAgo++) add(1, ago(daysAgo), 8);

	// Cold shower (3× a week): Monday and Wednesday so far this week, and most weeks before.
	const monday = key(startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }));
	for (const date of [
		monday,
		key(addDays(parseISO(monday), 2)),
		key(subDays(parseISO(monday), 7)),
		key(subDays(parseISO(monday), 5)),
		key(subDays(parseISO(monday), 3)),
	]) {
		add(2, date);
	}

	// Upper body (Tue/Thu, since 2 Mar): every day logged but four old misses (the
	// older half of the 180-day window, so the 90-day rate has a "+N pts" to show),
	// Tue 6 Oct missed, Thu 15 Oct frozen, and Mon 19 Oct a bonus.
	const missed = new Set([
		"2026-04-14",
		"2026-05-05",
		"2026-05-21",
		"2026-06-30",
		"2026-10-06",
		"2026-10-15",
	]);
	for (const date of scheduledDays("2026-03-02", "2026-10-22", [2, 4])) {
		if (!missed.has(date)) add(3, date);
	}
	add(3, "2026-10-19");

	// Meditate: 13 days in a row up to yesterday; Wed 14 Oct is missed in the reset scenario only.
	if (scenario === "habits-v3-reset") {
		for (let daysAgo = 1; daysAgo <= 8; daysAgo++) add(4, ago(daysAgo));
		for (let daysAgo = 10; daysAgo <= 22; daysAgo++) add(4, ago(daysAgo));
	} else {
		addRun(4, 1, 13);
	}

	// Read 20 min: 12 days in a row, a gap, then 202 more — 214 logs in all (DC1).
	addRun(5, 1, 12);
	addRun(5, 14, 215);

	// No social media: resisted every day for 21 days, today included.
	addRun(6, 0, 20);

	// No phone in bed: 9 nights in a row ending today; Tue 13 and Wed 14 Oct slipped.
	addRun(7, 0, 8);
	addRun(7, 11, 60);

	// Morning run (Mon/Wed/Fri, archived 12 Oct): a 41-day run ending Mon 28 Sep, Wed 30 Sep
	// missed, and the last week done; sparse before 26 Jun.
	const runDays = scheduledDays("2026-03-02", "2026-10-09", [1, 3, 5]);
	const runStart = "2026-06-26";
	for (const date of runDays) {
		if (date >= runStart && date !== "2026-09-30") add(8, date);
		else if (date < "2026-06-24" && parseISO(date).getDate() % 3 === 0)
			add(8, date);
	}

	// Journal 5 min: a few weeks, ending the day before it was archived.
	for (let daysAgo = 22; daysAgo <= 51; daysAgo++) add(9, ago(daysAgo));

	return entries;
}

/** Thu 15 Oct (Upper body) uses one of the month's two freezes; the reset scenario spends the other (D6). */
export function habitsV3FrozenDays(scenario: HabitsV3Scenario): FrozenDay[] {
	if (scenario === "habits-v3-new") return [];
	const now = new Date();
	const frozen = (id: number, habitId: number, date: string): FrozenDay => ({
		id,
		habitId,
		date,
		createdAt: now,
	});
	const days = [frozen(1, 3, "2026-10-15")];
	if (scenario === "habits-v3-reset") days.push(frozen(2, 1, "2026-10-06"));
	return days;
}

export function habitsV3Reminders(scenario: HabitsV3Scenario): Reminder[] {
	if (scenario === "habits-v3-new") return [];
	return [
		{
			id: 1,
			habitId: 3,
			hour: 7,
			minute: 0,
			weekdays: [2, 4],
			enabled: true,
		},
		{
			id: 2,
			habitId: 4,
			hour: 7,
			minute: 0,
			weekdays: [1, 2, 3, 4, 5, 6, 7],
			enabled: true,
		},
		{
			id: 3,
			habitId: 8,
			hour: 6,
			minute: 30,
			weekdays: [1, 3, 5],
			enabled: true,
		},
	];
}
