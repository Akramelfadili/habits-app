import { useAsyncAction } from "@/utils/use-async-action";
import { archiveHabit, deleteHabit } from "../services/habit-lifecycle-service";

/**
 * Habit Detail's Delete confirmation (HAB-13): the only place delete is
 * offered, with "Archive instead" beside it.
 */
export function useHabitDetailActions() {
	const archive = useAsyncAction(archiveHabit);
	const remove = useAsyncAction(deleteHabit);

	return {
		archiveHabit: archive.execute,
		isArchiving: archive.isLoading,
		deleteHabit: remove.execute,
		isDeleting: remove.isLoading,
	};
}
