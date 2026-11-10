import {
	endOfMonth,
	getISODay,
	isAfter,
	isBefore,
	isSameDay,
	min,
	parseISO,
	startOfDay,
	startOfMonth,
	subMonths,
} from "date-fns";
import { nextDay, toDayKey } from "@/utils/day-key";
import { weekAlignedSpan, weekLastDay } from "@/utils/week-window";
import type { Entry, FrozenDay, Habit, IsoWeekday } from "../types";
import { isPerfectDay } from "./completion-rate";
import { type CellStatus, habitDayClassifier } from "./day-status";
import { insightsFor, type MonthlyInsight } from "./monthly-insights";

// Weeks are clipped to the month, but a per-week habit's week is still judged whole, so the
// caller passes entries for the full Monday-aligned span (`monthEntryRange`). `countedDays`
// (not the calendar length) is the "of N" under perfect days, so rest days don't read as failure.

export type MonthWindow = { start: Date; end: Date };

export function monthWindowFor(date: Date): MonthWindow {
	return {
		start: startOfMonth(date),
		end: startOfDay(endOfMonth(date)),
	};
}

export function previousMonthWindow({ start }: MonthWindow): MonthWindow {
	return monthWindowFor(subMonths(start, 1));
}

export function historyStart(habits: readonly Habit[]): Date | null {
	if (habits.length === 0) return null;
	return min(habits.map((habit) => startOfDay(habit.createdAt)));
}

export function monthEntryRange(month: MonthWindow): MonthWindow {
	return weekAlignedSpan(previousMonthWindow(month).start, month.end);
}

export function monthWeeks(month: MonthWindow): MonthWindow[] {
	const weeks: MonthWindow[] = [];
	let start = month.start;
	while (!isAfter(start, month.end)) {
		const weekEnd = weekLastDay(start);
		weeks.push({ start, end: min([weekEnd, month.end]) });
		start = nextDay(weekEnd);
	}
	return weeks;
}

export type Outcome = "done" | "missed" | "frozen";

export type DayOutcome = {
	habitId: number;
	date: string;
	weekday: IsoWeekday;
	outcome: Outcome;
};

export type CalendarDayStatus =
	| { kind: "before-start" }
	| { kind: "future" }
	| { kind: "none" }
	| { kind: "frozen" }
	| { kind: "missed" }
	| { kind: "level"; level: 1 | 2 | 3 };

export type CalendarDay = { date: Date; status: CalendarDayStatus };

export type MonthlyWeekBar = {
	start: Date;
	end: Date;
	completed: number;
	scheduled: number;
	fraction: number | null;
};

export type MonthlyHabitRow = {
	habit: Habit;
	completed: number;
	scheduled: number;
	rate: number;
	weeks: MonthlyWeekBar[];
	deltaPoints: number | null;
};

export type MonthlySummary = {
	month: MonthWindow;
	previousMonth: MonthWindow;
	completed: number;
	scheduled: number;
	rate: number | null;
	perfectDays: number;
	countedDays: number;
	freezeDates: Date[];
	calendar: (CalendarDay | null)[][];
	rows: MonthlyHabitRow[];
	insights: MonthlyInsight[];
};

type MonthlySummaryInput = {
	habits: readonly Habit[];
	entries: readonly Entry[];
	frozenDays: readonly FrozenDay[];
	today: Date;
	month: MonthWindow;
};

function byCreationOrder(a: Habit, b: Habit): number {
	return a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;
}

export function outcomesFor({
	habits,
	entries,
	frozenDays,
	today,
	window,
}: Omit<MonthlySummaryInput, "month"> & {
	window: MonthWindow;
}): DayOutcome[] {
	const lastCounted = min([startOfDay(today), window.end]);
	const entriesByHabit = groupBy(entries, (entry) => entry.habitId);
	const frozenByHabit = groupBy(frozenDays, (frozen) => frozen.habitId);
	const outcomes: DayOutcome[] = [];

	for (const habit of habits) {
		const classify = habitDayClassifier({
			habit,
			entries: entriesByHabit.get(habit.id) ?? [],
			frozenDates: new Set(
				(frozenByHabit.get(habit.id) ?? []).map((frozen) => frozen.date),
			),
			today,
		});
		for (
			let cursor = window.start;
			!isAfter(cursor, lastCounted);
			cursor = nextDay(cursor)
		) {
			const { status, isToday } = classify(cursor);
			const outcome = outcomeOf(status, isToday);
			if (!outcome) continue;
			outcomes.push({
				habitId: habit.id,
				date: toDayKey(cursor),
				weekday: getISODay(cursor) as IsoWeekday,
				outcome,
			});
		}
	}
	return outcomes;
}

function outcomeOf(status: CellStatus, isToday: boolean): Outcome | null {
	if (status === "done") return "done";
	if (status === "frozen") return "frozen";
	// A partial quantity day is a verdict only once the day is over.
	if ((status === "missed" || status === "partial") && !isToday) {
		return "missed";
	}
	return null;
}

function groupBy<T>(items: readonly T[], key: (item: T) => number) {
	const groups = new Map<number, T[]>();
	for (const item of items) {
		const group = groups.get(key(item));
		if (group) group.push(item);
		else groups.set(key(item), [item]);
	}
	return groups;
}

export function rateOf(completed: number, scheduled: number): number | null {
	return scheduled > 0 ? completed / scheduled : null;
}

export function counts(outcomes: readonly DayOutcome[]) {
	let completed = 0;
	let scheduled = 0;
	for (const { outcome } of outcomes) {
		if (outcome === "frozen") continue;
		scheduled += 1;
		if (outcome === "done") completed += 1;
	}
	return { completed, scheduled };
}

function levelFor(completed: number, scheduled: number): 1 | 2 | 3 {
	const fraction = completed / scheduled;
	if (fraction === 1) return 3;
	return fraction >= 0.5 ? 2 : 1;
}

function buildCalendar(
	month: MonthWindow,
	outcomes: readonly DayOutcome[],
	firstDay: Date | null,
	today: Date,
): (CalendarDay | null)[][] {
	const byDate = new Map<string, DayOutcome[]>();
	for (const outcome of outcomes) {
		byDate.set(outcome.date, [...(byDate.get(outcome.date) ?? []), outcome]);
	}
	const lastCounted = min([startOfDay(today), month.end]);

	const statusOf = (date: Date): CalendarDayStatus => {
		if (firstDay && isBefore(date, firstDay)) return { kind: "before-start" };
		if (isAfter(date, lastCounted)) return { kind: "future" };
		const day = byDate.get(toDayKey(date)) ?? [];
		if (day.some(({ outcome }) => outcome === "frozen")) {
			return { kind: "frozen" };
		}
		const { completed, scheduled } = counts(day);
		if (scheduled === 0) {
			return isSameDay(date, today) ? { kind: "future" } : { kind: "none" };
		}
		if (completed === 0) return { kind: "missed" };
		return { kind: "level", level: levelFor(completed, scheduled) };
	};

	const weeks: (CalendarDay | null)[][] = [];
	for (const week of monthWeeks(month)) {
		const row: (CalendarDay | null)[] = Array(7).fill(null);
		for (
			let cursor = week.start;
			!isAfter(cursor, week.end);
			cursor = nextDay(cursor)
		) {
			row[getISODay(cursor) - 1] = { date: cursor, status: statusOf(cursor) };
		}
		weeks.push(row);
	}
	return weeks;
}

export function buildMonthlySummary(
	input: MonthlySummaryInput,
): MonthlySummary {
	const { habits, frozenDays, today, month } = input;
	const previousMonth = previousMonthWindow(month);
	const ordered = [...habits].sort(byCreationOrder);
	const outcomes = outcomesFor({ ...input, habits: ordered, window: month });
	const previousOutcomes = outcomesFor({
		...input,
		habits: ordered,
		window: previousMonth,
	});
	const weeks = monthWeeks(month);

	const activeHabits = ordered.filter((habit) => habit.archivedAt === null);
	const activeIds = new Set(activeHabits.map((habit) => habit.id));
	const activeOutcomes = outcomes.filter(({ habitId }) =>
		activeIds.has(habitId),
	);

	const rows: MonthlyHabitRow[] = [];
	for (const habit of ordered) {
		const own = outcomes.filter((outcome) => outcome.habitId === habit.id);
		const { completed, scheduled } = counts(own);
		if (scheduled === 0) continue;
		const previous = counts(
			previousOutcomes.filter((outcome) => outcome.habitId === habit.id),
		);
		const previousRate = rateOf(previous.completed, previous.scheduled);
		const rate = completed / scheduled;
		rows.push({
			habit,
			completed,
			scheduled,
			rate,
			weeks: weeks.map((week) => {
				const inWeek = counts(
					own.filter(({ date }) => {
						const day = parseISO(date);
						return !isBefore(day, week.start) && !isAfter(day, week.end);
					}),
				);
				return {
					...week,
					...inWeek,
					fraction: rateOf(inWeek.completed, inWeek.scheduled),
				};
			}),
			deltaPoints:
				previousRate === null
					? null
					: Math.round(rate * 100) - Math.round(previousRate * 100),
		});
	}
	rows.sort((a, b) => b.rate - a.rate);

	const { completed, scheduled } = counts(outcomes);
	const perDay = new Map<string, DayOutcome[]>();
	for (const outcome of outcomes) {
		perDay.set(outcome.date, [...(perDay.get(outcome.date) ?? []), outcome]);
	}
	let perfectDays = 0;
	let countedDays = 0;
	for (const day of perDay.values()) {
		const dayCounts = counts(day);
		if (dayCounts.scheduled === 0) continue;
		countedDays += 1;
		const frozen = day.filter(({ outcome }) => outcome === "frozen").length;
		const tally = {
			done: dayCounts.completed,
			due: dayCounts.scheduled,
			frozen,
			bonus: 0,
		};
		if (isPerfectDay(tally)) perfectDays += 1;
	}

	const monthStart = toDayKey(month.start);
	const monthEnd = toDayKey(month.end);
	const freezeDates = frozenDays
		.filter((frozen) => frozen.date >= monthStart && frozen.date <= monthEnd)
		.map((frozen) => parseISO(frozen.date))
		.sort((a, b) => a.getTime() - b.getTime());

	return {
		month,
		previousMonth,
		completed,
		scheduled,
		rate: rateOf(completed, scheduled),
		perfectDays,
		countedDays,
		freezeDates,
		calendar: buildCalendar(month, outcomes, historyStart(habits), today),
		rows,
		// Insights read active habits only; an archived habit is never named or offered as a target.
		insights: insightsFor({
			rows: rows.filter((row) => row.habit.archivedAt === null),
			outcomes: activeOutcomes,
			habits: activeHabits,
			...counts(activeOutcomes),
		}),
	};
}
