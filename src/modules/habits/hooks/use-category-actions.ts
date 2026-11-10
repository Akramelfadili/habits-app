import { failureMessage, UNDO_FAILED_MESSAGE } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import {
	createCategory,
	deleteCategory,
	renameCategory,
	reorderCategories,
	restoreCategory,
} from "../repositories/category-repository";

/**
 * Category writes, each a single repository call (delete's reassign-to-Other is one transaction
 * inside it), so no service in between.
 */
export function useCategoryActions() {
	const create = useAsyncAction(createCategory, { scope: "categories" });
	const rename = useAsyncAction(renameCategory, { scope: "categories" });
	const remove = useAsyncAction(deleteCategory, {
		scope: "categories",
		failure: failureMessage("delete", "this category"),
	});

	const restore = useAsyncAction(restoreCategory, {
		scope: "categories",
		failure: UNDO_FAILED_MESSAGE,
	});
	const reorder = useAsyncAction(reorderCategories, {
		scope: "categories",
		failure: failureMessage("reorder", "the categories"),
	});

	return {
		createCategory: create.execute,
		isCreating: create.isLoading,
		createError: create.error,
		renameCategory: rename.execute,
		isRenaming: rename.isLoading,
		deleteCategory: remove.run,
		isDeleting: remove.isLoading,
		restoreCategory: restore.run,
		reorderCategories: reorder.run,
	};
}
