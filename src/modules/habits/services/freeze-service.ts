import { endOfMonth, startOfMonth } from "date-fns";
import { FREEZE_POOL_SIZE } from "../constants";
import {
	freezeHabitDay,
	getFreezesUsedInMonth,
} from "../repositories/frozen-day-repository";

/**
 * The one composite operation this feature needs: freezing a missed day means
 * checking the shared pool's *current* eligibility (a fresh DB read, not
 * whatever a hook last rendered) and then writing the freeze — together, so
 * a stale UI can't push the pool over its monthly limit. Resolves with what is
 * left in the missed day's month, for the toast ("… · 0 left").
 */
export async function applyFreeze(
	habitId: number,
	missedDate: Date,
): Promise<{ freezesLeft: number }> {
	const used = await getFreezesUsedInMonth(
		startOfMonth(missedDate),
		endOfMonth(missedDate),
	);
	if (used >= FREEZE_POOL_SIZE) {
		throw new Error("No freezes remaining this month");
	}
	await freezeHabitDay(habitId, missedDate);
	return { freezesLeft: FREEZE_POOL_SIZE - used - 1 };
}
