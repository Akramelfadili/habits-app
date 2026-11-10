import { and, asc, eq, max, sql } from "drizzle-orm";
import { useMemo } from "react";
import { db } from "@/lib/db/client";
import { categories, habits } from "@/lib/db/schema";
import { rollbackQuietly } from "@/lib/db/transaction";
import { useLiveRows } from "@/lib/db/use-live-rows";
import { present } from "@/utils/indexed";
import { OTHER_CATEGORY_NAME } from "../constants";
import type { Category, CreateCategoryInput, DeletedCategory } from "../types";
import { allCategoriesQuery, rowToCategory } from "./category-rows";

export function useCategories(): Category[] {
	const { data } =
		useLiveRows<typeof categories.$inferSelect>(allCategoriesQuery);
	return useMemo(() => data.map(rowToCategory), [data]);
}

export async function getCategories(): Promise<Category[]> {
	const rows = await allCategoriesQuery();
	return rows.map(rowToCategory);
}

// Icon/color come from the caller so what the sheet previewed is exactly what's created.
// Name validation happens before this, in the form schema.
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

async function customCategoryRow(id: number, action: string) {
	const [row] = await db.select().from(categories).where(eq(categories.id, id));
	if (!row) throw new Error(`Category ${id} not found`);
	if (row.builtIn) throw new Error(`Can't ${action} a built-in category`);
	return row;
}

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

// Moved habits go to the end of the manual order, keeping their relative order, so they land
// last in Other without colliding with anyone's sort slot.
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

// Other is set to n + 1 so it stays last; a later new category (max + 1) can only land after
// it, where the groups still force Other to the end.
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
