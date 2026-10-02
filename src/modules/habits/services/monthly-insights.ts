import type { Habit, IsoWeekday } from "../types";
import type { DayOutcome, MonthlyHabitRow } from "./monthly-summary";

/**
 * Monthly Summary's insights (HAB-16, frame C3). Every threshold lives in this
 * one block so tuning them is a one-place change — and the `monthly-summary`
 * fixture's test pins that these defaults give C3's three cards, in order.
 */

/** Never more than this many ranked cards (the freeze card is not one of them). */
export const MAX_INSIGHTS = 3;

/** A week needs this many counted days to say anything about a trend. */
export const SLIPPING_MIN_DAYS_PER_WEEK = 3;
/** …and the habit this many such weeks, so "week over week" has a shape. */
export const SLIPPING_MIN_WEEKS = 3;
/** First eligible week → last must fall by at least this much (0–1). */
export const SLIPPING_MIN_DROP = 0.25;

/** Up this many percentage points on last month to be called improved. */
export const IMPROVED_MIN_POINTS = 10;

/** Weekends must trail weekdays by at least this much (0–1) to be a pattern… */
export const PATTERN_MIN_GAP = 0.15;
/** …with this many counted slots on each side, so two bad Sundays aren't one. */
export const PATTERN_MIN_SLOTS = 8;
/** One habit on one weekday must account for this share of the weekend's misses to earn an action. */
export const PATTERN_CAUSE_SHARE = 0.25;

export type PatternCause = {
	habit: Habit;
	weekday: IsoWeekday;
	/** This habit's misses on this weekday. */
	misses: number;
	/** All the misses on weekend days. */
	weekendMisses: number;
};

export type MonthlyInsight =
	| { type: "perfect" }
	| {
			type: "slipping";
			row: MonthlyHabitRow;
			first: { completed: number; scheduled: number };
			last: { completed: number; scheduled: number };
	  }
	| { type: "improved"; row: MonthlyHabitRow; points: number }
	| {
			type: "pattern";
			weekdayRate: number;
			weekendRate: number;
			/** Null when no single habit explains it — informational only. */
			cause: PatternCause | null;
	  }
	/** Nothing crossed a threshold — the slot is never empty. */
	| { type: "steady" };

type InsightInput = {
	rows: readonly MonthlyHabitRow[];
	outcomes: readonly DayOutcome[];
	habits: readonly Habit[];
	completed: number;
	scheduled: number;
};

/**
 * Gate order (carried over from the V1 audit): the screen has already checked
 * (1) too-early; here (2) perfect — only with something scheduled — then
 * (3) slipping, improved, pattern, in that priority.
 */
export function insightsFor(input: InsightInput): MonthlyInsight[] {
	if (input.scheduled === 0) return [];
	if (input.completed === input.scheduled) return [{ type: "perfect" }];

	const slipping = slippingInsight(input.rows);
	const improved = improvedInsight(input.rows, slipping?.row.habit.id ?? null);
	const pattern = patternInsight(input);
	const ranked: MonthlyInsight[] = [];
	if (slipping) ranked.push(slipping);
	if (improved) ranked.push(improved);
	if (pattern) ranked.push(pattern);
	return ranked.length > 0
		? ranked.slice(0, MAX_INSIGHTS)
		: [{ type: "steady" }];
}

function slippingInsight(
	rows: readonly MonthlyHabitRow[],
): Extract<MonthlyInsight, { type: "slipping" }> | null {
	let worst: Extract<MonthlyInsight, { type: "slipping" }> | null = null;
	let worstDrop = 0;
	for (const row of rows) {
		const weeks = row.weeks.filter(
			(week) =>
				week.scheduled >= SLIPPING_MIN_DAYS_PER_WEEK && week.fraction !== null,
		);
		if (weeks.length < SLIPPING_MIN_WEEKS) continue;
		const fractions = weeks.map((week) => week.fraction as number);
		const neverUp = fractions.every(
			(fraction, index) => index === 0 || fraction <= fractions[index - 1],
		);
		const drop = fractions[0] - fractions[fractions.length - 1];
		if (!neverUp || drop < SLIPPING_MIN_DROP || drop <= worstDrop) continue;
		worstDrop = drop;
		worst = {
			type: "slipping",
			row,
			first: weeks[0],
			last: weeks[weeks.length - 1],
		};
	}
	return worst;
}

function improvedInsight(
	rows: readonly MonthlyHabitRow[],
	excludeHabitId: number | null,
): Extract<MonthlyInsight, { type: "improved" }> | null {
	let best: MonthlyHabitRow | null = null;
	for (const row of rows) {
		if (row.habit.id === excludeHabitId) continue;
		if (row.deltaPoints === null || row.deltaPoints < IMPROVED_MIN_POINTS) {
			continue;
		}
		if (!best || row.deltaPoints > (best.deltaPoints ?? 0)) best = row;
	}
	return best && best.deltaPoints !== null
		? { type: "improved", row: best, points: best.deltaPoints }
		: null;
}

const isWeekend = (weekday: IsoWeekday) => weekday >= 6;

function patternInsight({
	outcomes,
	habits,
}: InsightInput): Extract<MonthlyInsight, { type: "pattern" }> | null {
	const counted = outcomes.filter(({ outcome }) => outcome !== "frozen");
	const weekend = counted.filter(({ weekday }) => isWeekend(weekday));
	const weekdays = counted.filter(({ weekday }) => !isWeekend(weekday));
	if (
		weekend.length < PATTERN_MIN_SLOTS ||
		weekdays.length < PATTERN_MIN_SLOTS
	) {
		return null;
	}
	const rateOf = (list: readonly DayOutcome[]) =>
		list.filter(({ outcome }) => outcome === "done").length / list.length;
	const weekdayRate = rateOf(weekdays);
	const weekendRate = rateOf(weekend);
	if (weekdayRate - weekendRate < PATTERN_MIN_GAP) return null;

	const misses = weekend.filter(({ outcome }) => outcome === "missed");
	const tally = new Map<string, number>();
	for (const miss of misses) {
		const key = `${miss.habitId}:${miss.weekday}`;
		tally.set(key, (tally.get(key) ?? 0) + 1);
	}
	let topKey: string | null = null;
	let topCount = 0;
	for (const [key, count] of tally) {
		if (count > topCount) {
			topKey = key;
			topCount = count;
		}
	}

	let cause: PatternCause | null = null;
	if (topKey && topCount / misses.length >= PATTERN_CAUSE_SHARE) {
		const [habitId, weekday] = topKey.split(":").map(Number);
		const habit = habits.find((candidate) => candidate.id === habitId);
		if (habit) {
			cause = {
				habit,
				weekday: weekday as IsoWeekday,
				misses: topCount,
				weekendMisses: misses.length,
			};
		}
	}
	return { type: "pattern", weekdayRate, weekendRate, cause };
}
