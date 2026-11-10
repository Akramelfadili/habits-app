import { atIndex } from "@/utils/indexed";
import {
	BUILT_IN_CATEGORIES,
	CATEGORY_ROTATION,
	OTHER_CATEGORY_NAME,
} from "../constants";
import type { Category, CategoryAppearance, Habit } from "../types";
import type { FixtureScenario } from "./habit-fixtures";

/**
 * Static categories backing the web-only category repository: the same rows the
 * migration would produce, the ten built-ins (ids 1-10, in order), then customs in
 * creation order, each on its rotation slot.
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

/** The earlier ten-slot rotation the fixtures' customs were created on, before migration 0011. */
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

/**
 * Customs as an upgraded device has them: created on the earlier rotation (slot N for
 * the Nth), then put through migration 0011. One on a hue the current rotation dropped
 * moves, in id order, to the slot with the fewest customs (ties lowest); the rest keep
 * their look. So baselines change only where a phone would.
 */
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

/**
 * The first version's free-text fixture categories, as customs on earlier-rotation slots
 * 1-3 (fixed order, not first-seen); Morning then moves off 175.
 */
const V1_CUSTOM_FIXTURES = customFixtures(["Morning", "Evening", "Training"]);

export const OTHER_FIXTURE = builtInFixture("Other");
export const MORNING_FIXTURE = atIndex(V1_CUSTOM_FIXTURES, 0);
export const EVENING_FIXTURE = atIndex(V1_CUSTOM_FIXTURES, 1);
export const TRAINING_FIXTURE = atIndex(V1_CUSTOM_FIXTURES, 2);

/** The eight customs of the many-customs mockup, in its creation order. */
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
 * The category-usage mockup's customs: Music (3 habits, one archived), Language (1) and
 * Garden (unused). One variant shows only Music.
 */
const F3C_CUSTOM_FIXTURES = customFixtures(["Music", "Language", "Garden"]);
export const MUSIC_FIXTURE = atIndex(F3C_CUSTOM_FIXTURES, 0);
export const LANGUAGE_FIXTURE = atIndex(F3C_CUSTOM_FIXTURES, 1);
const GARDEN_FIXTURE = atIndex(F3C_CUSTOM_FIXTURES, 2);

/**
 * The picker's rows per `?fixtures=` scenario: no customs where nothing exists yet
 * (built-ins only), many for the many-customs frame.
 */
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

/**
 * The order migration 0011 would store for these rows: first appearance among active
 * habits in manual order, then among archived ones, then unused categories by id; Other
 * last. The web repository starts from this, so fixtures group exactly as a migrated
 * device would.
 */
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
