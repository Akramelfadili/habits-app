import { format } from "date-fns";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";
import type { Entry } from "../types";

type EntryRow = typeof entries.$inferSelect;

const DATE_FORMAT = "yyyy-MM-dd";

function rowToEntry(row: EntryRow): Entry {
	return {
		id: row.id,
		habitId: row.habitId,
		date: row.date,
		createdAt: row.createdAt,
	};
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
