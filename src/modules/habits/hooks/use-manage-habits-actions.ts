import { useAsyncAction } from "@/utils/use-async-action";
import { reorderHabits } from "../repositories/habit-repository";
import {
	archiveHabit,
	restoreHabit,
} from "../services/habit-lifecycle-service";

/**
 * Manage & Archive's writes (HAB-13). Reorder is a single write, straight to
 * the repository; archive and restore also move the habit's notifications,
 * so they go through the lifecycle service.
 */
export function useManageHabitsActions() {
	const reorder = useAsyncAction(reorderHabits);
	const archive = useAsyncAction(archiveHabit);
	const restore = useAsyncAction(restoreHabit);

	return {
		reorderHabits: reorder.execute,
		archiveHabit: archive.execute,
		restoreHabit: restore.execute,
		isRestoring: restore.isLoading,
	};
}
