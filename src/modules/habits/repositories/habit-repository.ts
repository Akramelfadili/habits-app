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
import { present } from "@/utils/indexed";
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
		.flatMap((range) => {
			const [from, to] = range.split("..");
			// A malformed piece is dropped, not thrown on.
			return from && to ? [{ from, to }] : [];
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

async function toHabit(row: HabitRow): Promise<Habit> {
	return rowToHabit(
		row,
		resolveHabitCategory(row.categoryId, await loadCategoriesById()),
	);
}

// Two live subscriptions rather than a join: `useLiveQuery` only re-runs when its `from` table
// changes, so a join would show a renamed or deleted category's stale name/icon/color.
function useHabitsWithCategories(
	query: Parameters<typeof useLiveRows>[0],
): HabitsResult {
	const habitsResult = useLiveRows<HabitRow>(query);
	const categoriesResult = useLiveRows<CategoryRow>(allCategoriesQuery);
	// Until both queries resolve, report not-loaded rather than a partial list.
	const ready = habitsResult.loaded && categoriesResult.loaded;
	const habitRows = habitsResult.data;
	const categoryRows = categoriesResult.data;
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

const NOT_LOADED: HabitsResult = { habits: [], loaded: false };

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

	return toHabit(present(row, "the habit row"));
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

	return toHabit(present(row, "the habit row"));
}

export function useHabitsList(): HabitsResult {
	return useHabitsWithCategories(() =>
		db.select().from(habits).orderBy(asc(habits.sortOrder), asc(habits.id)),
	);
}

export function useActiveHabits(): HabitsResult {
	return useHabitsWithCategories(() =>
		db
			.select()
			.from(habits)
			.where(isNull(habits.archivedAt))
			.orderBy(asc(habits.sortOrder), asc(habits.id)),
	);
}

export function useArchivedHabits(): HabitsResult {
	return useHabitsWithCategories(() =>
		db
			.select()
			.from(habits)
			.where(isNotNull(habits.archivedAt))
			.orderBy(desc(habits.archivedAt), asc(habits.id)),
	);
}

export async function getAllHabits(): Promise<Habit[]> {
	const rows = await db
		.select()
		.from(habits)
		.orderBy(asc(habits.sortOrder), asc(habits.id));
	return Promise.all(rows.map(toHabit));
}

export async function getHabit(id: number): Promise<Habit | undefined> {
	const [row] = await db.select().from(habits).where(eq(habits.id, id));
	return row ? toHabit(row) : undefined;
}

// Existing sort values are redistributed, so reordering never moves a category relative to others.
// BEGIN/COMMIT/ROLLBACK are raw SQL, not `db.transaction()`: expo-sqlite's helper COMMITs as soon
// as an async callback returns its promise (at its first `await`), before the rest has run.
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

export async function setHabitArchived(
	id: number,
	archivedAt: Date,
	// Only for undoing a restore, which puts the past pauses back as they were.
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
	return toHabit(present(row, "the habit row"));
}

export async function setHabitRestored(
	id: number,
	pauses: readonly DayRange[],
): Promise<Habit> {
	const [row] = await db
		.update(habits)
		.set({ archivedAt: null, pausedRanges: pausesToColumn(pauses) })
		.where(eq(habits.id, id))
		.returning();
	return toHabit(present(row, "the habit row"));
}

// None of the referencing foreign keys cascade, so leaving any table out would orphan rows
// (or fail with foreign-key enforcement on).
export async function deleteHabitAndHistory(id: number): Promise<void> {
	// One serialised transaction: a failure leaves every row as it was, so Delete's "Nothing was
	// changed" message is true.
	await runInTransaction(async () => {
		await db.delete(entries).where(eq(entries.habitId, id));
		await db.delete(entryNotes).where(eq(entryNotes.habitId, id));
		await db.delete(frozenDays).where(eq(frozenDays.habitId, id));
		await db.delete(reminders).where(eq(reminders.habitId, id));
		await db.delete(habits).where(eq(habits.id, id));
	});
}
