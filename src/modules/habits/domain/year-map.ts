import {
	addMonths,
	differenceInCalendarDays,
	endOfMonth,
	format,
	isAfter,
	isBefore,
	isSameMonth,
	startOfDay,
} from "date-fns";
import type { Entry, FrozenDay, Habit } from "../types";
import { percentOf } from "./completion-rate";
import { aggregateDays, classifyHabits, daysIn } from "./day-grid";
import { historyStart } from "./monthly-summary";
import { type CalendarDay, calendarDayOf } from "./progress-grid";
import type { ClassifiedDays, RangeWindow } from "./range-summary";
import { bestMonth, isJudgeable } from "./yearly-insights";
import type { YearMonthCell } from "./yearly-summary";

/**
 * The year heat map (HAB-37, P12–P16, V3-3a): a level 0–3 for every day of a
 * year, all habits together or one habit (binary, since one habit is 1 of 1 or
 * 0), grouped by month for the three 4-month bands, plus the month tiles, the
 * best month and the month list the VoiceOver / AX3 fallback draws (P16).
 *
 * Built in one pass on the shared day grid: each habit's context is bucketed
 * once and every day is answered in O(1) — no per-day scan of entries — so it
 * stays fast on five years of logs (`year-map.perf.test.ts`). Pass the year's
 * Monday-aligned entries (`rangeEntrySpan` or `yearEntryRange`); more is fine.
 */

export type YearMapMonth = YearMonthCell & {
	/** "yyyy-MM". */
	key: string;
	/** Whole points; null unless the month was counted. */
	percent: number | null;
	/** The month's days in date order (one cell each; Mon → Sun rows are the screen's job). */
	days: CalendarDay[];
};

export type MonthListItem = {
	month: Date;
	key: string;
	kind: YearMonthCell["kind"];
	current: boolean;
	/** Whole points; null for a month with nothing counted. */
	percent: number | null;
	/** 0–1 bar length (0 when there is no rate). */
	bar: number;
};

export type YearMap = {
	year: RangeWindow;
	/** Every day of the year, in date order. */
	days: CalendarDay[];
	/** The twelve months, January first. */
	months: YearMapMonth[];
	/** Three bands of four months (Jan–Apr, May–Aug, Sep–Dec). */
	bands: YearMapMonth[][];
	/** The best finished month (needs two); null until then. */
	bestMonth: YearMapMonth | null;
	/** Months that have started, for the month-list fallback with bars and whole-number %. */
	monthList: MonthListItem[];
};

type YearMapInput = {
	habits: readonly Habit[];
	entries: readonly Entry[];
	frozenDays: readonly FrozenDay[];
	today: Date;
	year: RangeWindow;
	/** Nothing has ever been logged: due past days read `nothing-logged`. */
	nothingLogged?: boolean;
	/**
	 * The cells for the previous year and this one, classified once by
	 * `classifyRangeDays({ kind: "year", … })` and shared with the year's range
	 * summary, so the days are walked once. This year's days are read out of it.
	 */
	classified?: ClassifiedDays;
};

export function buildYearMap(input: YearMapInput): YearMap {
	const { year, today } = input;
	const todayStart = startOfDay(today);
	const dates = daysIn(year.start, year.end);
	const { classified } = input;
	const offset = classified
		? differenceInCalendarDays(year.start, classified.dates[0])
		: 0;
	const perHabit = classified
		? classified.perHabit.map(({ habit, cells }) => ({
				habit,
				cells: cells.slice(offset, offset + dates.length),
			}))
		: classifyHabits({
				habits: input.habits,
				entries: input.entries,
				frozenDays: input.frozenDays,
				today,
				dates,
				nothingLogged: input.nothingLogged,
			});
	const aggregates = aggregateDays(perHabit, dates, today);
	const days = aggregates.map((day) => calendarDayOf(day, perHabit.length));
	const firstDay = historyStart(input.habits);

	const months = Array.from({ length: 12 }, (_, index): YearMapMonth => {
		const month = addMonths(year.start, index);
		const key = format(month, "yyyy-MM");
		const inMonth = days.filter((day) => day.key.startsWith(key));
		let done = 0;
		let due = 0;
		for (const day of inMonth) {
			done += day.done;
			due += day.due;
		}
		const base = {
			month,
			key,
			current: isSameMonth(month, todayStart),
			completed: done,
			scheduled: due,
			rate: null as number | null,
			percent: null as number | null,
			days: inMonth,
		};
		if (firstDay && isBefore(startOfDay(endOfMonth(month)), firstDay)) {
			return { ...base, completed: 0, scheduled: 0, kind: "before-start" };
		}
		if (isAfter(month, todayStart)) {
			return { ...base, completed: 0, scheduled: 0, kind: "future" };
		}
		if (due === 0) return { ...base, kind: "none" };
		return {
			...base,
			kind: "counted",
			rate: done / due,
			percent: percentOf({ done, due, frozen: 0, bonus: 0 }),
		};
	});

	return {
		year,
		days,
		months,
		bands: [months.slice(0, 4), months.slice(4, 8), months.slice(8, 12)],
		bestMonth: bestMonth(months.filter(isJudgeable)) as YearMapMonth | null,
		monthList: months
			.filter(
				(month) => month.kind !== "before-start" && month.kind !== "future",
			)
			.map((month) => ({
				month: month.month,
				key: month.key,
				kind: month.kind,
				current: month.current,
				percent: month.percent,
				bar: month.rate ?? 0,
			})),
	};
}
