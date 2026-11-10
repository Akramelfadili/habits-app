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

/**
 * Logging that gives a freeze back: a day that was frozen and is now logged as done no
 * longer needs its freeze, so the `frozen_days` row goes in the same transaction as the
 * entry, and the pool never counts a freeze for a day that is done. Each function reads the
 * freeze fresh at call time (a stale render must not decide it) and leaves the transaction
 * to the repository.
 */

export type DayWrite = {
	/** The freeze this write gave back, if the day had one — pass it to `restoreDay` to Undo exactly. */
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

/**
 * Sets a quantity habit's amount on `date`. Only an amount that reaches the
 * `target` completes the day, so only that returns a frozen day's freeze; a
 * partial amount leaves the day as missed as before.
 */
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

/**
 * The Undo of a write: puts the day back as `previous` (a check's state, or a
 * quantity's amount) and, if that write gave a freeze back, takes the freeze
 * again — same `createdAt`, same transaction — so the pool and the at-risk
 * state are exactly what they were.
 */
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
