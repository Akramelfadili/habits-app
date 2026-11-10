import type { Habit } from "../types";
import type { YearlyHabitRow, YearMonthCell } from "./yearly-summary";

// Callers pass active habits only, so an archived habit is never named or counted. Only
// finished months with scheduled days are judgeable; one that doesn't count also breaks a run.

export const MAX_YEARLY_INSIGHTS = 3;

const STUCK_MIN_RATE = 0.85;
export const STUCK_MIN_MONTHS = 4;

const NEVER_STUCK_MAX_RATE = 0.5;
export const NEVER_STUCK_MIN_MONTHS = 5;

const BEST_MONTH_MIN_MONTHS = 2;
const SEASONAL_MIN_POINTS = 8;
const SEASONAL_MIN_MONTHS = 2;

export type YearlyInsight =
	| { type: "early" }
	| { type: "perfect" }
	| {
			type: "best-month";
			cell: YearMonthCell;
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
			points: number;
	  }
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

// The screen has already checked too-early. Only the first `MAX_YEARLY_INSIGHTS` show; the
// seasonal dip is the first to go.
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
		// `>=`: of two equal dips, the more recent is worth saying.
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
