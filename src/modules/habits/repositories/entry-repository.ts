import { and, asc, eq, sql } from "drizzle-orm";
import { useCallback, useMemo } from "react";
import { db } from "@/lib/db/client";
import { entries, entryNotes, frozenDays } from "@/lib/db/schema";
import {
	createSharedLiveTable,
	sameElements,
	useSharedLiveTable,
} from "@/lib/db/shared-live-table";
import { runInTransaction } from "@/lib/db/transaction";
import { useLiveRows } from "@/lib/db/use-live-rows";
import { toDayKey } from "@/utils/day-key";
import type { DayLog, Entry, EntryNote, LoggedDays } from "../types";

type EntryRow = typeof entries.$inferSelect;
type EntryNoteRow = typeof entryNotes.$inferSelect;

function rowToEntry(row: EntryRow): Entry {
	return {
		id: row.id,
		habitId: row.habitId,
		date: row.date,
		value: row.value ?? undefined,
		createdAt: row.createdAt,
	};
}

function rowToEntryNote(row: EntryNoteRow): EntryNote {
	return {
		habitId: row.habitId,
		date: row.date,
		note: row.note,
		updatedAt: row.updatedAt,
	};
}

// Every entry hook reads a slice of this one query, so one change listener serves however many
// screens are mounted and a write re-renders only the slices it changed.
const entryLog = createSharedLiveTable({
	table: "entries",
	read: () => db.select().from(entries).orderBy(asc(entries.date)),
	map: rowToEntry,
	key: (entry) => entry.id,
	same: (a, b) =>
		a.habitId === b.habitId &&
		a.date === b.date &&
		a.value === b.value &&
		a.createdAt.getTime() === b.createdAt.getTime(),
});

const allEntries = (rows: Entry[]): Entry[] => rows;

// A slice of the shared log: same entries give the same array, so Progress maths can be
// memoised and a write outside the range doesn't re-render.
export function useEntriesInRange(start: Date, end: Date): Entry[] {
	const startDate = toDayKey(start);
	const endDate = toDayKey(end);
	const inRange = useCallback(
		(rows: Entry[]) =>
			rows.filter((entry) => entry.date >= startDate && entry.date <= endDate),
		[startDate, endDate],
	);
	return useSharedLiveTable(entryLog, inRange, sameElements);
}

export function useHabitEntries(habitId: number): Entry[] {
	const ofHabit = useCallback(
		(rows: Entry[]) => rows.filter((entry) => entry.habitId === habitId),
		[habitId],
	);
	return useSharedLiveTable(entryLog, ofHabit, sameElements);
}

// One aggregate row, so the "7 days of logs" gate never reads the log.
export function useLoggedDays(): LoggedDays {
	const { data, loaded } = useLiveRows<{
		count: number | null;
		first: string | null;
	}>(() =>
		db
			.select({
				count: sql<number>`count(distinct ${entries.date})`,
				first: sql<string | null>`min(${entries.date})`,
			})
			.from(entries),
	);
	return {
		count: Number(data[0]?.count ?? 0),
		firstDate: data[0]?.first ?? null,
		loaded,
	};
}

// Unbounded on purpose: streaks can need arbitrarily old history and a week-bounded range has
// a gap around Sunday/Monday for per-week habits; a personal tracker's log stays small enough.
export function useAllEntries(): Entry[] {
	return useSharedLiveTable(entryLog, allEntries);
}

// `reinstate` keeps the original `createdAt` so Undo restores the freeze exactly.
export type FreezeChange = { release: true } | { reinstate: Date };

async function changeFreeze(
	habitId: number,
	dateString: string,
	freeze: FreezeChange,
): Promise<void> {
	if ("release" in freeze) {
		await db
			.delete(frozenDays)
			.where(
				and(eq(frozenDays.habitId, habitId), eq(frozenDays.date, dateString)),
			);
		return;
	}
	await db
		.insert(frozenDays)
		.values({ habitId, date: dateString, createdAt: freeze.reinstate })
		.onConflictDoNothing();
}

async function writeCompleted(
	habitId: number,
	dateString: string,
	completed: boolean,
): Promise<void> {
	if (completed) {
		await db
			.insert(entries)
			.values({ habitId, date: dateString, createdAt: new Date() })
			.onConflictDoNothing();
		return;
	}

	await db
		.delete(entries)
		.where(and(eq(entries.habitId, habitId), eq(entries.date, dateString)));
}

async function writeQuantity(
	habitId: number,
	dateString: string,
	value: number,
): Promise<void> {
	if (value <= 0) {
		await db
			.delete(entries)
			.where(and(eq(entries.habitId, habitId), eq(entries.date, dateString)));
		return;
	}

	await db
		.insert(entries)
		.values({ habitId, date: dateString, value, createdAt: new Date() })
		.onConflictDoUpdate({
			target: [entries.habitId, entries.date],
			set: { value },
		});
}

// Un-checking deletes the row rather than flipping a boolean; completing twice is a no-op.
export async function setHabitCompletedOn(
	habitId: number,
	date: Date,
	completed: boolean,
	freeze?: FreezeChange,
): Promise<void> {
	const dateString = toDayKey(date);
	if (!freeze) return writeCompleted(habitId, dateString, completed);
	await runInTransaction(async () => {
		await writeCompleted(habitId, dateString, completed);
		await changeFreeze(habitId, dateString, freeze);
	});
}

// `value <= 0` deletes the row: "no entry" stays the one signal for "nothing logged", so a
// zeroed quantity never counts as a completion (e.g. per-week scheduling).
export async function setHabitQuantityOn(
	habitId: number,
	date: Date,
	value: number,
	freeze?: FreezeChange,
): Promise<void> {
	const dateString = toDayKey(date);
	if (!freeze) return writeQuantity(habitId, dateString, value);
	await runInTransaction(async () => {
		await writeQuantity(habitId, dateString, value);
		await changeFreeze(habitId, dateString, freeze);
	});
}

export function useEntryNotes(): EntryNote[] {
	const { data } = useLiveRows<EntryNoteRow>(() =>
		db.select().from(entryNotes).orderBy(asc(entryNotes.date)),
	);
	return useMemo(() => data.map(rowToEntryNote), [data]);
}

// One transaction so a half-applied save can't leave the day inconsistent. A note that is
// empty after trimming deletes the note row.
export async function saveDayLog(date: Date, log: DayLog): Promise<void> {
	const dateString = toDayKey(date);
	const note = log.note.trim();
	const now = new Date();

	await runInTransaction(async () => {
		for (const { habitId, value } of log.values) {
			if (value === false || (typeof value === "number" && value <= 0)) {
				await writeCompleted(habitId, dateString, false);
			} else if (value === true) {
				await writeCompleted(habitId, dateString, true);
			} else {
				await writeQuantity(habitId, dateString, value);
			}
		}

		const noteOwner = and(
			eq(entryNotes.habitId, log.noteHabitId),
			eq(entryNotes.date, dateString),
		);
		if (note === "") {
			await db.delete(entryNotes).where(noteOwner);
		} else {
			await db
				.insert(entryNotes)
				.values({
					habitId: log.noteHabitId,
					date: dateString,
					note,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: [entryNotes.habitId, entryNotes.date],
					set: { note, updatedAt: now },
				});
		}
	});
}
