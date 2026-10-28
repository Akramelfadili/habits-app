import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries, entryNotes, frozenDays } from "@/lib/db/schema";
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
	return { habitId: row.habitId, date: row.date, note: row.note };
}

/** Live-query hook — entries with a date in `[start, end]`, inclusive. */
export function useEntriesInRange(start: Date, end: Date): Entry[] {
	const startDate = toDayKey(start);
	const endDate = toDayKey(end);
	const { data } = useLiveRows<EntryRow>(
		db
			.select()
			.from(entries)
			.where(and(gte(entries.date, startDate), lte(entries.date, endDate)))
			.orderBy(asc(entries.date)),
		// `useLiveQuery` subscribes once per `deps` — without these, the first
		// render's range would be queried forever.
		[startDate, endDate],
	);
	return data.map(rowToEntry);
}

/**
 * Live-query hook — how many distinct days have a log, and the first one:
 * one aggregate row, so Progress's "7 days of logs" gate never reads the log.
 */
export function useLoggedDays(): LoggedDays {
	const { data, loaded } = useLiveRows<{
		count: number | null;
		first: string | null;
	}>(
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
 * Live-query hook — every entry, unbounded. Streak calculation (HAB-08) can
 * need history arbitrarily far back (and a week-bounded range has a real gap
 * around Sunday/Monday for a per-week habit's own week), so this fetches
 * everything rather than trying to bound the range correctly — a personal
 * habit tracker's total entry count stays small enough that this is simpler
 * and cheaper than getting a tight range right.
 */
export function useAllEntries(): Entry[] {
	const { data } = useLiveRows<EntryRow>(
		db.select().from(entries).orderBy(asc(entries.date)),
	);
	return data.map(rowToEntry);
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
	const { data } = useLiveRows<EntryNoteRow>(
		db.select().from(entryNotes).orderBy(asc(entryNotes.date)),
	);
	return data.map(rowToEntryNote);
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
