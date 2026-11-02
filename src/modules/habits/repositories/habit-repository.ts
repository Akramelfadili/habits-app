import { asc, desc, eq, isNotNull, isNull, max, sql } from "drizzle-orm";
import { useMemo } from "react";
import { db } from "@/lib/db/client";
import {
	type categories,
	entries,
	entryNotes,
	frozenDays,
	habits,
	reminders,
} from "@/lib/db/schema";
import { rollbackQuietly, runInTransaction } from "@/lib/db/transaction";
import { useLiveRows } from "@/lib/db/use-live-rows";
import type {
	Category,
	CreateHabitInput,
	DayRange,
	Frequency,
	Habit,
	HabitsResult,
	IsoWeekday,
	UpdateHabitInput,
} from "../types";
import {
	allCategoriesQuery,
	resolveHabitCategory,
	rowToCategory,
} from "./category-rows";

type HabitRow = typeof habits.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;

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

function rowToHabit(row: HabitRow, category: Category): Habit {
	return {
		id: row.id,
		name: row.name,
		category,
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

async function loadCategoriesById(): Promise<Map<number, Category>> {
	const rows = await allCategoriesQuery();
	return new Map(rows.map((row) => [row.id, rowToCategory(row)]));
}

/**
 * A row back to the domain type — reads the (small, fixed-ish) category set so
 * a dangling `category_id` falls back to Other, same as the live hooks.
 */
async function toHabit(row: HabitRow): Promise<Habit> {
	return rowToHabit(
		row,
		resolveHabitCategory(row.categoryId, await loadCategoriesById()),
	);
}

/**
 * Habit rows + every category, mapped together. Two live subscriptions rather
 * than one joined query: Drizzle's `useLiveQuery` only re-runs when its `from`
 * table changes, so a join would leave habits showing a renamed or deleted
 * category's stale name/icon/color (HAB-25).
 */
function useHabitsWithCategories(
	query: Parameters<typeof useLiveRows>[0],
): HabitsResult {
	const habitsResult = useLiveRows<HabitRow>(query);
	const categoriesResult = useLiveRows<CategoryRow>(allCategoriesQuery());
	// The two queries resolve independently. Until both have, report what an
	// unresolved live query always reports — nothing yet, not loaded — rather
	// than a partial list missing whichever habits' categories haven't arrived.
	const ready = habitsResult.loaded && categoriesResult.loaded;
	const habitRows = habitsResult.data;
	const categoryRows = categoriesResult.data;
	// Stable between renders until a row changes, so what is built from the list
	// (Progress's summaries) can be memoised.
	return useMemo((): HabitsResult => {
		if (!ready) return NOT_LOADED;
		const byId = new Map(
			categoryRows.map((row) => [row.id, rowToCategory(row)]),
		);
		return {
			habits: habitRows.map((row) =>
				rowToHabit(row, resolveHabitCategory(row.categoryId, byId)),
			),
			loaded: true,
		};
	}, [ready, habitRows, categoryRows]);
}

/** Stable empty result while loading, so consumers' memo deps don't churn. */
const NOT_LOADED: HabitsResult = { habits: [], loaded: false };

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
		categoryId: input.categoryId,
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

	return toHabit(row);
}

export async function updateHabit(
	id: number,
	input: UpdateHabitInput,
): Promise<Habit> {
	const [row] = await db
		.update(habits)
		.set({
			name: input.name,
			categoryId: input.categoryId,
			targetType: input.targetType,
			targetAmount: input.targetAmount,
			targetUnit: input.targetUnit,
			...frequencyToColumns(input.frequency),
			updatedAt: new Date(),
		})
		.where(eq(habits.id, id))
		.returning();

	return toHabit(row);
}

/**
 * Live-query hook over every habit, archived ones included — for screens
 * that look one habit up by id (Habit Detail, Reminders), which must keep
 * working for an archived habit's history. Manual order (HAB-13).
 */
export function useHabitsList(): HabitsResult {
	return useHabitsWithCategories(
		db.select().from(habits).orderBy(asc(habits.sortOrder), asc(habits.id)),
	);
}

/** Live-query hook — habits not archived (Today, Weekly Summary, Manage), in manual order. */
export function useActiveHabits(): HabitsResult {
	return useHabitsWithCategories(
		db
			.select()
			.from(habits)
			.where(isNull(habits.archivedAt))
			.orderBy(asc(habits.sortOrder), asc(habits.id)),
	);
}

/** Live-query hook — archived habits, most recently archived first (HAB-13). */
export function useArchivedHabits(): HabitsResult {
	return useHabitsWithCategories(
		db
			.select()
			.from(habits)
			.where(isNotNull(habits.archivedAt))
			.orderBy(desc(habits.archivedAt), asc(habits.id)),
	);
}

/** A one-off (non-reactive) read of every habit, archived included — the launch-time reminder reconcile. */
export async function getAllHabits(): Promise<Habit[]> {
	const rows = await db
		.select()
		.from(habits)
		.orderBy(asc(habits.sortOrder), asc(habits.id));
	return Promise.all(rows.map(toHabit));
}

/** A one-off (non-reactive) read — services need what's stored right now. */
export async function getHabit(id: number): Promise<Habit | undefined> {
	const [row] = await db.select().from(habits).where(eq(habits.id, id));
	return row ? toHabit(row) : undefined;
}

/**
 * Saves a new manual order for some habits (HAB-13): the habits' *existing*
 * sort values are redistributed in the given order, so reordering within a
 * category never moves that category relative to the others. One
 * transaction, with BEGIN/COMMIT/ROLLBACK issued as raw SQL rather than
 * through Drizzle's `db.transaction()`: that helper's expo-sqlite
 * implementation issues COMMIT as soon as the callback *returns*, without
 * awaiting it — correct for a synchronous callback, a real bug for an async
 * one (the pending promise returns at its first `await`, so COMMIT fires before
 * the rest has run). Driving the statements through this file's awaited calls,
 * in order, sidesteps that.
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
		await rollbackQuietly();
		throw err;
	}
}

/** Marks a habit archived — nothing else about it changes (HAB-13). */
export async function setHabitArchived(
	id: number,
	archivedAt: Date,
	/** Also rewrites the past pauses — only for undoing a restore (HAB-20), which puts them back as they were. */
	pauses?: readonly DayRange[],
): Promise<Habit> {
	const [row] = await db
		.update(habits)
		.set(
			pauses
				? { archivedAt, pausedRanges: pausesToColumn(pauses) }
				: { archivedAt },
		)
		.where(eq(habits.id, id))
		.returning();
	return toHabit(row);
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
	return toHabit(row);
}

/**
 * Permanently deletes a habit and everything that references it (HAB-13) —
 * entries, notes, frozen days, reminders — in one transaction. None of those
 * foreign keys cascade, so leaving any out would orphan rows (or fail with
 * foreign-key enforcement on).
 */
export async function deleteHabitAndHistory(id: number): Promise<void> {
	// One serialised transaction (HAB-45): a failure anywhere leaves every row as
	// it was, so Delete's "Nothing was changed. Try again." is true.
	await runInTransaction(async () => {
		await db.delete(entries).where(eq(entries.habitId, id));
		await db.delete(entryNotes).where(eq(entryNotes.habitId, id));
		await db.delete(frozenDays).where(eq(frozenDays.habitId, id));
		await db.delete(reminders).where(eq(reminders.habitId, id));
		await db.delete(habits).where(eq(habits.id, id));
	});
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

	return toHabit(row);
}
