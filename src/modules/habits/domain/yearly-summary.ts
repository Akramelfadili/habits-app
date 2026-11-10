import {
	addMonths,
	differenceInCalendarDays,
	endOfMonth,
	endOfYear,
	format,
	isAfter,
	isBefore,
	isSameMonth,
	max,
	startOfDay,
	startOfYear,
} from "date-fns";
import { weekAlignedSpan } from "@/utils/week-window";
import type { Entry, FrozenDay, Habit } from "../types";
import { calculateLongestStreak } from "./habit-history";
import {
	counts,
	historyStart,
	type MonthWindow,
	outcomesFor,
	rateOf,
} from "./monthly-summary";
import {
	bestMonth,
	isJudgeable,
	type YearlyInsight,
	yearlyInsightsFor,
} from "./yearly-insights";

// Built on Monthly's `outcomesFor` and `historyStart` so the two can never disagree. All twelve
// month slots always exist so the year's shape is visible from day one.

export const YEAR_UNLOCK_MONTHS = 3;

export function yearWindowFor(date: Date): MonthWindow {
	return { start: startOfYear(date), end: startOfDay(endOfYear(date)) };
}

export function yearEntryRange(year: MonthWindow): MonthWindow {
	return weekAlignedSpan(year.start, year.end);
}

export type YearUnlock = {
	trackedDays: number;
	totalDays: number;
	unlockDate: Date;
	isUnlocked: boolean;
};

// `addMonths` from the first day, so a 31st clamps (31 Aug -> 30 Nov).
export function yearUnlock(firstDay: Date, today: Date): YearUnlock {
	const todayStart = startOfDay(today);
	const unlockDate = addMonths(firstDay, YEAR_UNLOCK_MONTHS);
	const totalDays = differenceInCalendarDays(unlockDate, firstDay);
	const elapsed = Math.max(0, differenceInCalendarDays(todayStart, firstDay));
	return {
		trackedDays: Math.min(elapsed, totalDays),
		totalDays,
		unlockDate,
		isUnlocked: !isBefore(todayStart, unlockDate),
	};
}

export type YearMonthKind = "before-start" | "future" | "none" | "counted";

export type YearMonthCell = {
	month: Date;
	kind: YearMonthKind;
	current: boolean;
	completed: number;
	scheduled: number;
	rate: number | null;
};

export type YearlyHabitRow = {
	habit: Habit;
	cells: YearMonthCell[];
	completed: number;
	scheduled: number;
	rate: number;
};

export type YearlyLongest = {
	days: number;
	endedOn: Date | null;
	habit: Habit | null;
};

export type YearlySummary = {
	year: MonthWindow;
	logged: number;
	scheduled: number;
	rate: number | null;
	longest: YearlyLongest;
	months: YearMonthCell[];
	best: YearMonthCell | null;
	rows: YearlyHabitRow[];
	insights: YearlyInsight[];
};

type YearlySummaryInput = {
	habits: readonly Habit[];
	entries: readonly Entry[];
	frozenDays: readonly FrozenDay[];
	today: Date;
	year: MonthWindow;
};

function monthCells(
	year: MonthWindow,
	firstDay: Date | null,
	today: Date,
	outcomes: ReturnType<typeof outcomesFor>,
): YearMonthCell[] {
	const todayStart = startOfDay(today);
	return Array.from({ length: 12 }, (_, index): YearMonthCell => {
		const month = addMonths(year.start, index);
		const key = format(month, "yyyy-MM");
		const base = {
			month,
			current: isSameMonth(month, todayStart),
			completed: 0,
			scheduled: 0,
			rate: null,
		};
		if (firstDay && isBefore(startOfDay(endOfMonth(month)), firstDay)) {
			return { ...base, kind: "before-start" };
		}
		if (isAfter(month, todayStart)) return { ...base, kind: "future" };
		const { completed, scheduled } = counts(
			outcomes.filter(({ date }) => date.startsWith(key)),
		);
		if (scheduled === 0) return { ...base, kind: "none" };
		return {
			...base,
			kind: "counted",
			completed,
			scheduled,
			rate: completed / scheduled,
		};
	});
}

function byCreationOrder(a: Habit, b: Habit): number {
	return a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;
}

// Clipped to the year so a December streak doesn't count in January's.
function longestOf({
	habits,
	entries,
	frozenDays,
	today,
	year,
}: YearlySummaryInput): YearlyLongest {
	const from = format(year.start, "yyyy-MM-dd");
	const to = format(year.end, "yyyy-MM-dd");
	const inYear = (date: string) => date >= from && date <= to;
	let best: YearlyLongest = { days: 0, endedOn: null, habit: null };
	for (const habit of habits) {
		const { days, endedOn } = calculateLongestStreak({
			habit: { ...habit, createdAt: max([habit.createdAt, year.start]) },
			entries: entries.filter(
				(entry) => entry.habitId === habit.id && inYear(entry.date),
			),
			frozenDates: new Set(
				frozenDays
					.filter(
						(frozen) => frozen.habitId === habit.id && inYear(frozen.date),
					)
					.map((frozen) => frozen.date),
			),
			today,
		});
		if (days > best.days) best = { days, endedOn, habit };
	}
	return best;
}

export function buildYearlySummary(input: YearlySummaryInput): YearlySummary {
	const { habits, today, year } = input;
	const ordered = [...habits].sort(byCreationOrder);
	const outcomes = outcomesFor({ ...input, habits: ordered, window: year });
	const firstDay = historyStart(habits);
	const months = monthCells(year, firstDay, today, outcomes);

	const rows: YearlyHabitRow[] = [];
	for (const habit of ordered) {
		const own = outcomes.filter(({ habitId }) => habitId === habit.id);
		const { completed, scheduled } = counts(own);
		if (scheduled === 0) continue;
		rows.push({
			habit,
			cells: monthCells(year, startOfDay(habit.createdAt), today, own),
			completed,
			scheduled,
			rate: completed / scheduled,
		});
	}

	const { completed, scheduled } = counts(outcomes);
	const longest = longestOf({ ...input, habits: ordered });

	// Insights look at active habits only; the tiles, chart and strips keep the whole history.
	const active = ordered.filter((habit) => habit.archivedAt === null);
	const activeIds = new Set(active.map((habit) => habit.id));
	const activeOutcomes = outcomes.filter(({ habitId }) =>
		activeIds.has(habitId),
	);
	const activeLongest = longestOf({ ...input, habits: active });

	return {
		year,
		logged: completed,
		scheduled,
		rate: rateOf(completed, scheduled),
		longest,
		months,
		best: bestMonth(months.filter(isJudgeable)),
		rows,
		insights:
			active.length === 0
				? []
				: yearlyInsightsFor({
						months: monthCells(
							year,
							historyStart(active),
							today,
							activeOutcomes,
						),
						rows: rows.filter(({ habit }) => activeIds.has(habit.id)),
						longest: activeLongest,
					}),
	};
}
