import { failureMessage, UNDO_FAILED_MESSAGE } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import {
	archiveHabit,
	deleteHabit,
	restoreHabit,
	undoRestoreHabit,
} from "../services/habit-lifecycle-service";

/**
 * Habit Detail's lifecycle writes (HAB-13): one-tap Archive, Delete (only
 * offered here, behind a confirmation), and Restore — which backs the
 * archive toast's Undo after Detail has already closed, and is itself
 * instant with its own Undo (`undoRestoreHabit`, HAB-20).
 */
export function useHabitDetailActions() {
	const archive = useAsyncAction(archiveHabit, {
		scope: "habit-detail",
		failure: failureMessage("archive", "this habit"),
	});
	const remove = useAsyncAction(deleteHabit, {
		scope: "habit-detail",
		failure: failureMessage("delete", "this habit"),
	});
	const restore = useAsyncAction(restoreHabit, {
		scope: "habit-detail",
		failure: failureMessage("restore", "this habit"),
	});
	const undoRestore = useAsyncAction(undoRestoreHabit, {
		scope: "habit-detail",
		failure: UNDO_FAILED_MESSAGE,
	});

	return {
		archiveHabit: archive.run,
		/** For a screen with no ToastHost (the Edit modal) that shows the failure inline itself. */
		archiveHabitOrThrow: archive.execute,
		isArchiving: archive.isLoading,
		deleteHabit: remove.run,
		isDeleting: remove.isLoading,
		restoreHabit: restore.run,
		isRestoring: restore.isLoading,
		undoRestoreHabit: undoRestore.run,
	};
}
