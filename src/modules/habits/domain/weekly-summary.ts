import {
	addDays,
	endOfWeek,
	format,
	getISODay,
	isAfter,
	isBefore,
	isSameDay,
	min,
	parseISO,
	startOfDay,
	startOfWeek,
	subWeeks,
} from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import type { Entry, Habit } from "../types";
import { isEntryComplete } from "./streaks";

/**
 * Weekly Summary's math (HAB-11) — pure functions over this week's habits and
 * entries. The window is the same Mon–Sun week HAB-02 schedules against
 * (`WEEK_STARTS_ON`), and every "was this day owed" question goes through the
 * habit's FrequencyStrategy (`wasScheduledOn`), exactly like Habit Detail's
 * history — so a 3×/week habit done three times reads 3/3, not 3/7.
 *
 * Counts run up to today only: future days aren't owed yet, and today joins
 * once it's logged (same rule as Habit Detail's 90-day rate). Mid-week, a
 * habit is judged on the days that have actually happened; a finished week
 * (last week) counts all seven.
 */

const DATE_FORMAT = "yyyy-MM-dd";

/** A habit needs this many scheduled days this week before it can be flagged as slipping. */
export const SLIPPING_MIN_SCHEDULED_DAYS = 3;

export type WeekWindow = { start: Date; end: Date };

/** The Mon–Sun week containing `today`. */
export function weekWindowFor(today: Date): WeekWindow {
	return {
		start: startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON }),
		end: startOfDay(endOfWeek(today, { weekStartsOn: WEEK_STARTS_ON })),
	};
}

export type SummaryWeek = "this" | "last";

/**
 * The first ISO weekday (Wednesday) the summary opens on this week. Before
 * it, this week has at most two days in it — nothing can have been due three
 * times — so the summary opens on the week that just finished instead: the
 * Sunday-night/Monday-morning review is exactly when people look.
 */
const THIS_WEEK_FROM_ISO_DAY = 3;

export function defaultSummaryWeek(today: Date): SummaryWeek {
	return getISODay(today) < THIS_WEEK_FROM_ISO_DAY ? "last" : "this";
}

/** The Mon–Sun window `which` refers to, relative to `today`. */
export function summaryWeekWindow(today: Date, which: SummaryWeek): WeekWindow {
	return weekWindowFor(which === "last" ? subWeeks(today, 1) : today);
}

export type WeeklyHabitRow = {
	habit: Habit;
	completed: number;
	scheduled: number;
	/** 0–1; rows only exist for habits with at least one scheduled day. */
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
	/** Something is under 100%, but nothing has had enough scheduled days to call. */
	| { type: "too-early" };

export type WeeklySummary = {
	week: WeekWindow;
	completed: number;
	scheduled: number;
	/** Worst → best; ties in creation order. */
	rows: WeeklyHabitRow[];
	/** The day with the most completions (earliest on a tie), or null when nothing's done yet. */
	bestDay: WeeklyBestDay | null;
	isPerfect: boolean;
	insight: WeeklyInsight;
};

type WeeklySummaryInput = {
	habits: readonly Habit[];
	/** The summarised week's entries, any habit. */
	entries: readonly Entry[];
	today: Date;
	/** Which week to summarise — defaults to the one containing `today`. */
	week?: SummaryWeek;
};

function byCreationOrder(a: Habit, b: Habit): number {
	return a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;
}

export function buildWeeklySummary({
	habits,
	entries,
	today,
	week: which = "this",
}: WeeklySummaryInput): WeeklySummary {
	const todayStart = startOfDay(today);
	const week = summaryWeekWindow(todayStart, which);
	const lastCountedDay = min([todayStart, week.end]);
	const perDay = new Map<string, { completed: number; scheduled: number }>();
	const rows: WeeklyHabitRow[] = [];

	for (const habit of [...habits].sort(byCreationOrder)) {
		const strategy = getHabitStrategy(habit);
		const completedSet = new Set(
			entries
				.filter(
					(entry) =>
						entry.habitId === habit.id && isEntryComplete(habit, entry),
				)
				.map((entry) => entry.date),
		);
		const context = {
			completedDates: [...completedSet].map((date) => parseISO(date)),
		};
		const createdStart = startOfDay(habit.createdAt);

		let scheduled = 0;
		let completed = 0;
		for (
			let cursor = week.start;
			!isAfter(cursor, lastCountedDay);
			cursor = addDays(cursor, 1)
		) {
			if (isBefore(cursor, createdStart)) continue;
			if (!strategy.wasScheduledOn(cursor, context)) continue;
			const dateString = format(cursor, DATE_FORMAT);
			const isDone = completedSet.has(dateString);
			if (isSameDay(cursor, todayStart) && !isDone) continue;

			scheduled += 1;
			if (isDone) completed += 1;
			const day = perDay.get(dateString) ?? { completed: 0, scheduled: 0 };
			day.scheduled += 1;
			if (isDone) day.completed += 1;
			perDay.set(dateString, day);
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

	// Stable sort keeps creation order among ties.
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

/**
 * One verdict for the week, behind one gate: until some habit has been due
 * SLIPPING_MIN_SCHEDULED_DAYS times, it's too early to call *either way* — a
 * single perfect Monday isn't a perfect week any more than one missed Monday
 * is a slipping habit. Past the gate: perfect if everything's done, otherwise
 * the single worst eligible habit (`rows` is already worst-first, ties in
 * creation order).
 */
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
