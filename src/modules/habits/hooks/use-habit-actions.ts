import { subDays } from "date-fns";
import { useAsyncAction } from "@/utils/use-async-action";
import { setHabitCompletedOn } from "../repositories/entry-repository";
import {
	createHabit,
	createHabitAt,
	deleteAllHabits,
	updateHabit,
} from "../repositories/habit-repository";

/**
 * Dev-only: creates a habit backdated 10 days, with days -2 and -3 completed
 * and yesterday (-1) left missing — lets HAB-08's streak-at-risk prompt be
 * tested on a real device without hand-editing the SQLite database.
 */
async function seedStreakAtRiskHabit(): Promise<void> {
	const habit = await createHabitAt(
		{
			name: "Meditate",
			icon: "leaf",
			color: "purple",
			category: "Morning",
			direction: "build",
			targetType: "simple",
			targetAmount: null,
			targetUnit: null,
			frequency: { type: "daily" },
		},
		subDays(new Date(), 10),
	);
	await setHabitCompletedOn(habit.id, subDays(new Date(), 2), true);
	await setHabitCompletedOn(habit.id, subDays(new Date(), 3), true);
}

export function useHabitActions() {
	const create = useAsyncAction(createHabit);
	const update = useAsyncAction(updateHabit);
	const clearAll = useAsyncAction(deleteAllHabits);
	const seedStreakAtRisk = useAsyncAction(seedStreakAtRiskHabit);

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
		/** Dev-only escape hatch for manually testing HAB-08 — see `seedStreakAtRiskHabit`. */
		seedStreakAtRiskHabit: __DEV__ ? seedStreakAtRisk.execute : undefined,
		isSeedingStreakAtRisk: seedStreakAtRisk.isLoading,
	};
}
