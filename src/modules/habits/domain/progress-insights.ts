import type { Habit } from "../types";
import { IMPROVED_MIN_POINTS } from "./monthly-insights";
import type { RangeHabitRow, RangeSummary } from "./range-summary";
import { yearUnlock } from "./yearly-summary";

/**
 * Progress's insight cards (HAB-38, V3-3a): up to three per range, ranked
 * **slipping → improved → nothing to fix**. The weekday-pattern insight is
 * Later (PR-03) and is not built here, though Monthly's old `pattern` insight
 * still exists until its screen goes.
 *
 * Gate order: (1) too early — the 7-logged-days gate, decided by the caller —
 * gives no insights; (2) perfect / nothing to fix; (3) slipping. A tone and an
 * action travel with each card: only *slipping* is actionable ("Change
 * frequency" → Edit habit scrolled to Frequency); improved and nothing to fix
 * are not tappable.
 *
 * Thresholds are the existing ones: a habit is slipping by the same rule as its
 * row tag (`slipping.ts`; Month's weekly trend lives in `monthly-insights.ts`),
 * improved from `IMPROVED_MIN_POINTS`, best month from `yearly-insights.ts`.
 * Archived habits are never named or offered as an action target.
 */

const MAX_PROGRESS_INSIGHTS = 3;

export type InsightTone = "warning" | "positive" | "neutral";

/** Where a slipping card sends the person: Edit habit, scrolled to Frequency. */
export type InsightAction = {
	type: "edit-habit";
	habitId: number;
	focus: "frequency";
};

export type HabitInsightStats = {
	done: number;
	due: number;
	rate: number;
	previousDone: number;
	previousDue: number;
	previousRate: number | null;
	deltaPoints: number | null;
};

export type ProgressInsight =
	| {
			kind: "slipping";
			tone: "warning";
			habit: Habit;
			stats: HabitInsightStats;
			action: InsightAction;
	  }
	| {
			kind: "improved";
			tone: "positive";
			reason: "up";
			habit: Habit;
			stats: HabitInsightStats;
			action: null;
	  }
	| {
			kind: "improved";
			tone: "positive";
			reason: "best-month";
			month: Date;
			percent: number;
			action: null;
	  }
	| {
			kind: "nothing-to-fix";
			tone: "positive" | "neutral";
			reason: "perfect" | "steady";
			action: null;
	  };

type InsightInput = {
	summary: RangeSummary;
	/** False while the 7-logged-days gate is closed: nothing to say yet. */
	unlocked: boolean;
	/** Year only: the year map's best finished month. */
	bestMonth?: { month: Date; percent: number } | null;
	/** Year only: the first day any habit existed — year-scale insights need 3 months of it (V2 rule). */
	firstDay?: Date | null;
	today: Date;
};

/** A range needs this many due days of a habit before "improved" is said of it. */
const IMPROVED_MIN_DUE = { week: 3, month: 5, year: 30 } as const;

function stats(row: RangeHabitRow): HabitInsightStats {
	return {
		done: row.done,
		due: row.due,
		rate: row.rate ?? 0,
		previousDone: row.previous.done,
		previousDue: row.previous.due,
		previousRate: row.previousRate,
		deltaPoints: row.deltaPoints,
	};
}

export function progressInsights({
	summary,
	unlocked,
	bestMonth = null,
	firstDay = null,
	today,
}: InsightInput): ProgressInsight[] {
	if (!unlocked) return [];
	if (summary.kind === "year") {
		if (!firstDay || !yearUnlock(firstDay, today).isUnlocked) return [];
	}
	if (summary.due === 0) return [];
	if (summary.done === summary.due) {
		return [
			{
				kind: "nothing-to-fix",
				tone: "positive",
				reason: "perfect",
				action: null,
			},
		];
	}

	const active = summary.habits.filter((row) => row.habit.archivedAt === null);
	const slipping = active
		.filter((row) => row.slipping)
		.sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));
	const improved = active
		.filter(
			(row) =>
				!row.slipping &&
				row.deltaPoints !== null &&
				row.deltaPoints >= IMPROVED_MIN_POINTS &&
				row.due >= IMPROVED_MIN_DUE[summary.kind] &&
				row.previous.due >= IMPROVED_MIN_DUE[summary.kind],
		)
		.sort((a, b) => (b.deltaPoints ?? 0) - (a.deltaPoints ?? 0));

	const ranked: ProgressInsight[] = [
		...slipping.map(
			(row): ProgressInsight => ({
				kind: "slipping",
				tone: "warning",
				habit: row.habit,
				stats: stats(row),
				action: {
					type: "edit-habit",
					habitId: row.habit.id,
					focus: "frequency",
				},
			}),
		),
		...improved.map(
			(row): ProgressInsight => ({
				kind: "improved",
				tone: "positive",
				reason: "up",
				habit: row.habit,
				stats: stats(row),
				action: null,
			}),
		),
	];
	if (summary.kind === "year" && bestMonth) {
		ranked.push({
			kind: "improved",
			tone: "positive",
			reason: "best-month",
			month: bestMonth.month,
			percent: bestMonth.percent,
			action: null,
		});
	}
	// Nothing is slipping, so there is nothing to fix.
	if (slipping.length === 0) {
		ranked.push({
			kind: "nothing-to-fix",
			tone: ranked.length === 0 ? "neutral" : "positive",
			reason: "steady",
			action: null,
		});
	}
	return ranked.slice(0, MAX_PROGRESS_INSIGHTS);
}
