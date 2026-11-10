import {
	addDays,
	addMonths,
	addWeeks,
	isAfter,
	isBefore,
	isSameDay,
	max,
	startOfDay,
	startOfMonth,
	subDays,
} from "date-fns";
import type { HeatmapLevel } from "@/theme/theme";
import { fromDayKey, nextDay, toDayKey } from "@/utils/day-key";
import { weekStart } from "@/utils/week-window";
import {
	getHabitStrategy,
	habitPauses,
} from "../strategies/frequency-strategy";
import { isPausedOn, restartDays } from "../strategies/paused-schedule";
import type { Entry, EntryNote, Habit } from "../types";
import { addToTally, EMPTY_TALLY } from "./completion-rate";
import { type HabitDayCell, habitDayClassifier } from "./day-status";
import { offScheduleChecker } from "./off-schedule";
import { calculateCurrentStreak, isEntryComplete } from "./streaks";

// Every "was this day owed" question goes through `wasScheduledOn`, so streaks, the 90-day
// rate and the heatmap cannot disagree.

const COMPLETION_RATE_WINDOW_DAYS = 90;
export const HEATMAP_WEEKS = 5;

type History = {
	habit: Habit;
	entries: readonly Entry[];
	frozenDates: ReadonlySet<string>;
	today: Date;
};

function completedDatesOf(habit: Habit, entries: readonly Entry[]) {
	const complete = entries.filter((entry) => isEntryComplete(habit, entry));
	return {
		dates: complete.map((entry) => fromDayKey(entry.date)),
		set: new Set(complete.map((entry) => entry.date)),
	};
}

// An unlogged, still-open today hasn't broken anything: count up to yesterday so the
// streak doesn't read 0 every morning.
export function currentStreakAsOf({
	habit,
	entries,
	frozenDates,
	today,
}: History): number {
	const todayDone = completedDatesOf(habit, entries).set.has(toDayKey(today));
	const asOf = todayDone ? today : subDays(startOfDay(today), 1);
	return calculateCurrentStreak(habit, entries, frozenDates, asOf);
}

export type LongestStreak = {
	days: number;
	endedOn: Date | null;
};

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

	// A restore starts a fresh run; nothing carries over the gap.
	const restarts = new Set(restartDays(habit.pauses));
	let best: LongestStreak = { days: 0, endedOn: null };
	let run = 0;
	for (
		let cursor = startOfDay(habit.createdAt);
		!isAfter(cursor, todayStart);
		cursor = nextDay(cursor)
	) {
		const dateString = toDayKey(cursor);
		if (restarts.has(dateString)) run = 0;
		if (!strategy.wasScheduledOn(cursor, context)) continue;
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
	frozen: number;
	fraction: number | null;
	skippedPaused: boolean;
};

// Today joins the denominator only once logged (it can't have been missed yet). An archived
// habit's window ends the day before archiving so the rate doesn't decay over days never asked of.
export function calculateCompletionRate({
	habit,
	entries,
	frozenDates,
	today,
}: History): CompletionRate {
	const classify = habitDayClassifier({ habit, entries, frozenDates, today });
	const todayStart = startOfDay(today);
	const windowEnd = habit.archivedAt
		? subDays(startOfDay(habit.archivedAt), 1)
		: todayStart;
	const windowStart = max([
		subDays(windowEnd, COMPLETION_RATE_WINDOW_DAYS - 1),
		startOfDay(habit.createdAt),
	]);
	const { tally, skippedPaused } = tallyWindow(
		classify,
		habit,
		windowStart,
		windowEnd,
	);

	return {
		completed: tally.done,
		scheduled: tally.due,
		frozen: tally.frozen,
		fraction: tally.due === 0 ? null : tally.done / tally.due,
		skippedPaused,
	};
}

function tallyWindow(
	classify: (date: Date) => HabitDayCell,
	habit: Habit,
	start: Date,
	end: Date,
) {
	const tally = { ...EMPTY_TALLY };
	let skippedPaused = false;
	for (let cursor = start; !isAfter(cursor, end); cursor = nextDay(cursor)) {
		if (isPausedOn(cursor, habit.pauses)) skippedPaused = true;
		addToTally(tally, classify(cursor));
	}
	return { tally, skippedPaused };
}

// Below this many due days a "+4 pts" comparison would be noise.
const MIN_DUE_FOR_DELTA = 7;

export function completionRateDelta({
	habit,
	entries,
	frozenDates,
	today,
}: History): number | null {
	if (habit.archivedAt) return null;
	const created = startOfDay(habit.createdAt);
	const currentEnd = startOfDay(today);
	const currentStart = subDays(currentEnd, COMPLETION_RATE_WINDOW_DAYS - 1);
	const previousEnd = subDays(currentStart, 1);
	if (isBefore(previousEnd, created)) return null;
	const classify = habitDayClassifier({ habit, entries, frozenDates, today });
	const previousStart = max([
		subDays(previousEnd, COMPLETION_RATE_WINDOW_DAYS - 1),
		created,
	]);
	const previous = tallyWindow(
		classify,
		habit,
		previousStart,
		previousEnd,
	).tally;
	const current = tallyWindow(classify, habit, currentStart, currentEnd).tally;
	if (previous.due < MIN_DUE_FOR_DELTA || current.due === 0) return null;
	const percent = (done: number, due: number) => Math.round((done / due) * 100);
	return (
		percent(current.done, current.due) - percent(previous.done, previous.due)
	);
}

export type HeatmapDayStatus =
	| "not-scheduled"
	| "missed"
	| "frozen"
	| "logged"
	| "bonus"
	| "paused"
	| "reset"
	| "pending"
	| "future"
	| "before-start";

export type HeatmapDay = {
	date: Date;
	status: HeatmapDayStatus;
	isToday: boolean;
	level?: HeatmapLevel;
	selectable: boolean;
};

export function heatmapLevelFor(habit: Habit, entry: Entry): HeatmapLevel {
	if (habit.targetType !== "quantity" || !habit.targetAmount) return 3;
	const ratio = (entry.value ?? 0) / habit.targetAmount;
	if (ratio >= 1) return 3;
	return ratio >= 0.5 ? 2 : 1;
}

export function buildHeatmapWeeks(
	{ habit, entries, frozenDates, today }: History,
	resetOn: Date | null = null,
): HeatmapDay[][] {
	const strategy = getHabitStrategy(habit);
	const pauses = habitPauses(habit);
	const completed = completedDatesOf(habit, entries);
	const context = { completedDates: completed.dates };
	const entriesByDate = new Map(entries.map((entry) => [entry.date, entry]));
	const isOffSchedule = offScheduleChecker(habit, entries);
	const todayStart = startOfDay(today);
	const createdStart = startOfDay(habit.createdAt);
	const firstWeek = addWeeks(weekStart(todayStart), -(HEATMAP_WEEKS - 1));

	function dayFor(date: Date): HeatmapDay {
		const isToday = isSameDay(date, todayStart);
		const day = dayStatusFor(date);
		return { ...day, isToday };
	}

	function dayStatusFor(date: Date): Omit<HeatmapDay, "isToday"> {
		const dateString = toDayKey(date);
		const entry = entriesByDate.get(dateString);
		const isFuture = isAfter(date, todayStart);
		const beforeCreation = isBefore(date, createdStart);
		const selectable = !isFuture && !beforeCreation;

		if (isFuture) return { date, status: "future", selectable };
		if (entry) {
			// A real log always shows, even off-schedule; hiding it would misreport what
			// happened. A frozen day is never a bonus: the freeze says it was owed.
			const bonus = !frozenDates.has(dateString) && isOffSchedule(entry);
			return {
				date,
				status: bonus ? "bonus" : "logged",
				level: heatmapLevelFor(habit, entry),
				selectable,
			};
		}
		// Before scheduling: a freeze always shows as one, even if the per-week rule
		// wouldn't count the day as owed in hindsight.
		if (frozenDates.has(dateString)) {
			return { date, status: "frozen", selectable };
		}
		if (!beforeCreation && isPausedOn(date, pauses)) {
			return { date, status: "paused", selectable };
		}
		if (beforeCreation) return { date, status: "before-start", selectable };
		if (!strategy.wasScheduledOn(date, context)) {
			return { date, status: "not-scheduled", selectable };
		}
		if (isSameDay(date, todayStart)) {
			return { date, status: "pending", selectable };
		}
		if (resetOn && isSameDay(date, resetOn)) {
			return { date, status: "reset", selectable };
		}
		return { date, status: "missed", selectable };
	}

	return Array.from({ length: HEATMAP_WEEKS }, (_, week) =>
		Array.from({ length: 7 }, (_, weekday) =>
			dayFor(addDays(addWeeks(firstWeek, week), weekday)),
		),
	);
}

export type HistoryKind =
	| "done"
	| "partial"
	| "missed"
	| "frozen"
	| "bonus"
	| "noted";

export type HistoryRow = {
	date: string;
	kind: HistoryKind;
	value: number | null;
	note: string | null;
};

const HISTORY_LIMIT = 10;

// Bound the scan: a habit with few days to list otherwise walked back to its creation.
const HISTORY_LOOKBACK_DAYS = 366;

// A habit nothing has ever been logged for lists no missed days: it has not started.
export function habitHistoryRows(
	history: History,
	notes: readonly EntryNote[],
	limit = HISTORY_LIMIT,
): HistoryRow[] {
	const { habit, entries, today } = history;
	const classify = habitDayClassifier(history);
	const noteByDate = new Map(notes.map(({ date, note }) => [date, note]));
	const entryByDate = new Map(entries.map((entry) => [entry.date, entry]));
	const started = entries.length > 0;
	const todayStart = startOfDay(today);
	const first = max([
		startOfDay(habit.createdAt),
		subDays(todayStart, HISTORY_LOOKBACK_DAYS),
	]);
	const rows: HistoryRow[] = [];

	for (
		let cursor = todayStart;
		!isBefore(cursor, first) && rows.length < limit;
		cursor = subDays(cursor, 1)
	) {
		const date = toDayKey(cursor);
		const cell = classify(cursor);
		const note = noteByDate.get(date) ?? null;
		const value = entryByDate.get(date)?.value ?? null;
		const kind: HistoryKind | null =
			cell.status === "done"
				? "done"
				: cell.status === "partial"
					? "partial"
					: cell.status === "bonus"
						? "bonus"
						: cell.status === "frozen"
							? "frozen"
							: cell.status === "missed" && started
								? "missed"
								: note
									? "noted"
									: null;
		if (kind) rows.push({ date, kind, value, note });
	}
	return rows;
}

export type StreakReset = {
	missedDate: Date;
	poolRefillsOn: Date;
};

// Scans back from yesterday, so a run of misses reports the first one (the day it broke).
export function streakResetInfo(
	{ habit, entries, frozenDates, today }: History,
	freezesRemaining: number,
): StreakReset | null {
	if (freezesRemaining > 0 || habit.archivedAt) return null;

	const strategy = getHabitStrategy(habit);
	const completed = completedDatesOf(habit, entries);
	const context = { completedDates: completed.dates };
	const todayStart = startOfDay(today);
	const monthStart = startOfMonth(todayStart);
	const earliest = max([monthStart, startOfDay(habit.createdAt)]);

	for (
		let cursor = subDays(todayStart, 1);
		!isBefore(cursor, earliest);
		cursor = subDays(cursor, 1)
	) {
		const dateString = toDayKey(cursor);
		if (
			!strategy.wasScheduledOn(cursor, context) ||
			completed.set.has(dateString) ||
			frozenDates.has(dateString)
		) {
			continue;
		}
		const standing = calculateCurrentStreak(
			habit,
			entries,
			frozenDates,
			subDays(cursor, 1),
		);
		if (standing > 0) {
			return {
				missedDate: cursor,
				poolRefillsOn: startOfMonth(addMonths(todayStart, 1)),
			};
		}
	}
	return null;
}
