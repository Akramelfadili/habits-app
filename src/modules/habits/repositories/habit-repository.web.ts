import { useSyncExternalStore } from "react";
// Explicit `.web` suffix — Jest defaults to iOS resolution, and an
// extension-less import here would pull in the native app-settings
// repository (and its real `db`/expo-sqlite import) even when this file is
// loaded explicitly for a web test.
import { setSetting } from "@/lib/app-settings/repositories/app-settings-repository.web";
import type {
	CreateHabitInput,
	DayRange,
	Habit,
	UpdateHabitInput,
} from "../types";
import {
	DEFAULT_HABITS,
	habitFixturesFor,
	resolveFixtureScenario,
} from "./habit-fixtures";
import type * as NativeHabitRepository from "./habit-repository";

/**
 * Web-only stand-in for `habit-repository.ts`, picked by Metro's `.web.ts`
 * platform resolution. expo-sqlite has no web binding without WASM + COOP/COEP
 * headers, and web only exists here for visual checks against docs/mockups/
 * (scripts/visual-check.mjs) — so it's backed by in-memory fixtures instead.
 * Hooks and screens import `./habit-repository` either way and never know.
 *
 * Append `?fixtures=empty` (no habits), `?fixtures=rest-day`, or
 * `?fixtures=day-closed` to any URL to render those Today states (HAB-05).
 */

function initialHabits(): Habit[] {
	return habitFixturesFor(resolveFixtureScenario());
}

let store: Habit[] | undefined;
const listeners = new Set<() => void>();

function getHabits(): Habit[] {
	store ??= initialHabits();
	return store;
}

function setHabits(next: Habit[]) {
	store = next;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function nextId(habits: Habit[]): number {
	return Math.max(0, ...habits.map((h) => h.id)) + 1;
}

function nextSortOrder(habits: Habit[]): number {
	return Math.max(0, ...habits.map((h) => h.sortOrder)) + 1;
}

function newHabit(
	input: CreateHabitInput,
	habits: Habit[],
	createdAt: Date,
): Habit {
	return {
		...input,
		id: nextId(habits),
		sortOrder: nextSortOrder(habits),
		archivedAt: null,
		pauses: [],
		createdAt,
		updatedAt: createdAt,
	};
}

function byManualOrder(a: Habit, b: Habit): number {
	return a.sortOrder - b.sortOrder || a.id - b.id;
}

/** Derived lists are cached per store snapshot so `useSyncExternalStore` sees stable references. */
let derivedFor: Habit[] | undefined;
let derived: { all: Habit[]; active: Habit[]; archived: Habit[] } = {
	all: [],
	active: [],
	archived: [],
};

function getDerived() {
	const habits = getHabits();
	if (derivedFor !== habits) {
		const all = [...habits].sort(byManualOrder);
		derived = {
			all,
			active: all.filter((h) => h.archivedAt === null),
			archived: all
				.filter((h) => h.archivedAt !== null)
				.sort(
					(a, b) =>
						(b.archivedAt?.getTime() ?? 0) - (a.archivedAt?.getTime() ?? 0),
				),
		};
		derivedFor = habits;
	}
	return derived;
}

const SERVER_ACTIVE = DEFAULT_HABITS.filter((h) => h.archivedAt === null);
const SERVER_ARCHIVED: Habit[] = [];

function updateOne(id: number, patch: Partial<Habit>): Habit {
	const existing = getHabits().find((h) => h.id === id);
	if (!existing) throw new Error(`Habit ${id} not found`);
	const habit = { ...existing, ...patch };
	setHabits(getHabits().map((h) => (h.id === id ? habit : h)));
	return habit;
}

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
	const habits = getHabits();
	const habit = newHabit(input, habits, new Date());
	setHabits([...habits, habit]);
	return habit;
}

export async function updateHabit(
	id: number,
	input: UpdateHabitInput,
): Promise<Habit> {
	const existing = getHabits().find((h) => h.id === id);
	if (!existing) throw new Error(`Habit ${id} not found`);

	// Field-by-field like the native repository — direction stays locked (HAB-01)
	// even if a caller passes a wider object at runtime.
	const habit: Habit = {
		...existing,
		name: input.name,
		icon: input.icon,
		color: input.color,
		category: input.category,
		targetType: input.targetType,
		targetAmount: input.targetAmount,
		targetUnit: input.targetUnit,
		frequency: input.frequency,
		updatedAt: new Date(),
	};
	setHabits(getHabits().map((h) => (h.id === id ? habit : h)));
	return habit;
}

/** Web counterpart of the native repository's atomic batch-create (HAB-06). */
export async function createHabitsAndMarkSetting(
	inputs: CreateHabitInput[],
	setting: { key: string; value: string },
): Promise<Habit[]> {
	const now = new Date();
	let habits = getHabits();
	const created: Habit[] = [];
	for (const input of inputs) {
		const habit = newHabit(input, habits, now);
		created.push(habit);
		habits = [...habits, habit];
	}
	setHabits(habits);
	await setSetting(setting.key, setting.value);
	return created;
}

export function useHabitsList(): Habit[] {
	// Static web rendering has no URL-aware store on the server, so it renders
	// the default fixtures; the client snapshot then applies `?fixtures=`.
	return useSyncExternalStore(
		subscribe,
		() => getDerived().all,
		() => DEFAULT_HABITS,
	);
}

export function useActiveHabits(): Habit[] {
	return useSyncExternalStore(
		subscribe,
		() => getDerived().active,
		() => SERVER_ACTIVE,
	);
}

export function useArchivedHabits(): Habit[] {
	return useSyncExternalStore(
		subscribe,
		() => getDerived().archived,
		() => SERVER_ARCHIVED,
	);
}

export async function getHabit(id: number): Promise<Habit | undefined> {
	return getHabits().find((h) => h.id === id);
}

/** Web counterpart of the native repository's slot-preserving reorder (HAB-13). */
export async function reorderHabits(orderedIds: number[]): Promise<void> {
	const habits = getHabits();
	const slots = orderedIds
		.map((id) => habits.find((h) => h.id === id)?.sortOrder)
		.filter((value): value is number => value !== undefined)
		.sort((a, b) => a - b);
	if (slots.length !== orderedIds.length) {
		throw new Error("Cannot reorder a habit that doesn't exist");
	}
	const next = new Map(orderedIds.map((id, index) => [id, slots[index]]));
	setHabits(
		habits.map((h) =>
			next.has(h.id) ? { ...h, sortOrder: next.get(h.id) ?? h.sortOrder } : h,
		),
	);
}

export async function setHabitArchived(
	id: number,
	archivedAt: Date,
): Promise<Habit> {
	return updateOne(id, { archivedAt });
}

export async function setHabitRestored(
	id: number,
	pauses: readonly DayRange[],
): Promise<Habit> {
	return updateOne(id, { archivedAt: null, pauses: [...pauses] });
}

/** Web has no related rows to clear — the fixture entry stores just ignore an unknown habit id. */
export async function deleteHabitAndHistory(id: number): Promise<void> {
	setHabits(getHabits().filter((h) => h.id !== id));
}

export async function deleteAllHabits(): Promise<void> {
	if (!__DEV__) {
		throw new Error("deleteAllHabits is dev-only");
	}
	setHabits([]);
}

/** Web counterpart of the native repository's backdated dev-seed helper (HAB-08). */
export async function createHabitAt(
	input: CreateHabitInput,
	createdAt: Date,
): Promise<Habit> {
	if (!__DEV__) {
		throw new Error("createHabitAt is dev-only");
	}
	const habits = getHabits();
	const habit = newHabit(input, habits, createdAt);
	setHabits([...habits, habit]);
	return habit;
}

// Compile-time guard: this file must export exactly what the native repository
// does, so a function added there without a web counterpart fails `tsc`.
const _sameShape: typeof NativeHabitRepository = {
	createHabit,
	updateHabit,
	createHabitsAndMarkSetting,
	useHabitsList,
	useActiveHabits,
	useArchivedHabits,
	getHabit,
	reorderHabits,
	setHabitArchived,
	setHabitRestored,
	deleteHabitAndHistory,
	deleteAllHabits,
	createHabitAt,
};
void _sameShape;
