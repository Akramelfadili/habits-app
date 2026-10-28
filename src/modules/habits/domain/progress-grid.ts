import { endOfWeek, getISODay, startOfDay, startOfWeek } from "date-fns";
import { toDayKey } from "@/utils/day-key";
import { WEEK_STARTS_ON } from "../constants";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import type { Entry, FrozenDay, Habit } from "../types";
import { type DayLevel, percentOf, tallyOf } from "./completion-rate";
import {
	aggregateDays,
	classifyHabits,
	type DayAggregate,
	daysIn,
} from "./day-grid";
import type { CellStatus, HabitDayCell } from "./day-status";
import { monthWindowFor } from "./monthly-summary";
import type { RangeWindow } from "./range-summary";

/**
 * The grids Progress draws (HAB-35/36, V3-3a): the week matrix (habits × 7
 * days), the month calendar and one day's detail card. All three read the
 * shared day grid, so a cell here is always the status the rates counted.
 * "One habit" variants (P5, P10) are the same calls with `scopeHabits`.
 */

type GridInput = {
	habits: readonly Habit[];
	/** Any habit's entries covering the grid's Monday-aligned span. */
	entries: readonly Entry[];
	frozenDays: readonly FrozenDay[];
	today: Date;
	/** Nothing has ever been logged: due past cells read `nothing-logged` (P4). */
	nothingLogged?: boolean;
};

function byCreationOrder(a: Habit, b: Habit): number {
	return a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;
}

// ─── Week matrix ──────────────────────────────────────────────────────────────

export type MatrixDay = {
	date: Date;
	/** "yyyy-MM-dd". */
	key: string;
	isToday: boolean;
};

export type MatrixCell = HabitDayCell & { date: Date; key: string };

export type MatrixRow = {
	habit: Habit;
	/** Break habit: a done cell reads "resisted" (D8). */
	isBreak: boolean;
	/** Seven cells, Monday → Sunday. */
	cells: MatrixCell[];
	/** Days done this week (a × per week habit can pass its target). */
	done: number;
	/** The "n/target" under the row: days the habit is due this week, or the weekly count for × per week. */
	target: number;
};

export type WeekMatrix = {
	week: RangeWindow;
	days: MatrixDay[];
	rows: MatrixRow[];
};

/**
 * Days the habit is due across the whole week, future days included
 * (P1's "3/7"): before-start and paused days are not, a frozen day still is.
 * A × per week habit's target is its weekly count.
 */
function weeklyTarget(habit: Habit, week: readonly Date[]): number {
	if (habit.frequency.type === "per-week") return habit.frequency.timesPerWeek;
	const strategy = getHabitStrategy(habit);
	const createdStart = startOfDay(habit.createdAt);
	return week.filter(
		(date) =>
			date >= createdStart && strategy.isDueOn(date, { completedDates: [] }),
	).length;
}

const QUIET: readonly CellStatus[] = ["before-start", "not-due", "future"];

export function buildWeekMatrix(
	input: GridInput & { week: RangeWindow },
): WeekMatrix {
	const { week, today } = input;
	const dates = daysIn(week.start, week.end);
	const perHabit = classifyHabits({
		habits: [...input.habits].sort(byCreationOrder),
		entries: input.entries,
		frozenDays: input.frozenDays,
		today,
		dates,
		nothingLogged: input.nothingLogged,
	});
	const days = dates.map((date) => ({
		date,
		key: toDayKey(date),
		isToday: toDayKey(date) === toDayKey(today),
	}));

	const rows: MatrixRow[] = [];
	for (const { habit, cells } of perHabit) {
		// A finished (archived) habit with nothing in this week has no row.
		if (
			habit.archivedAt !== null &&
			cells.every((cell) => QUIET.includes(cell.status))
		) {
			continue;
		}
		rows.push({
			habit,
			isBreak: habit.direction === "break",
			cells: cells.map((cell, index) => ({
				...cell,
				date: dates[index],
				key: days[index].key,
			})),
			done: cells.filter((cell) => cell.status === "done").length,
			target: weeklyTarget(habit, dates),
		});
	}
	return { week, days, rows };
}

// ─── Month calendar ───────────────────────────────────────────────────────────

/**
 * One day of the month calendar:
 * - `before-start` — every habit is younger than this day (dashed).
 * - `future` — after today (hairline).
 * - `open` — today, nothing due is done yet.
 * - `rest` — nothing was due.
 * - `nothing-logged` — would be missed, but nothing has ever been logged.
 * - `frozen` — a freeze covers a habit that day (violet).
 * - `missed` — due, none done (level 0).
 * - `level` — 1 to 3 by done ÷ due.
 */
export type CalendarDayStatus =
	| "before-start"
	| "future"
	| "open"
	| "rest"
	| "nothing-logged"
	| "frozen"
	| "missed"
	| "level";

export type CalendarDay = {
	date: Date;
	key: string;
	isToday: boolean;
	status: CalendarDayStatus;
	/** 0–3 by done ÷ due (L1 1–49 %, L2 50–99 %, L3 100 %); null when nothing was due. */
	level: DayLevel | null;
	/** Level 1 or 2: the corner notch that says "partial" without relying on lightness. */
	notch: boolean;
	perfect: boolean;
	done: number;
	due: number;
	frozen: number;
};

function calendarStatus(
	day: DayAggregate,
	habitCount: number,
): CalendarDayStatus {
	const { counts, tally } = day;
	if (habitCount > 0 && counts["before-start"] === habitCount) {
		return "before-start";
	}
	if (habitCount > 0 && counts.future === habitCount) return "future";
	if (tally.frozen > 0) return "frozen";
	if (tally.due === 0) {
		if (counts.today + counts.partial > 0) return "open";
		return counts["nothing-logged"] > 0 ? "nothing-logged" : "rest";
	}
	return day.level === 0 ? "missed" : "level";
}

export function calendarDayOf(
	day: DayAggregate,
	habitCount: number,
): CalendarDay {
	return {
		date: day.date,
		key: day.key,
		isToday: day.isToday,
		status: calendarStatus(day, habitCount),
		level: day.level,
		notch: day.level === 1 || day.level === 2,
		perfect: day.perfect,
		done: day.tally.done,
		due: day.tally.due,
		frozen: day.tally.frozen,
	};
}

export type MonthCalendar = {
	month: RangeWindow;
	/** Rows of seven (Mon → Sun); null pads the days outside the month. */
	weeks: (CalendarDay | null)[][];
	/** Flat, in date order. */
	days: CalendarDay[];
};

export function buildMonthCalendar(
	input: GridInput & { month: RangeWindow },
): MonthCalendar {
	const { month, today } = input;
	const dates = daysIn(month.start, month.end);
	const perHabit = classifyHabits({
		habits: input.habits,
		entries: input.entries,
		frozenDays: input.frozenDays,
		today,
		dates,
		nothingLogged: input.nothingLogged,
	});
	const days = aggregateDays(perHabit, dates, today).map((day) =>
		calendarDayOf(day, perHabit.length),
	);

	const weeks: (CalendarDay | null)[][] = [];
	let row: (CalendarDay | null)[] = [];
	for (const day of days) {
		const weekday = getISODay(day.date);
		if (row.length === 0 && weekday !== 1) row = Array(weekday - 1).fill(null);
		row.push(day);
		if (weekday === 7) {
			weeks.push(row);
			row = [];
		}
	}
	if (row.length > 0) {
		while (row.length < 7) row.push(null);
		weeks.push(row);
	}
	return { month, weeks, days };
}

/** The Mon–Sun weeks a calendar month's cells need entries for (× per week judges a whole week). */
export function calendarEntrySpan(month: Date): RangeWindow {
	const window = monthWindowFor(month);
	return {
		start: startOfWeek(window.start, { weekStartsOn: WEEK_STARTS_ON }),
		end: startOfDay(endOfWeek(window.end, { weekStartsOn: WEEK_STARTS_ON })),
	};
}

// ─── Day detail ───────────────────────────────────────────────────────────────

export type DayDetailItem = {
	habit: Habit;
	isBreak: boolean;
	status: CellStatus;
	level: 0 | 1 | 2 | 3;
	/** The logged amount (a quantity habit's "8 of 8"), when there is one. */
	value?: number;
	/** The target for a quantity habit; null for a simple check. */
	target: number | null;
};

export type DayDetail = {
	date: Date;
	key: string;
	isToday: boolean;
	/** Future days can't be edited ("Can't log ahead"). */
	editable: boolean;
	done: number;
	due: number;
	/** Whole points; null when nothing was due. */
	percent: number | null;
	/** The habits with something to say that day: due, logged, frozen or still open. */
	items: DayDetailItem[];
};

/**
 * Each habit's state on one date — the Month day card and the year's day
 * detail (P13). `entries` must cover the date's Monday–Sunday week (a × per
 * week habit's day depends on the rest of its week).
 */
export function buildDayDetail(input: GridInput & { date: Date }): DayDetail {
	const { date, today } = input;
	const day = startOfDay(date);
	const perHabit = classifyHabits({
		habits: [...input.habits].sort(byCreationOrder),
		entries: input.entries,
		frozenDays: input.frozenDays,
		today,
		dates: [day],
		nothingLogged: input.nothingLogged,
	});
	const cells = perHabit.map(({ cells: [cell] }) => cell);
	const tally = tallyOf(cells);
	const items = perHabit
		.map(({ habit, cells: [cell] }) => ({
			habit,
			isBreak: habit.direction === "break",
			status: cell.status,
			level: cell.level,
			value: cell.value,
			target: habit.targetAmount,
		}))
		.filter(
			({ status }) =>
				status !== "not-due" &&
				status !== "before-start" &&
				status !== "future",
		);
	return {
		date: day,
		key: toDayKey(day),
		isToday: toDayKey(day) === toDayKey(today),
		editable: day <= startOfDay(today),
		done: tally.done,
		due: tally.due,
		percent: percentOf(tally),
		items,
	};
}

/** The Monday–Sunday span to read entries for when showing one day's detail. */
export function dayEntrySpan(date: Date): RangeWindow {
	return {
		start: startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
		end: startOfDay(endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON })),
	};
}
