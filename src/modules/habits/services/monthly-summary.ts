import {
	addDays,
	differenceInCalendarDays,
	endOfMonth,
	endOfWeek,
	format,
	getISODay,
	isAfter,
	isBefore,
	isSameDay,
	min,
	parseISO,
	startOfDay,
	startOfMonth,
	startOfWeek,
	subMonths,
} from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import type { Entry, FrozenDay, Habit, IsoWeekday } from "../types";
import { isEntryComplete } from "./habit-service";
import { insightsFor, type MonthlyInsight } from "./monthly-insights";

/**
 * Monthly Summary's math (HAB-16) — pure functions, same shape as
 * `weekly-summary.ts`: every "was this day owed" question goes through the
 * habit's FrequencyStrategy (`wasScheduledOn`), which already honours archive
 * pauses; a habit's own creation day bounds the start.
 *
 * What counts, per habit per day (up to today — today only once it's done):
 * - **done** — completed, whatever else.
 * - **frozen** — scheduled, not done, covered by a freeze (HAB-08). An excused
 *   day: it is neither done nor missed, so it leaves both sides of the rate.
 * - **missed** — scheduled, not done, not frozen.
 *
 * The month is a calendar month; its weeks are Monday-based (`WEEK_STARTS_ON`)
 * and **clipped** to it — a month starting on a Saturday opens with a
 * two-day week. A per-week habit's week is still judged whole (the caller
 * passes entries for the full Monday-aligned span, `monthEntryRange`).
 *
 * **Perfect day** = a day with at least one counted habit where every counted
 * habit was done. The "of N" under it is the number of days that had at least
 * one counted habit (`countedDays`) — not the calendar length, so a month of
 * rest days or a part-month history doesn't read as failure.
 */

const DATE_FORMAT = "yyyy-MM-dd";

/** A month needs this many days of history before the Monthly screen unlocks. */
export const MONTH_UNLOCK_DAYS = 30;

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

/** The first day any habit existed — null with no habits. */
export function historyStart(habits: readonly Habit[]): Date | null {
	if (habits.length === 0) return null;
	return min(habits.map((habit) => startOfDay(habit.createdAt)));
}

/**
 * The month Monthly opens on: the last complete one, or — when that ended
 * before any habit existed (31 Oct with a habit made on 1 Oct) — the current one.
 */
export function defaultSummaryMonth(
	today: Date,
	firstDay: Date | null,
): MonthWindow {
	const last = monthWindowFor(subMonths(today, 1));
	if (firstDay && isBefore(last.end, firstDay)) return monthWindowFor(today);
	return last;
}

export type MonthUnlock = {
	/** Days of history before today, capped for display at MONTH_UNLOCK_DAYS. */
	trackedDays: number;
	unlockDate: Date;
	isUnlocked: boolean;
};

/** "Under one month of history" (C6): 30 full days before today, unlocking on day 31. */
export function monthUnlock(firstDay: Date, today: Date): MonthUnlock {
	const elapsed = Math.max(0, differenceInCalendarDays(today, firstDay));
	return {
		trackedDays: Math.min(elapsed, MONTH_UNLOCK_DAYS),
		unlockDate: addDays(firstDay, MONTH_UNLOCK_DAYS),
		isUnlocked: elapsed >= MONTH_UNLOCK_DAYS,
	};
}

/** Entries are needed from the Monday-aligned start of the previous month to the end of this month's last week. */
export function monthEntryRange(month: MonthWindow): MonthWindow {
	return {
		start: startOfWeek(previousMonthWindow(month).start, {
			weekStartsOn: WEEK_STARTS_ON,
		}),
		end: startOfDay(endOfWeek(month.end, { weekStartsOn: WEEK_STARTS_ON })),
	};
}

/** The month's Monday-based weeks, the first and last clipped to the month. */
export function monthWeeks(month: MonthWindow): MonthWindow[] {
	const weeks: MonthWindow[] = [];
	let start = month.start;
	while (!isAfter(start, month.end)) {
		const weekEnd = startOfDay(
			endOfWeek(start, { weekStartsOn: WEEK_STARTS_ON }),
		);
		weeks.push({ start, end: min([weekEnd, month.end]) });
		start = addDays(weekEnd, 1);
	}
	return weeks;
}

export type Outcome = "done" | "missed" | "frozen";

export type DayOutcome = {
	habitId: number;
	/** yyyy-MM-dd */
	date: string;
	weekday: IsoWeekday;
	outcome: Outcome;
};

/** One cell of the month calendar (NEW-16 states). */
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
	/** null when nothing was scheduled that week — drawn as an empty column. */
	fraction: number | null;
};

export type MonthlyHabitRow = {
	habit: Habit;
	completed: number;
	scheduled: number;
	/** 0–1; rows only exist for habits with at least one counted day. */
	rate: number;
	weeks: MonthlyWeekBar[];
	/** Percentage points vs the previous month; null when that month had no data for this habit. */
	deltaPoints: number | null;
};

export type MonthlySummary = {
	month: MonthWindow;
	previousMonth: MonthWindow;
	completed: number;
	scheduled: number;
	/** null before anything is counted. */
	rate: number | null;
	perfectDays: number;
	/** Days with at least one counted habit — the "of N" under perfect days. */
	countedDays: number;
	/** Freezes used in the month, shared pool across habits (HAB-08). */
	freezeDates: Date[];
	/** Rows of seven (Mon→Sun); null pads the days outside the month. */
	calendar: (CalendarDay | null)[][];
	/** Best rate first; ties in creation order. */
	rows: MonthlyHabitRow[];
	/** Ranked, never more than MAX_INSIGHTS — the freeze card is separate. */
	insights: MonthlyInsight[];
};

type MonthlySummaryInput = {
	habits: readonly Habit[];
	/** Covers `monthEntryRange(month)`; any habit. */
	entries: readonly Entry[];
	frozenDays: readonly FrozenDay[];
	today: Date;
	month: MonthWindow;
};

function byCreationOrder(a: Habit, b: Habit): number {
	return a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;
}

/** Every counted (habit, day) in `window` — see the file header for what counts. */
export function outcomesFor({
	habits,
	entries,
	frozenDays,
	today,
	window,
}: Omit<MonthlySummaryInput, "month"> & {
	window: MonthWindow;
}): DayOutcome[] {
	const todayStart = startOfDay(today);
	const lastCounted = min([todayStart, window.end]);
	const outcomes: DayOutcome[] = [];

	for (const habit of habits) {
		const strategy = getHabitStrategy(habit);
		const completedSet = new Set(
			entries
				.filter(
					(entry) =>
						entry.habitId === habit.id && isEntryComplete(habit, entry),
				)
				.map((entry) => entry.date),
		);
		const frozenSet = new Set(
			frozenDays
				.filter((frozen) => frozen.habitId === habit.id)
				.map((frozen) => frozen.date),
		);
		const context = {
			completedDates: [...completedSet].map((date) => parseISO(date)),
		};
		const createdStart = startOfDay(habit.createdAt);

		for (
			let cursor = window.start;
			!isAfter(cursor, lastCounted);
			cursor = addDays(cursor, 1)
		) {
			if (isBefore(cursor, createdStart)) continue;
			if (!strategy.wasScheduledOn(cursor, context)) continue;
			const date = format(cursor, DATE_FORMAT);
			const weekday = getISODay(cursor) as IsoWeekday;
			if (completedSet.has(date)) {
				outcomes.push({ habitId: habit.id, date, weekday, outcome: "done" });
			} else if (frozenSet.has(date)) {
				outcomes.push({ habitId: habit.id, date, weekday, outcome: "frozen" });
			} else if (!isSameDay(cursor, todayStart)) {
				outcomes.push({ habitId: habit.id, date, weekday, outcome: "missed" });
			}
		}
	}
	return outcomes;
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
		const day = byDate.get(format(date, DATE_FORMAT)) ?? [];
		if (day.some(({ outcome }) => outcome === "frozen")) {
			return { kind: "frozen" };
		}
		const { completed, scheduled } = counts(day);
		if (scheduled === 0) {
			// Today with nothing logged yet isn't a rest day — it's still open.
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
			cursor = addDays(cursor, 1)
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
	// Stable sort keeps creation order among ties.
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
		if (dayCounts.completed === dayCounts.scheduled) perfectDays += 1;
	}

	const monthStart = format(month.start, DATE_FORMAT);
	const monthEnd = format(month.end, DATE_FORMAT);
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
		// Insights read active habits only (HAB-17's rule, now Monthly's too): an
		// archived habit keeps its history in the tiles, calendar and rows, but is
		// never named by an insight or offered as an action target.
		insights: insightsFor({
			rows: rows.filter((row) => row.habit.archivedAt === null),
			outcomes: activeOutcomes,
			habits: activeHabits,
			...counts(activeOutcomes),
		}),
	};
}
