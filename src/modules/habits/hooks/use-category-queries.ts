import { useCategories } from "../repositories/category-repository";

export function useCategoryQueries() {
	const categories = useCategories();
	return { categories };
}
