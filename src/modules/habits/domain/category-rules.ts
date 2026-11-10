import { atIndex } from "@/utils/indexed";
import { CATEGORY_ROTATION, OTHER_CATEGORY_NAME } from "../constants";
import type {
	Category,
	CategoryAppearance,
	CategoryUsage,
	Habit,
} from "../types";

/** The comparison key for category names: surrounding whitespace and case don't count. */
function nameKey(name: string): string {
	return name.trim().toLowerCase();
}

/**
 * The existing category a name would clash with, if any (HAB-24) — matching
 * ignores case and surrounding whitespace and includes the built-ins, so
 * " health " collides with "Health". `ignoreId` lets a rename (HAB-25) keep
 * its own name without colliding with itself.
 */
export function findDuplicateCategory(
	categories: readonly Category[],
	name: string,
	ignoreId?: number,
): Category | undefined {
	const key = nameKey(name);
	if (key === "") return undefined;
	return categories.find(
		(category) => category.id !== ignoreId && nameKey(category.name) === key,
	);
}

function sameAppearance(a: CategoryAppearance, b: CategoryAppearance): boolean {
	return a.shape === b.shape && a.hue === b.hue;
}

/**
 * The icon/color the next custom category gets (HAB-24): the rotation slot
 * fewest existing customs are on, ties going to the lowest slot. Creating
 * from scratch walks the slots in order (the Nth custom gets slot N); after a
 * delete (HAB-25) the freed slot is reused before any pair repeats; past six
 * customs it wraps around evenly. Pure, so the add sheet's live preview and
 * the created row are the same pick.
 *
 * Only customs are counted, by design: no rotation hue equals a built-in's
 * (V3 dropped 175 and 230 for Health and Social, and the red 15 and 350), but
 * several sit 10–20° from one (slot 2 · 95 vs Finance · 110, slot 3 · 220 vs
 * Social · 230 and Creativity · 200, slot 4 · 265 vs Productivity · 255,
 * slot 6 · 290 vs Mindfulness · 300).
 * That's the design table (design-system.md), told apart by shape as well
 * as hue — not a bug in this pick. Change the table, not this function.
 */
export function nextCategoryAppearance(
	categories: readonly Category[],
): CategoryAppearance {
	const customs = categories.filter((category) => !category.builtIn);
	const uses = CATEGORY_ROTATION.map(
		(slot) => customs.filter((custom) => sameAppearance(custom, slot)).length,
	);
	const fewest = Math.min(...uses);
	return atIndex(CATEGORY_ROTATION, uses.indexOf(fewest));
}

/**
 * Each category with the habits in it (HAB-25), in the categories' own order.
 * Pass every habit, archived ones included — a delete moves those too, so
 * counting only active habits would undercount what's affected.
 */
export function categoryUsage(
	categories: readonly Category[],
	habits: readonly Habit[],
): CategoryUsage[] {
	return categories.map((category) => {
		const inCategory = habits.filter(
			(habit) => habit.category.id === category.id,
		);
		const archivedCount = inCategory.filter(
			(habit) => habit.archivedAt !== null,
		).length;
		return {
			category,
			habitNames: inCategory.map((habit) => habit.name),
			activeCount: inCategory.length - archivedCount,
			archivedCount,
		};
	});
}

/**
 * The categories a person can put in a new order (C2): all but the built-in
 * Other, which always stays last. Custom and built-in mix freely — the order
 * is the one Today and Habits group by.
 */
export function movableCategories(categories: readonly Category[]): Category[] {
	return categories.filter(
		(category) => !(category.builtIn && category.name === OTHER_CATEGORY_NAME),
	);
}
