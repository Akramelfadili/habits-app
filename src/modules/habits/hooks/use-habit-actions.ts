import { useAsyncAction } from "@/utils/use-async-action";
import { createHabitWithReminders } from "../services/habit-create-service";
import { updateHabitAndSyncReminders } from "../services/reminder-service";

export function useHabitActions() {
	const create = useAsyncAction(createHabitWithReminders, {
		scope: "habit-form",
	});
	// A schedule change moves which reminder days are real, so an edit re-syncs the habit's
	// notifications along with the write.
	const update = useAsyncAction(updateHabitAndSyncReminders, {
		scope: "habit-form",
	});

	return {
		createHabit: create.execute,
		isCreating: create.isLoading,
		createError: create.error,
		updateHabit: update.execute,
		isUpdating: update.isLoading,
		updateError: update.error,
	};
}
