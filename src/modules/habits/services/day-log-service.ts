import { endOfMonth, startOfMonth } from "date-fns";
import { FREEZE_POOL_SIZE } from "../constants";
import {
	type FreezeChange,
	setHabitCompletedOn,
	setHabitQuantityOn,
} from "../repositories/entry-repository";
import {
	getFreezesUsedInMonth,
	getFrozenDay,
} from "../repositories/frozen-day-repository";
import type { FrozenDay } from "../types";

// The `frozen_days` row goes in the same transaction as the entry, so the pool never counts a
// freeze for a done day. The freeze is read fresh (a stale render must not decide it).

export type DayWrite = {
	returnedFreeze: FrozenDay | null;
	freezesLeft: number;
};

export async function freezesLeftIn(date: Date): Promise<number> {
	const used = await getFreezesUsedInMonth(
		startOfMonth(date),
		endOfMonth(date),
	);
	return Math.max(0, FREEZE_POOL_SIZE - used);
}

async function finish(
	date: Date,
	returnedFreeze: FrozenDay | null,
): Promise<DayWrite> {
	return { returnedFreeze, freezesLeft: await freezesLeftIn(date) };
}

export async function setCheckOnDay(
	habitId: number,
	date: Date,
	completed: boolean,
): Promise<DayWrite> {
	const frozen = completed ? await getFrozenDay(habitId, date) : undefined;
	await setHabitCompletedOn(
		habitId,
		date,
		completed,
		frozen ? { release: true } : undefined,
	);
	return finish(date, frozen ?? null);
}

// Only an amount reaching `target` completes the day, so a partial amount keeps the freeze.
export async function setQuantityOnDay(
	habitId: number,
	date: Date,
	value: number,
	target: number | null,
): Promise<DayWrite> {
	const completes = target !== null && value >= target;
	const frozen = completes ? await getFrozenDay(habitId, date) : undefined;
	await setHabitQuantityOn(
		habitId,
		date,
		value,
		frozen ? { release: true } : undefined,
	);
	return finish(date, frozen ?? null);
}

// Takes the freeze again with the same `createdAt`, so the pool and at-risk state are exactly as before.
export async function restoreDay(
	habitId: number,
	date: Date,
	previous: boolean | number,
	returnedFreeze: FrozenDay | null,
): Promise<void> {
	const freeze: FreezeChange | undefined = returnedFreeze
		? { reinstate: returnedFreeze.createdAt }
		: undefined;
	if (typeof previous === "boolean") {
		await setHabitCompletedOn(habitId, date, previous, freeze);
	} else {
		await setHabitQuantityOn(habitId, date, previous, freeze);
	}
}
