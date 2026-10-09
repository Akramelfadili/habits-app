import { failureMessage, UNDO_FAILED_MESSAGE } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { reorderHabits } from "../repositories/habit-repository";
import {
	archiveHabit,
	restoreHabit,
	undoRestoreHabit,
} from "../services/habit-lifecycle-service";

/**
 * Manage & Archive's writes (HAB-13). Reorder is a single write, straight to
 * the repository; archive and restore also move the habit's notifications,
 * so they go through the lifecycle service.
 */
export function useManageHabitsActions() {
	const reorder = useAsyncAction(reorderHabits, {
		scope: "manage",
		failure: failureMessage("reorder", "your habits"),
	});
	const archive = useAsyncAction(archiveHabit, {
		scope: "manage",
		failure: failureMessage("archive", "this habit"),
	});
	const restore = useAsyncAction(restoreHabit, {
		scope: "manage",
		failure: failureMessage("restore", "this habit"),
	});

	const undoRestore = useAsyncAction(undoRestoreHabit, {
		scope: "manage",
		failure: UNDO_FAILED_MESSAGE,
	});

	return {
		reorderHabits: reorder.run,
		archiveHabit: archive.run,
		restoreHabit: restore.run,
		undoRestoreHabit: undoRestore.run,
		isRestoring: restore.isLoading,
	};
}
