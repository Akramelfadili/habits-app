import { useMemo, useSyncExternalStore } from "react";
import type {
	CreateReminderInput,
	IsoWeekday,
	Reminder,
	ReminderPatch,
} from "../types";
import { resolveFixtureScenario } from "./habit-fixtures";
import { makeReminderFixtures } from "./reminder-fixtures";
import type * as NativeReminderRepository from "./reminder-repository";

/**
 * Web-only stand-in for `reminder-repository.ts` — in-memory fixtures, no
 * expo-sqlite binding, same shape as `frozen-day-repository.web.ts`.
 */

let store: Reminder[] | undefined;
const listeners = new Set<() => void>();

function getReminders(): Reminder[] {
	store ??= makeReminderFixtures(resolveFixtureScenario());
	return store;
}

function setReminders(next: Reminder[]) {
	store = next;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function normalizeWeekdays(weekdays: readonly IsoWeekday[]): IsoWeekday[] {
	return [...new Set(weekdays)].sort((a, b) => a - b);
}

function forHabit(all: Reminder[], habitId: number): Reminder[] {
	return all
		.filter((reminder) => reminder.habitId === habitId)
		.sort((a, b) => a.hour - b.hour || a.minute - b.minute || a.id - b.id);
}

export function useHabitReminders(habitId: number): Reminder[] {
	const all = useSyncExternalStore(
		subscribe,
		getReminders,
		() => [] as Reminder[],
	);
	return useMemo(() => forHabit(all, habitId), [all, habitId]);
}

export async function getHabitReminders(habitId: number): Promise<Reminder[]> {
	return forHabit(getReminders(), habitId);
}

export async function createReminder(
	input: CreateReminderInput,
): Promise<Reminder> {
	const all = getReminders();
	const reminder: Reminder = {
		...input,
		weekdays: normalizeWeekdays(input.weekdays),
		id: Math.max(0, ...all.map((r) => r.id)) + 1,
	};
	setReminders([...all, reminder]);
	return reminder;
}

export async function updateReminder(
	id: number,
	patch: ReminderPatch,
): Promise<Reminder> {
	let updated: Reminder | undefined;
	setReminders(
		getReminders().map((reminder) => {
			if (reminder.id !== id) return reminder;
			updated = {
				...reminder,
				...patch,
				weekdays: patch.weekdays
					? normalizeWeekdays(patch.weekdays)
					: reminder.weekdays,
			};
			return updated;
		}),
	);
	if (!updated) throw new Error(`No reminder with id ${id}`);
	return updated;
}

export async function deleteReminder(id: number): Promise<void> {
	setReminders(getReminders().filter((reminder) => reminder.id !== id));
}

// Compile-time guard: this file must export exactly what the native repository
// does, so a function added there without a web counterpart fails `tsc`.
const _sameShape: typeof NativeReminderRepository = {
	useHabitReminders,
	getHabitReminders,
	createReminder,
	updateReminder,
	deleteReminder,
};
void _sameShape;
