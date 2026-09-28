import { asc, desc, eq, isNotNull, isNull, max, sql } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { setSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { db } from "@/lib/db/client";
import {
	entries,
	entryNotes,
	frozenDays,
	habits,
	reminders,
} from "@/lib/db/schema";
import type { HabitAccentKey } from "@/theme/theme";
import type { HabitIconKey } from "../constants";
import type {
	CreateHabitInput,
	DayRange,
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

function rowToPauses(column: string | null): DayRange[] {
	return (column ?? "")
		.split(",")
		.filter(Boolean)
		.map((range) => {
			const [from, to] = range.split("..");
			return { from, to };
		});
}

function pausesToColumn(pauses: readonly DayRange[]): string | null {
	return pauses.length > 0
		? pauses.map((pause) => `${pause.from}..${pause.to}`).join(",")
		: null;
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
		sortOrder: row.sortOrder,
		archivedAt: row.archivedAt,
		pauses: rowToPauses(row.pausedRanges),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

/** New habits go last in their category (HAB-13's manual order). */
async function nextSortOrder(): Promise<number> {
	const [row] = await db.select({ value: max(habits.sortOrder) }).from(habits);
	return (row?.value ?? 0) + 1;
}

function habitInsertValues(
	input: CreateHabitInput,
	now: Date,
	sortOrder: number,
) {
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
		sortOrder,
		createdAt: now,
		updatedAt: now,
	};
}

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
	const [row] = await db
		.insert(habits)
		.values(habitInsertValues(input, new Date(), await nextSortOrder()))
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
				.values(habitInsertValues(input, new Date(), await nextSortOrder()))
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

/**
 * Live-query hook over every habit, archived ones included — for screens
 * that look one habit up by id (Habit Detail, Reminders), which must keep
 * working for an archived habit's history. Manual order (HAB-13).
 */
export function useHabitsList(): Habit[] {
	const { data } = useLiveQuery(
		db.select().from(habits).orderBy(asc(habits.sortOrder), asc(habits.id)),
	);
	return (data ?? []).map(rowToHabit);
}

/** Live-query hook — habits not archived (Today, Weekly Summary, Manage), in manual order. */
export function useActiveHabits(): Habit[] {
	const { data } = useLiveQuery(
		db
			.select()
			.from(habits)
			.where(isNull(habits.archivedAt))
			.orderBy(asc(habits.sortOrder), asc(habits.id)),
	);
	return (data ?? []).map(rowToHabit);
}

/** Live-query hook — archived habits, most recently archived first (HAB-13). */
export function useArchivedHabits(): Habit[] {
	const { data } = useLiveQuery(
		db
			.select()
			.from(habits)
			.where(isNotNull(habits.archivedAt))
			.orderBy(desc(habits.archivedAt), asc(habits.id)),
	);
	return (data ?? []).map(rowToHabit);
}

/** A one-off (non-reactive) read — services need what's stored right now. */
export async function getHabit(id: number): Promise<Habit | undefined> {
	const [row] = await db.select().from(habits).where(eq(habits.id, id));
	return row ? rowToHabit(row) : undefined;
}

/**
 * Saves a new manual order for some habits (HAB-13): the habits' *existing*
 * sort values are redistributed in the given order, so reordering within a
 * category never moves that category relative to the others. One
 * transaction, same raw-SQL reasoning as `createHabitsAndMarkSetting`.
 */
export async function reorderHabits(orderedIds: number[]): Promise<void> {
	const rows = await db
		.select({ id: habits.id, sortOrder: habits.sortOrder })
		.from(habits);
	const byId = new Map(rows.map((row) => [row.id, row.sortOrder]));
	const slots = orderedIds
		.map((id) => byId.get(id))
		.filter((value): value is number => value !== undefined)
		.sort((a, b) => a - b);
	if (slots.length !== orderedIds.length) {
		throw new Error("Cannot reorder a habit that doesn't exist");
	}

	await db.run(sql`begin`);
	try {
		for (const [index, id] of orderedIds.entries()) {
			await db
				.update(habits)
				.set({ sortOrder: slots[index] })
				.where(eq(habits.id, id));
		}
		await db.run(sql`commit`);
	} catch (err) {
		await db.run(sql`rollback`);
		throw err;
	}
}

/** Marks a habit archived — nothing else about it changes (HAB-13). */
export async function setHabitArchived(
	id: number,
	archivedAt: Date,
): Promise<Habit> {
	const [row] = await db
		.update(habits)
		.set({ archivedAt })
		.where(eq(habits.id, id))
		.returning();
	return rowToHabit(row);
}

/** Clears the archive flag and stores the habit's full list of past pauses. */
export async function setHabitRestored(
	id: number,
	pauses: readonly DayRange[],
): Promise<Habit> {
	const [row] = await db
		.update(habits)
		.set({ archivedAt: null, pausedRanges: pausesToColumn(pauses) })
		.where(eq(habits.id, id))
		.returning();
	return rowToHabit(row);
}

/**
 * Permanently deletes a habit and everything that references it (HAB-13) —
 * entries, notes, frozen days, reminders — in one transaction. None of those
 * foreign keys cascade, so leaving any out would orphan rows (or fail with
 * foreign-key enforcement on).
 */
export async function deleteHabitAndHistory(id: number): Promise<void> {
	await db.run(sql`begin`);
	try {
		await db.delete(entries).where(eq(entries.habitId, id));
		await db.delete(entryNotes).where(eq(entryNotes.habitId, id));
		await db.delete(frozenDays).where(eq(frozenDays.habitId, id));
		await db.delete(reminders).where(eq(reminders.habitId, id));
		await db.delete(habits).where(eq(habits.id, id));
		await db.run(sql`commit`);
	} catch (err) {
		await db.run(sql`rollback`);
		throw err;
	}
}

/** Dev-only escape hatch for clearing out test data — refuses to run outside `__DEV__`. */
export async function deleteAllHabits(): Promise<void> {
	if (!__DEV__) {
		throw new Error("deleteAllHabits is dev-only");
	}
	await db.delete(habits);
}

/**
 * Dev-only escape hatch for manually testing streak/freeze logic (HAB-08) on
 * a real device — a normal `createHabit` always stamps `createdAt` as "now,"
 * which would make any backdated seed entry fall before the habit's own
 * `createdAt` floor and never count toward a streak. Refuses to run outside
 * `__DEV__`.
 */
export async function createHabitAt(
	input: CreateHabitInput,
	createdAt: Date,
): Promise<Habit> {
	if (!__DEV__) {
		throw new Error("createHabitAt is dev-only");
	}
	const [row] = await db
		.insert(habits)
		.values(habitInsertValues(input, createdAt, await nextSortOrder()))
		.returning();

	return rowToHabit(row);
}
