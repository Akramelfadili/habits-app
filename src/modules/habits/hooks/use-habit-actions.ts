import { parseISO, subDays } from "date-fns";
import { failureMessage } from "@/utils/failure-message";
import { useAsyncAction } from "@/utils/use-async-action";
import { type BuiltInCategoryName, findBuiltInCategory } from "../constants";
import { getCategories } from "../repositories/category-repository";
import { makeEntryFixtures } from "../repositories/entry-fixtures";
import {
	setHabitCompletedOn,
	setHabitQuantityOn,
} from "../repositories/entry-repository";
import { makeFrozenDayFixtures } from "../repositories/frozen-day-fixtures";
import { freezeHabitDay } from "../repositories/frozen-day-repository";
import {
	HABIT_DETAIL_HISTORY_DAYS,
	habitDetailFixtures,
} from "../repositories/habit-fixtures";
import {
	createHabit,
	createHabitAt,
	deleteAllHabits,
} from "../repositories/habit-repository";
import { updateHabitAndSyncReminders } from "../services/reminder-service";

/** Dev seeds file their habits under a built-in — the only categories every device has. */
async function builtInCategoryId(name: BuiltInCategoryName): Promise<number> {
	const category = findBuiltInCategory(await getCategories(), name);
	if (!category) throw new Error(`Built-in category "${name}" is missing`);
	return category.id;
}

/**
 * Dev-only: creates a habit backdated 10 days, with days -2 and -3 completed
 * and yesterday (-1) left missing — lets HAB-08's streak-at-risk prompt be
 * tested on a real device without hand-editing the SQLite database.
 */
async function seedStreakAtRiskHabit(): Promise<void> {
	const habit = await createHabitAt(
		{
			name: "Meditate",
			categoryId: await builtInCategoryId("Mindfulness"),
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

/**
 * Dev-only: creates "Glass of water" backdated ~5 months with the same
 * history the web `habit-detail` fixture uses (varied quantities, a 24-day
 * current streak, a 41-day longest, 2 frozen days) — lets HAB-09's Habit
 * Detail be seen full of data on a real device. Freezes are written directly,
 * skipping the pool check: they fall in earlier months, so this month's pool
 * is untouched.
 */
async function seedHabitWithHistory(): Promise<void> {
	const [fixture] = habitDetailFixtures();
	const habit = await createHabitAt(
		{
			name: fixture.name,
			categoryId: await builtInCategoryId("Health"),
			direction: fixture.direction,
			targetType: fixture.targetType,
			targetAmount: fixture.targetAmount,
			targetUnit: fixture.targetUnit,
			frequency: fixture.frequency,
		},
		subDays(new Date(), HABIT_DETAIL_HISTORY_DAYS),
	);
	for (const entry of makeEntryFixtures("habit-detail")) {
		await setHabitQuantityOn(habit.id, parseISO(entry.date), entry.value ?? 0);
	}
	for (const frozenDay of makeFrozenDayFixtures("habit-detail")) {
		await freezeHabitDay(habit.id, parseISO(frozenDay.date));
	}
}

export function useHabitActions() {
	const create = useAsyncAction(createHabit, { scope: "habit-form" });
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
