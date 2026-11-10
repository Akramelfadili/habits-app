import { z } from "zod";
import { MAX_CATEGORY_NAME_LENGTH } from "../constants";
import { findDuplicateCategory } from "../domain/category-rules";
import { categoriesCopy } from "../messages";
import type { Category } from "../types";

export function makeCategoryNameSchema(
	categories: readonly Category[],
	ignoreId?: number,
) {
	return z.object({
		name: z
			.string()
			.trim()
			.min(1, categoriesCopy.addSheet.needsName)
			.max(MAX_CATEGORY_NAME_LENGTH)
			.superRefine((name, ctx) => {
				const existing = findDuplicateCategory(categories, name, ignoreId);
				if (existing) {
					ctx.addIssue({
						code: "custom",
						message: categoriesCopy.duplicate(existing.name),
					});
				}
			}),
	});
}

export type CategoryNameFormValues = z.infer<
	ReturnType<typeof makeCategoryNameSchema>
>;
