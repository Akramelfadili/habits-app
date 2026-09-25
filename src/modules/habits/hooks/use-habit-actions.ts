import { useAsyncAction } from "@/utils/use-async-action";
import {
	createHabit,
	deleteAllHabits,
	updateHabit,
} from "../repositories/habit-repository";

export function useHabitActions() {
	const create = useAsyncAction(createHabit);
	const update = useAsyncAction(updateHabit);
	const clearAll = useAsyncAction(deleteAllHabits);

	return {
		createHabit: create.execute,
		isCreating: create.isLoading,
		createError: create.error,
		updateHabit: update.execute,
		isUpdating: update.isLoading,
		updateError: update.error,
		/**
		 * Dev-only escape hatch for clearing out test data — undefined in
		 * production builds, so callers can't wire it up by accident.
		 */
		clearAllHabits: __DEV__ ? clearAll.execute : undefined,
		isClearingAll: clearAll.isLoading,
	};
}
