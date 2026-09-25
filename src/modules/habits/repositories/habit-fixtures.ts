import { getISODay } from "date-fns";
import type { Habit, IsoWeekday } from "../types";

/**
 * Static fake habits backing the web-only repository (`habit-repository.web.ts`).
 * Web exists purely for visual checks against docs/mockups/, so this covers the
 * variety a screen needs to render: build + break, with and without category,
 * several accents and icons, and every frequency type (#1 matches the mockup's
 * Mon–Fri specific-weekdays selection). Ids are stable so `/edit-habit/1` always resolves.
 */
const FIXTURE_DATE = new Date("2026-09-16T08:00:00Z");

export type FixtureScenario = "default" | "empty" | "rest-day" | "day-closed";

/**
 * `?fixtures=` on any web URL — read once here so the habit and entry
 * repositories agree on which scenario is showing (scripts/visual-check.mjs).
 */
export function resolveFixtureScenario(): FixtureScenario {
	const search = globalThis.location?.search ?? "";
	const value = new URLSearchParams(search).get("fixtures");
	return value === "empty" || value === "rest-day" || value === "day-closed"
		? value
		: "default";
}

export const HABIT_FIXTURES: Habit[] = [
	{
		id: 1,
		name: "Evening walk",
		icon: "walk",
		color: "blue",
		category: "Evening",
		direction: "build",
		targetType: "simple",
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
export const REST_DAY_HABIT_FIXTURES: Habit[] = [
	{
		id: 1,
		name: "Evening walk",
		icon: "walk",
		color: "blue",
		category: "Evening",
		direction: "build",
		targetType: "simple",
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
export const DAY_CLOSED_HABIT_FIXTURES: Habit[] = [
	{
		id: 1,
		name: "Glass of water",
		icon: "drop",
		color: "teal",
		category: "Morning",
		direction: "build",
		targetType: "simple",
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
		frequency: {
			type: "weekdays",
			days: [((getISODay(new Date()) % 7) + 1) as IsoWeekday],
		},
		createdAt: FIXTURE_DATE,
		updatedAt: FIXTURE_DATE,
	},
];

export function habitFixturesFor(scenario: FixtureScenario): Habit[] {
	switch (scenario) {
		case "empty":
			return [];
		case "rest-day":
			return REST_DAY_HABIT_FIXTURES.map((habit) => ({ ...habit }));
		case "day-closed":
			return DAY_CLOSED_HABIT_FIXTURES.map((habit) => ({ ...habit }));
		default:
			return HABIT_FIXTURES.map((habit) => ({ ...habit }));
	}
}
