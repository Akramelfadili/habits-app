import { useMemo } from "react";
import { useCategories } from "../repositories/category-repository";
import { useHabitsList } from "../repositories/habit-repository";
import { categoryUsage } from "../services/category-rules";
import type { Category, CategoryUsage } from "../types";

export type ManageCategoriesView = {
	/** Locked, fixed order — shown first (HAB-25). */
	builtIns: CategoryUsage[];
	/** The user's own, in creation order — the picker's order too. */
	customs: CategoryUsage[];
	/** Every category — for the name schema's duplicate check and the add sheet's rotation pick. */
	categories: Category[];
};

/**
 * Manage Categories' reads (HAB-25): every category with its habits, counted
 * over every habit including archived ones — a delete moves those too.
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
