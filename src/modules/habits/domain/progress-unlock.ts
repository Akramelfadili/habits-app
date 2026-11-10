import { fromDayKey } from "@/utils/day-key";

/**
 * The "too early" gate for Week, Month and Year: rates from a few days mislead, so with fewer
 * than 7 days of logs an unlock card (with progress) replaces the stats and insights while the
 * grid still draws. One gate for all three ranges.
 *
 * "Days of logs" = distinct calendar days with at least one entry (any habit, bonus included),
 * over all history: a person who skips a day waits a day.
 *
 * The three states a Progress screen has *before* "ready" are distinct views: no habits at all,
 * habits but nothing ever logged (outlined cells, not missed), and too early.
 */

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
	/** No habits exist: empty state, Export disabled. */
	| "no-habits"
	/** Habits exist but nothing was ever logged: outlined cells, a link to Today. */
	| "nothing-logged"
	/** Fewer than 7 days of logs: unlock card, the grid still renders. */
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
