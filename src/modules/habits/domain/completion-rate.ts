import type { HabitDayCell } from "./day-status";

/**
 * The one completion-rate rule, used by Progress, Monthly, Yearly, Weekly and Habit Detail's
 * 90-day rate: **done ÷ due**, per day, summed.
 *
 * - Due = done + partial + missed. A partial quantity day is due and not done.
 * - Frozen days leave both sides; bonus (off-schedule) logs are never counted.
 * - Paused, before-start, future and not-due days are not due; `nothing-logged` (nothing has ever
 *   been logged) isn't either: there is no rate yet.
 * - Today joins only once it is done: it can't have been missed, and a half-logged quantity day
 *   isn't a verdict yet.
 * - Break habits: a logged day is a resisted day, i.e. done.
 * - Rates are whole numbers.
 */
export type Tally = {
	done: number;
	due: number;
	frozen: number;
	bonus: number;
};

export const EMPTY_TALLY: Tally = { done: 0, due: 0, frozen: 0, bonus: 0 };

/** Adds one cell to `tally` (mutates and returns it — hot loops over a year). */
export function addToTally(tally: Tally, cell: HabitDayCell): Tally {
	switch (cell.status) {
		case "done":
			tally.done += 1;
			tally.due += 1;
			break;
		case "partial":
		case "missed":
			if (!cell.isToday) tally.due += 1;
			break;
		case "frozen":
			tally.frozen += 1;
			break;
		case "bonus":
			tally.bonus += 1;
			break;
		default:
			break;
	}
	return tally;
}

export function tallyOf(cells: Iterable<HabitDayCell>): Tally {
	const tally = { ...EMPTY_TALLY };
	for (const cell of cells) addToTally(tally, cell);
	return tally;
}

export function mergeTallies(into: Tally, from: Tally): Tally {
	into.done += from.done;
	into.due += from.due;
	into.frozen += from.frozen;
	into.bonus += from.bonus;
	return into;
}

export function completionPercent(done: number, due: number): number | null {
	return due > 0 ? Math.round((done / due) * 100) : null;
}

export function percentOf(tally: Tally): number | null {
	return completionPercent(tally.done, tally.due);
}

/** A day where every due habit was done and none was frozen (a frozen day is not perfect). */
export function isPerfectDay(tally: Tally): boolean {
	return tally.due > 0 && tally.done === tally.due && tally.frozen === 0;
}

export type DayLevel = 0 | 1 | 2 | 3;

/**
 * The calendar / year-map shade: L0 nothing done, L1 1–49 %, L2 50–99 %, L3
 * 100 %. Exact fractions (not the rounded %) so 99.6 % never shades as full.
 * null when nothing was due.
 */
export function dayLevel(tally: Tally): DayLevel | null {
	if (tally.due === 0) return null;
	const fraction = tally.done / tally.due;
	if (fraction >= 1) return 3;
	if (fraction >= 0.5) return 2;
	return fraction > 0 ? 1 : 0;
}
