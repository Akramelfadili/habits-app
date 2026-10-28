import { fromDayKey } from "@/utils/day-key";

/**
 * The "too early" gate for Week, Month and Year (HAB-35–37, P2/P9/P14): rates
 * from a few days mislead, so with fewer than 7 days of logs an unlock card
 * (with progress) replaces the stats and insights while the grid still draws.
 * One gate for all three ranges. It replaces Monthly's old 30-day unlock.
 *
 * "Days of logs" = distinct calendar days with at least one entry (any habit,
 * bonus included), over all history — a person who skips a day waits a day.
 *
 * The three states a Progress screen has *before* "ready" are distinct views:
 * no habits at all (P3), habits but nothing ever logged (P4: outlined cells,
 * not missed), and too early (P2).
 */

export const PROGRESS_UNLOCK_DAYS = 7;

export type ProgressUnlock = {
	/** Days with a log so far, capped at `neededDays`. */
	loggedDays: number;
	neededDays: number;
	/** "Unlocks in N days". */
	remainingDays: number;
	/** 0–1, for the unlock card's bar. */
	progress: number;
	isUnlocked: boolean;
	/** The first logged day ("Started Wed 21 Oct"); null when nothing is logged. */
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
	/** No habits exist (P3): empty state, Export disabled. */
	| "no-habits"
	/** Habits exist but nothing was ever logged (P4): outlined cells, a link to Today. */
	| "nothing-logged"
	/** Fewer than 7 days of logs (P2/P9/P14): unlock card, the grid still renders. */
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
