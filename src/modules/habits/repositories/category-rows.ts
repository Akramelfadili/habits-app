import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { builtInAppearance, OTHER_CATEGORY_NAME } from "../constants";
import type { Category } from "../types";

/**
 * Native-only internals shared by the category and habit repositories — kept
 * out of `category-repository.ts`'s exports so its `.web.ts` counterpart
 * doesn't have to mirror Drizzle details.
 */

type CategoryRow = typeof categories.$inferSelect;

export function rowToCategory(row: CategoryRow): Category {
	return {
		id: row.id,
		name: row.name,
		shape: row.shape,
		hue: row.hue,
		builtIn: row.builtIn,
	};
}

/**
 * Every category in picker order (HAB-24): autoincrement ids put the
 * migration-seeded built-ins first, then customs in creation order.
 */
export const allCategoriesQuery = () =>
	db.select().from(categories).orderBy(asc(categories.id));

/**
 * A habit's category from the loaded set — or, if its `category_id` matches
 * nothing (a dangling id; SQLite isn't enforcing foreign keys on device),
 * the built-in Other, so the habit still shows rather than vanishing. Other
 * is seeded by migration and can't be deleted; the constant is only a guard.
 */
export function resolveHabitCategory(
	categoryId: number,
	loaded: ReadonlyMap<number, Category>,
): Category {
	const found = loaded.get(categoryId);
	if (found) return found;
	for (const category of loaded.values()) {
		if (category.builtIn && category.name === OTHER_CATEGORY_NAME) {
			return category;
		}
	}
	return {
		id: 0,
		name: OTHER_CATEGORY_NAME,
		...builtInAppearance(OTHER_CATEGORY_NAME),
		builtIn: true,
	};
}
