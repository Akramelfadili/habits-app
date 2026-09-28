import { format } from "date-fns";
import { useSyncExternalStore } from "react";
import type { Entry } from "../types";
import { makeEntryFixtures } from "./entry-fixtures";
import type * as NativeEntryRepository from "./entry-repository";
import { resolveFixtureScenario } from "./habit-fixtures";

/**
 * Web-only stand-in for `entry-repository.ts` (see `habit-repository.web.ts`
 * for why web exists at all — in-memory fixtures, no expo-sqlite binding).
 */

let store: Entry[] | undefined;
const listeners = new Set<() => void>();

function getEntries(): Entry[] {
	store ??= makeEntryFixtures(resolveFixtureScenario());
	return store;
}

function setEntries(next: Entry[]) {
	store = next;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useEntriesInRange(start: Date, end: Date): Entry[] {
	const entries = useSyncExternalStore(
		subscribe,
		getEntries,
		() => [] as Entry[],
	);
	const startDate = format(start, "yyyy-MM-dd");
	const endDate = format(end, "yyyy-MM-dd");
	return entries.filter(
		(entry) => entry.date >= startDate && entry.date <= endDate,
	);
}

/** Web counterpart of the native repository's unbounded live query. */
export function useAllEntries(): Entry[] {
	return useSyncExternalStore(subscribe, getEntries, () => [] as Entry[]);
}

export async function setHabitCompletedOn(
	habitId: number,
	date: Date,
	completed: boolean,
): Promise<void> {
	const dateString = format(date, "yyyy-MM-dd");
	const entries = getEntries();
	const existing = entries.find(
		(entry) => entry.habitId === habitId && entry.date === dateString,
	);

	if (completed) {
		if (existing) return;
		const nextId = Math.max(0, ...entries.map((entry) => entry.id)) + 1;
		setEntries([
			...entries,
			{ id: nextId, habitId, date: dateString, createdAt: new Date() },
		]);
		return;
	}

	if (!existing) return;
	setEntries(entries.filter((entry) => entry.id !== existing.id));
}

/** Web counterpart of the native repository's quantity upsert (HAB-07). */
export async function setHabitQuantityOn(
	habitId: number,
	date: Date,
	value: number,
): Promise<void> {
	const dateString = format(date, "yyyy-MM-dd");
	const entries = getEntries();
	const existing = entries.find(
		(entry) => entry.habitId === habitId && entry.date === dateString,
	);

	if (value <= 0) {
		if (!existing) return;
		setEntries(entries.filter((entry) => entry.id !== existing.id));
		return;
	}

	if (existing) {
		setEntries(
			entries.map((entry) =>
				entry.id === existing.id ? { ...entry, value } : entry,
			),
		);
		return;
	}

	const nextId = Math.max(0, ...entries.map((entry) => entry.id)) + 1;
	setEntries([
		...entries,
		{ id: nextId, habitId, date: dateString, value, createdAt: new Date() },
	]);
}

// Compile-time guard: this file must export exactly what the native repository
// does, so a function added there without a web counterpart fails `tsc`.
const _sameShape: typeof NativeEntryRepository = {
	useEntriesInRange,
	useAllEntries,
	setHabitCompletedOn,
	setHabitQuantityOn,
};
void _sameShape;
