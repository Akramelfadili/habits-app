import { format } from "date-fns";
import { and, asc, gte, lte } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "@/lib/db/client";
import { frozenDays } from "@/lib/db/schema";
import type { FrozenDay } from "../types";

type FrozenDayRow = typeof frozenDays.$inferSelect;

const DATE_FORMAT = "yyyy-MM-dd";

function rowToFrozenDay(row: FrozenDayRow): FrozenDay {
	return {
		id: row.id,
		habitId: row.habitId,
		date: row.date,
		createdAt: row.createdAt,
	};
}

/** Live-query hook — every frozen day, across every habit (the pool is shared, not per-habit). */
export function useFrozenDays(): FrozenDay[] {
	const { data } = useLiveQuery(
		db.select().from(frozenDays).orderBy(asc(frozenDays.date)),
	);
	return (data ?? []).map(rowToFrozenDay);
}

/**
 * A one-off (non-reactive) count of freezes used in `[monthStart, monthEnd]`,
 * across every habit — the shared pool's write-time eligibility check
 * (`habit-service.ts`'s `applyFreeze`) needs a fresh read at call time, not
 * whatever a hook last rendered, since it gates whether the write is allowed.
 */
export async function getFreezesUsedInMonth(
	monthStart: Date,
	monthEnd: Date,
): Promise<number> {
	const rows = await db
		.select()
		.from(frozenDays)
		.where(
			and(
				gte(frozenDays.date, format(monthStart, DATE_FORMAT)),
				lte(frozenDays.date, format(monthEnd, DATE_FORMAT)),
			),
		);
	return rows.length;
}

/** Freezes `habitId`'s missed `date` — idempotent, since a day can only be frozen once. */
export async function freezeHabitDay(
	habitId: number,
	date: Date,
): Promise<void> {
	await db
		.insert(frozenDays)
		.values({ habitId, date: format(date, DATE_FORMAT), createdAt: new Date() })
		.onConflictDoNothing();
}
