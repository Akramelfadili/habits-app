import { z } from "zod";
import { MAX_CATEGORY_NAME_LENGTH } from "../constants";
import { findDuplicateCategory } from "../services/category-rules";
import type { Category } from "../types";

export const NO_CATEGORY_NAME_MESSAGE = "Add a name to create this category";

/** NEW-24 error copy for a clash (HAB-24) — names the existing chip to pick instead. */
export function duplicateCategoryMessage(existing: Category): string {
	return `You already have ${existing.name}. Pick it from the list instead.`;
}

/** The same clash on rename (HAB-25) — there's no list to pick from there. */
export function duplicateRenameMessage(existing: Category): string {
	return `You already have ${existing.name}. Choose a different name.`;
}

/**
 * The add-category name (HAB-24; HAB-25's rename reuses it with `ignoreId`):
 * trimmed, 1–20 characters, and not a duplicate of any category — built-ins
 * included, ignoring case and surrounding whitespace.
 */
export function makeCategoryNameSchema(
	categories: readonly Category[],
	ignoreId?: number,
) {
	return z.object({
		name: z
			.string()
			.trim()
			.min(1, NO_CATEGORY_NAME_MESSAGE)
			.max(MAX_CATEGORY_NAME_LENGTH)
			.superRefine((name, ctx) => {
				const existing = findDuplicateCategory(categories, name, ignoreId);
				if (existing) {
					ctx.addIssue({
						code: "custom",
						message: duplicateCategoryMessage(existing),
					});
				}
			}),
	});
}

export type CategoryNameFormValues = z.infer<
	ReturnType<typeof makeCategoryNameSchema>
>;
