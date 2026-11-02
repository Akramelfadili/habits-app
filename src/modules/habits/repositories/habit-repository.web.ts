import { useSyncExternalStore } from "react";
import {
	DEFAULT_HABITS,
	habitFixturesFor,
	resolveFixtureScenario,
} from "../dev/habit-fixtures";
import {
	assertWritesAllowed,
	holdWriteIfSlow,
} from "../dev/write-failure-fixtures";
import type {
	Category,
	CreateHabitInput,
	DayRange,
	Habit,
	HabitsResult,
	UpdateHabitInput,
} from "../types";
import { getCategories } from "./category-repository.web";
import type * as NativeHabitRepository from "./habit-repository";

/**
 * Web-only stand-in for `habit-repository.ts`, picked by Metro's `.web.ts`
 * platform resolution. expo-sqlite has no web binding without WASM + COOP/COEP
 * headers, and web only exists here for visual checks against docs/mockups/
 * (scripts/visual-check.mjs) — so it's backed by in-memory fixtures instead.
 * Hooks and screens import `./habit-repository` either way and never know.
 *
 * Append `?fixtures=empty` (no habits) or `?fixtures=rest-day` to any URL to
 * render those Today states (HAB-05).
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

async function categoryById(id: number): Promise<Category> {
	const category = (await getCategories()).find((c) => c.id === id);
	if (!category) throw new Error(`Category ${id} not found`);
	return category;
}

function newHabit(
	{ categoryId: _categoryId, ...input }: CreateHabitInput,
	category: Category,
	habits: Habit[],
	createdAt: Date,
): Habit {
	return {
		...input,
		category,
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
const loadedResult = (habits: Habit[]): HabitsResult => ({
	habits,
	loaded: true,
});
let derived: {
	all: HabitsResult;
	active: HabitsResult;
	archived: HabitsResult;
} = {
	all: loadedResult([]),
	active: loadedResult([]),
	archived: loadedResult([]),
};

function getDerived() {
	const habits = getHabits();
	if (derivedFor !== habits) {
		const all = [...habits].sort(byManualOrder);
		derived = {
			all: loadedResult(all),
			active: loadedResult(all.filter((h) => h.archivedAt === null)),
			archived: loadedResult(
				all
					.filter((h) => h.archivedAt !== null)
					.sort(
						(a, b) =>
							(b.archivedAt?.getTime() ?? 0) - (a.archivedAt?.getTime() ?? 0),
					),
			),
		};
		derivedFor = habits;
	}
	return derived;
}

const SERVER_ALL = loadedResult(DEFAULT_HABITS);
const SERVER_ACTIVE = loadedResult(
	DEFAULT_HABITS.filter((h) => h.archivedAt === null),
);
const SERVER_ARCHIVED = loadedResult([]);

function updateOne(id: number, patch: Partial<Habit>): Habit {
	const existing = getHabits().find((h) => h.id === id);
	if (!existing) throw new Error(`Habit ${id} not found`);
	const habit = { ...existing, ...patch };
	setHabits(getHabits().map((h) => (h.id === id ? habit : h)));
	return habit;
}

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
	assertWritesAllowed();
	const category = await categoryById(input.categoryId);
	const habits = getHabits();
	const habit = newHabit(input, category, habits, new Date());
	setHabits([...habits, habit]);
	return habit;
}

export async function updateHabit(
	id: number,
	input: UpdateHabitInput,
): Promise<Habit> {
	assertWritesAllowed();
	const existing = getHabits().find((h) => h.id === id);
	if (!existing) throw new Error(`Habit ${id} not found`);
	const category = await categoryById(input.categoryId);

	// Field-by-field like the native repository — direction stays locked (HAB-01)
	// even if a caller passes a wider object at runtime.
	const habit: Habit = {
		...existing,
		name: input.name,
		category,
		targetType: input.targetType,
		targetAmount: input.targetAmount,
		targetUnit: input.targetUnit,
		frequency: input.frequency,
		updatedAt: new Date(),
	};
	setHabits(getHabits().map((h) => (h.id === id ? habit : h)));
	return habit;
}

export function useHabitsList(): HabitsResult {
	// Static web rendering has no URL-aware store on the server, so it renders
	// the default fixtures; the client snapshot then applies `?fixtures=`.
	return useSyncExternalStore(
		subscribe,
		() => getDerived().all,
		() => SERVER_ALL,
	);
}

export function useActiveHabits(): HabitsResult {
	return useSyncExternalStore(
		subscribe,
		() => getDerived().active,
		() => SERVER_ACTIVE,
	);
}

export function useArchivedHabits(): HabitsResult {
	return useSyncExternalStore(
		subscribe,
		() => getDerived().archived,
		() => SERVER_ARCHIVED,
	);
}

export async function getAllHabits(): Promise<Habit[]> {
	return [...getHabits()].sort(byManualOrder);
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
	pauses?: readonly DayRange[],
): Promise<Habit> {
	return updateOne(
		id,
		pauses ? { archivedAt, pauses: [...pauses] } : { archivedAt },
	);
}

export async function setHabitRestored(
	id: number,
	pauses: readonly DayRange[],
): Promise<Habit> {
	return updateOne(id, { archivedAt: null, pauses: [...pauses] });
}

/**
 * Web-only (not in the native repository): habits embed their category here,
 * where native resolves it live — so a category rename (HAB-25) has to be
 * copied onto every habit in it.
 */
export function applyCategoryChange(category: Category): void {
	setHabits(
		getHabits().map((h) =>
			h.category.id === category.id ? { ...h, category } : h,
		),
	);
}

/**
 * Web-only counterpart of the native category delete's reassignment
 * (HAB-25): every habit in `fromId`, archived ones too, moves to `to` at the
 * end of the manual order, keeping its relative order.
 */
export function reassignHabitsToCategory(fromId: number, to: Category): void {
	const habits = getHabits();
	const moving = habits
		.filter((h) => h.category.id === fromId)
		.sort(byManualOrder)
		.map((h) => h.id);
	const base = Math.max(0, ...habits.map((h) => h.sortOrder));
	setHabits(
		habits.map((h) => {
			const index = moving.indexOf(h.id);
			return index === -1
				? h
				: { ...h, category: to, sortOrder: base + index + 1 };
		}),
	);
}

/** Web has no related rows to clear — the fixture entry stores just ignore an unknown habit id. */
export async function deleteHabitAndHistory(id: number): Promise<void> {
	assertWritesAllowed();
	await holdWriteIfSlow();
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
	const category = await categoryById(input.categoryId);
	const habits = getHabits();
	const habit = newHabit(input, category, habits, createdAt);
	setHabits([...habits, habit]);
	return habit;
}

// Compile-time guard: this file must export exactly what the native repository
// does, so a function added there without a web counterpart fails `tsc`.
const _sameShape: typeof NativeHabitRepository = {
	createHabit,
	updateHabit,
	useHabitsList,
	useActiveHabits,
	useArchivedHabits,
	getAllHabits,
	getHabit,
	reorderHabits,
	setHabitArchived,
	setHabitRestored,
	deleteHabitAndHistory,
	deleteAllHabits,
	createHabitAt,
};
void _sameShape;
