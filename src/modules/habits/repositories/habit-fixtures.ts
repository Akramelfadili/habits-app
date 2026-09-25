import type { Habit } from "../types";

/**
 * Static fake habits backing the web-only repository (`habit-repository.web.ts`).
 * Web exists purely for visual checks against docs/mockups/, so this covers the
 * variety a screen needs to render: build + break, with and without category,
 * several accents and icons, and every frequency type (#1 matches the mockup's
 * Mon–Fri specific-weekdays selection). Ids are stable so `/edit-habit/1` always resolves.
 */
const FIXTURE_DATE = new Date("2026-09-16T08:00:00Z");

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
