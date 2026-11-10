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

export function useFrozenDays(): FrozenDay[] {
	return useSharedLiveTable(frozenLog, allFrozenDays);
}

export function useFrozenDaysInRange(start: Date, end: Date): FrozenDay[] {
	const startDate = toDayKey(start);
	const endDate = toDayKey(end);
	const { data } = useLiveRows<FrozenDayRow>(
		() =>
			db
				.select()
				.from(frozenDays)
				.where(
					and(gte(frozenDays.date, startDate), lte(frozenDays.date, endDate)),
				)
				.orderBy(asc(frozenDays.date)),
		// Without deps the first range would be read forever.
		[startDate, endDate],
	);
	return useMemo(() => data.map(rowToFrozenDay), [data]);
}

// A fresh read, not whatever a hook last rendered: it gates whether the write is allowed.
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

// A log on that day decides on this, so it must not trust a stale render.
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

// Idempotent: a day can only be frozen once.
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
