import { useAsyncAction } from "@/utils/use-async-action";
import {
	archiveHabit,
	deleteHabit,
	restoreHabit,
} from "../services/habit-lifecycle-service";

/**
 * Habit Detail's lifecycle writes (HAB-13): one-tap Archive, Delete (only
 * offered here, behind a confirmation), and Restore — which backs the
 * archive toast's Undo after Detail has already closed.
 */
export function useHabitDetailActions() {
	const archive = useAsyncAction(archiveHabit);
	const remove = useAsyncAction(deleteHabit);
	const restore = useAsyncAction(restoreHabit);

	return {
		archiveHabit: archive.execute,
		isArchiving: archive.isLoading,
		deleteHabit: remove.execute,
		isDeleting: remove.isLoading,
		restoreHabit: restore.execute,
	};
}
