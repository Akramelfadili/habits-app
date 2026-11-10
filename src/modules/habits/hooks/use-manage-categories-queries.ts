import { useMemo } from "react";
import { categoryUsage } from "../domain/category-rules";
import { useCategories } from "../repositories/category-repository";
import { useHabitsList } from "../repositories/habit-repository";
import type { Category, CategoryUsage } from "../types";

export type ManageCategoriesView = {
	builtIns: CategoryUsage[];
	customs: CategoryUsage[];
	/** Every category in the stored order — for the duplicate check, the add sheet's rotation pick and the reorder list. */
	categories: Category[];
};

/**
 * The Categories screen's reads: every category with its habits, counted over every habit
 * including archived ones, since a delete moves those too.
 */
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
