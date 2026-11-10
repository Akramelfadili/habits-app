import {
	addDays,
	differenceInCalendarDays,
	getISODay,
	isAfter,
	isBefore,
	max,
	min,
	startOfDay,
	subWeeks,
	subYears,
} from "date-fns";
import { toDayKey } from "@/utils/day-key";
import { atIndex } from "@/utils/indexed";
import { weekAlignedSpan, weekWindow } from "@/utils/week-window";
import type { Entry, FrozenDay, Habit, IsoWeekday } from "../types";
import {
	addToTally,
	EMPTY_TALLY,
	mergeTallies,
	percentOf,
	type Tally,
} from "./completion-rate";
import {
	aggregateDays,
	classifyHabits,
	daysIn,
	groupByHabit,
	type HabitCells,
} from "./day-grid";
import type { HabitDayCell } from "./day-status";
import { calculateLongestStreak, currentStreakAsOf } from "./habit-history";
import { slippingTrend } from "./monthly-insights";
import {
	monthEntryRange,
	monthWeeks,
	monthWindowFor,
	previousMonthWindow,
} from "./monthly-summary";
import { isSlippingVsPrevious } from "./slipping";
import { calculateCurrentStreak } from "./streaks";
import { yearWindowFor } from "./yearly-summary";

export type RangeKind = "week" | "month" | "year";
export type RangeWindow = { start: Date; end: Date };

export function rangeWindowFor(kind: RangeKind, date: Date): RangeWindow {
	if (kind === "week") return weekWindow(date);
	if (kind === "month") return monthWindowFor(date);
	return yearWindowFor(date);
}

export function previousRangeWindow(
	kind: RangeKind,
	window: RangeWindow,
): RangeWindow {
	if (kind === "week") return weekWindow(subWeeks(window.start, 1));
	if (kind === "month") return previousMonthWindow(window);
	return yearWindowFor(subYears(window.start, 1));
}

// Both ends are Monday-aligned because a per-week habit's week is judged whole.
export function rangeEntrySpan(
	kind: RangeKind,
	window: RangeWindow,
): RangeWindow {
	if (kind === "month") return monthEntryRange(window);
	const previous = previousRangeWindow(kind, window);
	return weekAlignedSpan(previous.start, window.end);
}

export type RangeHabitRow = {
	habit: Habit;
	isBreak: boolean;
	done: number;
	due: number;
	frozen: number;
	bonus: number;
	rate: number | null;
	previousRate: number | null;
	previous: { done: number; due: number };
	deltaPoints: number | null;
	slipping: boolean;
};

export type BonusLog = { habit: Habit; date: string; value?: number };
export type FreezeLog = { habit: Habit; date: string };

export type WeekdayShare = {
	weekday: IsoWeekday;
	date: Date | null;
	done: number;
	due: number;
	percent: number | null;
};

export type BestStreak = {
	days: number;
	habit: Habit;
	endedOn: Date | null;
};

export type RangeSummary = {
	kind: RangeKind;
	window: RangeWindow;
	previousWindow: RangeWindow;
	done: number;
	due: number;
	rate: number | null;
	previousRate: number | null;
	deltaPoints: number | null;
	perfectDays: number;
	countedDays: number;
	bestStreak: BestStreak | null;
	bestDay: WeekdayShare | null;
	weekdays: WeekdayShare[];
	habits: RangeHabitRow[];
	bonus: BonusLog[];
	freezes: FreezeLog[];
};

type RangeSummaryInput = {
	kind: RangeKind;
	habits: readonly Habit[];
	entries: readonly Entry[];
	frozenDays: readonly FrozenDay[];
	today: Date;
	window: RangeWindow;
	nothingLogged?: boolean;
	classified?: ClassifiedDays;
	// Week's streak reaches back past the week, so callers pass every entry and freeze here.
	streakHistory?: {
		entries: readonly Entry[];
		frozenDays: readonly FrozenDay[];
	};
};

// Classified once so a screen needing both the summary and a grid over the same days
// (Year) doesn't walk them twice.
export type ClassifiedDays = {
	dates: Date[];
	perHabit: HabitCells[];
};

export function classifyRangeDays(
	input: Pick<
		RangeSummaryInput,
		| "kind"
		| "habits"
		| "entries"
		| "frozenDays"
		| "today"
		| "window"
		| "nothingLogged"
	>,
): ClassifiedDays {
	const previous = previousRangeWindow(input.kind, input.window);
	const dates = daysIn(previous.start, input.window.end);
	return {
		dates,
		perHabit: classifyHabits({
			habits: [...input.habits].sort(byCreationOrder),
			entries: input.entries,
			frozenDays: input.frozenDays,
			today: input.today,
			dates,
			nothingLogged: input.nothingLogged,
		}),
	};
}

function byCreationOrder(a: Habit, b: Habit): number {
	return a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;
}

function tallyCells(
	cells: readonly HabitDayCell[],
	from: number,
	to: number,
): Tally {
	const tally = { ...EMPTY_TALLY };
	for (let index = from; index < to; index += 1) {
		addToTally(tally, atIndex(cells, index));
	}
	return tally;
}

export function buildRangeSummary(input: RangeSummaryInput): RangeSummary {
	const { kind, frozenDays, today, window } = input;
	const todayStart = startOfDay(today);
	const previousWindow = previousRangeWindow(kind, window);
	const ordered = [...input.habits].sort(byCreationOrder);
	const dates = daysIn(previousWindow.start, min([window.end, todayStart]));
	const windowFrom = Math.min(
		differenceInCalendarDays(window.start, previousWindow.start),
		dates.length,
	);
	const perHabit = input.classified
		? input.classified.perHabit.map(({ habit, cells }) => ({
				habit,
				cells: cells.slice(0, dates.length),
			}))
		: classifyHabits({
				habits: ordered,
				entries: input.entries,
				frozenDays,
				today,
				dates,
				nothingLogged: input.nothingLogged,
			});

	const total = { ...EMPTY_TALLY };
	const previousTotal = { ...EMPTY_TALLY };
	const rows: RangeHabitRow[] = [];
	const bonus: BonusLog[] = [];
	const freezes: FreezeLog[] = [];
	for (const { habit, cells } of perHabit) {
		const own = tallyCells(cells, windowFrom, dates.length);
		const before = tallyCells(cells, 0, windowFrom);
		mergeTallies(total, own);
		mergeTallies(previousTotal, before);
		for (let index = windowFrom; index < dates.length; index += 1) {
			const { status, value } = atIndex(cells, index);
			const date = toDayKey(atIndex(dates, index));
			if (status === "bonus") bonus.push({ habit, date, value });
			if (status === "frozen") freezes.push({ habit, date });
		}
		if (own.due === 0 && own.bonus === 0 && own.frozen === 0) continue;
		const rate = percentOf(own);
		const previousRate = percentOf(before);
		const row: RangeHabitRow = {
			habit,
			isBreak: habit.direction === "break",
			done: own.done,
			due: own.due,
			frozen: own.frozen,
			bonus: own.bonus,
			rate,
			previousRate,
			previous: { done: before.done, due: before.due },
			deltaPoints:
				rate !== null && previousRate !== null ? rate - previousRate : null,
			slipping: false,
		};
		row.slipping = isSlipping(kind, row, cells, window, dates, windowFrom);
		rows.push(row);
	}

	const days = dayShares(
		perHabit,
		dates,
		windowFrom,
		today,
		kind === "week" ? window.start : null,
	);
	const rate = percentOf(total);
	const previousRate = percentOf(previousTotal);

	return {
		kind,
		window,
		previousWindow,
		done: total.done,
		due: total.due,
		rate,
		previousRate,
		deltaPoints:
			rate !== null && previousRate !== null ? rate - previousRate : null,
		perfectDays: days.perfectDays,
		countedDays: days.countedDays,
		bestStreak: bestStreakOf(input, ordered),
		bestDay: bestShare(days.weekdays),
		weekdays: days.weekdays,
		habits: rankRows(rows),
		bonus,
		freezes,
	};
}

function isSlipping(
	kind: RangeKind,
	row: RangeHabitRow,
	cells: readonly HabitDayCell[],
	window: RangeWindow,
	dates: readonly Date[],
	windowFrom: number,
): boolean {
	if (row.habit.archivedAt !== null) return false;
	if (kind !== "month") return isSlippingVsPrevious(kind, row);
	const weeks = monthWeeks(window).flatMap((week) => {
		const first = dates.findIndex((date) => !isBefore(date, week.start));
		if (first === -1) return [];
		const after = dates.findIndex((date) => isAfter(date, week.end));
		const tally = tallyCells(
			cells,
			Math.max(windowFrom, first),
			after === -1 ? dates.length : after,
		);
		return [
			{
				scheduled: tally.due,
				fraction: tally.due > 0 ? tally.done / tally.due : null,
			},
		];
	});
	return slippingTrend(weeks) !== null;
}

function rankRows(rows: readonly RangeHabitRow[]): RangeHabitRow[] {
	const group = (row: RangeHabitRow) =>
		row.rate === null ? 2 : row.slipping ? 1 : 0;
	return [...rows].sort(
		(a, b) => group(a) - group(b) || (b.rate ?? 0) - (a.rate ?? 0),
	);
}

function dayShares(
	perHabit: readonly HabitCells[],
	dates: readonly Date[],
	windowFrom: number,
	today: Date,
	monday: Date | null,
) {
	const byWeekday = new Map<IsoWeekday, Tally>();
	let perfectDays = 0;
	let countedDays = 0;
	const inWindow = aggregateDays(
		perHabit.map(({ habit, cells }) => ({
			habit,
			cells: cells.slice(windowFrom),
		})),
		dates.slice(windowFrom),
		today,
	);
	for (const day of inWindow) {
		if (day.tally.due > 0) countedDays += 1;
		if (day.perfect) perfectDays += 1;
		const weekday = getISODay(day.date) as IsoWeekday;
		const tally = byWeekday.get(weekday) ?? { ...EMPTY_TALLY };
		byWeekday.set(weekday, mergeTallies(tally, day.tally));
	}
	const weekdays = ([1, 2, 3, 4, 5, 6, 7] as IsoWeekday[]).map(
		(weekday): WeekdayShare => {
			const tally = byWeekday.get(weekday) ?? EMPTY_TALLY;
			return {
				weekday,
				date: monday ? addDays(monday, weekday - 1) : null,
				done: tally.done,
				due: tally.due,
				percent: percentOf(tally),
			};
		},
	);
	return { weekdays, perfectDays, countedDays };
}

function bestShare(weekdays: readonly WeekdayShare[]): WeekdayShare | null {
	let best: WeekdayShare | null = null;
	for (const share of weekdays) {
		if (share.done === 0 || share.due === 0) continue;
		if (!best || share.done / share.due > best.done / best.due) best = share;
	}
	return best;
}

function bestStreakOf(
	{
		kind,
		entries,
		frozenDays,
		today,
		window,
		streakHistory,
	}: RangeSummaryInput,
	ordered: readonly Habit[],
): BestStreak | null {
	const todayStart = startOfDay(today);
	const upTo = min([window.end, todayStart]);
	const entriesByHabit = groupByHabit(streakHistory?.entries ?? entries);
	const frozenByHabit = groupByHabit(streakHistory?.frozenDays ?? frozenDays);
	let best: BestStreak | null = null;
	for (const habit of ordered) {
		const own = entriesByHabit.get(habit.id) ?? [];
		const frozenDates = new Set(
			(frozenByHabit.get(habit.id) ?? []).map((frozen) => frozen.date),
		);
		let days: number;
		let endedOn: Date | null = null;
		if (kind === "week") {
			if (habit.archivedAt !== null) continue;
			days = isBefore(upTo, todayStart)
				? calculateCurrentStreak(habit, own, frozenDates, upTo)
				: currentStreakAsOf({ habit, entries: own, frozenDates, today });
		} else {
			const inRange = (date: string) =>
				date >= toDayKey(window.start) && date <= toDayKey(window.end);
			({ days, endedOn } = calculateLongestStreak({
				habit: { ...habit, createdAt: max([habit.createdAt, window.start]) },
				entries: own,
				frozenDates: new Set([...frozenDates].filter(inRange)),
				today: upTo,
			}));
		}
		if (days > (best?.days ?? 0)) best = { days, habit, endedOn };
	}
	return best;
}
