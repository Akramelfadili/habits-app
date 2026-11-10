import { useState } from "react";
import { failureMessage, UNDO_FAILED_MESSAGE } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import {
	archiveHabit,
	deleteHabit,
	restoreHabit,
	undoRestoreHabit,
} from "../services/habit-lifecycle-service";

export function useHabitDetailActions() {
	const [deleteFailed, setDeleteFailed] = useState(false);
	const archive = useAsyncAction(archiveHabit, {
		scope: "habit-detail",
		failure: failureMessage("archive", "this habit"),
	});
	const remove = useAsyncAction(deleteHabit, {
		scope: "habit-detail",
		failure: failureMessage("delete", "this habit"),
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
		// For a screen with no ToastHost (the Edit modal), which shows the failure inline.
		archiveHabitOrThrow: archive.execute,
		isArchiving: archive.isLoading,
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
