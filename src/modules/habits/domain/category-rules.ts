import { atIndex } from "@/utils/indexed";
import { CATEGORY_ROTATION, OTHER_CATEGORY_NAME } from "../constants";
import type {
	Category,
	CategoryAppearance,
	CategoryUsage,
	Habit,
} from "../types";

function nameKey(name: string): string {
	return name.trim().toLowerCase();
}

export function findDuplicateCategory(
	categories: readonly Category[],
	name: string,
	ignoreId?: number,
): Category | undefined {
	const key = nameKey(name);
	if (key === "") return undefined;
	return categories.find(
		(category) => category.id !== ignoreId && nameKey(category.name) === key,
	);
}

function sameAppearance(a: CategoryAppearance, b: CategoryAppearance): boolean {
	return a.shape === b.shape && a.hue === b.hue;
}

// Pure, so the add sheet's live preview and the created row are the same pick. Only customs
// are counted by design: some rotation hues sit 10-20 degrees from a built-in's and are told
// apart by shape. Change the table, not this function.
export function nextCategoryAppearance(
	categories: readonly Category[],
): CategoryAppearance {
	const customs = categories.filter((category) => !category.builtIn);
	const uses = CATEGORY_ROTATION.map(
		(slot) => customs.filter((custom) => sameAppearance(custom, slot)).length,
	);
	const fewest = Math.min(...uses);
	return atIndex(CATEGORY_ROTATION, uses.indexOf(fewest));
}

// Pass archived habits too: a delete moves them, so counting only active would undercount.
export function categoryUsage(
	categories: readonly Category[],
	habits: readonly Habit[],
): CategoryUsage[] {
	return categories.map((category) => {
		const inCategory = habits.filter(
			(habit) => habit.category.id === category.id,
		);
		const archivedCount = inCategory.filter(
			(habit) => habit.archivedAt !== null,
		).length;
		return {
			category,
			habitNames: inCategory.map((habit) => habit.name),
			activeCount: inCategory.length - archivedCount,
			archivedCount,
		};
	});
}

// Other always stays last, so it isn't reorderable.
export function movableCategories(categories: readonly Category[]): Category[] {
	return categories.filter(
		(category) => !(category.builtIn && category.name === OTHER_CATEGORY_NAME),
	);
}
