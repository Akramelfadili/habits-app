import { and, asc, eq, max, sql } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "@/lib/db/client";
import { categories, habits } from "@/lib/db/schema";
import { OTHER_CATEGORY_NAME } from "../constants";
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

/** The custom category `id` — built-ins are locked (HAB-25), so they never get past this. */
async function customCategoryRow(id: number, action: string) {
	const [row] = await db.select().from(categories).where(eq(categories.id, id));
	if (!row) throw new Error(`Category ${id} not found`);
	if (row.builtIn) throw new Error(`Can't ${action} a built-in category`);
	return row;
}

/**
 * Renames a custom category (HAB-25). Name validation (length, duplicates
 * including built-ins) happens before this, in the same form schema as
 * creating one.
 */
export async function renameCategory(
	id: number,
	name: string,
): Promise<Category> {
	await customCategoryRow(id, "rename");
	const [row] = await db
		.update(categories)
		.set({ name: name.trim() })
		.where(eq(categories.id, id))
		.returning();
	return rowToCategory(row);
}

/**
 * Deletes a custom category (HAB-25), moving every habit in it — archived
 * ones too — to the built-in Other, in one transaction: either all of them
 * move and the category goes, or nothing changes. Moved habits go to the end
 * of the manual order, keeping their relative order, so they land last in
 * Other's group without colliding with anyone's sort slot.
 */
export async function deleteCategory(id: number): Promise<void> {
	await customCategoryRow(id, "delete");
	const [other] = await db
		.select()
		.from(categories)
		.where(
			and(
				eq(categories.builtIn, true),
				eq(categories.name, OTHER_CATEGORY_NAME),
			),
		);
	if (!other) throw new Error("The built-in Other category is missing");

	// Same raw begin/commit as the habit repository's multi-row writes.
	await db.run(sql`begin`);
	try {
		const moving = await db
			.select({ id: habits.id })
			.from(habits)
			.where(eq(habits.categoryId, id))
			.orderBy(asc(habits.sortOrder), asc(habits.id));
		const [last] = await db
			.select({ value: max(habits.sortOrder) })
			.from(habits);
		const base = last?.value ?? 0;
		for (const [index, habit] of moving.entries()) {
			await db
				.update(habits)
				.set({ categoryId: other.id, sortOrder: base + index + 1 })
				.where(eq(habits.id, habit.id));
		}
		await db.delete(categories).where(eq(categories.id, id));
		await db.run(sql`commit`);
	} catch (err) {
		await db.run(sql`rollback`);
		throw err;
	}
}
