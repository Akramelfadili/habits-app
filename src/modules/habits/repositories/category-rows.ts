import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { builtInAppearance, OTHER_CATEGORY_NAME } from "../constants";
import type { Category } from "../types";

// Kept out of `category-repository.ts`'s exports so its `.web.ts` twin needn't mirror Drizzle details.

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

export const allCategoriesQuery = () =>
	db
		.select()
		.from(categories)
		.orderBy(asc(categories.sortOrder), asc(categories.id));

// A dangling `category_id` (SQLite isn't enforcing foreign keys on device) falls back to Other
// so the habit still shows rather than vanishing.
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
