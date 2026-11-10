import { getISODay, startOfDay } from "date-fns";
import { toDayKey } from "@/utils/day-key";
import { atIndex } from "@/utils/indexed";
import { weekAlignedSpan, weekWindow } from "@/utils/week-window";
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

type GridInput = {
	habits: readonly Habit[];
	entries: readonly Entry[];
	frozenDays: readonly FrozenDay[];
	today: Date;
	nothingLogged?: boolean;
};

function byCreationOrder(a: Habit, b: Habit): number {
	return a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;
}

export type MatrixDay = {
	date: Date;
	key: string;
	isToday: boolean;
};

export type MatrixCell = HabitDayCell & { date: Date; key: string };

export type MatrixRow = {
	habit: Habit;
	isBreak: boolean;
	cells: MatrixCell[];
	done: number;
	target: number;
};

export type WeekMatrix = {
	week: RangeWindow;
	days: MatrixDay[];
	rows: MatrixRow[];
};

// Future days count ("3/7"); before-start and paused days don't, a frozen day still does.
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
				date: atIndex(dates, index),
				key: atIndex(days, index).key,
			})),
			done: cells.filter((cell) => cell.status === "done").length,
			target: weeklyTarget(habit, dates),
		});
	}
	return { week, days, rows };
}

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
	level: DayLevel | null;
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
	weeks: (CalendarDay | null)[][];
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

export function calendarEntrySpan(month: Date): RangeWindow {
	const window = monthWindowFor(month);
	return weekAlignedSpan(window.start, window.end);
}

export type DayDetailItem = {
	habit: Habit;
	isBreak: boolean;
	status: CellStatus;
	level: 0 | 1 | 2 | 3;
	value?: number;
	target: number | null;
};

export type DayDetail = {
	date: Date;
	key: string;
	isToday: boolean;
	editable: boolean;
	done: number;
	due: number;
	percent: number | null;
	items: DayDetailItem[];
};

// `entries` must cover the date's Monday-Sunday week: a per-week habit's day depends on it.
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
	const cells = perHabit.map(({ cells: habitCells }) => atIndex(habitCells, 0));
	const tally = tallyOf(cells);
	const items = perHabit
		.map(({ habit, cells: habitCells }) => {
			const cell = atIndex(habitCells, 0);
			return {
				habit,
				isBreak: habit.direction === "break",
				status: cell.status,
				level: cell.level,
				value: cell.value,
				target: habit.targetAmount,
			};
		})
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

export function dayEntrySpan(date: Date): RangeWindow {
	return weekWindow(date);
}
