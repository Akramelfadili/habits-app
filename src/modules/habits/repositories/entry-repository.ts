import { format } from "date-fns";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "@/lib/db/client";
import { entries, entryNotes } from "@/lib/db/schema";
import type { DayLog, Entry, EntryNote } from "../types";

type EntryRow = typeof entries.$inferSelect;
type EntryNoteRow = typeof entryNotes.$inferSelect;

const DATE_FORMAT = "yyyy-MM-dd";

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
	const startDate = format(start, DATE_FORMAT);
	const endDate = format(end, DATE_FORMAT);
	const { data } = useLiveQuery(
		db
			.select()
			.from(entries)
			.where(and(gte(entries.date, startDate), lte(entries.date, endDate)))
			.orderBy(asc(entries.date)),
	);
	return (data ?? []).map(rowToEntry);
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
	const { data } = useLiveQuery(
		db.select().from(entries).orderBy(asc(entries.date)),
	);
	return (data ?? []).map(rowToEntry);
}

/**
 * Marks `habitId` completed/resisted (or un-completed) on `date`. Un-checking
 * is always allowed with no confirmation (HAB-03), so this deletes the row
 * rather than flipping a boolean; completing twice is a no-op, not an error.
 */
export async function setHabitCompletedOn(
	habitId: number,
	date: Date,
	completed: boolean,
): Promise<void> {
	const dateString = format(date, DATE_FORMAT);

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

/**
 * Sets `habitId`'s logged quantity on `date` (HAB-07). `value <= 0` deletes the
 * row instead of storing a zero — keeping "no entry" as the one signal for
 * "nothing logged," same as `setHabitCompletedOn`, so a zeroed-out quantity
 * habit doesn't spuriously count as a completion anywhere (e.g. per-week
 * scheduling). Otherwise upserts, since a day can be logged more than once as
 * the value is adjusted through the day.
 */
export async function setHabitQuantityOn(
	habitId: number,
	date: Date,
	value: number,
): Promise<void> {
	const dateString = format(date, DATE_FORMAT);

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

/** Live-query hook — every habit's day notes (HAB-10). Same "small enough to fetch whole" reasoning as `useAllEntries`. */
export function useEntryNotes(): EntryNote[] {
	const { data } = useLiveQuery(
		db.select().from(entryNotes).orderBy(asc(entryNotes.date)),
	);
	return (data ?? []).map(rowToEntryNote);
}

/**
 * Saves a retro-logged day (HAB-10) — every changed value plus the note — in
 * one transaction, so a half-applied save can't leave the day inconsistent.
 * Values follow the same rules as the single-day writes above: `false`/`0`
 * deletes the entry, `true` inserts a presence row, an amount upserts. An
 * empty (after trimming) note deletes the note row.
 *
 * The callback is deliberately synchronous (`.run()`, no `await`): the
 * expo-sqlite driver's `transaction()` is sync and would commit after the
 * first `await`, leaving the rest outside the transaction. The outer `await`
 * is a no-op there, but lets an async driver (the Jest test db) finish first.
 */
export async function saveDayLog(date: Date, log: DayLog): Promise<void> {
	const dateString = format(date, DATE_FORMAT);
	const note = log.note.trim();
	const now = new Date();

	await db.transaction((tx) => {
		for (const { habitId, value } of log.values) {
			const sameDay = and(
				eq(entries.habitId, habitId),
				eq(entries.date, dateString),
			);
			if (value === false || (typeof value === "number" && value <= 0)) {
				tx.delete(entries).where(sameDay).run();
			} else if (value === true) {
				tx.insert(entries)
					.values({ habitId, date: dateString, createdAt: now })
					.onConflictDoNothing()
					.run();
			} else {
				tx.insert(entries)
					.values({ habitId, date: dateString, value, createdAt: now })
					.onConflictDoUpdate({
						target: [entries.habitId, entries.date],
						set: { value },
					})
					.run();
			}
		}

		const noteOwner = and(
			eq(entryNotes.habitId, log.noteHabitId),
			eq(entryNotes.date, dateString),
		);
		if (note === "") {
			tx.delete(entryNotes).where(noteOwner).run();
		} else {
			tx.insert(entryNotes)
				.values({
					habitId: log.noteHabitId,
					date: dateString,
					note,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: [entryNotes.habitId, entryNotes.date],
					set: { note, updatedAt: now },
				})
				.run();
		}
	});
}
