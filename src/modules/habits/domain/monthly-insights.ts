import { atIndex } from "@/utils/indexed";
import type { Habit, IsoWeekday } from "../types";
import type { DayOutcome, MonthlyHabitRow } from "./monthly-summary";

export const MAX_INSIGHTS = 3;

const SLIPPING_MIN_DAYS_PER_WEEK = 3;
const SLIPPING_MIN_WEEKS = 3;
export const SLIPPING_MIN_DROP = 0.25;

export const IMPROVED_MIN_POINTS = 10;

export const PATTERN_MIN_GAP = 0.15;
export const PATTERN_MIN_SLOTS = 8;
export const PATTERN_CAUSE_SHARE = 0.25;

export type PatternCause = {
	habit: Habit;
	weekday: IsoWeekday;
	misses: number;
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
			cause: PatternCause | null;
	  }
	| { type: "steady" };

type InsightInput = {
	rows: readonly MonthlyHabitRow[];
	outcomes: readonly DayOutcome[];
	habits: readonly Habit[];
	completed: number;
	scheduled: number;
};

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

type WeekShare = { scheduled: number; fraction: number | null };

// Shared by the insight and Progress's per-habit "slipping" tag so they always agree.
export function slippingTrend<W extends WeekShare>(
	allWeeks: readonly W[],
): { first: W; last: W; drop: number } | null {
	const weeks = allWeeks.filter(
		(week) =>
			week.scheduled >= SLIPPING_MIN_DAYS_PER_WEEK && week.fraction !== null,
	);
	if (weeks.length < SLIPPING_MIN_WEEKS) return null;
	const fractions = weeks.map((week) => week.fraction as number);
	const neverUp = fractions.every(
		(fraction, index) =>
			index === 0 || fraction <= atIndex(fractions, index - 1),
	);
	const lastIndex = weeks.length - 1;
	const drop = atIndex(fractions, 0) - atIndex(fractions, lastIndex);
	if (!neverUp || drop < SLIPPING_MIN_DROP) return null;
	return { first: atIndex(weeks, 0), last: atIndex(weeks, lastIndex), drop };
}

function slippingInsight(
	rows: readonly MonthlyHabitRow[],
): Extract<MonthlyInsight, { type: "slipping" }> | null {
	let worst: Extract<MonthlyInsight, { type: "slipping" }> | null = null;
	let worstDrop = 0;
	for (const row of rows) {
		const trend = slippingTrend(row.weeks);
		if (!trend || trend.drop <= worstDrop) continue;
		worstDrop = trend.drop;
		worst = {
			type: "slipping",
			row,
			first: trend.first,
			last: trend.last,
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
