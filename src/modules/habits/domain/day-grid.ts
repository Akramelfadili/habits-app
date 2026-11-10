import { isAfter, isSameDay, startOfDay } from "date-fns";
import { nextDay, toDayKey } from "@/utils/day-key";
import { atIndex } from "@/utils/indexed";
import type { Entry, FrozenDay, Habit } from "../types";
import {
	addToTally,
	type DayLevel,
	dayLevel,
	EMPTY_TALLY,
	isPerfectDay,
	type Tally,
} from "./completion-rate";
import {
	type CellStatus,
	type HabitDayCell,
	habitDayClassifier,
} from "./day-status";

/**
 * The shared grid behind every Progress range: each habit's cells over a run of days, classified
 * once (`day-status.ts`), then summed per day. Rates, the week matrix, the month calendar and the
 * year map all read it, so none of them can disagree about what a day was. Entries and freezes
 * are grouped by habit once; nothing scans them per day.
 */

export function daysIn(start: Date, end: Date): Date[] {
	const days: Date[] = [];
	for (
		let cursor = startOfDay(start);
		!isAfter(cursor, end);
		cursor = nextDay(cursor)
	) {
		days.push(cursor);
	}
	return days;
}

export function groupByHabit<T extends { habitId: number }>(
	items: readonly T[],
): Map<number, T[]> {
	const groups = new Map<number, T[]>();
	for (const item of items) {
		const group = groups.get(item.habitId);
		if (group) group.push(item);
		else groups.set(item.habitId, [item]);
	}
	return groups;
}

export type HabitCells = { habit: Habit; cells: HabitDayCell[] };

type GridInput = {
	habits: readonly Habit[];
	/** Any habit's entries; must cover the days' Monday-aligned span (× per week habits are judged by week). */
	entries: readonly Entry[];
	frozenDays: readonly FrozenDay[];
	today: Date;
	dates: readonly Date[];
	/** Nothing has ever been logged — due past days read `nothing-logged`, not `missed`. */
	nothingLogged?: boolean;
};

export function classifyHabits({
	habits,
	entries,
	frozenDays,
	today,
	dates,
	nothingLogged = false,
}: GridInput): HabitCells[] {
	const entriesByHabit = groupByHabit(entries);
	const frozenByHabit = groupByHabit(frozenDays);
	return habits.map((habit) => {
		const classify = habitDayClassifier({
			habit,
			entries: entriesByHabit.get(habit.id) ?? [],
			frozenDates: new Set(
				(frozenByHabit.get(habit.id) ?? []).map((frozen) => frozen.date),
			),
			today,
			nothingLogged,
		});
		return { habit, cells: dates.map(classify) };
	});
}

const STATUSES: readonly CellStatus[] = [
	"done",
	"partial",
	"missed",
	"frozen",
	"bonus",
	"not-due",
	"before-start",
	"nothing-logged",
	"future",
	"today",
];

export type DayAggregate = {
	date: Date;
	key: string;
	isToday: boolean;
	tally: Tally;
	counts: Record<CellStatus, number>;
	level: DayLevel | null;
	perfect: boolean;
};

export function aggregateDays(
	perHabit: readonly HabitCells[],
	dates: readonly Date[],
	today: Date,
): DayAggregate[] {
	return dates.map((date, index) => {
		const tally = { ...EMPTY_TALLY };
		const counts = Object.fromEntries(
			STATUSES.map((status) => [status, 0]),
		) as Record<CellStatus, number>;
		for (const { cells } of perHabit) {
			const cell = atIndex(cells, index);
			addToTally(tally, cell);
			counts[cell.status] += 1;
		}
		const isToday = isSameDay(date, today);
		// Today with a habit still open (unlogged, or half-logged) isn't a verdict yet.
		const stillOpen = isToday && counts.today + counts.partial > 0;
		return {
			date,
			key: toDayKey(date),
			isToday,
			tally,
			counts,
			level: dayLevel(tally),
			perfect: isPerfectDay(tally) && !stillOpen,
		};
	});
}

/** One habit's slice of the data for the one-habit variants; all habits when `habitId` is null. */
export function scopeHabits(
	habits: readonly Habit[],
	habitId: number | null | undefined,
): Habit[] {
	return habitId == null
		? [...habits]
		: habits.filter((habit) => habit.id === habitId);
}
