import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
	appSettings,
	categories,
	entries,
	entryNotes,
	frozenDays,
	habits,
	reminders,
} from "@/lib/db/schema";
import { runInTransaction } from "@/lib/db/transaction";
import type { DeviceState } from "../dev/device-state";

/**
 * Device-validation only (`src/lib/device-validation`): replaces everything
 * the app shows with one visual-check state's fixture data, so the simulator
 * can open the same state the web baseline was captured from. The caller
 * checks the build flag; this only writes. Its web twin does nothing.
 *
 * Fixture rows keep their ids (`/habit/1` must be the same habit), so the
 * autoincrement counters are reset too.
 */
export async function replaceAllData(state: DeviceState): Promise<void> {
	const now = new Date();
	await runInTransaction(async () => {
		await db.delete(entries);
		await db.delete(entryNotes);
		await db.delete(frozenDays);
		await db.delete(reminders);
		await db.delete(habits);
		await db.delete(appSettings);
		await db.delete(categories).where(eq(categories.builtIn, false));
		await db.run(
			sql`delete from sqlite_sequence where name in ('entries','entry_notes','frozen_days','reminders','habits')`,
		);

		// Built-ins already exist (migration 0008); only their group order moves.
		// A custom fixture takes its id and order from the list.
		const stored = await db.select({ id: categories.id }).from(categories);
		const storedIds = new Set(stored.map((row) => row.id));
		for (const [index, category] of state.categories.entries()) {
			if (storedIds.has(category.id)) {
				await db
					.update(categories)
					.set({ sortOrder: index })
					.where(eq(categories.id, category.id));
			} else {
				await db.insert(categories).values({
					id: category.id,
					name: category.name,
					shape: category.shape,
					hue: category.hue,
					builtIn: category.builtIn,
					sortOrder: index,
					createdAt: now,
				});
			}
		}

		for (const habit of state.habits) {
			await db.insert(habits).values({
				id: habit.id,
				name: habit.name,
				categoryId: habit.category.id,
				direction: habit.direction,
				targetType: habit.targetType,
				targetAmount: habit.targetAmount,
				targetUnit: habit.targetUnit,
				frequencyType: habit.frequency.type,
				frequencyWeekdays:
					habit.frequency.type === "weekdays"
						? habit.frequency.days.join(",")
						: null,
				frequencyTimesPerWeek:
					habit.frequency.type === "per-week"
						? habit.frequency.timesPerWeek
						: null,
				sortOrder: habit.sortOrder,
				archivedAt: habit.archivedAt,
				pausedRanges:
					habit.pauses.length > 0
						? habit.pauses.map((p) => `${p.from}..${p.to}`).join(",")
						: null,
				createdAt: habit.createdAt,
				updatedAt: habit.updatedAt,
			});
		}
		for (const entry of state.entries) {
			await db.insert(entries).values({ ...entry, createdAt: now });
		}
		for (const note of state.notes) {
			await db.insert(entryNotes).values({ ...note, updatedAt: now });
		}
		for (const day of state.frozenDays) {
			await db.insert(frozenDays).values({ ...day, createdAt: now });
		}
		for (const reminder of state.reminders) {
			await db.insert(reminders).values({
				id: reminder.id,
				habitId: reminder.habitId,
				hour: reminder.hour,
				minute: reminder.minute,
				weekdays: reminder.weekdays.join(","),
				enabled: reminder.enabled,
				createdAt: now,
			});
		}
		for (const [key, value] of Object.entries(state.settings)) {
			await db.insert(appSettings).values({ key, value });
		}
	});
}

/** Habit ids currently stored — lets a screen wait until a state has landed. */
export async function storedHabitIds(): Promise<number[]> {
	const rows = await db.select({ id: habits.id }).from(habits);
	return rows.map((row) => row.id);
}
