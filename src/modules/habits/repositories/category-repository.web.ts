import { useSyncExternalStore } from "react";
import type { Category, CreateCategoryInput } from "../types";
import {
	categoryFixturesFor,
	FIXTURE_BUILT_IN_CATEGORIES,
} from "./category-fixtures";
import type * as NativeCategoryRepository from "./category-repository";
import { resolveFixtureScenario } from "./habit-fixtures";

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
	store = [...existing, category];
	for (const listener of listeners) listener();
	return category;
}

// Compile-time guard: same exports as the native repository.
const _sameShape: typeof NativeCategoryRepository = {
	useCategories,
	getCategories,
	createCategory,
};
void _sameShape;
