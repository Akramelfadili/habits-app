import { getISODay, subDays } from "date-fns";
import type { Habit, IsoWeekday } from "../types";

/**
 * A fixture habit before its HAB-13 lifecycle fields — `habitFixturesFor`
 * fills those in (active, sorted by id) unless a scenario sets them itself.
 */
export type FixtureHabit = Omit<Habit, "sortOrder" | "archivedAt" | "pauses"> &
	Partial<Pick<Habit, "sortOrder" | "archivedAt" | "pauses">>;

function withLifecycle(habit: FixtureHabit): Habit {
	return {
		...habit,
		sortOrder: habit.sortOrder ?? habit.id,
		archivedAt: habit.archivedAt ?? null,
		pauses: habit.pauses ?? [],
	};
}

/**
 * Static fake habits backing the web-only repository (`habit-repository.web.ts`).
 * Web exists purely for visual checks against docs/mockups/, so this covers the
 * variety a screen needs to render: build + break, with and without category,
 * several accents and icons, and every frequency type (#1 matches the mockup's
 * Mon–Fri specific-weekdays selection). Ids are stable so `/edit-habit/1` always resolves.
 */
const FIXTURE_DATE = new Date("2026-09-16T08:00:00Z");

export type FixtureScenario =
	| "default"
	| "empty"
	| "rest-day"
	| "day-closed"
	| "first-run"
	| "quantity-log"
	| "streak-at-risk"
	| "habit-detail"
	| "habit-detail-new"
	| "retro-log"
	| "weekly-summary"
	| "perfect-week"
	| "reminders"
	| "reminders-at-cap"
	| "manage-archive";

const FIXTURE_SCENARIOS: FixtureScenario[] = [
	"empty",
	"rest-day",
	"day-closed",
	"first-run",
	"quantity-log",
	"streak-at-risk",
	"habit-detail",
	"habit-detail-new",
	"retro-log",
	"weekly-summary",
	"perfect-week",
	"reminders",
	"reminders-at-cap",
	"manage-archive",
];

/**
 * `?fixtures=` on any web URL — read once here so the habit and entry
 * repositories agree on which scenario is showing (scripts/visual-check.mjs).
 * `app-settings-repository.web.ts` reads this same param independently to
 * decide whether "seen first run" starts seeded (see its own comment).
 */
export function resolveFixtureScenario(): FixtureScenario {
	const search = globalThis.location?.search ?? "";
	const value = new URLSearchParams(search).get("fixtures");
	return (FIXTURE_SCENARIOS as string[]).includes(value ?? "")
		? (value as FixtureScenario)
		: "default";
}

export const HABIT_FIXTURES: FixtureHabit[] = [
	{
		id: 1,
		name: "Evening walk",
		icon: "walk",
		color: "blue",
		category: "Evening",
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	},
	{
		id: 2,
		name: "Read before bed",
		icon: "book",
		color: "orange",
		category: "Evening",
		direction: "build",
		targetType: "quantity",
		targetAmount: 20,
		targetUnit: "pages",
		frequency: { type: "daily" },
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	},
	{
		id: 3,
		name: "Glass of water",
		icon: "drop",
		color: "teal",
		category: "Morning",
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	},
	{
		id: 4,
		name: "No phone after 23:00",
		icon: "moon",
		color: "purple",
		category: null,
		direction: "break",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "per-week", timesPerWeek: 5 },
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	},
];

/**
 * Due every day except today (HAB-05's Rest day) — computed from the real
 * weekday at render time so the scenario holds regardless of which day the
 * visual check happens to run on.
 */
export const REST_DAY_HABIT_FIXTURES: FixtureHabit[] = [
	{
		id: 1,
		name: "Evening walk",
		icon: "walk",
		color: "blue",
		category: "Evening",
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: {
			type: "weekdays",
			days: ([1, 2, 3, 4, 5, 6, 7] as IsoWeekday[]).filter(
				(day) => day !== getISODay(new Date()),
			),
		},
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	},
];

/** Habit ids due today, all completed, for the Day closed scenario. */
export const DAY_CLOSED_DUE_TODAY_IDS = [1, 2, 3];

/**
 * Three daily habits (due today, completed via `entry-fixtures.ts`) plus two
 * due only tomorrow (HAB-05's Day closed "Tomorrow" preview) — tomorrow's
 * weekday is computed at render time, same reasoning as Rest day above.
 */
export const DAY_CLOSED_HABIT_FIXTURES: FixtureHabit[] = [
	{
		id: 1,
		name: "Glass of water",
		icon: "drop",
		color: "teal",
		category: "Morning",
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	},
	{
		id: 2,
		name: "Read before bed",
		icon: "book",
		color: "orange",
		category: "Evening",
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	},
	{
		id: 3,
		name: "No phone after 23:00",
		icon: "moon",
		color: "purple",
		category: null,
		direction: "break",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	},
	{
		id: 4,
		name: "Meditate",
		icon: "leaf",
		color: "green",
		category: "Morning",
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: {
			type: "weekdays",
			days: [((getISODay(new Date()) % 7) + 1) as IsoWeekday],
		},
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	},
	{
		id: 5,
		name: "Easy run",
		icon: "walk",
		color: "red",
		category: "Evening",
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: {
			type: "weekdays",
			days: [((getISODay(new Date()) % 7) + 1) as IsoWeekday],
		},
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	},
];

/**
 * A single quantity habit matching docs/mockups/quantity-log.png exactly
 * (name, target, unit, current value) so the Quantity Log sheet screenshot
 * (scripts/visual-check.mjs) can be compared to it directly.
 */
export const QUANTITY_LOG_HABIT_FIXTURES: FixtureHabit[] = [
	{
		id: 1,
		name: "Glass of water",
		icon: "drop",
		color: "blue",
		category: "Morning",
		direction: "build",
		targetType: "quantity",
		targetAmount: 8,
		targetUnit: "glasses",
		frequency: { type: "daily" },
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	},
];

/**
 * Created well before any streak-history date the fixtures generate, so the
 * habit's own `createdAt` floor (see `calculateCurrentStreak`) never cuts the
 * fixture streak short regardless of which real-world day the visual check
 * runs on.
 */
export const STREAK_AT_RISK_HABIT_CREATED = new Date("2025-01-01T00:00:00Z");

/**
 * One daily Build habit matching docs/mockups/streak-at-risk.png — its
 * matching entries (`entry-fixtures.ts`) complete every day except yesterday,
 * so opening it shows the streak-at-risk sheet with the full freeze pool
 * available (`frozen-day-fixtures.ts` adds none for this scenario).
 */
export const STREAK_AT_RISK_HABIT_FIXTURES: FixtureHabit[] = [
	{
		id: 1,
		name: "Meditate",
		icon: "leaf",
		color: "purple",
		category: "Morning",
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		createdAt: STREAK_AT_RISK_HABIT_CREATED,
		updatedAt: STREAK_AT_RISK_HABIT_CREATED,
	},
];

/** Days before "now" the `habit-detail` fixture habit was created — room for a long-past longest streak. */
export const HABIT_DETAIL_HISTORY_DAYS = 150;

/**
 * One daily quantity habit matching docs/mockups/habit-detail.png's "Glass of
 * water · Morning · 8 glasses · daily" — its ~5 months of varied history
 * (`entry-fixtures.ts`, `frozen-day-fixtures.ts`) fill every heatmap state.
 * Created relative to now so the history lands the same way on any run.
 */
export function habitDetailFixtures(): FixtureHabit[] {
	const created = subDays(new Date(), HABIT_DETAIL_HISTORY_DAYS);
	return [
		{
			id: 1,
			name: "Glass of water",
			icon: "drop",
			color: "blue",
			category: "Morning",
			direction: "build",
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
			frequency: { type: "daily" },
			createdAt: created,
			updatedAt: created,
		},
	];
}

/**
 * A just-created habit with no history, matching
 * docs/mockups/habit-detail-new.png ("Evening walk · Mon–Fri · added today").
 */
export function habitDetailNewFixtures(): FixtureHabit[] {
	const now = new Date();
	return [
		{
			id: 1,
			name: "Evening walk",
			icon: "walk",
			color: "orange",
			category: "Evening",
			direction: "build",
			targetType: "simple",
			targetAmount: null,
			targetUnit: null,
			frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
			createdAt: now,
			updatedAt: now,
		},
	];
}

/**
 * `habit-detail`'s "Glass of water" plus the three other habits
 * docs/mockups/retro-log.png lists for the tapped day — Meditate and Read are
 * quantity habits, Mobility a simple check — so the Retro log sheet (HAB-10)
 * renders the mockup's four rows.
 */
export function retroLogFixtures(): FixtureHabit[] {
	const created = subDays(new Date(), HABIT_DETAIL_HISTORY_DAYS);
	const base = {
		direction: "build",
		createdAt: created,
		updatedAt: created,
	} as const;
	return [
		...habitDetailFixtures(),
		{
			...base,
			id: 2,
			name: "Meditate",
			icon: "leaf",
			color: "purple",
			category: "Morning",
			targetType: "quantity",
			targetAmount: 10,
			targetUnit: "min",
			frequency: { type: "daily" },
		},
		{
			...base,
			id: 3,
			name: "Read",
			icon: "book",
			color: "orange",
			category: "Evening",
			targetType: "quantity",
			targetAmount: 20,
			targetUnit: "pages",
			frequency: { type: "daily" },
		},
		{
			...base,
			id: 4,
			name: "Mobility",
			icon: "walk",
			color: "green",
			category: "Evening",
			targetType: "simple",
			targetAmount: null,
			targetUnit: null,
			frequency: { type: "daily" },
		},
	];
}

/** Created well before any week the visual check pins its clock to. */
const WEEKLY_SUMMARY_CREATED = new Date("2025-01-01T00:00:00Z");

/**
 * docs/mockups/weekly-summary.png / perfect-week.png's six habits, ids in the
 * creation order perfect-week.png lists them (its all-100% bars fall back to
 * creation order). `weekly-summary` makes every habit daily, as that mockup's
 * x/7 bars show; `perfect-week` gives Read Mon–Fri and Easy run 3×/week, as
 * its 5/5 and 3/3 bars show. Matching entries live in `entry-fixtures.ts`.
 */
function weeklySummaryFixtures(perfectWeek: boolean): FixtureHabit[] {
	const base = {
		category: null,
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		createdAt: WEEKLY_SUMMARY_CREATED,
		updatedAt: WEEKLY_SUMMARY_CREATED,
	} as const;
	return [
		{ ...base, id: 1, name: "Glass of water", icon: "drop", color: "blue" },
		{ ...base, id: 2, name: "Meditate", icon: "leaf", color: "purple" },
		{
			...base,
			id: 3,
			name: "Read",
			icon: "book",
			color: "orange",
			frequency: perfectWeek
				? { type: "weekdays", days: [1, 2, 3, 4, 5] }
				: base.frequency,
		},
		{
			...base,
			id: 4,
			name: "Easy run",
			icon: "walk",
			color: "red",
			frequency: perfectWeek
				? { type: "per-week", timesPerWeek: 3 }
				: base.frequency,
		},
		{ ...base, id: 5, name: "Mobility", icon: "walk", color: "green" },
		{
			...base,
			id: 6,
			name: "No phone in bed",
			icon: "moon",
			color: "teal",
			direction: "break",
		},
	];
}

/**
 * docs/mockups/reminders.png / reminders-at-cap.png's "Meditate" — Mon–Fri
 * for `reminders`, so its Sat/Sun reminder shows the unscheduled-day warning;
 * daily for `reminders-at-cap`, which shows no warning on any of its four.
 * Matching reminders live in `reminder-fixtures.ts`.
 */
function remindersHabitFixtures(frequency: Habit["frequency"]): FixtureHabit[] {
	return [
		{
			id: 1,
			name: "Meditate",
			icon: "leaf",
			color: "purple",
			category: "Morning",
			direction: "build",
			targetType: "simple",
			targetAmount: null,
			targetUnit: null,
			frequency,
			createdAt: FIXTURE_DATE,
			updatedAt: FIXTURE_DATE,
		},
	];
}

/** Archive dates for docs/mockups/manage-archive.png's two archived rows. */
export const MANAGE_ARCHIVE_ARCHIVED_AT = {
	coldShower: new Date("2026-09-02T09:00:00"),
	noPhoneInBed: new Date("2026-08-18T09:00:00"),
};

/**
 * docs/mockups/manage-archive.png: five active habits across Morning,
 * Evening and Training, plus two archived ones — their "N logs kept" come
 * from `entry-fixtures.ts` (41 and 96).
 */
function manageArchiveFixtures(): FixtureHabit[] {
	const base = {
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		createdAt: WEEKLY_SUMMARY_CREATED,
		updatedAt: WEEKLY_SUMMARY_CREATED,
	} as const;
	return [
		{
			...base,
			id: 1,
			name: "Glass of water",
			icon: "drop",
			color: "blue",
			category: "Morning",
			frequency: { type: "daily" },
		},
		{
			...base,
			id: 2,
			name: "Meditate",
			icon: "leaf",
			color: "purple",
			category: "Morning",
			frequency: { type: "daily" },
		},
		{
			...base,
			id: 3,
			name: "Read",
			icon: "book",
			color: "orange",
			category: "Evening",
			frequency: { type: "per-week", timesPerWeek: 5 },
		},
		{
			...base,
			id: 4,
			name: "Easy run",
			icon: "walk",
			color: "red",
			category: "Training",
			frequency: { type: "weekdays", days: [1, 3, 5] },
		},
		{
			...base,
			id: 5,
			name: "Mobility",
			icon: "walk",
			color: "green",
			category: "Training",
			frequency: { type: "daily" },
		},
		{
			...base,
			id: 6,
			name: "Cold shower",
			icon: "drop",
			color: "teal",
			category: "Morning",
			frequency: { type: "daily" },
			archivedAt: MANAGE_ARCHIVE_ARCHIVED_AT.coldShower,
		},
		{
			...base,
			id: 7,
			name: "No phone in bed",
			icon: "moon",
			color: "purple",
			category: null,
			direction: "break",
			frequency: { type: "daily" },
			archivedAt: MANAGE_ARCHIVE_ARCHIVED_AT.noPhoneInBed,
		},
	];
}

function rawFixturesFor(scenario: FixtureScenario): FixtureHabit[] {
	switch (scenario) {
		case "empty":
		case "first-run":
			return [];
		case "rest-day":
			return REST_DAY_HABIT_FIXTURES.map((habit) => ({ ...habit }));
		case "day-closed":
			return DAY_CLOSED_HABIT_FIXTURES.map((habit) => ({ ...habit }));
		case "quantity-log":
			return QUANTITY_LOG_HABIT_FIXTURES.map((habit) => ({ ...habit }));
		case "streak-at-risk":
			return STREAK_AT_RISK_HABIT_FIXTURES.map((habit) => ({ ...habit }));
		case "habit-detail":
			return habitDetailFixtures();
		case "habit-detail-new":
			return habitDetailNewFixtures();
		case "retro-log":
			return retroLogFixtures();
		case "weekly-summary":
			return weeklySummaryFixtures(false);
		case "perfect-week":
			return weeklySummaryFixtures(true);
		case "reminders":
			return remindersHabitFixtures({
				type: "weekdays",
				days: [1, 2, 3, 4, 5],
			});
		case "reminders-at-cap":
			return remindersHabitFixtures({ type: "daily" });
		case "manage-archive":
			return manageArchiveFixtures();
		default:
			return HABIT_FIXTURES.map((habit) => ({ ...habit }));
	}
}

export function habitFixturesFor(scenario: FixtureScenario): Habit[] {
	return rawFixturesFor(scenario).map(withLifecycle);
}

/** `HABIT_FIXTURES` as full habits — the web repository's server snapshot. */
export const DEFAULT_HABITS: Habit[] = HABIT_FIXTURES.map(withLifecycle);
