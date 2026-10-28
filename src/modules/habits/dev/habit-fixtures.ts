import { getISODay, subDays } from "date-fns";
import type { Habit, IsoWeekday } from "../types";
import {
	builtInFixture,
	EVENING_FIXTURE,
	LANGUAGE_FIXTURE,
	MORNING_FIXTURE,
	MUSIC_FIXTURE,
	OTHER_FIXTURE,
	TRAINING_FIXTURE,
} from "./category-fixtures";
import { monthlyHabitFixtures } from "./monthly-fixtures";
import { yearlyHabitFixtures } from "./yearly-fixtures";

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
 * variety a screen needs to render: build + break, custom categories and
 * Other (V1's no-category habits, as the HAB-24 migration maps them), and every frequency type (#1 matches the mockup's
 * Mon–Fri specific-weekdays selection). Ids are stable so `/edit-habit/1` always resolves.
 */
const FIXTURE_DATE = new Date("2026-09-16T08:00:00Z");

export type FixtureScenario =
	| "default"
	| "empty"
	| "rest-day"
	| "rest-day-picker"
	| "rest-day-logged"
	| "rest-day-ineligible"
	| "first-run"
	| "quantity-log"
	| "streak-at-risk"
	| "streak-at-risk-no-freezes"
	| "no-freezes"
	| "habit-detail"
	| "habit-detail-new"
	| "habit-detail-bonus"
	| "habit-detail-archived"
	| "retro-log"
	| "weekly-summary"
	| "weekly-summary-last-week"
	| "perfect-week"
	| "monthly-summary"
	| "monthly-too-early"
	| "yearly-summary"
	| "reminders"
	| "reminders-at-cap"
	| "manage-archive"
	| "manage-all-archived"
	| "manage-nothing-archived"
	| "many-categories"
	| "categories-built-in-only"
	| "categories-one-custom"
	| "categories-in-use";

const FIXTURE_SCENARIOS: FixtureScenario[] = [
	"empty",
	"rest-day",
	"rest-day-picker",
	"rest-day-logged",
	"rest-day-ineligible",
	"first-run",
	"quantity-log",
	"streak-at-risk",
	"streak-at-risk-no-freezes",
	"no-freezes",
	"habit-detail",
	"habit-detail-new",
	"habit-detail-bonus",
	"habit-detail-archived",
	"retro-log",
	"weekly-summary",
	"weekly-summary-last-week",
	"perfect-week",
	"monthly-summary",
	"monthly-too-early",
	"yearly-summary",
	"reminders",
	"reminders-at-cap",
	"manage-archive",
	"manage-all-archived",
	"manage-nothing-archived",
	"many-categories",
	"categories-built-in-only",
	"categories-one-custom",
	"categories-in-use",
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
		category: EVENING_FIXTURE,
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
		category: EVENING_FIXTURE,
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
		category: MORNING_FIXTURE,
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
		category: OTHER_FIXTURE,
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
const REST_DAY_HABIT_FIXTURES: FixtureHabit[] = [
	{
		id: 1,
		name: "Evening walk",
		category: EVENING_FIXTURE,
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

/**
 * HAB-18's picker scenarios (D1/D2): every habit is due every day except
 * today, so Today is on a rest day. `Read` (id 3) is the one the logged
 * scenario logs off-schedule; "No phone after 23:00" is a Break habit the
 * picker must leave out. `ineligible` keeps only that Break habit.
 */
function restDayPickerFixtures(onlyBreak: boolean): FixtureHabit[] {
	const notToday = ([1, 2, 3, 4, 5, 6, 7] as IsoWeekday[]).filter(
		(day) => day !== getISODay(new Date()),
	);
	const base = {
		direction: "build" as const,
		targetType: "simple" as const,
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "weekdays" as const, days: notToday },
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	};
	const habits: FixtureHabit[] = [
		{
			...base,
			id: 1,
			name: "Glass of water",
			category: MORNING_FIXTURE,
			targetType: "quantity",
			targetAmount: 8,
			targetUnit: "glasses",
		},
		{ ...base, id: 2, name: "Meditate", category: MORNING_FIXTURE },
		{ ...base, id: 3, name: "Read", category: EVENING_FIXTURE },
		{ ...base, id: 4, name: "Easy run", category: TRAINING_FIXTURE },
		{
			...base,
			id: 5,
			name: "No phone after 23:00",
			category: OTHER_FIXTURE,
			direction: "break",
		},
	];
	return onlyBreak ? habits.filter((habit) => habit.id === 5) : habits;
}

/**
 * A single quantity habit matching docs/mockups/quantity-log.png exactly
 * (name, target, unit, current value) so the Quantity Log sheet screenshot
 * (scripts/visual-check.mjs) can be compared to it directly.
 */
const QUANTITY_LOG_HABIT_FIXTURES: FixtureHabit[] = [
	{
		id: 1,
		name: "Glass of water",
		category: MORNING_FIXTURE,
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
const STREAK_AT_RISK_HABIT_CREATED = new Date("2025-01-01T00:00:00Z");

/**
 * One daily Build habit matching docs/mockups/streak-at-risk.png — its
 * matching entries (`entry-fixtures.ts`) complete every day except yesterday,
 * so opening it shows the streak-at-risk sheet with the full freeze pool
 * available (`frozen-day-fixtures.ts` adds none for this scenario).
 */
const STREAK_AT_RISK_HABIT_FIXTURES: FixtureHabit[] = [
	{
		id: 1,
		name: "Meditate",
		category: MORNING_FIXTURE,
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		createdAt: STREAK_AT_RISK_HABIT_CREATED,
		updatedAt: STREAK_AT_RISK_HABIT_CREATED,
	},
];

/**
 * docs/mockups/streak-reset-no-freezes.png's "Meditate · Morning · 10 min ·
 * daily" — a 24-day run that ended two days ago, yesterday missed, today
 * done (current 1). "Glass of water" is only there to own the two frozen
 * days (`frozen-day-fixtures.ts`) that empty this month's shared pool, so
 * the miss resets the streak with no prompt (HAB-08).
 */
const NO_FREEZES_HABIT_FIXTURES: FixtureHabit[] = [
	{
		id: 1,
		name: "Meditate",
		category: MORNING_FIXTURE,
		direction: "build",
		targetType: "quantity",
		targetAmount: 10,
		targetUnit: "min",
		frequency: { type: "daily" },
		createdAt: STREAK_AT_RISK_HABIT_CREATED,
		updatedAt: STREAK_AT_RISK_HABIT_CREATED,
	},
	{
		id: 2,
		name: "Glass of water",
		category: MORNING_FIXTURE,
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
			category: MORNING_FIXTURE,
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

/** Days before "now" the `habit-detail-archived` habit was archived (HAB-20 D5/E1) — a few weeks in, so the heatmap shows a paused stretch. */
export const HABIT_DETAIL_ARCHIVED_DAYS_AGO = 17;

/**
 * docs/mockups/hab-20-d5.png's "Cold shower · Morning · daily · archived":
 * `habit-detail`'s history (`entry-fixtures.ts` drops everything after the
 * archive day), a simple check, and a 07:00 daily reminder
 * (`reminder-fixtures.ts`) so Restore shows E1's "07:00 · daily" row.
 */
function habitDetailArchivedFixtures(): FixtureHabit[] {
	return habitDetailFixtures().map((habit) => ({
		...habit,
		name: "Cold shower",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		archivedAt: subDays(new Date(), HABIT_DETAIL_ARCHIVED_DAYS_AGO),
	}));
}

/**
 * A just-created habit with no history, matching
 * docs/mockups/habit-detail-new.png ("Evening walk · Mon–Fri · added today").
 */
function habitDetailNewFixtures(): FixtureHabit[] {
	const now = new Date();
	return [
		{
			id: 1,
			name: "Evening walk",
			category: EVENING_FIXTURE,
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
function retroLogFixtures(): FixtureHabit[] {
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
			category: MORNING_FIXTURE,
			targetType: "quantity",
			targetAmount: 10,
			targetUnit: "min",
			frequency: { type: "daily" },
		},
		{
			...base,
			id: 3,
			name: "Read",
			category: EVENING_FIXTURE,
			targetType: "quantity",
			targetAmount: 20,
			targetUnit: "pages",
			frequency: { type: "daily" },
		},
		{
			...base,
			id: 4,
			name: "Mobility",
			category: EVENING_FIXTURE,
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
		category: OTHER_FIXTURE,
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		createdAt: WEEKLY_SUMMARY_CREATED,
		updatedAt: WEEKLY_SUMMARY_CREATED,
	} as const;
	return [
		{ ...base, id: 1, name: "Glass of water" },
		{ ...base, id: 2, name: "Meditate" },
		{
			...base,
			id: 3,
			name: "Read",
			frequency: perfectWeek
				? { type: "weekdays", days: [1, 2, 3, 4, 5] }
				: base.frequency,
		},
		{
			...base,
			id: 4,
			name: "Easy run",
			frequency: perfectWeek
				? { type: "per-week", timesPerWeek: 3 }
				: base.frequency,
		},
		{ ...base, id: 5, name: "Mobility" },
		{
			...base,
			id: 6,
			name: "No phone in bed",
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
			category: MORNING_FIXTURE,
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
			category: MORNING_FIXTURE,
			frequency: { type: "daily" },
		},
		{
			...base,
			id: 2,
			name: "Meditate",
			category: MORNING_FIXTURE,
			frequency: { type: "daily" },
		},
		{
			...base,
			id: 3,
			name: "Read",
			category: MORNING_FIXTURE,
			frequency: { type: "per-week", timesPerWeek: 5 },
		},
		{
			...base,
			id: 4,
			name: "Easy run",
			category: TRAINING_FIXTURE,
			frequency: { type: "weekdays", days: [1, 3, 5] },
		},
		{
			...base,
			id: 5,
			name: "Mobility",
			category: TRAINING_FIXTURE,
			frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] },
		},
		{
			...base,
			id: 8,
			name: "Upper body",
			category: TRAINING_FIXTURE,
			frequency: { type: "weekdays", days: [2, 4] },
		},
		{
			...base,
			id: 6,
			name: "Cold shower",
			category: MORNING_FIXTURE,
			frequency: { type: "daily" },
			archivedAt: MANAGE_ARCHIVE_ARCHIVED_AT.coldShower,
		},
		{
			...base,
			id: 7,
			name: "No phone in bed",
			category: OTHER_FIXTURE,
			direction: "break",
			frequency: { type: "daily" },
			archivedAt: MANAGE_ARCHIVE_ARCHIVED_AT.noPhoneInBed,
		},
	];
}

/**
 * Manage Categories (HAB-25, docs/mockups/hab-25-f3a–f3c.png): the built-in
 * counts every frame shows (Health 1, Fitness 2, Mindfulness 1, Productivity
 * 1, Learning 1), plus — with customs in use — Music's three habits (one
 * archived, so the count proves archived habits are included) and
 * Language's one.
 */
function manageCategoriesFixtures(withCustomsInUse: boolean): FixtureHabit[] {
	const base = {
		direction: "build",
		targetType: "simple",
		targetAmount: null,
		targetUnit: null,
		frequency: { type: "daily" },
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	} as const;
	const builtIns: FixtureHabit[] = [
		{
			...base,
			id: 1,
			name: "Take vitamins",
			category: builtInFixture("Health"),
		},
		{
			...base,
			id: 2,
			name: "Morning run",
			category: builtInFixture("Fitness"),
		},
		{ ...base, id: 3, name: "Stretch", category: builtInFixture("Fitness") },
		{
			...base,
			id: 4,
			name: "Meditate",
			category: builtInFixture("Mindfulness"),
		},
		{
			...base,
			id: 5,
			name: "Plan the day",
			category: builtInFixture("Productivity"),
		},
		{
			...base,
			id: 6,
			name: "Read 20 pages",
			category: builtInFixture("Learning"),
		},
	];
	if (!withCustomsInUse) return builtIns;
	return [
		...builtIns,
		{ ...base, id: 7, name: "Piano practice", category: MUSIC_FIXTURE },
		{ ...base, id: 8, name: "Guitar scales", category: MUSIC_FIXTURE },
		{
			...base,
			id: 9,
			name: "Ear training",
			category: MUSIC_FIXTURE,
			archivedAt: new Date("2026-09-10T09:00:00"),
		},
		{
			...base,
			id: 10,
			name: "Spanish flashcards",
			category: LANGUAGE_FIXTURE,
		},
	];
}

function rawFixturesFor(scenario: FixtureScenario): FixtureHabit[] {
	switch (scenario) {
		case "empty":
		case "first-run":
		case "many-categories":
			return [];
		case "rest-day":
			return REST_DAY_HABIT_FIXTURES.map((habit) => ({ ...habit }));
		case "rest-day-picker":
		case "rest-day-logged":
			return restDayPickerFixtures(false);
		case "rest-day-ineligible":
			return restDayPickerFixtures(true);
		case "quantity-log":
			return QUANTITY_LOG_HABIT_FIXTURES.map((habit) => ({ ...habit }));
		case "streak-at-risk":
		case "streak-at-risk-no-freezes":
			return STREAK_AT_RISK_HABIT_FIXTURES.map((habit) => ({ ...habit }));
		case "no-freezes":
			return NO_FREEZES_HABIT_FIXTURES.map((habit) => ({ ...habit }));
		case "habit-detail":
			return habitDetailFixtures();
		case "habit-detail-new":
			return habitDetailNewFixtures();
		case "habit-detail-bonus":
			// Same history, but Mon–Fri only: the weekend logs become bonus dots (HAB-18).
			return habitDetailFixtures().map((habit) =>
				habit.id === 1
					? { ...habit, frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] } }
					: habit,
			);
		case "habit-detail-archived":
			return habitDetailArchivedFixtures();
		case "retro-log":
			return retroLogFixtures();
		case "weekly-summary":
		case "weekly-summary-last-week":
			return weeklySummaryFixtures(false);
		case "perfect-week":
			return weeklySummaryFixtures(true);
		case "monthly-summary":
			return monthlyHabitFixtures(false);
		case "monthly-too-early":
			return monthlyHabitFixtures(true);
		case "yearly-summary":
			return yearlyHabitFixtures();
		case "reminders":
			return remindersHabitFixtures({
				type: "weekdays",
				days: [1, 2, 3, 4, 5],
			});
		case "reminders-at-cap":
			return remindersHabitFixtures({ type: "daily" });
		case "manage-archive":
			return manageArchiveFixtures();
		case "manage-all-archived":
			return manageArchiveFixtures().filter((habit) => habit.archivedAt);
		case "manage-nothing-archived":
			return manageArchiveFixtures().filter((habit) => !habit.archivedAt);
		case "categories-built-in-only":
		case "categories-one-custom":
			return manageCategoriesFixtures(false);
		case "categories-in-use":
			return manageCategoriesFixtures(true);
		default:
			return HABIT_FIXTURES.map((habit) => ({ ...habit }));
	}
}

/**
 * HAB-22 name-length check: `?longNames=1` on top of any scenario renames the
 * first two habits to a V1-length name (40, over today's 32 cap) and one at
 * exactly the cap, so every screen can be checked with the longest names.
 */
const LONG_FIXTURE_NAMES = [
	"Read twenty pages before my morning tea!",
	"Stretch ten minutes after waking",
] as const;

function withLongNames(habits: FixtureHabit[]): FixtureHabit[] {
	const search = globalThis.location?.search ?? "";
	if (new URLSearchParams(search).get("longNames") !== "1") return habits;
	return habits.map((habit, index) =>
		index < LONG_FIXTURE_NAMES.length
			? { ...habit, name: LONG_FIXTURE_NAMES[index] }
			: habit,
	);
}

export function habitFixturesFor(scenario: FixtureScenario): Habit[] {
	return withLongNames(rawFixturesFor(scenario)).map(withLifecycle);
}

/** `HABIT_FIXTURES` as full habits — the web repository's server snapshot. */
export const DEFAULT_HABITS: Habit[] = HABIT_FIXTURES.map(withLifecycle);
