import { useMemo } from "react";
import { inCreationOrder } from "../domain/category-rules";
import { useCategories } from "../repositories/category-repository";

/** Every category, in picker order (HAB-24): built-ins, then customs by creation. */
export function useCategoryQueries() {
	const stored = useCategories();
	const categories = useMemo(() => inCreationOrder(stored), [stored]);
	return { categories };
}
