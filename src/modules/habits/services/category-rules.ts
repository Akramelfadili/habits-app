import { CATEGORY_ROTATION } from "../constants";
import type { Category, CategoryAppearance } from "../types";

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
 * delete (HAB-25) the freed slot is reused before any pair repeats; past ten
 * customs it wraps around evenly. Pure, so the add sheet's live preview and
 * the created row are the same pick.
 *
 * Only customs are counted, by design: built-ins never share a rotation pair,
 * but several rotation hues sit 5–15° from a built-in's (slot 3 · 95 vs
 * Finance · 110, slot 5 · 15 vs Health · 25, slot 6 · 265 vs Productivity ·
 * 255, slot 8 · 350 vs Social · 345, slot 10 · 290 vs Mindfulness · 300).
 * That's the design table (design-system-v2.md), told apart by shape as well
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
	return CATEGORY_ROTATION[uses.indexOf(fewest)];
}
