import { failureMessage } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { seedHabitWithHistory, seedStreakAtRiskHabit } from "../dev/dev-seeds";
import { deleteAllHabits } from "../repositories/habit-repository";
import { createHabitWithReminders } from "../services/habit-create-service";
import { updateHabitAndSyncReminders } from "../services/reminder-service";

export function useHabitActions() {
	const create = useAsyncAction(createHabitWithReminders, {
		scope: "habit-form",
	});
	// A schedule change moves which reminder days are real (HAB-12), so an
	// edit re-syncs the habit's notifications along with the write.
	const update = useAsyncAction(updateHabitAndSyncReminders, {
		scope: "habit-form",
	});
	const clearAll = useAsyncAction(deleteAllHabits, {
		scope: "dev",
		failure: failureMessage("clear", "habits"),
	});
	const seedStreakAtRisk = useAsyncAction(seedStreakAtRiskHabit, {
		scope: "dev",
		failure: failureMessage("seed", "that habit"),
	});
	const seedHistory = useAsyncAction(seedHabitWithHistory, {
		scope: "dev",
		failure: failureMessage("seed", "that habit"),
	});

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
		clearAllHabits: __DEV__ ? clearAll.run : undefined,
		isClearingAll: clearAll.isLoading,
		/** Dev-only escape hatch for manually testing HAB-08 — see `seedStreakAtRiskHabit`. */
		seedStreakAtRiskHabit: __DEV__ ? seedStreakAtRisk.run : undefined,
		isSeedingStreakAtRisk: seedStreakAtRisk.isLoading,
		/** Dev-only escape hatch for seeing HAB-09 full of data — see `seedHabitWithHistory`. */
		seedHabitWithHistory: __DEV__ ? seedHistory.run : undefined,
		isSeedingHistory: seedHistory.isLoading,
	};
}
