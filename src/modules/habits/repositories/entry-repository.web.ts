import { format } from "date-fns";
import { useSyncExternalStore } from "react";
import {
	makeEntryFixtures,
	makeEntryNoteFixtures,
} from "../dev/entry-fixtures";
import { resolveFixtureScenario } from "../dev/habit-fixtures";
import { assertWritesAllowed } from "../dev/write-failure-fixtures";
import type { DayLog, Entry, EntryNote } from "../types";
import type * as NativeEntryRepository from "./entry-repository";
import { freezeHabitDay, unfreezeHabitDay } from "./frozen-day-repository.web";

export type FreezeChange = NativeEntryRepository.FreezeChange;

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

let noteStore: EntryNote[] | undefined;

function getNotes(): EntryNote[] {
	noteStore ??= makeEntryNoteFixtures(resolveFixtureScenario());
	return noteStore;
}

function setNotes(next: EntryNote[]) {
	noteStore = next;
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

/** Web counterpart of the native freeze change (PR-11): no real transaction, one store. */
async function changeFreeze(
	habitId: number,
	date: Date,
	freeze: FreezeChange | undefined,
): Promise<void> {
	if (!freeze) return;
	if ("release" in freeze) await unfreezeHabitDay(habitId, date);
	else await freezeHabitDay(habitId, date, freeze.reinstate);
}

export async function setHabitCompletedOn(
	habitId: number,
	date: Date,
	completed: boolean,
	freeze?: FreezeChange,
): Promise<void> {
	assertWritesAllowed();
	await changeFreeze(habitId, date, freeze);
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
	freeze?: FreezeChange,
): Promise<void> {
	assertWritesAllowed();
	await changeFreeze(habitId, date, freeze);
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

/** Web counterpart of the native repository's notes live query (HAB-10). */
export function useEntryNotes(): EntryNote[] {
	return useSyncExternalStore(subscribe, getNotes, () => [] as EntryNote[]);
}

/** Web counterpart of the native transactional day save (HAB-10). */
export async function saveDayLog(date: Date, log: DayLog): Promise<void> {
	assertWritesAllowed();
	for (const { habitId, value } of log.values) {
		if (typeof value === "boolean") {
			await setHabitCompletedOn(habitId, date, value);
		} else {
			await setHabitQuantityOn(habitId, date, value);
		}
	}

	const dateString = format(date, "yyyy-MM-dd");
	const note = log.note.trim();
	const others = getNotes().filter(
		(entry) =>
			!(entry.habitId === log.noteHabitId && entry.date === dateString),
	);
	setNotes(
		note === ""
			? others
			: [...others, { habitId: log.noteHabitId, date: dateString, note }],
	);
}

// Compile-time guard: this file must export exactly what the native repository
// does, so a function added there without a web counterpart fails `tsc`.
const _sameShape: typeof NativeEntryRepository = {
	useEntriesInRange,
	useAllEntries,
	setHabitCompletedOn,
	setHabitQuantityOn,
	useEntryNotes,
	saveDayLog,
};
void _sameShape;
