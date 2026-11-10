import { useState } from "react";
import { failureMessage, UNDO_FAILED_MESSAGE } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import {
	archiveHabit,
	deleteHabit,
	restoreHabit,
	undoRestoreHabit,
} from "../services/habit-lifecycle-service";

/**
 * Habit Detail's lifecycle writes: Archive (behind its sheet), Delete (behind its own, where a
 * failure is shown in the sheet and not as a toast), and Restore, which is instant and has its
 * own Undo (`undoRestoreHabit`). Archive also backs the archive toast's Undo, after Detail has
 * closed, through Restore.
 */
export function useHabitDetailActions() {
	const [deleteFailed, setDeleteFailed] = useState(false);
	const archive = useAsyncAction(archiveHabit, {
		scope: "habit-detail",
		failure: failureMessage("archive", "this habit"),
	});
	const remove = useAsyncAction(deleteHabit, {
		scope: "habit-detail",
		failure: failureMessage("delete", "this habit"),
		// The sheet says it: nothing was changed, try again.
		onFailure: () => setDeleteFailed(true),
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
		/** Clears an earlier failure first, so the banner goes while the next try runs. */
		deleteHabit: (habitId: number) => {
			setDeleteFailed(false);
			return remove.run(habitId);
		},
		isDeleting: remove.isLoading,
		deleteFailed,
		clearDeleteFailure: () => setDeleteFailed(false),
		restoreHabit: restore.run,
		isRestoring: restore.isLoading,
		undoRestoreHabit: undoRestore.run,
	};
}
