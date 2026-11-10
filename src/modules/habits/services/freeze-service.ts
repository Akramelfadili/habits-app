import { endOfMonth, startOfMonth } from "date-fns";
import { FREEZE_POOL_SIZE } from "../constants";
import {
	freezeHabitDay,
	getFreezesUsedInMonth,
} from "../repositories/frozen-day-repository";

// The eligibility check is a fresh DB read, done together with the write, so a stale UI can't
// push the pool over its monthly limit.
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
