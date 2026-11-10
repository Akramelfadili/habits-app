import { useMemo } from "react";
import { categoryUsage } from "../domain/category-rules";
import { useCategories } from "../repositories/category-repository";
import { useHabitsList } from "../repositories/habit-repository";
import type { Category, CategoryUsage } from "../types";

export type ManageCategoriesView = {
	builtIns: CategoryUsage[];
	customs: CategoryUsage[];
	categories: Category[];
};

// Counted over archived habits too: a delete moves those as well.
export function useManageCategoriesQueries(): ManageCategoriesView {
	const categories = useCategories();
	const { habits } = useHabitsList();
	return useMemo(() => {
		const usage = categoryUsage(categories, habits);
		return {
			builtIns: usage.filter((row) => row.category.builtIn),
			customs: usage.filter((row) => !row.category.builtIn),
			categories,
		};
	}, [categories, habits]);
}
