import { BUILT_IN_CATEGORIES, CATEGORY_ROTATION } from "../constants";
import type { Category } from "../types";
import type { FixtureScenario } from "./habit-fixtures";

/**
 * Static categories backing the web-only category repository — the same rows
 * the HAB-24 migration would produce: the ten built-ins (ids 1–10, in order),
 * then customs in creation order, each on its rotation slot.
 */
export const FIXTURE_BUILT_IN_CATEGORIES: Category[] = BUILT_IN_CATEGORIES.map(
	(builtIn, index) => ({
		id: index + 1,
		name: builtIn.name,
		shape: builtIn.shape,
		hue: builtIn.hue,
		builtIn: true,
	}),
);

function customFixtures(names: string[]): Category[] {
	return names.map((name, index) => ({
		id: FIXTURE_BUILT_IN_CATEGORIES.length + index + 1,
		name,
		...CATEGORY_ROTATION[index % CATEGORY_ROTATION.length],
		builtIn: false,
	}));
}

function builtInFixture(name: string): Category {
	const category = FIXTURE_BUILT_IN_CATEGORIES.find((c) => c.name === name);
	if (!category) throw new Error(`No built-in fixture "${name}"`);
	return category;
}

/** V1 fixture habits' free-text categories, as customs on rotation slots 1–3 (fixed order, not first-seen). */
const V1_CUSTOM_FIXTURES = customFixtures(["Morning", "Evening", "Training"]);

export const OTHER_FIXTURE = builtInFixture("Other");
export const [MORNING_FIXTURE, EVENING_FIXTURE, TRAINING_FIXTURE] =
	V1_CUSTOM_FIXTURES;

/** docs/mockups/hab-24-f1c.png's eight customs, in its creation order. */
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

/**
 * The picker's rows per `?fixtures=` scenario: no customs where nothing exists
 * yet (the picker mockups F1a/F2a start with built-ins only), many for F1c.
 */
export function categoryFixturesFor(scenario: FixtureScenario): Category[] {
	switch (scenario) {
		case "empty":
		case "first-run":
			return [...FIXTURE_BUILT_IN_CATEGORIES];
		case "many-categories":
			return [...FIXTURE_BUILT_IN_CATEGORIES, ...MANY_CUSTOM_FIXTURES];
		default:
			return [...FIXTURE_BUILT_IN_CATEGORIES, ...V1_CUSTOM_FIXTURES];
	}
}
