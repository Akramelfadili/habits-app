import { useSyncExternalStore } from "react";
import { OTHER_CATEGORY_NAME } from "../constants";
import type { Category, CreateCategoryInput } from "../types";
import {
	categoryFixturesFor,
	FIXTURE_BUILT_IN_CATEGORIES,
} from "./category-fixtures";
import type * as NativeCategoryRepository from "./category-repository";
import { resolveFixtureScenario } from "./habit-fixtures";
import {
	applyCategoryChange,
	reassignHabitsToCategory,
} from "./habit-repository.web";

/**
 * Web-only stand-in for `category-repository.ts` (see `habit-repository.web.ts`
 * for why web runs on in-memory fixtures). `?fixtures=many-categories` gives
 * docs/mockups/hab-24-f1c.png's eight customs.
 */

let store: Category[] | undefined;
const listeners = new Set<() => void>();

function getCategoriesNow(): Category[] {
	store ??= categoryFixturesFor(resolveFixtureScenario());
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

export async function deleteCategory(id: number): Promise<void> {
	customCategory(id, "delete");
	const other = getCategoriesNow().find(
		(c) => c.builtIn && c.name === OTHER_CATEGORY_NAME,
	);
	if (!other) throw new Error("The built-in Other category is missing");
	reassignHabitsToCategory(id, other);
	setCategories(getCategoriesNow().filter((c) => c.id !== id));
}

// Compile-time guard: same exports as the native repository.
const _sameShape: typeof NativeCategoryRepository = {
	useCategories,
	getCategories,
	createCategory,
	renameCategory,
	deleteCategory,
};
void _sameShape;
