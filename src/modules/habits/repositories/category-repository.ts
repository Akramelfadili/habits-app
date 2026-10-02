import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import type { Category, CreateCategoryInput } from "../types";
import { allCategoriesQuery, rowToCategory } from "./category-rows";

/** Live-query hook — every category in picker order (HAB-24): built-ins, then customs by creation. */
export function useCategories(): Category[] {
	const { data } = useLiveQuery(allCategoriesQuery());
	return (data ?? []).map(rowToCategory);
}

/** One-off read — e.g. resolving built-ins by name outside a component. */
export async function getCategories(): Promise<Category[]> {
	const rows = await allCategoriesQuery();
	return rows.map(rowToCategory);
}

/**
 * Creates a custom category. Its icon/color come from the caller — the same
 * rotation pick the add-category sheet previewed — so what was shown is
 * exactly what's created. Name validation (length, duplicates) happens before
 * this, in the form schema.
 */
export async function createCategory(
	input: CreateCategoryInput,
): Promise<Category> {
	const [row] = await db
		.insert(categories)
		.values({
			name: input.name.trim(),
			shape: input.shape,
			hue: input.hue,
			builtIn: false,
			createdAt: new Date(),
		})
		.returning();
	return rowToCategory(row);
}
