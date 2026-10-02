import {
	addDays,
	addWeeks,
	format,
	isAfter,
	isBefore,
	isSameDay,
	max,
	parseISO,
	startOfDay,
	startOfWeek,
	subDays,
} from "date-fns";
import type { HeatmapLevel } from "@/theme/theme";
import { WEEK_STARTS_ON } from "../constants";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import type { Entry, EntryNote, Habit } from "../types";
import { calculateCurrentStreak, isEntryComplete } from "./habit-service";
import { isOffScheduleEntry } from "./off-schedule";

/**
 * Habit Detail's history math (HAB-09) — pure functions over a habit's own
 * entries and frozen days. Every "was this day owed" question goes through the
 * habit's FrequencyStrategy (`wasScheduledOn`), so the streaks, the 90-day
 * rate, and the heatmap can never disagree about which days counted.
 */

const DATE_FORMAT = "yyyy-MM-dd";

export const COMPLETION_RATE_WINDOW_DAYS = 90;
export const HEATMAP_WEEKS = 10;

type History = {
	habit: Habit;
	/** This habit's entries only. */
	entries: readonly Entry[];
	/** This habit's frozen days, "yyyy-MM-dd". */
	frozenDates: ReadonlySet<string>;
	today: Date;
};

function completedDatesOf(habit: Habit, entries: readonly Entry[]) {
	const complete = entries.filter((entry) => isEntryComplete(habit, entry));
	return {
		dates: complete.map((entry) => parseISO(entry.date)),
		set: new Set(complete.map((entry) => entry.date)),
	};
}

/**
 * The streak as it stands right now. A still-open today that isn't logged yet
 * hasn't broken anything, so the count runs up to yesterday instead of reading
 * as 0 every morning; once today is logged, it counts.
 */
export function currentStreakAsOf({
	habit,
	entries,
	frozenDates,
	today,
}: History): number {
	const todayDone = completedDatesOf(habit, entries).set.has(
		format(today, DATE_FORMAT),
	);
	const asOf = todayDone ? today : subDays(startOfDay(today), 1);
	return calculateCurrentStreak(habit, entries, frozenDates, asOf);
}

export type LongestStreak = {
	days: number;
	/** The run's last day — "days, in June" — or null when there's never been one. */
	endedOn: Date | null;
};

/** The longest run of scheduled days completed or frozen, since the habit was created. */
export function calculateLongestStreak({
	habit,
	entries,
	frozenDates,
	today,
}: History): LongestStreak {
	const strategy = getHabitStrategy(habit);
	const completed = completedDatesOf(habit, entries);
	const context = { completedDates: completed.dates };
	const todayStart = startOfDay(today);

	let best: LongestStreak = { days: 0, endedOn: null };
	let run = 0;
	for (
		let cursor = startOfDay(habit.createdAt);
		!isAfter(cursor, todayStart);
		cursor = addDays(cursor, 1)
	) {
		if (!strategy.wasScheduledOn(cursor, context)) continue;
		const dateString = format(cursor, DATE_FORMAT);
		if (completed.set.has(dateString) || frozenDates.has(dateString)) {
			run += 1;
			if (run > best.days) best = { days: run, endedOn: cursor };
		} else if (isBefore(cursor, todayStart)) {
			run = 0;
		}
	}
	return best;
}

export type CompletionRate = {
	completed: number;
	scheduled: number;
	/** 0–1, or null when nothing has been scheduled yet (a brand-new habit). */
	fraction: number | null;
};

/**
 * Completion rate over the last 90 days, against **scheduled** days only —
 * clipped to the habit's own creation date rather than padded to 90 (HAB-09
 * edge case). Today joins the denominator only once it's logged, since it
 * can't have been missed yet. A frozen day stays in the denominator but isn't
 * a completion — a freeze protects the streak, not the rate.
 */
export function calculateCompletionRate({
	habit,
	entries,
	today,
}: Omit<History, "frozenDates">): CompletionRate {
	const strategy = getHabitStrategy(habit);
	const completed = completedDatesOf(habit, entries);
	const context = { completedDates: completed.dates };
	const todayStart = startOfDay(today);
	const windowStart = max([
		subDays(todayStart, COMPLETION_RATE_WINDOW_DAYS - 1),
		startOfDay(habit.createdAt),
	]);

	let scheduled = 0;
	let done = 0;
	for (
		let cursor = windowStart;
		!isAfter(cursor, todayStart);
		cursor = addDays(cursor, 1)
	) {
		if (!strategy.wasScheduledOn(cursor, context)) continue;
		const isDone = completed.set.has(format(cursor, DATE_FORMAT));
		if (isSameDay(cursor, todayStart) && !isDone) continue;
		scheduled += 1;
		if (isDone) done += 1;
	}

	return {
		completed: done,
		scheduled,
		fraction: scheduled === 0 ? null : done / scheduled,
	};
}

/**
 * One heatmap day. `pending` is today while it's still open and unlogged,
 * `future` is later this week; neither can be missed yet.
 */
export type HeatmapDayStatus =
	| "not-scheduled"
	| "missed"
	| "frozen"
	| "logged"
	/** Logged on a day that wasn't scheduled (HAB-18) — informational, never counted. */
	| "bonus"
	| "pending"
	| "future";

export type HeatmapDay = {
	date: Date;
	status: HeatmapDayStatus;
	/** Shading for a `logged` day — how much of the target it reached. */
	level?: HeatmapLevel;
	/** Past and today are the entry point into retro logging (HAB-10); future and pre-creation days aren't. */
	selectable: boolean;
};

/**
 * Quantity habits shade by how much of the target was reached — under half,
 * under target, at/over. A simple-check entry is all-or-nothing, so it's
 * always the full shade.
 */
export function heatmapLevelFor(habit: Habit, entry: Entry): HeatmapLevel {
	if (habit.targetType !== "quantity" || !habit.targetAmount) return 3;
	const ratio = (entry.value ?? 0) / habit.targetAmount;
	if (ratio >= 1) return 3;
	return ratio >= 0.5 ? 2 : 1;
}

/**
 * The last 10 Mon–Sun weeks ending with the current one — one column per
 * week, oldest first, each with 7 days Monday → Sunday.
 */
export function buildHeatmapWeeks({
	habit,
	entries,
	frozenDates,
	today,
}: History): HeatmapDay[][] {
	const strategy = getHabitStrategy(habit);
	const completed = completedDatesOf(habit, entries);
	const context = { completedDates: completed.dates };
	const entriesByDate = new Map(entries.map((entry) => [entry.date, entry]));
	const todayStart = startOfDay(today);
	const createdStart = startOfDay(habit.createdAt);
	const firstWeek = addWeeks(
		startOfWeek(todayStart, { weekStartsOn: WEEK_STARTS_ON }),
		-(HEATMAP_WEEKS - 1),
	);

	function dayFor(date: Date): HeatmapDay {
		const dateString = format(date, DATE_FORMAT);
		const entry = entriesByDate.get(dateString);
		const isFuture = isAfter(date, todayStart);
		const beforeCreation = isBefore(date, createdStart);
		const selectable = !isFuture && !beforeCreation;

		if (isFuture) return { date, status: "future", selectable };
		if (entry) {
			// A real log always shows, even on an off-schedule day — hiding it
			// would misreport what happened; the rate still ignores it. A frozen
			// day is never a bonus: the freeze says it was owed.
			const bonus =
				!frozenDates.has(dateString) &&
				isOffScheduleEntry(habit, entry, entries);
			return {
				date,
				status: bonus ? "bonus" : "logged",
				level: heatmapLevelFor(habit, entry),
				selectable,
			};
		}
		// Checked before scheduling: a freeze is always shown as one, even if
		// the per-week rule wouldn't count that day as owed in hindsight.
		if (frozenDates.has(dateString)) {
			return { date, status: "frozen", selectable };
		}
		if (beforeCreation || !strategy.wasScheduledOn(date, context)) {
			return { date, status: "not-scheduled", selectable };
		}
		if (isSameDay(date, todayStart)) {
			return { date, status: "pending", selectable };
		}
		return { date, status: "missed", selectable };
	}

	return Array.from({ length: HEATMAP_WEEKS }, (_, week) =>
		Array.from({ length: 7 }, (_, weekday) =>
			dayFor(addDays(addWeeks(firstWeek, week), weekday)),
		),
	);
}

/**
 * One line of Habit Detail's "Recent entries": a day with a log, a note, or
 * both. A note on a day that wasn't logged (HAB-10) still gets its own line —
 * otherwise it would only ever be visible from inside the Retro log sheet.
 */
export type RecentEntry = {
	/** "yyyy-MM-dd". */
	date: string;
	entry: Entry | null;
	note: string | null;
};

/** This habit's logged and/or noted days, newest first — Habit Detail's "Recent entries". */
export function recentEntries(
	entries: readonly Entry[],
	notes: readonly EntryNote[],
	limit = 10,
): RecentEntry[] {
	const byDate = new Map<string, RecentEntry>();
	for (const entry of entries) {
		byDate.set(entry.date, { date: entry.date, entry, note: null });
	}
	for (const { date, note } of notes) {
		const existing = byDate.get(date);
		byDate.set(date, { date, entry: existing?.entry ?? null, note });
	}
	return [...byDate.values()]
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, limit);
}
