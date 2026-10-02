import { useAsyncAction } from "@/utils/use-async-action";
import { createCategory } from "../repositories/category-repository";

/** Category writes (HAB-24) — a single insert, so no service in between. */
export function useCategoryActions() {
	const create = useAsyncAction(createCategory);

	return {
		createCategory: create.execute,
		isCreating: create.isLoading,
		createError: create.error,
	};
}
