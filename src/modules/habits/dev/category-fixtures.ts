import { atIndex } from "@/utils/indexed";
import {
	BUILT_IN_CATEGORIES,
	CATEGORY_ROTATION,
	OTHER_CATEGORY_NAME,
} from "../constants";
import type { Category, CategoryAppearance, Habit } from "../types";
import type { FixtureScenario } from "./habit-fixtures";

export const FIXTURE_BUILT_IN_CATEGORIES: Category[] = BUILT_IN_CATEGORIES.map(
	(builtIn, index) => ({
		id: index + 1,
		name: builtIn.name,
		shape: builtIn.shape,
		hue: builtIn.hue,
		builtIn: true,
	}),
);

const V2_ROTATION: readonly CategoryAppearance[] = [
	{ shape: "diamond", hue: 175 },
	{ shape: "ring", hue: 330 },
	{ shape: "square", hue: 95 },
	{ shape: "bars", hue: 220 },
	{ shape: "dot", hue: 15 },
	{ shape: "plus", hue: 265 },
	{ shape: "half", hue: 130 },
	{ shape: "lines", hue: 350 },
	{ shape: "grid", hue: 230 },
	{ shape: "archive", hue: 290 },
];

const sameLook = (a: CategoryAppearance, b: CategoryAppearance) =>
	a.shape === b.shape && a.hue === b.hue;

// Customs as an upgraded device has them (created on the earlier rotation, then migrated), so
// visual baselines change only where a phone would.
function customFixtures(names: string[]): Category[] {
	const created = names.map((name, index) => ({
		id: FIXTURE_BUILT_IN_CATEGORIES.length + index + 1,
		name,
		...atIndex(V2_ROTATION, index % V2_ROTATION.length),
		builtIn: false,
	}));
	const kept = (category: Category) =>
		CATEGORY_ROTATION.some((slot) => sameLook(slot, category));
	const result = created.map((category) => ({ ...category }));
	for (const category of result) {
		if (kept(category)) continue;
		const uses = CATEGORY_ROTATION.map(
			(slot) =>
				result.filter((other) => kept(other) && sameLook(other, slot)).length,
		);
		Object.assign(
			category,
			atIndex(CATEGORY_ROTATION, uses.indexOf(Math.min(...uses))),
		);
	}
	return result;
}

export function builtInFixture(name: string): Category {
	const category = FIXTURE_BUILT_IN_CATEGORIES.find((c) => c.name === name);
	if (!category) throw new Error(`No built-in fixture "${name}"`);
	return category;
}

const V1_CUSTOM_FIXTURES = customFixtures(["Morning", "Evening", "Training"]);

export const OTHER_FIXTURE = builtInFixture("Other");
export const MORNING_FIXTURE = atIndex(V1_CUSTOM_FIXTURES, 0);
export const EVENING_FIXTURE = atIndex(V1_CUSTOM_FIXTURES, 1);
export const TRAINING_FIXTURE = atIndex(V1_CUSTOM_FIXTURES, 2);

const MANY_CUSTOM_FIXTURES = customFixtures([
	"Music",
	"Language",
	"Garden",
	"Kids",
	"Side project",
	"Cooking",
	"Volunteering",
	"Pets",
]);

const F3C_CUSTOM_FIXTURES = customFixtures(["Music", "Language", "Garden"]);
export const MUSIC_FIXTURE = atIndex(F3C_CUSTOM_FIXTURES, 0);
export const LANGUAGE_FIXTURE = atIndex(F3C_CUSTOM_FIXTURES, 1);
const GARDEN_FIXTURE = atIndex(F3C_CUSTOM_FIXTURES, 2);

export function categoryFixturesFor(scenario: FixtureScenario): Category[] {
	switch (scenario) {
		case "empty":
		case "first-run":
		case "categories-built-in-only":
			return [...FIXTURE_BUILT_IN_CATEGORIES];
		case "categories-one-custom":
			return [...FIXTURE_BUILT_IN_CATEGORIES, MUSIC_FIXTURE];
		case "categories-in-use":
			return [
				...FIXTURE_BUILT_IN_CATEGORIES,
				MUSIC_FIXTURE,
				LANGUAGE_FIXTURE,
				GARDEN_FIXTURE,
			];
		case "many-categories":
			return [...FIXTURE_BUILT_IN_CATEGORIES, ...MANY_CUSTOM_FIXTURES];
		default:
			return [...FIXTURE_BUILT_IN_CATEGORIES, ...V1_CUSTOM_FIXTURES];
	}
}

// The order the migration would store, so fixtures group exactly as a migrated device would.
export function inMigrationOrder(
	categories: readonly Category[],
	habits: readonly Habit[],
): Category[] {
	const manual = [...habits].sort(
		(a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
	);
	const firstSeen = new Map<number, number>();
	const record = (list: Habit[]) => {
		for (const habit of list) {
			if (!firstSeen.has(habit.category.id))
				firstSeen.set(habit.category.id, firstSeen.size);
		}
	};
	record(manual.filter((habit) => habit.archivedAt === null));
	record(manual.filter((habit) => habit.archivedAt !== null));
	const isOther = (category: Category) =>
		category.builtIn && category.name === OTHER_CATEGORY_NAME;
	const rank = (category: Category) => firstSeen.get(category.id) ?? Infinity;
	return [...categories].sort(
		(a, b) =>
			Number(isOther(a)) - Number(isOther(b)) ||
			rank(a) - rank(b) ||
			a.id - b.id,
	);
}
