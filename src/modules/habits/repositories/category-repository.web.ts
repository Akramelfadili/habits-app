import { useSyncExternalStore } from "react";
import { OTHER_CATEGORY_NAME } from "../constants";
import {
	categoryFixturesFor,
	FIXTURE_BUILT_IN_CATEGORIES,
	inMigrationOrder,
} from "../dev/category-fixtures";
import {
	habitFixturesFor,
	resolveFixtureScenario,
} from "../dev/habit-fixtures";
import type { Category, CreateCategoryInput, DeletedCategory } from "../types";
import type * as NativeCategoryRepository from "./category-repository";
import {
	applyCategoryChange,
	reassignHabitsToCategory,
} from "./habit-repository.web";

/**
 * Web-only stand-in for `category-repository.ts` (see `habit-repository.web.ts`
 * for why web runs on in-memory fixtures). `?fixtures=many-categories` gives
 * docs/mockups/hab-24-f1c.png's eight customs. The store is kept in the
 * stored group order (HAB-42): fixtures start in the order migration 0011
 * would give them, and a new category is appended (max + 1, as on device).
 */

let store: Category[] | undefined;
const listeners = new Set<() => void>();

function getCategoriesNow(): Category[] {
	if (!store) {
		const scenario = resolveFixtureScenario();
		store = inMigrationOrder(
			categoryFixturesFor(scenario),
			habitFixturesFor(scenario),
		);
	}
	return store;
}

function setCategories(next: Category[]) {
	store = next;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useCategories(): Category[] {
	return useSyncExternalStore(
		subscribe,
		getCategoriesNow,
		() => FIXTURE_BUILT_IN_CATEGORIES,
	);
}

export async function getCategories(): Promise<Category[]> {
	return getCategoriesNow();
}

export async function createCategory(
	input: CreateCategoryInput,
): Promise<Category> {
	const existing = getCategoriesNow();
	const category: Category = {
		id: Math.max(0, ...existing.map((c) => c.id)) + 1,
		name: input.name.trim(),
		shape: input.shape,
		hue: input.hue,
		builtIn: false,
	};
	// Appended: the array position is the stored order, so this is max + 1.
	setCategories([...existing, category]);
	return category;
}

function customCategory(id: number, action: string): Category {
	const category = getCategoriesNow().find((c) => c.id === id);
	if (!category) throw new Error(`Category ${id} not found`);
	if (category.builtIn) throw new Error(`Can't ${action} a built-in category`);
	return category;
}

export async function renameCategory(
	id: number,
	name: string,
): Promise<Category> {
	const renamed = { ...customCategory(id, "rename"), name: name.trim() };
	setCategories(getCategoriesNow().map((c) => (c.id === id ? renamed : c)));
	applyCategoryChange(renamed);
	return renamed;
}

export async function deleteCategory(id: number): Promise<DeletedCategory> {
	const category = customCategory(id, "delete");
	const sortOrder = getCategoriesNow().findIndex((c) => c.id === id);
	const other = getCategoriesNow().find(
		(c) => c.builtIn && c.name === OTHER_CATEGORY_NAME,
	);
	if (!other) throw new Error("The built-in Other category is missing");
	reassignHabitsToCategory(id, other);
	setCategories(getCategoriesNow().filter((c) => c.id !== id));
	return { category, sortOrder };
}

/** Puts a deleted category back where it stood (DC6's Undo). */
export async function restoreCategory(
	deleted: DeletedCategory,
): Promise<Category> {
	const existing = getCategoriesNow();
	const at = Math.min(deleted.sortOrder, existing.length);
	setCategories([
		...existing.slice(0, at),
		deleted.category,
		...existing.slice(at),
	]);
	return deleted.category;
}

/**
 * The stored order is the array order here: the movable categories in the new
 * order, then Other last (C2). Unknown ids are ignored.
 */
export async function reorderCategories(orderedIds: number[]): Promise<void> {
	const existing = getCategoriesNow();
	const byId = new Map(existing.map((c) => [c.id, c]));
	const moved = orderedIds.flatMap((id) => {
		const category = byId.get(id);
		return category ? [category] : [];
	});
	const rest = existing.filter(
		(c) => !orderedIds.includes(c.id) && c.name !== OTHER_CATEGORY_NAME,
	);
	const other = existing.filter((c) => c.name === OTHER_CATEGORY_NAME);
	setCategories([...moved, ...rest, ...other]);
}

// Compile-time guard: same exports as the native repository.
const _sameShape: typeof NativeCategoryRepository = {
	useCategories,
	getCategories,
	createCategory,
	renameCategory,
	deleteCategory,
	restoreCategory,
	reorderCategories,
};
void _sameShape;
