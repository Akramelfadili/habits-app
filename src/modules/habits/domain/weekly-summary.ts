import {
	getISODay,
	isAfter,
	min,
	parseISO,
	startOfDay,
	subWeeks,
} from "date-fns";
import { nextDay, toDayKey } from "@/utils/day-key";
import { type DayWindow, weekWindow } from "@/utils/week-window";
import type { Entry, FrozenDay, Habit } from "../types";
import { addToTally, EMPTY_TALLY } from "./completion-rate";
import { habitDayClassifier } from "./day-status";

// Counts run up to today only, so mid-week a habit is judged on days that have happened and
// a 3x/week habit done three times reads 3/3, not 3/7.

export const SLIPPING_MIN_SCHEDULED_DAYS = 3;

export type WeekWindow = DayWindow;

export type SummaryWeek = "this" | "last";

// Before Wednesday nothing can have been due three times, so the summary opens on the week
// that just finished: Sunday night / Monday morning is when people look.
const THIS_WEEK_FROM_ISO_DAY = 3;

export function defaultSummaryWeek(today: Date): SummaryWeek {
	return getISODay(today) < THIS_WEEK_FROM_ISO_DAY ? "last" : "this";
}

function summaryWeekWindow(today: Date, which: SummaryWeek): WeekWindow {
	return weekWindow(which === "last" ? subWeeks(today, 1) : today);
}

export type WeeklyHabitRow = {
	habit: Habit;
	completed: number;
	scheduled: number;
	fraction: number;
};

export type WeeklyBestDay = {
	date: Date;
	completed: number;
	scheduled: number;
};

export type WeeklyInsight =
	| { type: "slipping"; row: WeeklyHabitRow }
	| { type: "perfect" }
	| { type: "too-early" };

export type WeeklySummary = {
	week: WeekWindow;
	completed: number;
	scheduled: number;
	rows: WeeklyHabitRow[];
	bestDay: WeeklyBestDay | null;
	isPerfect: boolean;
	insight: WeeklyInsight;
};

type WeeklySummaryInput = {
	habits: readonly Habit[];
	entries: readonly Entry[];
	frozenDays?: readonly FrozenDay[];
	today: Date;
	week?: SummaryWeek;
};

function byCreationOrder(a: Habit, b: Habit): number {
	return a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;
}

export function buildWeeklySummary({
	habits,
	entries,
	frozenDays = [],
	today,
	week: which = "this",
}: WeeklySummaryInput): WeeklySummary {
	const todayStart = startOfDay(today);
	const week = summaryWeekWindow(todayStart, which);
	const lastCountedDay = min([todayStart, week.end]);
	const perDay = new Map<string, { completed: number; scheduled: number }>();
	const rows: WeeklyHabitRow[] = [];

	for (const habit of [...habits].sort(byCreationOrder)) {
		const classify = habitDayClassifier({
			habit,
			entries: entries.filter((entry) => entry.habitId === habit.id),
			frozenDates: new Set(
				frozenDays
					.filter((frozen) => frozen.habitId === habit.id)
					.map((frozen) => frozen.date),
			),
			today,
		});

		let scheduled = 0;
		let completed = 0;
		for (
			let cursor = week.start;
			!isAfter(cursor, lastCountedDay);
			cursor = nextDay(cursor)
		) {
			const day = addToTally({ ...EMPTY_TALLY }, classify(cursor));
			if (day.due === 0) continue;
			const dateString = toDayKey(cursor);
			scheduled += 1;
			completed += day.done;
			const perDayCounts = perDay.get(dateString) ?? {
				completed: 0,
				scheduled: 0,
			};
			perDayCounts.scheduled += 1;
			perDayCounts.completed += day.done;
			perDay.set(dateString, perDayCounts);
		}

		if (scheduled > 0) {
			rows.push({
				habit,
				completed,
				scheduled,
				fraction: completed / scheduled,
			});
		}
	}

	rows.sort((a, b) => a.fraction - b.fraction);

	const completed = rows.reduce((sum, row) => sum + row.completed, 0);
	const scheduled = rows.reduce((sum, row) => sum + row.scheduled, 0);
	const isPerfect = scheduled > 0 && completed === scheduled;

	return {
		week,
		completed,
		scheduled,
		rows,
		bestDay: bestDayOf(perDay),
		isPerfect,
		insight: insightFor(rows, isPerfect),
	};
}

function bestDayOf(
	perDay: ReadonlyMap<string, { completed: number; scheduled: number }>,
): WeeklyBestDay | null {
	let best: WeeklyBestDay | null = null;
	const days = [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b));
	for (const [date, day] of days) {
		if (day.completed === 0) continue;
		if (!best || day.completed > best.completed) {
			best = { date: parseISO(date), ...day };
		}
	}
	return best;
}

// Too early to call either way until some habit has been due SLIPPING_MIN_SCHEDULED_DAYS
// times: one perfect Monday isn't a perfect week, one miss isn't a slipping habit.
function insightFor(
	rows: readonly WeeklyHabitRow[],
	isPerfect: boolean,
): WeeklyInsight {
	const eligible = rows.filter(
		(row) => row.scheduled >= SLIPPING_MIN_SCHEDULED_DAYS,
	);
	if (eligible.length === 0) return { type: "too-early" };
	if (isPerfect) return { type: "perfect" };
	const worst = eligible.find((row) => row.fraction < 1);
	return worst ? { type: "slipping", row: worst } : { type: "too-early" };
}
