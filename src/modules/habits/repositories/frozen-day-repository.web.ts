import { useMemo, useSyncExternalStore } from "react";
import { toDayKey } from "@/utils/day-key";
import { makeFrozenDayFixtures } from "../dev/frozen-day-fixtures";
import { resolveFixtureScenario } from "../dev/habit-fixtures";
import type { FrozenDay } from "../types";
import type * as NativeFrozenDayRepository from "./frozen-day-repository";

/**
 * Web-only stand-in for `frozen-day-repository.ts` — in-memory fixtures, no
 * expo-sqlite binding, same shape as `entry-repository.web.ts`.
 */

let store: FrozenDay[] | undefined;
const listeners = new Set<() => void>();

function getFrozenDays(): FrozenDay[] {
	store ??= makeFrozenDayFixtures(resolveFixtureScenario());
	return store;
}

function setFrozenDays(next: FrozenDay[]) {
	store = next;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useFrozenDays(): FrozenDay[] {
	return useSyncExternalStore(
		subscribe,
		getFrozenDays,
		() => [] as FrozenDay[],
	);
}

export function useFrozenDaysInRange(start: Date, end: Date): FrozenDay[] {
	const frozenDays = useFrozenDays();
	const startDate = toDayKey(start);
	const endDate = toDayKey(end);
	return useMemo(
		() =>
			frozenDays.filter(
				(frozen) => frozen.date >= startDate && frozen.date <= endDate,
			),
		[frozenDays, startDate, endDate],
	);
}

export async function getFreezesUsedInMonth(
	monthStart: Date,
	monthEnd: Date,
): Promise<number> {
	const startDate = toDayKey(monthStart);
	const endDate = toDayKey(monthEnd);
	return getFrozenDays().filter(
		(frozenDay) => frozenDay.date >= startDate && frozenDay.date <= endDate,
	).length;
}

export async function freezeHabitDay(
	habitId: number,
	date: Date,
	createdAt: Date = new Date(),
): Promise<void> {
	const dateString = toDayKey(date);
	const frozenDays = getFrozenDays();
	if (
		frozenDays.some(
			(frozenDay) =>
				frozenDay.habitId === habitId && frozenDay.date === dateString,
		)
	) {
		return;
	}

	const nextId =
		Math.max(0, ...frozenDays.map((frozenDay) => frozenDay.id)) + 1;
	setFrozenDays([
		...frozenDays,
		{ id: nextId, habitId, date: dateString, createdAt },
	]);
}

export async function getFrozenDay(
	habitId: number,
	date: Date,
): Promise<FrozenDay | undefined> {
	const dateString = toDayKey(date);
	return getFrozenDays().find(
		(frozenDay) =>
			frozenDay.habitId === habitId && frozenDay.date === dateString,
	);
}

export async function unfreezeHabitDay(
	habitId: number,
	date: Date,
): Promise<void> {
	const dateString = toDayKey(date);
	setFrozenDays(
		getFrozenDays().filter(
			(frozenDay) =>
				!(frozenDay.habitId === habitId && frozenDay.date === dateString),
		),
	);
}

// Compile-time guard: this file must export exactly what the native repository
// does, so a function added there without a web counterpart fails `tsc`.
const _sameShape: typeof NativeFrozenDayRepository = {
	useFrozenDays,
	useFrozenDaysInRange,
	getFreezesUsedInMonth,
	freezeHabitDay,
	getFrozenDay,
	unfreezeHabitDay,
};
void _sameShape;
