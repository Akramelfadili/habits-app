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
	startOfWeek,
	subDays,
} from "date-fns";
import type { HeatmapLevel } from "@/theme/theme";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { WEEK_STARTS_ON } from "../constants";
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

/**
 * Habit Detail's history math (HAB-09) — pure functions over a habit's own
 * entries and frozen days. Every "was this day owed" question goes through the
 * habit's FrequencyStrategy (`wasScheduledOn`), so the streaks, the 90-day
 * rate, and the heatmap can never disagree about which days counted.
 */

const COMPLETION_RATE_WINDOW_DAYS = 90;
export const HEATMAP_WEEKS = 5;

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
		dates: complete.map((entry) => fromDayKey(entry.date)),
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
	const todayDone = completedDatesOf(habit, entries).set.has(toDayKey(today));
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

	// A restore starts a fresh run (HAB-20) — nothing carries over the gap.
	const restarts = new Set(restartDays(habit.pauses));
	let best: LongestStreak = { days: 0, endedOn: null };
	let run = 0;
	for (
		let cursor = startOfDay(habit.createdAt);
		!isAfter(cursor, todayStart);
		cursor = addDays(cursor, 1)
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
	/** Due days in the window: frozen and bonus days are on neither side (D14). */
	scheduled: number;
	/** Frozen days inside the window — excused, left out of both counts. */
	frozen: number;
	/** 0–1, or null when nothing has been due yet (a brand-new habit). */
	fraction: number | null;
	/** An archive pause falls inside the window — its days were skipped, not missed (HAB-20). */
	skippedPaused: boolean;
};

/**
 * Completion rate over the last 90 days: the shared rule (`completion-rate.ts`,
 * done ÷ due) over the habit's **scheduled** days only — clipped to the
 * habit's own creation date rather than padded to 90 (HAB-09 edge case).
 * Today joins the denominator only once it's logged, since it can't have been
 * missed yet. A frozen day is excused (D14): it leaves both the completions
 * and the denominator, as on Progress. An archived habit's window ends the day
 * before it was archived, so the rate reads "before archive" rather than
 * decaying over days it was never asked of.
 */
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

/** Adds every day of `start`–`end` to one tally; `skippedPaused` says a pause fell inside. */
function tallyWindow(
	classify: (date: Date) => HabitDayCell,
	habit: Habit,
	start: Date,
	end: Date,
) {
	const tally = { ...EMPTY_TALLY };
	let skippedPaused = false;
	for (let cursor = start; !isAfter(cursor, end); cursor = addDays(cursor, 1)) {
		if (isPausedOn(cursor, habit.pauses)) skippedPaused = true;
		addToTally(tally, classify(cursor));
	}
	return { tally, skippedPaused };
}

/**
 * The fewest due days the earlier window needs before the 90-day rate is
 * compared with it: a tile that says "+4 pts" over two days would be noise.
 */
const MIN_DUE_FOR_DELTA = 7;

/**
 * The 90-day rate minus the rate over the 90 days before it, in whole points
 * (D1's "+4 pts"); null when there is nothing fair to compare: a habit younger
 * than 90 days, an earlier window with fewer than 7 due days, no rate yet, or an
 * archived habit (its tile says "until <date>" instead). Both windows use the one
 * rate rule, so frozen days and bonus logs leave both sides (D14).
 */
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
	/** Inside an archive period (HAB-20) — read as paused, never as missed. */
	| "paused"
	/** The unfrozen missed day that reset a streak with no freezes left (HAB-20). */
	| "reset"
	| "pending"
	| "future"
	/** Before the habit was created: drawn dashed, "before start" (D3). */
	| "before-start";

export type HeatmapDay = {
	date: Date;
	status: HeatmapDayStatus;
	/** The cell is today — it is ringed whatever its status. */
	isToday: boolean;
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
export function buildHeatmapWeeks(
	{ habit, entries, frozenDates, today }: History,
	/** The day a streak reset on (`streakResetInfo`) — outlined in the grid (HAB-20). */
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
	const firstWeek = addWeeks(
		startOfWeek(todayStart, { weekStartsOn: WEEK_STARTS_ON }),
		-(HEATMAP_WEEKS - 1),
	);

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
			// A real log always shows, even on an off-schedule day — hiding it
			// would misreport what happened; the rate still ignores it. A frozen
			// day is never a bonus: the freeze says it was owed.
			const bonus = !frozenDates.has(dateString) && isOffSchedule(entry);
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
		// Archived days are paused, not "not scheduled" — and never missed.
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
	/** A quantity day logged below its target. */
	| "partial"
	| "missed"
	| "frozen"
	/** Logged on a day that was not due (D11): shown, tagged "not counted". */
	| "bonus"
	/** A day with a note and nothing else to say. */
	| "noted";

/** One line of Habit Detail's history (D2). */
export type HistoryRow = {
	/** "yyyy-MM-dd". */
	date: string;
	kind: HistoryKind;
	/** The logged amount (a quantity habit's bonus or partial day), when there is one. */
	value: number | null;
	note: string | null;
};

/** How many lines History lists: the latest days that have something to say. */
const HISTORY_LIMIT = 10;

/**
 * Habit Detail's History (D2): the latest days that were done, missed, frozen or
 * an off-schedule bonus — and a day that carries a note — newest first. A day
 * that was not due, a paused day and today while still open say nothing. A habit
 * nothing has ever been logged for lists no missed days: it has not started
 * (D3). Every answer comes from the one day classifier, so History can never
 * disagree with the grid or the rate about what a day was.
 */
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
	const first = startOfDay(habit.createdAt);
	const rows: HistoryRow[] = [];

	for (
		let cursor = startOfDay(today);
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
	/** The missed day that ended the streak. */
	missedDate: Date;
	/** First day of next month, when the freeze pool refills. */
	poolRefillsOn: Date;
};

/**
 * Whether Detail should explain a streak reset (HAB-20 / D6): this month, a
 * streak was standing, a scheduled day went unlogged, and the shared pool had
 * nothing left to cover it. A historical note, not a badge — only the month
 * it happened in, and only while the pool is still empty. Scans back from
 * yesterday, so a run of misses reports the first one (the day it broke).
 */
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
