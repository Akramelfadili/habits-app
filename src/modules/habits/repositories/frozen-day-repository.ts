import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { frozenDays } from "@/lib/db/schema";
import { useLiveRows } from "@/lib/db/use-live-rows";
import { toDayKey } from "@/utils/day-key";
import type { FrozenDay } from "../types";

type FrozenDayRow = typeof frozenDays.$inferSelect;

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
	const { data } = useLiveRows<FrozenDayRow>(
		db.select().from(frozenDays).orderBy(asc(frozenDays.date)),
	);
	return data.map(rowToFrozenDay);
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
				gte(frozenDays.date, toDayKey(monthStart)),
				lte(frozenDays.date, toDayKey(monthEnd)),
			),
		);
	return rows.length;
}

/** Takes a freeze back (the Undo for using one) — returns it to the shared pool. A no-op if that day isn't frozen. */
export async function unfreezeHabitDay(
	habitId: number,
	date: Date,
): Promise<void> {
	await db
		.delete(frozenDays)
		.where(
			and(eq(frozenDays.habitId, habitId), eq(frozenDays.date, toDayKey(date))),
		);
}

/** Freezes `habitId`'s missed `date` — idempotent, since a day can only be frozen once. */
export async function freezeHabitDay(
	habitId: number,
	date: Date,
): Promise<void> {
	await db
		.insert(frozenDays)
		.values({ habitId, date: toDayKey(date), createdAt: new Date() })
		.onConflictDoNothing();
}
