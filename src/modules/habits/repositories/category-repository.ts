import { and, asc, eq, max, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, habits } from "@/lib/db/schema";
import { rollbackQuietly } from "@/lib/db/transaction";
import { useLiveRows } from "@/lib/db/use-live-rows";
import { present } from "@/utils/indexed";
import { OTHER_CATEGORY_NAME } from "../constants";
import type { Category, CreateCategoryInput, DeletedCategory } from "../types";
import { allCategoriesQuery, rowToCategory } from "./category-rows";

/** Live-query hook — every category in the stored group order (HAB-42). */
export function useCategories(): Category[] {
	const { data } = useLiveRows<typeof categories.$inferSelect>(
		allCategoriesQuery(),
	);
	return data.map(rowToCategory);
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
 * this, in the form schema. It goes last in the stored order (max + 1, read in
 * the same statement).
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
			sortOrder: sql`(SELECT coalesce(max(${categories.sortOrder}), 0) + 1 FROM ${categories})`,
			createdAt: new Date(),
		})
		.returning();
	return rowToCategory(present(row, "the category row"));
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
	return rowToCategory(present(row, "the category row"));
}

/**
 * Deletes a custom category (HAB-25), moving every habit in it — archived
 * ones too — to the built-in Other, in one transaction: either all of them
 * move and the category goes, or nothing changes. Moved habits go to the end
 * of the manual order, keeping their relative order, so they land last in
 * Other's group without colliding with anyone's sort slot.
 */
export async function deleteCategory(id: number): Promise<DeletedCategory> {
	const deleted = await customCategoryRow(id, "delete");
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
		return { category: rowToCategory(deleted), sortOrder: deleted.sortOrder };
	} catch (err) {
		await rollbackQuietly();
		throw err;
	}
}

/**
 * The Undo for deleting a category nobody used (DC6): the same row (id, look,
 * place in the order) goes back. Habits are untouched — none were in it.
 */
export async function restoreCategory(
	deleted: DeletedCategory,
): Promise<Category> {
	const { category, sortOrder } = deleted;
	const [row] = await db
		.insert(categories)
		.values({
			id: category.id,
			name: category.name,
			shape: category.shape,
			hue: category.hue,
			builtIn: false,
			sortOrder,
			createdAt: new Date(),
		})
		.returning();
	return rowToCategory(present(row, "the category row"));
}

/**
 * Stores a new group order (C2): `orderedIds` are every movable category — all
 * but the built-in Other — in the order the person left them, numbered 1…n in
 * one transaction. Other is then set to n + 1, so it stays last and a later
 * new category (max + 1) can only land after it, where the groups still force
 * Other to the end.
 */
export async function reorderCategories(orderedIds: number[]): Promise<void> {
	await db.run(sql`begin`);
	try {
		for (const [index, id] of orderedIds.entries()) {
			await db
				.update(categories)
				.set({ sortOrder: index + 1 })
				.where(eq(categories.id, id));
		}
		await db
			.update(categories)
			.set({ sortOrder: orderedIds.length + 1 })
			.where(
				and(
					eq(categories.builtIn, true),
					eq(categories.name, OTHER_CATEGORY_NAME),
				),
			);
		await db.run(sql`commit`);
	} catch (err) {
		await rollbackQuietly();
		throw err;
	}
}
