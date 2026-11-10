import { and, asc, eq, gte, lte } from "drizzle-orm";
import { useMemo } from "react";
import { db } from "@/lib/db/client";
import { frozenDays } from "@/lib/db/schema";
import {
	createSharedLiveTable,
	useSharedLiveTable,
} from "@/lib/db/shared-live-table";
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

/** The one live read of every frozen day, shared by the screens that want the pool (audit B-07, as `entry-repository.ts`'s log). */
const frozenLog = createSharedLiveTable({
	table: "frozen_days",
	read: () => db.select().from(frozenDays).orderBy(asc(frozenDays.date)),
	map: rowToFrozenDay,
	key: (frozenDay) => frozenDay.id,
	same: (a, b) =>
		a.habitId === b.habitId &&
		a.date === b.date &&
		a.createdAt.getTime() === b.createdAt.getTime(),
});

const allFrozenDays = (rows: FrozenDay[]): FrozenDay[] => rows;

/** Live-query hook — every frozen day, across every habit (the pool is shared, not per-habit). */
export function useFrozenDays(): FrozenDay[] {
	return useSharedLiveTable(frozenLog, allFrozenDays);
}

/** Live-query hook — frozen days with a date in `[start, end]`, inclusive, across every habit. */
export function useFrozenDaysInRange(start: Date, end: Date): FrozenDay[] {
	const startDate = toDayKey(start);
	const endDate = toDayKey(end);
	const { data } = useLiveRows<FrozenDayRow>(
		db
			.select()
			.from(frozenDays)
			.where(
				and(gte(frozenDays.date, startDate), lte(frozenDays.date, endDate)),
			)
			.orderBy(asc(frozenDays.date)),
		// Subscribes once per deps: without them the first range would be read forever.
		[startDate, endDate],
	);
	return useMemo(() => data.map(rowToFrozenDay), [data]);
}

/**
 * A one-off (non-reactive) count of freezes used in `[monthStart, monthEnd]`,
 * across every habit — the shared pool's write-time eligibility check
 * (`services/freeze-service.ts`'s `applyFreeze`) needs a fresh read at call time, not
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

/**
 * A fresh (non-reactive) read of one habit's freeze on `date`, if it has one —
 * what a log on that day decides on, so it must not trust a stale render.
 */
export async function getFrozenDay(
	habitId: number,
	date: Date,
): Promise<FrozenDay | undefined> {
	const [row] = await db
		.select()
		.from(frozenDays)
		.where(
			and(eq(frozenDays.habitId, habitId), eq(frozenDays.date, toDayKey(date))),
		);
	return row ? rowToFrozenDay(row) : undefined;
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

/** Freezes `habitId`'s missed `date` — idempotent, since a day can only be frozen once. `createdAt` is for putting a returned freeze back as it was. */
export async function freezeHabitDay(
	habitId: number,
	date: Date,
	createdAt: Date = new Date(),
): Promise<void> {
	await db
		.insert(frozenDays)
		.values({ habitId, date: toDayKey(date), createdAt })
		.onConflictDoNothing();
}
