import { asc, eq, sql } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { setSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { db } from "@/lib/db/client";
import { habits } from "@/lib/db/schema";
import type { HabitAccentKey } from "@/theme/theme";
import type { HabitIconKey } from "../constants";
import type {
	CreateHabitInput,
	Frequency,
	Habit,
	IsoWeekday,
	UpdateHabitInput,
} from "../types";

type HabitRow = typeof habits.$inferSelect;

function rowToFrequency(row: HabitRow): Frequency {
	switch (row.frequencyType) {
		case "weekdays":
			return {
				type: "weekdays",
				days: (row.frequencyWeekdays ?? "")
					.split(",")
					.filter(Boolean)
					.map((day) => Number(day) as IsoWeekday),
			};
		case "per-week":
			return {
				type: "per-week",
				timesPerWeek: row.frequencyTimesPerWeek ?? 1,
			};
		default:
			return { type: "daily" };
	}
}

/** Only the column for the active type is set; the others are cleared to null. */
function frequencyToColumns(frequency: Frequency) {
	return {
		frequencyType: frequency.type,
		frequencyWeekdays:
			frequency.type === "weekdays"
				? [...frequency.days].sort((a, b) => a - b).join(",")
				: null,
		frequencyTimesPerWeek:
			frequency.type === "per-week" ? frequency.timesPerWeek : null,
	};
}

function rowToHabit(row: HabitRow): Habit {
	return {
		id: row.id,
		name: row.name,
		icon: row.icon as HabitIconKey,
		color: row.color as HabitAccentKey,
		category: row.category,
		direction: row.direction,
		targetType: row.targetType,
		targetAmount: row.targetAmount,
		targetUnit: row.targetUnit,
		frequency: rowToFrequency(row),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function habitInsertValues(input: CreateHabitInput, now: Date) {
	return {
		name: input.name,
		icon: input.icon,
		color: input.color,
		category: input.category,
		direction: input.direction,
		targetType: input.targetType,
		targetAmount: input.targetAmount,
		targetUnit: input.targetUnit,
		...frequencyToColumns(input.frequency),
		createdAt: now,
		updatedAt: now,
	};
}

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
	const [row] = await db
		.insert(habits)
		.values(habitInsertValues(input, new Date()))
		.returning();

	return rowToHabit(row);
}

/**
 * Creates several habits and marks an app-setting in one SQLite transaction —
 * used by First Run (HAB-06) so a mid-batch crash can't leave some suggested
 * habits committed while "seen first run" stays unset (which would both
 * duplicate those habits and show First Run again on the next attempt).
 *
 * This manages BEGIN/COMMIT/ROLLBACK with raw SQL instead of Drizzle's own
 * `db.transaction()` helper: that helper's expo-sqlite implementation issues
 * COMMIT as soon as the callback *returns*, without awaiting it — correct for
 * a synchronous callback, but a real bug for an async one (the callback
 * returns a pending promise at its first `await`, so COMMIT fires before the
 * rest of the batch has actually run). Driving BEGIN, the inserts, and COMMIT
 * through this file's normal awaited calls, in order, sidesteps that entirely.
 */
export async function createHabitsAndMarkSetting(
	inputs: CreateHabitInput[],
	setting: { key: string; value: string },
): Promise<Habit[]> {
	await db.run(sql`begin`);
	try {
		const created: Habit[] = [];
		for (const input of inputs) {
			const [row] = await db
				.insert(habits)
				.values(habitInsertValues(input, new Date()))
				.returning();
			created.push(rowToHabit(row));
		}
		// Same `db` connection, still inside the open transaction above — calling
		// the generic settings repository's own write here (rather than
		// duplicating its upsert) keeps it as the only place that logic lives.
		await setSetting(setting.key, setting.value);
		await db.run(sql`commit`);
		return created;
	} catch (err) {
		await db.run(sql`rollback`);
		throw err;
	}
}

export async function updateHabit(
	id: number,
	input: UpdateHabitInput,
): Promise<Habit> {
	const [row] = await db
		.update(habits)
		.set({
			name: input.name,
			icon: input.icon,
			color: input.color,
			category: input.category,
			targetType: input.targetType,
			targetAmount: input.targetAmount,
			targetUnit: input.targetUnit,
			...frequencyToColumns(input.frequency),
			updatedAt: new Date(),
		})
		.where(eq(habits.id, id))
		.returning();

	return rowToHabit(row);
}

/** Live-query hook — the only place outside this file that ever sees habit data. */
export function useHabitsList(): Habit[] {
	const { data } = useLiveQuery(
		db.select().from(habits).orderBy(asc(habits.createdAt)),
	);
	return (data ?? []).map(rowToHabit);
}

/** Dev-only escape hatch for clearing out test data — refuses to run outside `__DEV__`. */
export async function deleteAllHabits(): Promise<void> {
	if (!__DEV__) {
		throw new Error("deleteAllHabits is dev-only");
	}
	await db.delete(habits);
}
