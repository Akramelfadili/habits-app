import { useCategories } from "../repositories/category-repository";

/**
 * Every category in the stored group order (HAB-42) — the order the form's
 * chips, the Categories screen and the Today and Habits groups all follow.
 */
export function useCategoryQueries() {
	const categories = useCategories();
	return { categories };
}
