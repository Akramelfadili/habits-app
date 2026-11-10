import { fromDayKey } from "@/utils/day-key";

// Rates from a few days mislead, so fewer than 7 days of logs (distinct days, any habit,
// bonus included) shows the unlock card instead of stats.

const PROGRESS_UNLOCK_DAYS = 7;

export type ProgressUnlock = {
	loggedDays: number;
	neededDays: number;
	remainingDays: number;
	progress: number;
	isUnlocked: boolean;
	firstLogDate: Date | null;
};

export function progressUnlock(logged: {
	count: number;
	firstDate: string | null;
}): ProgressUnlock {
	const loggedDays = Math.min(Math.max(logged.count, 0), PROGRESS_UNLOCK_DAYS);
	return {
		loggedDays,
		neededDays: PROGRESS_UNLOCK_DAYS,
		remainingDays: PROGRESS_UNLOCK_DAYS - loggedDays,
		progress: loggedDays / PROGRESS_UNLOCK_DAYS,
		isUnlocked: logged.count >= PROGRESS_UNLOCK_DAYS,
		firstLogDate: logged.firstDate ? fromDayKey(logged.firstDate) : null,
	};
}

export type ProgressGate =
	| "no-habits"
	| "nothing-logged"
	| "too-early"
	| "ready";

export function progressGate(
	habitCount: number,
	unlock: ProgressUnlock,
): ProgressGate {
	if (habitCount === 0) return "no-habits";
	if (unlock.loggedDays === 0) return "nothing-logged";
	return unlock.isUnlocked ? "ready" : "too-early";
}
