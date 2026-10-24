import { parseISO, subDays } from "date-fns";
import { type BuiltInCategoryName, findBuiltInCategory } from "../constants";
import { getCategories } from "../repositories/category-repository";
import {
	setHabitCompletedOn,
	setHabitQuantityOn,
} from "../repositories/entry-repository";
import { freezeHabitDay } from "../repositories/frozen-day-repository";
import { createHabitAt } from "../repositories/habit-repository";
import { makeEntryFixtures } from "./entry-fixtures";
import { makeFrozenDayFixtures } from "./frozen-day-fixtures";
import {
	HABIT_DETAIL_HISTORY_DAYS,
	habitDetailFixtures,
} from "./habit-fixtures";

/**
 * Dev-only seeds for trying features on a real device. `useHabitActions`
 * exposes them only under `__DEV__`; `createHabitAt` refuses to run outside it.
 */

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
export async function seedStreakAtRiskHabit(): Promise<void> {
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
export async function seedHabitWithHistory(): Promise<void> {
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
