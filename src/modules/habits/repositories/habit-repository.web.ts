import { useSyncExternalStore } from "react";
import type { CreateHabitInput, Habit, UpdateHabitInput } from "../types";
import {
	HABIT_FIXTURES,
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

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
	const now = new Date();
	const habits = getHabits();
	const habit: Habit = {
		...input,
		id: Math.max(0, ...habits.map((h) => h.id)) + 1,
		createdAt: now,
		updatedAt: now,
	};
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
		frequency: input.frequency,
		updatedAt: new Date(),
	};
	setHabits(getHabits().map((h) => (h.id === id ? habit : h)));
	return habit;
}

export function useHabitsList(): Habit[] {
	// Static web rendering has no URL-aware store on the server, so it renders
	// the default fixtures; the client snapshot then applies `?fixtures=`.
	return useSyncExternalStore(subscribe, getHabits, () => HABIT_FIXTURES);
}

export async function deleteAllHabits(): Promise<void> {
	if (!__DEV__) {
		throw new Error("deleteAllHabits is dev-only");
	}
	setHabits([]);
}

// Compile-time guard: this file must export exactly what the native repository
// does, so a function added there without a web counterpart fails `tsc`.
const _sameShape: typeof NativeHabitRepository = {
	createHabit,
	updateHabit,
	useHabitsList,
	deleteAllHabits,
};
void _sameShape;
