import { format } from "date-fns";
import { useSyncExternalStore } from "react";
import { makeFrozenDayFixtures } from "../dev/frozen-day-fixtures";
import { resolveFixtureScenario } from "../dev/habit-fixtures";
import type { FrozenDay } from "../types";
import type * as NativeFrozenDayRepository from "./frozen-day-repository";

/**
 * Web-only stand-in for `frozen-day-repository.ts` — in-memory fixtures, no
 * expo-sqlite binding, same shape as `entry-repository.web.ts`.
 */

const DATE_FORMAT = "yyyy-MM-dd";

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

export async function getFreezesUsedInMonth(
	monthStart: Date,
	monthEnd: Date,
): Promise<number> {
	const startDate = format(monthStart, DATE_FORMAT);
	const endDate = format(monthEnd, DATE_FORMAT);
	return getFrozenDays().filter(
		(frozenDay) => frozenDay.date >= startDate && frozenDay.date <= endDate,
	).length;
}

export async function freezeHabitDay(
	habitId: number,
	date: Date,
): Promise<void> {
	const dateString = format(date, DATE_FORMAT);
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
		{ id: nextId, habitId, date: dateString, createdAt: new Date() },
	]);
}

export async function unfreezeHabitDay(
	habitId: number,
	date: Date,
): Promise<void> {
	const dateString = format(date, DATE_FORMAT);
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
	getFreezesUsedInMonth,
	freezeHabitDay,
	unfreezeHabitDay,
};
void _sameShape;
