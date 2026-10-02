import { useCategories } from "../repositories/category-repository";

/** Every category, in picker order (HAB-24): built-ins, then customs by creation. */
export function useCategoryQueries() {
	const categories = useCategories();
	return { categories };
}
