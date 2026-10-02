import type { Habit } from "../types";
import type { YearlyHabitRow, YearMonthCell } from "./yearly-summary";

/**
 * Yearly Summary's insights (HAB-17, frame C5). Every threshold lives in this
 * one block, like `monthly-insights.ts` — and the `yearly-summary` fixture's
 * test pins that these defaults give C5's cards, in order.
 *
 * Insights are about habits you still have: the caller passes **active
 * habits only** (months, rows and the longest streak alike), so an archived
 * habit is never named, counted toward a month's rate, or linked to.
 *
 * Only **judgeable** months are looked at: a month with scheduled days that
 * has finished. Months before a habit started, months that were all frozen or
 * rest days, and the month still in progress never count — toward a streak of
 * good months or toward "under half" — and a month that doesn't count also
 * breaks a run of good ones (it can't be one of the four).
 */

/** Never more than this many ranked cards. */
export const MAX_YEARLY_INSIGHTS = 3;

/** "Stuck": at or above this rate (0–1)… */
export const STUCK_MIN_RATE = 0.85;
/** …for this many judgeable months in a row. */
export const STUCK_MIN_MONTHS = 4;

/** "Never stuck": below this rate (0–1)… */
export const NEVER_STUCK_MAX_RATE = 0.5;
/** …in at least this many judgeable months (not necessarily in a row). */
export const NEVER_STUCK_MIN_MONTHS = 5;

/** Best month and seasonal dip need this many judgeable months to compare. */
export const BEST_MONTH_MIN_MONTHS = 2;
/** A dip: this many percentage points under the best month… */
export const SEASONAL_MIN_POINTS = 8;
/** …for this many judgeable months in a row. */
export const SEASONAL_MIN_MONTHS = 2;

export type YearlyInsight =
	/** The year has no finished month yet (early January, or a first month still running). */
	| { type: "early" }
	| { type: "perfect" }
	| {
			type: "best-month";
			cell: YearMonthCell;
			/** Set only when the year's longest streak ended in this month. */
			streak: { days: number; habit: Habit } | null;
	  }
	| { type: "stuck"; row: YearlyHabitRow; months: number }
	| {
			type: "never-stuck";
			row: YearlyHabitRow;
			underMonths: number;
			judgedMonths: number;
	  }
	| {
			type: "seasonal";
			best: YearMonthCell;
			run: YearMonthCell[];
			/** The smallest gap across the run — "at least N points". */
			points: number;
	  }
	/** Nothing crossed a threshold — the slot is never empty. */
	| { type: "steady" };

type InsightInput = {
	months: readonly YearMonthCell[];
	rows: readonly YearlyHabitRow[];
	longest: { days: number; endedOn: Date | null; habit: Habit | null };
};

export function isJudgeable(cell: YearMonthCell): boolean {
	return cell.kind === "counted" && !cell.current;
}

const points = (rate: number) => Math.round(rate * 100);

/**
 * Gate order: (1) the screen has already checked too-early (< 3 months of
 * history); here (2) no finished month yet, (3) perfect — only with something
 * scheduled — then the rest in card order. Of those, only the first
 * `MAX_YEARLY_INSIGHTS` show — a fourth (the seasonal dip) is the first to go.
 */
export function yearlyInsightsFor(input: InsightInput): YearlyInsight[] {
	const judged = input.months.filter(isJudgeable);
	if (judged.length === 0) return [{ type: "early" }];
	const completed = judged.reduce((sum, cell) => sum + cell.completed, 0);
	const scheduled = judged.reduce((sum, cell) => sum + cell.scheduled, 0);
	if (completed === scheduled) return [{ type: "perfect" }];

	const best = bestMonth(judged);
	const ranked: YearlyInsight[] = [];
	if (best) {
		const { longest } = input;
		const streakEndedInBest =
			longest.endedOn !== null &&
			longest.habit !== null &&
			longest.days > 0 &&
			longest.endedOn.getFullYear() === best.month.getFullYear() &&
			longest.endedOn.getMonth() === best.month.getMonth();
		ranked.push({
			type: "best-month",
			cell: best,
			streak: streakEndedInBest
				? { days: longest.days, habit: longest.habit as Habit }
				: null,
		});
	}
	const stuck = stuckInsight(input.rows);
	if (stuck) ranked.push(stuck);
	const neverStuck = neverStuckInsight(input.rows);
	if (neverStuck) ranked.push(neverStuck);
	const seasonal = best ? seasonalInsight(input.months, best) : null;
	if (seasonal) ranked.push(seasonal);

	return ranked.length > 0
		? ranked.slice(0, MAX_YEARLY_INSIGHTS)
		: [{ type: "steady" }];
}

/** The judgeable month with the highest rate; the earliest wins a tie. */
export function bestMonth(
	judged: readonly YearMonthCell[],
): YearMonthCell | null {
	if (judged.length < BEST_MONTH_MIN_MONTHS) return null;
	let best: YearMonthCell | null = null;
	for (const cell of judged) {
		if (cell.rate === null) continue;
		if (!best || cell.rate > (best.rate ?? 0)) best = cell;
	}
	return best;
}

function stuckInsight(
	rows: readonly YearlyHabitRow[],
): Extract<YearlyInsight, { type: "stuck" }> | null {
	let winner: Extract<YearlyInsight, { type: "stuck" }> | null = null;
	for (const row of rows) {
		let run = 0;
		let longest = 0;
		for (const cell of row.cells) {
			const good =
				isJudgeable(cell) && cell.rate !== null && cell.rate >= STUCK_MIN_RATE;
			run = good ? run + 1 : 0;
			longest = Math.max(longest, run);
		}
		if (longest >= STUCK_MIN_MONTHS && (!winner || longest > winner.months)) {
			winner = { type: "stuck", row, months: longest };
		}
	}
	return winner;
}

function neverStuckInsight(
	rows: readonly YearlyHabitRow[],
): Extract<YearlyInsight, { type: "never-stuck" }> | null {
	let winner: Extract<YearlyInsight, { type: "never-stuck" }> | null = null;
	for (const row of rows) {
		const judged = row.cells.filter(isJudgeable);
		const under = judged.filter(
			(cell) => cell.rate !== null && cell.rate < NEVER_STUCK_MAX_RATE,
		).length;
		if (under < NEVER_STUCK_MIN_MONTHS) continue;
		const better =
			!winner ||
			under > winner.underMonths ||
			(under === winner.underMonths && row.rate < winner.row.rate);
		if (better) {
			winner = {
				type: "never-stuck",
				row,
				underMonths: under,
				judgedMonths: judged.length,
			};
		}
	}
	return winner;
}

function seasonalInsight(
	months: readonly YearMonthCell[],
	best: YearMonthCell,
): Extract<YearlyInsight, { type: "seasonal" }> | null {
	const bestPoints = points(best.rate ?? 0);
	let run: YearMonthCell[] = [];
	let longest: YearMonthCell[] = [];
	for (const cell of months) {
		const dip =
			isJudgeable(cell) &&
			cell.rate !== null &&
			bestPoints - points(cell.rate) >= SEASONAL_MIN_POINTS;
		run = dip ? [...run, cell] : [];
		// `>=`: of two equal dips, the more recent one is the one worth saying.
		if (run.length >= longest.length) longest = run;
	}
	if (longest.length < SEASONAL_MIN_MONTHS) return null;
	return {
		type: "seasonal",
		best,
		run: longest,
		points: Math.min(
			...longest.map((cell) => bestPoints - points(cell.rate ?? 0)),
		),
	};
}
