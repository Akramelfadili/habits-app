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

/**
 * The one live read of the whole entry log (audit A-03, B-07). Every hook below
 * that shows entries reads a slice of this, so Today, Habits, Detail, Progress
 * and Retro-log share one query and one change listener however many are
 * mounted, and a write re-renders only the slices it changed. The rows are
 * ordered by date, as the unbounded read always was.
 */
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

/**
 * Live-query hook — entries with a date in `[start, end]`, inclusive: a slice of
 * the shared log, so the Progress maths built on it can be memoised (same
 * entries, same array) and a write outside the range does not re-render.
 */
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

/** Live-query hook — one habit's entries, oldest first: a slice of the shared log (Habit detail). */
export function useHabitEntries(habitId: number): Entry[] {
	const ofHabit = useCallback(
		(rows: Entry[]) => rows.filter((entry) => entry.habitId === habitId),
		[habitId],
	);
	return useSharedLiveTable(entryLog, ofHabit, sameElements);
}

/**
 * Live-query hook — how many distinct days have a log, and the first one:
 * one aggregate row, so Progress's "7 days of logs" gate never reads the log.
 */
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

/**
 * Live-query hook — every entry, unbounded (the shared log itself). Streak calculation (HAB-08) can
 * need history arbitrarily far back (and a week-bounded range has a real gap
 * around Sunday/Monday for a per-week habit's own week), so this fetches
 * everything rather than trying to bound the range correctly — a personal
 * habit tracker's total entry count stays small enough that this is simpler
 * and cheaper than getting a tight range right.
 */
export function useAllEntries(): Entry[] {
	return useSharedLiveTable(entryLog, allEntries);
}

/**
 * What a write does to the habit's freeze on the same day, in the same
 * transaction as the entry (PR-11): logging a frozen day gives the freeze back
 * to the pool (`release`), and Undoing that puts it back exactly as it was
 * (`reinstate`, keeping the original `createdAt`).
 */
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

/**
 * Marks `habitId` completed/resisted (or un-completed) on `date`. Un-checking
 * is always allowed with no confirmation (HAB-03), so this deletes the row
 * rather than flipping a boolean; completing twice is a no-op, not an error.
 * With `freeze`, the day's freeze changes in the same transaction.
 */
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

/**
 * Sets `habitId`'s logged quantity on `date` (HAB-07). `value <= 0` deletes the
 * row instead of storing a zero — keeping "no entry" as the one signal for
 * "nothing logged," same as `setHabitCompletedOn`, so a zeroed-out quantity
 * habit doesn't spuriously count as a completion anywhere (e.g. per-week
 * scheduling). Otherwise upserts, since a day can be logged more than once as
 * the value is adjusted through the day. With `freeze`, the day's freeze
 * changes in the same transaction.
 */
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

/** Live-query hook — every habit's day notes (HAB-10). Same "small enough to fetch whole" reasoning as `useAllEntries`. */
export function useEntryNotes(): EntryNote[] {
	const { data } = useLiveRows<EntryNoteRow>(() =>
		db.select().from(entryNotes).orderBy(asc(entryNotes.date)),
	);
	// Stable until a row changes (audit B-10): the mapping ran on every render.
	return useMemo(() => data.map(rowToEntryNote), [data]);
}

/**
 * Saves a retro-logged day (HAB-10) — every changed value plus the note — in
 * one transaction, so a half-applied save can't leave the day inconsistent.
 * Values follow the same rules as the single-day writes above: `false`/`0`
 * deletes the entry, `true` inserts a presence row, an amount upserts. An
 * empty (after trimming) note deletes the note row. Edit this day writes only
 * the note through it now (`useDayNoteActions`); a tap's freeze return is
 * `day-log-service`.
 */
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
